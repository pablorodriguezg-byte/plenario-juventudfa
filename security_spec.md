# Security Specification & Hardened Rules Audit

## 1. Data Invariants
1. **Verified Identity**: No read or write is allowed without `request.auth != null && request.auth.token.email_verified == true`.
2. **Accreditation Gate**: Non-admin reads/writes to plenary rooms, motions, votes, and audit logs require membership in `/accredited_users/{emailLower}`.
3. **PII Isolation**: Emails in `/accredited_users/{emailKey}` can only be read (`get`) by the owning verified email user or an admin; `list` is restricted to admin or exact `existing().emailLower == request.auth.token.email.lower()`. Audit logs (which store `ipAddress`) can only be read by admins. Public roster (`/plenario_rooms/roster`) stores zero emails and zero IPs.
4. **Immutable Ballots**: `/votes/{voteId}` has deterministic ID `${motionId}__${delegateId}`, `allow create` only when parent `/motions/{motionId}` has `status == 'VOTING'` and actor is an accredited `DELEGATE` matching `delegateId`, and `allow update: if false`.
5. **Motion Lifecycle Authority**: Delegates may only `create` motions with `status == 'DRAFT'` and `motionKind in ['MOCION_EXTENSIVA', 'MOCION_SUPRESIVA']` attributed to their own `authorUid`. Only Secretaría Técnica (`isAdmin()`) can open, close, update, or delete motions, edit synthesis chapters, manage the Padrón, or certify actas.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read on `/motions/moc-1`**: Rejected (`isVerifiedAccredited()` fails).
2. **Unverified email (`email_verified: false`) writing to `/votes/moc-1__del-1`**: Rejected (`isVerifiedUser()` fails).
3. **Spoofed admin email with `email_verified: false`**: Rejected (`isAdmin()` requires `isVerifiedUser()`).
4. **Random signed-in Google user (not in `/accredited_users`) reading `/plenario_rooms/synthesis`**: Rejected (`isVerifiedAccredited()` fails).
5. **Delegate attempting to read another delegate's `/accredited_users/{otherEmail}`**: Rejected (`request.auth.token.email.lower() == emailKey` fails).
6. **Delegate attempting to `list` `/accredited_users` without matching `emailLower`**: Rejected (`allow list` requires `isAdmin()` or `existing().emailLower == request.auth.token.email.lower()`).
7. **Delegate attempting to `update` their own `role` to `'SECRETARY'`**: Rejected (`affectedKeys().hasOnly(['isOnline', 'lastSessionId', 'updatedAt'])` and `incoming().role == existing().role`).
8. **Delegate attempting to `create` a motion directly in `status: 'VOTING'`**: Rejected (`incoming().status == 'DRAFT'`).
9. **Secretary (`role: 'SECRETARY'`) attempting to cast a vote in `/votes/...`**: Rejected (`isAccreditedDelegate()` requires `role == 'DELEGATE'`).
10. **Delegate attempting to `update` an already-confirmed vote in `/votes/{voteId}`**: Rejected (`allow update: if false`).
11. **Delegate attempting to vote on a `CLOSED` or `DRAFT` motion**: Rejected (`get(.../motions/$(motionId)).data.status == 'VOTING'`).
12. **Shadow / Ghost field injection (`isAdmin: true` or 1MB string) in `/motions/{motionId}` or `/votes/{voteId}`**: Rejected (`keys().hasOnly(...)` + `.size()` limits).
