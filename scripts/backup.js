const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const dbPath = path.join(__dirname, "../prisma/dev.db");
const backupDir = path.join(__dirname, "../backups/local");

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const targetBackupPath = path.join(backupDir, `espacio-backup-${timestamp}.db`);

try {
  console.log("📦 Starting ESPACIO ERP Database Backup Procedure...");

  if (fs.existsSync(dbPath)) {
    // Copy main DB file
    fs.copyFileSync(dbPath, targetBackupPath);
    console.log(`✅ Backup archive created successfully: ${targetBackupPath}`);

    // Retention Cleanup: Remove backups older than 30 days
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(backupDir, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Purged expired backup: ${file}`);
      }
    });
  } else {
    console.warn("⚠️ Main database file not found at " + dbPath);
  }
} catch (err) {
  console.error("❌ Backup failed:", err);
  process.exit(1);
}
