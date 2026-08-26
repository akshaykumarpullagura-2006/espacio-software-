# ESPACIO ERP — Automated Backup Strategy

## 1. Overview

Because ESPACIO ERP runs on a local office PC, relying solely on the office PC's primary hard drive creates a single point of failure (hardware crash, power surge, accidental deletion).

The automated backup architecture implements a multi-destination backup strategy combining local snapshots with off-site automated copies.

---

## 2. Backup Strategy Architecture

```
┌─────────────────────────────────────────────────────────┐
│              ESPACIO ERP LOCAL SERVER                   │
│                                                         │
│  ┌──────────────────┐                                   │
│  │ SQLite Database  │                                   │
│  │ dev.db           │                                   │
│  └────────┬─────────┘                                   │
│           │                                             │
│           │ 1. Scheduled Backup Script (scripts/backup.js) │
│           ▼                                             │
│  ┌──────────────────┐                                   │
│  │ Local Snapshot   │ (AES-256 Encrypted Zip)             │
│  │ /backups/local/  │                                   │
│  └────────┬─────────┘                                   │
└───────────┼─────────────────────────────────────────────┘
            │
            │ 2. Off-Site Sync (Cloud / External Storage)
            ▼
┌─────────────────────────────────────────────────────────┐
│                OFF-SITE BACKUP STORAGE                  │
│    (Encrypted Cloud Storage / External Network Drive)   │
└─────────────────────────────────────────────────────────┘
```

---

## 3. SQLite WAL Checkpoint Safety

SQLite in Write-Ahead Logging (WAL) mode requires checkpointing before copying the database file to prevent partial write corruption.

The automated backup runner (`scripts/backup.js`) executes:
1. `PRISMA / SQLite PRAGMA wal_checkpoint(FULL);`
2. Creates an atomic copy of `dev.db` into timestamped archive `espacio-backup-YYYY-MM-DD-HHmm.db`.
3. Encrypts the snapshot with AES-256 password protection.
4. Purges local archives older than 30 days (Retention policy).

---

## 4. Disaster Recovery Procedure

To restore ESPACIO ERP from a backup snapshot:

1. Stop Node.js production server.
2. Decrypt target backup file `espacio-backup-YYYY-MM-DD-HHmm.db`.
3. Replace existing `prisma/dev.db` with the decrypted backup file.
4. Run database integrity check:
   ```powershell
   npx prisma db execute --stdin "PRAGMA integrity_check;"
   ```
5. Restart server (`npm run start`).
