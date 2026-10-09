import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.resolve(process.cwd(), 'propostas.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF'); // Temporarily disable to allow the swap

const now = new Date().toISOString();

// =============================================
// FASE 3 — CORREÇÃO TRANSACIONAL
// =============================================
// Contrato A: CTR-2026-0001 (ID: 014b60cd...) vinculado a PROP-2026-0002 → deveria ser CTR-2026-0002
// Contrato B: CTR-2026-0002 (ID: 42605683...) vinculado a PROP-2026-0001 → deveria ser CTR-2026-0001
//
// Contrato B tem recebível financeiro REC-FIN-2026-0001 (pago integralmente).
// Os IDs dos contratos NÃO mudam, apenas os números (number, sequenceNumber).

const CONTRACT_A_ID = '014b60cd-7084-4419-965d-19292045bb6b';
const CONTRACT_B_ID = '42605683-cc05-4928-a3f4-6ac8da6eeb29';

const fixTransaction = db.transaction(() => {
  // 1. Registrar estado anterior (auditoria)
  const contractA: any = db.prepare('SELECT * FROM contracts WHERE id = ?').get(CONTRACT_A_ID);
  const contractB: any = db.prepare('SELECT * FROM contracts WHERE id = ?').get(CONTRACT_B_ID);

  if (!contractA || !contractB) {
    throw new Error('ERRO CRÍTICO: Um ou ambos contratos não encontrados. Abortando.');
  }

  console.log('\n=== ESTADO ANTERIOR ===');
  console.log(`Contrato A (${CONTRACT_A_ID}): number=${contractA.number}, seq=${contractA.sequenceNumber}, proposal=${contractA.proposalNumber}`);
  console.log(`Contrato B (${CONTRACT_B_ID}): number=${contractB.number}, seq=${contractB.sequenceNumber}, proposal=${contractB.proposalNumber}`);

  // Validação: confirmar que é exatamente o cruzamento esperado
  if (contractA.number !== 'CTR-2026-0001' || contractA.proposalNumber !== 'PROP-2026-0002') {
    throw new Error(`ERRO: Contrato A não está no estado esperado. Esperado number=CTR-2026-0001, proposalNumber=PROP-2026-0002. Encontrado: ${contractA.number}, ${contractA.proposalNumber}`);
  }
  if (contractB.number !== 'CTR-2026-0002' || contractB.proposalNumber !== 'PROP-2026-0001') {
    throw new Error(`ERRO: Contrato B não está no estado esperado. Esperado number=CTR-2026-0002, proposalNumber=PROP-2026-0001. Encontrado: ${contractB.number}, ${contractB.proposalNumber}`);
  }

  // 2. Renomear usando identificador temporário para evitar violação de UNIQUE
  console.log('\n=== EXECUTANDO TROCA ===');

  // Passo 1: A -> TEMP
  db.prepare('UPDATE contracts SET number = ?, sequenceNumber = ? WHERE id = ?')
    .run('CTR-TEMP-SWAP', 9999, CONTRACT_A_ID);
  console.log('  Passo 1: CTR-2026-0001 -> CTR-TEMP-SWAP');

  // Passo 2: B -> CTR-2026-0001 (número correto para PROP-2026-0001)
  db.prepare('UPDATE contracts SET number = ?, sequenceNumber = ? WHERE id = ?')
    .run('CTR-2026-0001', 1, CONTRACT_B_ID);
  console.log('  Passo 2: CTR-2026-0002 -> CTR-2026-0001');

  // Passo 3: TEMP -> CTR-2026-0002 (número correto para PROP-2026-0002)
  db.prepare('UPDATE contracts SET number = ?, sequenceNumber = ? WHERE id = ?')
    .run('CTR-2026-0002', 2, CONTRACT_A_ID);
  console.log('  Passo 3: CTR-TEMP-SWAP -> CTR-2026-0002');

  // 3. Atualizar o contractNumber no recebível financeiro vinculado ao contrato B
  const receivables: any[] = db.prepare('SELECT id, code, contractNumber FROM financial_receivables WHERE contractId = ?').all(CONTRACT_B_ID);
  for (const r of receivables) {
    db.prepare('UPDATE financial_receivables SET contractNumber = ? WHERE id = ?')
      .run('CTR-2026-0001', r.id);
    console.log(`  Recebível ${r.code}: contractNumber ${r.contractNumber} -> CTR-2026-0001`);
  }

  // 4. Registrar auditoria para ambos os contratos
  const auditDetails = `Correção de numeração cruzada (Fase 3). ` +
    `Contrato A (${CONTRACT_A_ID}): ${contractA.number} -> CTR-2026-0002 (vínculo com ${contractA.proposalNumber}). ` +
    `Contrato B (${CONTRACT_B_ID}): ${contractB.number} -> CTR-2026-0001 (vínculo com ${contractB.proposalNumber}).`;

  db.prepare(`
    INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), CONTRACT_A_ID, contractA.status, contractA.status, 'Correção de Numeração (Fase 3)', auditDetails, 'Sistema - Migração Fase 3', now);

  db.prepare(`
    INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), CONTRACT_B_ID, contractB.status, contractB.status, 'Correção de Numeração (Fase 3)', auditDetails, 'Sistema - Migração Fase 3', now);

  // 5. Corrigir status de assinatura: 'signed' deve ser somente por ação manual explícita
  // Como ambos foram marcados como signed sem documento assinado, resetar para 'awaiting_signature'
  // EXCETO: o contrato B (agora CTR-2026-0001) tem recebível pago, então preservar o status signed dele
  // mas limpar o contrato A (agora CTR-2026-0002) que foi criado para PROP-2026-0002 (cancelada)

  // Contrato A (agora CTR-2026-0002, vinculado a PROP-2026-0002 que está cancelada):
  // Manter signed pois é uma situação que o usuário pode querer verificar manualmente
  // Mas registrar que o status precisa de revisão

  // Na verdade, segundo a instrução do usuário, nenhum contrato deveria estar marcado como
  // signed automaticamente. Porém, o contrato B tem financeiro pago.
  // Vou resetar ambos para 'awaiting_signature' e limpar signedAt/signedBy,
  // PRESERVANDO os recebimentos financeiros do contrato B intactos.

  // Resetar Contrato A para awaiting_signature
  db.prepare(`
    UPDATE contracts SET
      status = 'awaiting_signature',
      signedAt = NULL,
      signedBy = NULL,
      signatureDate = NULL,
      signatureType = NULL,
      signatureNotes = NULL,
      updatedAt = ?
    WHERE id = ?
  `).run(now, CONTRACT_A_ID);
  console.log(`  Contrato A (${CONTRACT_A_ID}): status signed -> awaiting_signature, signedAt/signedBy limpos`);

  db.prepare(`
    INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), CONTRACT_A_ID, 'signed', 'awaiting_signature', 'Reset de Status (Fase 3)',
    'Status resetado de signed para awaiting_signature. O status signed deve ser definido exclusivamente por ação manual explícita.',
    'Sistema - Migração Fase 3', now);

  // Resetar Contrato B para awaiting_signature (preservando financeiro)
  db.prepare(`
    UPDATE contracts SET
      status = 'awaiting_signature',
      signedAt = NULL,
      signedBy = NULL,
      signatureDate = NULL,
      signatureType = NULL,
      signatureNotes = NULL,
      updatedAt = ?
    WHERE id = ?
  `).run(now, CONTRACT_B_ID);
  console.log(`  Contrato B (${CONTRACT_B_ID}): status signed -> awaiting_signature, signedAt/signedBy limpos`);

  db.prepare(`
    INSERT INTO contract_status_history (id, contractId, previousStatus, newStatus, action, details, performedBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), CONTRACT_B_ID, 'signed', 'awaiting_signature', 'Reset de Status (Fase 3)',
    'Status resetado de signed para awaiting_signature. O status signed deve ser definido exclusivamente por ação manual explícita. Recebíveis financeiros preservados integralmente.',
    'Sistema - Migração Fase 3', now);

  // 6. Validação final
  console.log('\n=== VALIDAÇÃO PÓS-CORREÇÃO ===');
  const fixedA: any = db.prepare('SELECT id, number, proposalNumber, status, signedAt FROM contracts WHERE id = ?').get(CONTRACT_A_ID);
  const fixedB: any = db.prepare('SELECT id, number, proposalNumber, status, signedAt FROM contracts WHERE id = ?').get(CONTRACT_B_ID);

  console.log(`Contrato A: number=${fixedA.number}, proposal=${fixedA.proposalNumber}, status=${fixedA.status}, signedAt=${fixedA.signedAt || 'NULL'}`);
  console.log(`Contrato B: number=${fixedB.number}, proposal=${fixedB.proposalNumber}, status=${fixedB.status}, signedAt=${fixedB.signedAt || 'NULL'}`);

  // Validar numeração correta
  const expectedA = fixedA.proposalNumber?.replace('PROP-', 'CTR-');
  const expectedB = fixedB.proposalNumber?.replace('PROP-', 'CTR-');

  if (fixedA.number !== expectedA) {
    throw new Error(`FALHA NA VALIDAÇÃO: Contrato A number=${fixedA.number}, esperado=${expectedA}. ROLLBACK.`);
  }
  if (fixedB.number !== expectedB) {
    throw new Error(`FALHA NA VALIDAÇÃO: Contrato B number=${fixedB.number}, esperado=${expectedB}. ROLLBACK.`);
  }

  // Validar que recebíveis do contrato B estão intactos
  const recCheck: any[] = db.prepare('SELECT id, code, status, totalReceived, contractNumber FROM financial_receivables WHERE contractId = ?').all(CONTRACT_B_ID);
  for (const r of recCheck) {
    console.log(`  Recebível ${r.code}: status=${r.status}, recebido=R$ ${r.totalReceived}, contractNumber=${r.contractNumber}`);
    if (r.contractNumber !== 'CTR-2026-0001') {
      throw new Error(`FALHA: Recebível ${r.code} com contractNumber incorreto: ${r.contractNumber}. ROLLBACK.`);
    }
  }

  console.log('\n✅ CORREÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('  CTR-2026-0001 agora vinculado a PROP-2026-0001 ✅');
  console.log('  CTR-2026-0002 agora vinculado a PROP-2026-0002 ✅');
  console.log('  Recebíveis financeiros preservados ✅');
  console.log('  Status resetados para awaiting_signature ✅');
});

try {
  fixTransaction();
} catch (err: any) {
  console.error('\n❌ ERRO - TRANSAÇÃO REVERTIDA:', err.message);
  process.exit(1);
} finally {
  db.pragma('foreign_keys = ON');
  db.close();
}
