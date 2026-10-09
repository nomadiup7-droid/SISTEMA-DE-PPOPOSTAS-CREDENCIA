import { db } from '../database';

export interface DerivedContractNumber {
  number: string;
  sequenceNumber: number;
  year: number;
  prefix: string;
}

/**
 * Valida rigorosamente se o número da proposta segue o padrão oficial PROP-AAAA-NNNN.
 * Exemplo válido: PROP-2026-0001, PROP-2026-0045
 */
export function isValidProposalNumberForContract(proposalNumber?: string | null): boolean {
  if (!proposalNumber || typeof proposalNumber !== 'string') return false;
  return /^PROP-\d{4}-\d{4,}$/.test(proposalNumber.trim());
}

/**
 * Deriva o número oficial do contrato a partir da proposta vinculada.
 * Regra: PROP-AAAA-NNNN -> CTR-AAAA-NNNN (mesmo ano e final, mudando apenas o prefixo).
 * O contrato não utiliza sequência própria independente.
 */
export function deriveContractNumberFromProposal(proposal: {
  number?: string | null;
  year?: number;
  sequenceNumber?: number;
}): DerivedContractNumber {
  const rawNumber = (proposal?.number || '').trim();

  if (!isValidProposalNumberForContract(rawNumber)) {
    throw new Error('Não foi possível gerar o contrato porque o número da proposta é inválido.');
  }

  const parts = rawNumber.split('-');
  const yearFromNumber = parseInt(parts[1], 10);
  const seqFromNumber = parseInt(parts[2], 10);

  const contractNumber = rawNumber.replace(/^PROP-/, 'CTR-');

  if (!/^CTR-\d{4}-\d{4,}$/.test(contractNumber)) {
    throw new Error('Não foi possível gerar o contrato porque o número da proposta é inválido.');
  }

  return {
    number: contractNumber,
    sequenceNumber: !isNaN(seqFromNumber) ? seqFromNumber : (proposal.sequenceNumber || 1),
    year: !isNaN(yearFromNumber) ? yearFromNumber : (proposal.year || new Date().getFullYear()),
    prefix: 'CTR'
  };
}

/**
 * Verifica se um número de contrato já existe no banco de dados.
 */
export function contractNumberExists(number: string): boolean {
  const row = db.prepare('SELECT 1 FROM contracts WHERE number = ? AND isDeleted = 0').get(number);
  return !!row;
}
