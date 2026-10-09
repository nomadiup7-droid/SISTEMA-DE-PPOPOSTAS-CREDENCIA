/**
 * Utilitário oficial de nomenclatura e validação para propostas comerciais
 * Padrão do sistema Credencia Proposta: Proposta_NUMERO_DA_PROPOSTA_NOME_DO_CLIENTE.pdf
 */

export const CLIENT_REQUIRED_MESSAGE = 'Selecione ou cadastre um cliente antes de finalizar esta proposta.';

const FORBIDDEN_NAMES = new Set([
  'undefined',
  'null',
  'cliente',
  'sem-nome',
  'sem_nome',
  'proposta',
  'proposta.pdf',
  'download'
]);

/**
 * Sanitiza o nome do cliente e gera o nome oficial do arquivo PDF da proposta.
 * Exemplo 1:
 *  Cliente: "Empresa Brasileira de Eventos Ltda."
 *  Proposta: "PROP-2026-0042"
 *  -> "Proposta_PROP-2026-0042_Empresa-Brasileira-de-Eventos-Ltda.pdf"
 *
 * Exemplo 2:
 *  Cliente: "João & Silva Produções"
 *  Proposta: "PROP-2026-0043"
 *  -> "Proposta_PROP-2026-0043_Joao-e-Silva-Producoes.pdf"
 */
export function formatProposalPdfFileName(proposalNumber: string, rawClientName?: string | null): string {
  // Limpa o número da proposta mantendo apenas alfanuméricos e hífens
  const cleanNumber = (proposalNumber || 'PROPOSTA')
    .trim()
    .replace(/[^a-zA-Z0-9-]/g, '-');

  let clientStr = (rawClientName || '').trim();

  // Substitui & por " e " antes da sanitização
  clientStr = clientStr.replace(/&/g, ' e ');

  // Remove acentos e caracteres diacríticos
  clientStr = clientStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Substitui espaços, pontuações, barras e caracteres inválidos por hífen
  clientStr = clientStr.replace(/[^a-zA-Z0-9-]/g, '-');

  // Colapsa hífens repetidos
  clientStr = clientStr.replace(/-+/g, '-');

  // Remove hífens no início e no final
  clientStr = clientStr.replace(/^-+|-+$/g, '');

  // Limita o tamanho do nome do cliente para evitar caminhos excessivamente longos (máx 60 caracteres)
  if (clientStr.length > 60) {
    clientStr = clientStr.substring(0, 60).replace(/-+$/, '');
  }

  // Verifica se o nome resultante é inválido ou proibido
  const lowerCheck = clientStr.toLowerCase();
  if (!clientStr || FORBIDDEN_NAMES.has(lowerCheck)) {
    clientStr = 'Cliente-Nao-Informado';
  }

  return `Proposta_${cleanNumber}_${clientStr}.pdf`;
}

/**
 * Valida se a proposta possui um cliente vinculado válido
 */
export function hasValidClient(proposal: {
  clientId?: string | null;
  clientSnapshot?: any;
} | null | undefined): boolean {
  if (!proposal) return false;
  if (!proposal.clientId || typeof proposal.clientId !== 'string' || proposal.clientId.trim() === '') {
    return false;
  }

  const cleanClientId = proposal.clientId.trim().toLowerCase();
  if (FORBIDDEN_NAMES.has(cleanClientId)) {
    return false;
  }

  if (proposal.clientSnapshot) {
    const snapshot = typeof proposal.clientSnapshot === 'string'
      ? (() => {
          try {
            return JSON.parse(proposal.clientSnapshot);
          } catch {
            return null;
          }
        })()
      : proposal.clientSnapshot;

    if (snapshot) {
      const name = snapshot.name || snapshot.tradeName;
      if (name && typeof name === 'string') {
        const cleanName = name.trim().toLowerCase();
        if (FORBIDDEN_NAMES.has(cleanName)) {
          return false;
        }
      }
    }
  }

  return true;
}
