import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'propostas.db');
const db = new Database(dbPath);

console.log('=== AUDITORIA FASE 3 ===\n');

// 1. Lista de todos os contratos
console.log('--- CONTRATOS ---');
const contracts: any[] = db.prepare(`
  SELECT id, number, sequenceNumber, year, proposalId, proposalNumber, status,
         currentVersion, signedAt, signedBy, signatureDate, signatureType,
         signedDocumentPath, signedDocumentName,
         financialReleaseStatus, createdAt, updatedAt
  FROM contracts WHERE isDeleted = 0
  ORDER BY year, sequenceNumber
`).all();

for (const c of contracts) {
  console.log(`\nContrato: ${c.number}`);
  console.log(`  ID: ${c.id}`);
  console.log(`  Proposta vinculada: ${c.proposalNumber} (ID: ${c.proposalId})`);
  console.log(`  Status: ${c.status}`);
  console.log(`  Versão: ${c.currentVersion}`);
  console.log(`  signedAt: ${c.signedAt || 'NULL'}`);
  console.log(`  signedBy: ${c.signedBy || 'NULL'}`);
  console.log(`  signatureDate: ${c.signatureDate || 'NULL'}`);
  console.log(`  signatureType: ${c.signatureType || 'NULL'}`);
  console.log(`  signedDocumentPath: ${c.signedDocumentPath || 'NULL'}`);
  console.log(`  signedDocumentName: ${c.signedDocumentName || 'NULL'}`);
  console.log(`  financialReleaseStatus: ${c.financialReleaseStatus}`);

  // Verificar recebíveis financeiros vinculados
  const receivables: any[] = db.prepare(`
    SELECT id, code, status, finalAmount, totalReceived, balance
    FROM financial_receivables WHERE contractId = ? AND isDeleted = 0
  `).all(c.id);

  if (receivables.length > 0) {
    console.log(`  Recebíveis financeiros:`);
    for (const r of receivables) {
      console.log(`    ${r.code} - Status: ${r.status}, Valor: R$ ${r.finalAmount}, Recebido: R$ ${r.totalReceived}, Saldo: R$ ${r.balance}`);

      // Verificar parcelas
      const installments: any[] = db.prepare(`
        SELECT id, installmentNumber, status, originalAmount, receivedAmount, balance, dueDate
        FROM financial_receivable_installments WHERE receivableId = ?
      `).all(r.id);
      for (const inst of installments) {
        console.log(`      Parcela ${inst.installmentNumber}: ${inst.status}, R$ ${inst.originalAmount}, Recebido: R$ ${inst.receivedAmount}, Venc: ${inst.dueDate}`);
      }

      // Verificar recebimentos
      const receipts: any[] = db.prepare(`
        SELECT id, receiptNumber, amount, receivedDate, isReversed
        FROM financial_receipts WHERE receivableId = ?
      `).all(r.id);
      for (const rec of receipts) {
        console.log(`      Recebimento: ${rec.receiptNumber}, R$ ${rec.amount}, Data: ${rec.receivedDate}, Estornado: ${rec.isReversed}`);
      }
    }
  } else {
    console.log(`  Recebíveis financeiros: NENHUM`);
  }

  // Histórico de status
  const history: any[] = db.prepare(`
    SELECT previousStatus, newStatus, action, details, performedBy, createdAt
    FROM contract_status_history WHERE contractId = ?
    ORDER BY createdAt ASC
  `).all(c.id);
  console.log(`  Histórico de status:`);
  for (const h of history) {
    console.log(`    [${h.createdAt}] ${h.previousStatus || 'NULL'} -> ${h.newStatus} | ${h.action} | ${h.performedBy}`);
  }
}

// 2. Lista de todas as propostas
console.log('\n\n--- PROPOSTAS ---');
const proposals: any[] = db.prepare(`
  SELECT id, number, sequenceNumber, year, status, clientId, eventName
  FROM proposals WHERE isDeleted = 0
  ORDER BY year, sequenceNumber
`).all();

for (const p of proposals) {
  const client: any = db.prepare('SELECT name FROM clients WHERE id = ?').get(p.clientId);
  console.log(`\nProposta: ${p.number}`);
  console.log(`  ID: ${p.id}`);
  console.log(`  Status: ${p.status}`);
  console.log(`  Cliente: ${client?.name || 'N/A'} (ID: ${p.clientId})`);
  console.log(`  Evento: ${p.eventName}`);
}

// 3. Verificar cruzamento
console.log('\n\n--- VERIFICAÇÃO DE CRUZAMENTO ---');
for (const c of contracts) {
  const expectedNumber = c.proposalNumber?.replace('PROP-', 'CTR-');
  const match = c.number === expectedNumber;
  console.log(`${c.number} vinculado a ${c.proposalNumber} => Esperado: ${expectedNumber} => ${match ? '✅ CORRETO' : '❌ CRUZADO'}`);
}

db.close();
