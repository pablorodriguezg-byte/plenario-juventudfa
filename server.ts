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

async function startServer() {
  const app = express();
  
  // Aumentar límite de carga para archivos CSV y documentos del plenario
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      storageConnected: true, 
      storagePath: DATA_DIR, 
      timestamp: Date.now() 
    });
  });

  // 1. Obtener estado almacenado en la carpeta interna
  app.get('/api/storage', (req, res) => {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return res.json({ 
          success: true, 
          exists: true, 
          data: parsed,
          savedAt: fs.statSync(STORAGE_FILE).mtimeMs 
        });
      }
      return res.json({ success: true, exists: false, data: null });
    } catch (err: any) {
      console.error('Error al leer de la carpeta interna /data:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Guardar estado permanentemente en la carpeta interna
  app.post('/api/storage', (req, res) => {
    try {
      const payload = req.body;
      if (!payload) {
        return res.status(400).json({ success: false, error: 'Payload vacío' });
      }

      // Guardar archivo principal en /data/plenario_store.json
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(payload, null, 2), 'utf-8');

      // Crear respaldo rotativo en /data/backups/
      try {
        const backupFile = path.join(BACKUPS_DIR, `respaldo_${Date.now()}.json`);
        fs.writeFileSync(backupFile, JSON.stringify(payload, null, 2), 'utf-8');

        // Conservar los últimos 15 respaldos
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

      return res.json({ 
        success: true, 
        savedAt: Date.now(), 
        file: STORAGE_FILE 
      });
    } catch (err: any) {
      console.error('Error al guardar en la carpeta interna /data:', err);
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
  app.get('/api/storage/files', (req, res) => {
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
  app.post('/api/storage/reset', (req, res) => {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        // Mover a backup antes de resetear
        const archiveName = path.join(BACKUPS_DIR, `pre_reset_${Date.now()}.json`);
        fs.renameSync(STORAGE_FILE, archiveName);
      }
      return res.json({ success: true, message: 'Almacenamiento interno reiniciado en limpio' });
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
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Plenario Server] Servidor activo en puerto ${PORT} con almacenamiento en ${DATA_DIR}`);
  });
}

startServer();
