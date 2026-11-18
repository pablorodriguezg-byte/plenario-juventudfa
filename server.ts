import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// Carpeta interna permanente para almacenamiento persistente
const DATA_DIR = path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const BACKUPS_DIR = path.resolve(DATA_DIR, 'backups');

for (const dir of [DATA_DIR, UPLOADS_DIR, BACKUPS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const STORAGE_FILE = path.join(DATA_DIR, 'plenario_store.json');

// Control de versión y difusión en tiempo real (SSE)
let storeVersion = Date.now();
const sseClients = new Set<express.Response>();

function readStoreFromDisk(): any | null {
  try {
    if (!fs.existsSync(STORAGE_FILE)) return null;
    const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error al leer plenario_store.json:', err);
    return null;
  }
}

function writeStoreToDisk(payload: any, createBackup = true): number {
  storeVersion = Math.max(storeVersion + 1, Date.now());
  const dataToWrite = {
    ...payload,
    version: storeVersion,
    savedAt: Date.now(),
    isoTime: new Date().toISOString()
  };

  fs.writeFileSync(STORAGE_FILE, JSON.stringify(dataToWrite, null, 2), 'utf-8');

  if (createBackup) {
    try {
      const backupFile = path.join(BACKUPS_DIR, `respaldo_${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(dataToWrite, null, 2), 'utf-8');

      const existingBackups = fs.readdirSync(BACKUPS_DIR)
        .filter(f => f.startsWith('respaldo_') && f.endsWith('.json'))
        .sort()
        .reverse();

      for (const old of existingBackups.slice(15)) {
        try {
          fs.unlinkSync(path.join(BACKUPS_DIR, old));
        } catch {}
      }
    } catch (backupErr) {
      console.warn('Advertencia en rotación de respaldos:', backupErr);
    }
  }

  broadcastUpdate(storeVersion);
  return storeVersion;
}

function broadcastUpdate(version: number) {
  const msg = `event: update\ndata: ${JSON.stringify({ version, savedAt: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(msg);
    } catch {
      sseClients.delete(client);
    }
  }
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Inicializar storeVersion desde archivo existente si hay
  const initialDisk = readStoreFromDisk();
  if (initialDisk?.version) {
    storeVersion = Number(initialDisk.version) || Date.now();
  }

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      storageConnected: true,
      storagePath: DATA_DIR,
      version: storeVersion,
      connectedClients: sseClients.size,
      timestamp: Date.now()
    });
  });

  // Stream SSE en tiempo real para sincronizar lanzamientos y votos entre todos los dispositivos
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`event: connected\ndata: ${JSON.stringify({ version: storeVersion, timestamp: Date.now() })}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: ping\n\n`);
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(res);
      }
    }, 20000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // 1. Obtener estado almacenado en la carpeta interna
  app.get('/api/storage', (_req, res) => {
    try {
      const parsed = readStoreFromDisk();
      if (parsed) {
        return res.json({
          success: true,
          exists: true,
          data: parsed,
          version: parsed.version || storeVersion,
          savedAt: parsed.savedAt || fs.statSync(STORAGE_FILE).mtimeMs
        });
      }
      return res.json({ success: true, exists: false, data: null, version: storeVersion });
    } catch (err: any) {
      console.error('Error al leer de la carpeta interna /data:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Guardar estado permanentemente en la carpeta interna (con fusión segura de votos en sala)
  app.post('/api/storage', (req, res) => {
    try {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ success: false, error: 'Payload vacío' });
      }

      const existing = readStoreFromDisk();
      const mergedPayload = { ...payload };

      // Proteger votos concurrentes en mociones abiertas (si en disco hay votos más recientes que el cliente aún no recibió)
      if (existing && Array.isArray(existing.motionsHistory) && Array.isArray(mergedPayload.motionsHistory)) {
        const diskMotionsMap = new Map<string, any>(
          existing.motionsHistory.map((m: any) => [m.id, m])
        );
        mergedPayload.motionsHistory = mergedPayload.motionsHistory.map((clientMotion: any) => {
          const diskMotion = diskMotionsMap.get(clientMotion.id);
          if (diskMotion && clientMotion.status === 'VOTING' && diskMotion.status === 'VOTING') {
            return {
              ...clientMotion,
              votes: {
                ...(diskMotion.votes || {}),
                ...(clientMotion.votes || {})
              }
            };
          }
          return clientMotion;
        });
      }

      const newVersion = writeStoreToDisk(mergedPayload, true);

      return res.json({
        success: true,
        version: newVersion,
        savedAt: Date.now(),
        file: STORAGE_FILE
      });
    } catch (err: any) {
      console.error('Error al guardar en la carpeta interna /data:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2b. Emisión atómica de voto de delegado (evita colisiones entre múltiples votantes simultáneos)
  app.post('/api/vote', (req, res) => {
    try {
      const { motionId, delegateId, voteEntry, auditEntry } = req.body;
      if (!motionId || !delegateId || !voteEntry) {
        return res.status(400).json({ success: false, error: 'Datos de sufragio incompletos' });
      }

      const current = readStoreFromDisk();
      if (!current || !Array.isArray(current.motionsHistory)) {
        return res.status(404).json({ success: false, error: 'No existe registro activo en sala' });
      }

      const targetIndex = current.motionsHistory.findIndex((m: any) => m.id === motionId);
      if (targetIndex === -1) {
        return res.status(404).json({ success: false, error: 'Moción no encontrada en sala' });
      }

      const targetMotion = current.motionsHistory[targetIndex];
      if (targetMotion.status !== 'VOTING') {
        return res.status(409).json({ success: false, error: 'La votación ya no se encuentra abierta' });
      }

      if (targetMotion.votes && targetMotion.votes[delegateId]) {
        return res.status(409).json({
          success: false,
          error: 'El voto ya fue emitido y confirmado. No se permite modificar el sufragio.'
        });
      }

      targetMotion.votes = {
        ...(targetMotion.votes || {}),
        [delegateId]: voteEntry
      };
      current.motionsHistory[targetIndex] = targetMotion;

      if (auditEntry) {
        current.auditLogs = [auditEntry, ...(current.auditLogs || []).slice(0, 199)];
      }

      const newVersion = writeStoreToDisk(current, false);
      return res.json({ success: true, version: newVersion, motion: targetMotion });
    } catch (err: any) {
      console.error('Error en voto atómico:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2c. Presentación atómica de moción (extensiva o supresiva) por delegado sin sobreescribir estado de sala
  app.post('/api/motions/propose', (req, res) => {
    try {
      const { motion, auditEntry } = req.body;
      if (!motion || !motion.id) {
        return res.status(400).json({ success: false, error: 'Moción inválida' });
      }

      const current = readStoreFromDisk() || {
        delegates: [],
        motionsHistory: [],
        synthesisChapters: [],
        orderMotions: [],
        actas: [],
        auditLogs: []
      };

      const existingIdx = (current.motionsHistory || []).findIndex((m: any) => m.id === motion.id);
      if (existingIdx === -1) {
        current.motionsHistory = [motion, ...(current.motionsHistory || [])];
      }
      if (auditEntry) {
        current.auditLogs = [auditEntry, ...(current.auditLogs || []).slice(0, 199)];
      }

      const newVersion = writeStoreToDisk(current, true);
      return res.json({ success: true, version: newVersion, motion });
    } catch (err: any) {
      console.error('Error al ingresar moción:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2d. Actualización de sesión de delegado sin sobreescribir votaciones o capítulos
  app.post('/api/delegates/session', (req, res) => {
    try {
      const { delegate, auditEntry } = req.body;
      if (!delegate || !delegate.id) {
        return res.status(400).json({ success: false, error: 'Delegado inválido' });
      }

      const current = readStoreFromDisk();
      if (!current) {
        return res.json({ success: true, version: storeVersion });
      }

      const delegatesList = Array.isArray(current.delegates) ? [...current.delegates] : [];
      const idx = delegatesList.findIndex((d: any) => d.id === delegate.id);
      if (idx >= 0) {
        delegatesList[idx] = { ...delegatesList[idx], ...delegate };
      } else {
        delegatesList.unshift(delegate);
      }
      current.delegates = delegatesList;

      if (auditEntry) {
        current.auditLogs = [auditEntry, ...(current.auditLogs || []).slice(0, 199)];
      }

      const newVersion = writeStoreToDisk(current, false);
      return res.json({ success: true, version: newVersion });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Subir archivo a la carpeta interna (/data/uploads)
  app.post('/api/storage/upload', (req, res) => {
    try {
      const { filename, content, type, category } = req.body;
      if (!filename || !content) {
        return res.status(400).json({ success: false, error: 'Nombre de archivo y contenido requeridos' });
      }

      const safeBaseName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueName = `${Date.now()}_${safeBaseName}`;
      const destPath = path.join(UPLOADS_DIR, uniqueName);

      fs.writeFileSync(destPath, content, 'utf-8');

      return res.json({
        success: true,
        file: {
          id: uniqueName,
          originalName: filename,
          savedName: uniqueName,
          size: Buffer.byteLength(content, 'utf-8'),
          uploadedAt: Date.now(),
          type: type || 'text/csv',
          category: category || 'padron'
        }
      });
    } catch (err: any) {
      console.error('Error al subir archivo a /data/uploads:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Listar archivos guardados en la carpeta interna
  app.get('/api/storage/files', (_req, res) => {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        return res.json({ success: true, files: [] });
      }

      const files = fs.readdirSync(UPLOADS_DIR).map(f => {
        const full = path.join(UPLOADS_DIR, f);
        const stat = fs.statSync(full);
        return {
          id: f,
          name: f,
          sizeBytes: stat.size,
          createdAt: stat.birthtimeMs,
          modifiedAt: stat.mtimeMs
        };
      }).sort((a, b) => b.createdAt - a.createdAt);

      return res.json({ success: true, files });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Restablecer / Vaciar datos en disco
  app.post('/api/storage/reset', (_req, res) => {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const archiveName = path.join(BACKUPS_DIR, `pre_reset_${Date.now()}.json`);
        fs.renameSync(STORAGE_FILE, archiveName);
      }
      storeVersion = Date.now();
      broadcastUpdate(storeVersion);
      return res.json({ success: true, version: storeVersion, message: 'Almacenamiento interno reiniciado en limpio' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Integración con Vite para desarrollo o servir producción
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Plenario Server] Servidor activo en puerto ${PORT} con almacenamiento en ${DATA_DIR}`);
  });
}

startServer();
