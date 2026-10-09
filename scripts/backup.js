import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const backupDir = path.resolve(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `propostas_pre_billing_companies_${timestamp}.db`);

const db = new Database('propostas.db');
await db.backup(backupPath);
const stats = fs.statSync(backupPath);

console.log('STATUS: BACKUP_CONCLUIDO');
console.log('ARQUIVO:', backupPath);
console.log('TAMANHO:', stats.size, 'bytes');
