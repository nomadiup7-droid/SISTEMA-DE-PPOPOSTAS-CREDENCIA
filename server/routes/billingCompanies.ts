import { Router } from 'express';
import { db } from '../database';
import { randomUUID } from 'crypto';

const router = Router();

// Utility to normalize and format CNPJ
export function formatCnpj(doc: string): string {
  const digits = (doc || '').replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return (doc || '').trim();
}

export function cleanDigits(doc: string): string {
  return (doc || '').replace(/\D/g, '');
}

// GET /api/billing-companies - List all or active billing companies
router.get('/', (req, res) => {
  try {
    const { activeOnly } = req.query;
    let query = 'SELECT * FROM billing_companies';
    const params: any[] = [];

    if (activeOnly === 'true' || activeOnly === '1') {
      query += ' WHERE isActive = 1';
    }

    query += ' ORDER BY isDefault DESC, companyName ASC';
    const rows: any[] = db.prepare(query).all(...params);

    // Attach counts of related proposals, contracts, receivables
    const companies = rows.map((c) => {
      const propCount = (db.prepare('SELECT COUNT(*) as count FROM proposals WHERE billingCompanyId = ? AND isDeleted = 0').get(c.id) as any)?.count || 0;
      const ctrCount = (db.prepare('SELECT COUNT(*) as count FROM contracts WHERE billingCompanyId = ? AND isDeleted = 0').get(c.id) as any)?.count || 0;
      const recCount = (db.prepare('SELECT COUNT(*) as count FROM financial_receivables WHERE billingCompanyId = ? AND isDeleted = 0').get(c.id) as any)?.count || 0;

      return {
        ...c,
        isActive: Boolean(c.isActive),
        isDefault: Boolean(c.isDefault),
        usage: {
          proposalsCount: propCount,
          contractsCount: ctrCount,
          receivablesCount: recCount,
          totalUsage: propCount + ctrCount + recCount
        }
      };
    });

    res.json(companies);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar empresas de faturamento: ' + err.message });
  }
});

// GET /api/billing-companies/:id - Get billing company by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const row: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ error: 'Empresa de faturamento não encontrada.' });
    }

    const propCount = (db.prepare('SELECT COUNT(*) as count FROM proposals WHERE billingCompanyId = ? AND isDeleted = 0').get(id) as any)?.count || 0;
    const ctrCount = (db.prepare('SELECT COUNT(*) as count FROM contracts WHERE billingCompanyId = ? AND isDeleted = 0').get(id) as any)?.count || 0;
    const recCount = (db.prepare('SELECT COUNT(*) as count FROM financial_receivables WHERE billingCompanyId = ? AND isDeleted = 0').get(id) as any)?.count || 0;

    res.json({
      ...row,
      isActive: Boolean(row.isActive),
      isDefault: Boolean(row.isDefault),
      usage: {
        proposalsCount: propCount,
        contractsCount: ctrCount,
        receivablesCount: recCount,
        totalUsage: propCount + ctrCount + recCount
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar empresa de faturamento: ' + err.message });
  }
});

// GET /api/billing-companies/:id/usage - Get detailed list of records using this company
router.get('/:id/usage', (req, res) => {
  try {
    const { id } = req.params;
    const company: any = db.prepare('SELECT id, companyName, tradeName, cnpj FROM billing_companies WHERE id = ?').get(id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa de faturamento não encontrada.' });
    }

    const proposals = db.prepare(`
      SELECT id, number, eventName, status, finalAmount, issueDate
      FROM proposals
      WHERE billingCompanyId = ? AND isDeleted = 0
      ORDER BY year DESC, sequenceNumber DESC
      LIMIT 50
    `).all(id);

    const contracts = db.prepare(`
      SELECT id, number, proposalNumber, title, status, createdAt
      FROM contracts
      WHERE billingCompanyId = ? AND isDeleted = 0
      ORDER BY year DESC, sequenceNumber DESC
      LIMIT 50
    `).all(id);

    const receivables = db.prepare(`
      SELECT id, code, eventName, finalAmount, status, firstDueDate
      FROM financial_receivables
      WHERE billingCompanyId = ? AND isDeleted = 0
      ORDER BY year DESC, sequenceNumber DESC
      LIMIT 50
    `).all(id);

    res.json({
      company,
      proposals,
      contracts,
      receivables,
      totals: {
        proposals: proposals.length,
        contracts: contracts.length,
        receivables: receivables.length
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao buscar uso da empresa: ' + err.message });
  }
});

// POST /api/billing-companies - Create new billing company
router.post('/', (req, res) => {
  try {
    const {
      companyName,
      tradeName,
      cnpj,
      stateRegistration,
      municipalRegistration,
      phone,
      email,
      zipCode,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      legalRepresentative,
      legalRepresentativeCpf,
      legalRepresentativeRole,
      logoUrl,
      pixKey,
      bankName,
      agency,
      accountNumber,
      billingNotes,
      isActive = true,
      isDefault = false
    } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'A Razão Social da empresa é obrigatória.' });
    }
    if (!cnpj || !cnpj.trim()) {
      return res.status(400).json({ error: 'O CNPJ da empresa é obrigatório.' });
    }

    const rawCnpj = cleanDigits(cnpj);
    if (rawCnpj.length !== 14) {
      return res.status(400).json({ error: 'CNPJ inválido. Um CNPJ completo deve conter 14 dígitos.' });
    }

    const formattedCnpj = formatCnpj(cnpj);

    // Validate CNPJ uniqueness (by normalized digits)
    const existingCnpj: any = db.prepare(`
      SELECT id, companyName FROM billing_companies
      WHERE replace(replace(replace(replace(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
    `).get(rawCnpj);

    if (existingCnpj) {
      return res.status(409).json({
        error: `Já existe uma empresa cadastrada com este CNPJ (${formattedCnpj}): "${existingCnpj.companyName}".`
      });
    }

    // Check if this will be default or if there are no existing companies
    const totalCount = (db.prepare('SELECT COUNT(*) as count FROM billing_companies').get() as any)?.count || 0;
    const shouldBeDefault = Boolean(isDefault) || totalCount === 0;

    // Rule: default company MUST be active
    const effectiveActive = shouldBeDefault ? 1 : (isActive ? 1 : 0);

    const now = new Date().toISOString();
    const newId = randomUUID();

    const insertTx = db.transaction(() => {
      // If setting as default, unset previous default
      if (shouldBeDefault) {
        db.prepare('UPDATE billing_companies SET isDefault = 0, updatedAt = ? WHERE isDefault = 1').run(now);
      }

      db.prepare(`
        INSERT INTO billing_companies (
          id, companyName, tradeName, cnpj, stateRegistration, municipalRegistration,
          phone, email, zipCode, address, number, complement, neighborhood, city, state,
          legalRepresentative, legalRepresentativeCpf, legalRepresentativeRole,
          logoUrl, pixKey, bankName, agency, accountNumber, billingNotes,
          isActive, isDefault, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `).run(
        newId,
        companyName.trim(),
        (tradeName || companyName).trim(),
        formattedCnpj,
        (stateRegistration || '').trim() || null,
        (municipalRegistration || '').trim() || null,
        (phone || '').trim() || null,
        (email || '').trim() || null,
        (zipCode || '').trim() || null,
        (address || '').trim() || null,
        (number || '').trim() || null,
        (complement || '').trim() || null,
        (neighborhood || '').trim() || null,
        (city || '').trim() || null,
        (state || '').trim() || null,
        (legalRepresentative || '').trim() || null,
        (legalRepresentativeCpf || '').trim() || null,
        (legalRepresentativeRole || '').trim() || null,
        logoUrl || null,
        (pixKey || '').trim() || null,
        (bankName || '').trim() || null,
        (agency || '').trim() || null,
        (accountNumber || '').trim() || null,
        (billingNotes || '').trim() || null,
        effectiveActive,
        shouldBeDefault ? 1 : 0,
        now,
        now
      );
    });

    insertTx();

    const created: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(newId);
    res.status(201).json({
      ...created,
      isActive: Boolean(created.isActive),
      isDefault: Boolean(created.isDefault)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao cadastrar empresa de faturamento: ' + err.message });
  }
});

// PUT /api/billing-companies/:id - Update billing company
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Empresa de faturamento não encontrada.' });
    }

    const {
      companyName,
      tradeName,
      cnpj,
      stateRegistration,
      municipalRegistration,
      phone,
      email,
      zipCode,
      address,
      number,
      complement,
      neighborhood,
      city,
      state,
      legalRepresentative,
      legalRepresentativeCpf,
      legalRepresentativeRole,
      logoUrl,
      pixKey,
      bankName,
      agency,
      accountNumber,
      billingNotes,
      isActive,
      isDefault
    } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'A Razão Social da empresa é obrigatória.' });
    }
    if (!cnpj || !cnpj.trim()) {
      return res.status(400).json({ error: 'O CNPJ da empresa é obrigatório.' });
    }

    const rawCnpj = cleanDigits(cnpj);
    if (rawCnpj.length !== 14) {
      return res.status(400).json({ error: 'CNPJ inválido. Um CNPJ completo deve conter 14 dígitos.' });
    }

    const formattedCnpj = formatCnpj(cnpj);

    // Validate uniqueness against OTHER companies
    const duplicate: any = db.prepare(`
      SELECT id, companyName FROM billing_companies
      WHERE replace(replace(replace(replace(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
        AND id != ?
    `).get(rawCnpj, id);

    if (duplicate) {
      return res.status(409).json({
        error: `O CNPJ ${formattedCnpj} já está sendo utilizado pela empresa "${duplicate.companyName}".`
      });
    }

    const isCurrentlyDefault = Boolean(existing.isDefault);
    const requestedDefault = isDefault !== undefined ? Boolean(isDefault) : isCurrentlyDefault;
    let requestedActive = isActive !== undefined ? (isActive ? 1 : 0) : existing.isActive;

    // Rule: Cannot deactivate default company without setting another
    if (isCurrentlyDefault && requestedActive === 0) {
      return res.status(400).json({
        error: 'Não é permitido desativar a empresa padrão. Defina outra empresa ativa como padrão antes de desativar esta.'
      });
    }

    // Rule: Default company must be active
    if (requestedDefault && requestedActive === 0) {
      return res.status(400).json({
        error: 'A empresa padrão não pode ser inativa. Ative a empresa antes de defini-la como padrão.'
      });
    }

    // Rule: If currently default and user tries to unset isDefault to false, check if there's another default
    if (isCurrentlyDefault && !requestedDefault) {
      return res.status(400).json({
        error: 'Deve haver sempre uma empresa padrão definida. Para alterar a empresa padrão, defina outra como padrão diretamente.'
      });
    }

    const now = new Date().toISOString();

    const updateTx = db.transaction(() => {
      // If setting as default, remove default flag from others
      if (requestedDefault && !isCurrentlyDefault) {
        db.prepare('UPDATE billing_companies SET isDefault = 0, updatedAt = ? WHERE isDefault = 1').run(now);
      }

      db.prepare(`
        UPDATE billing_companies SET
          companyName = ?, tradeName = ?, cnpj = ?,
          stateRegistration = ?, municipalRegistration = ?,
          phone = ?, email = ?, zipCode = ?,
          address = ?, number = ?, complement = ?, neighborhood = ?,
          city = ?, state = ?,
          legalRepresentative = ?, legalRepresentativeCpf = ?, legalRepresentativeRole = ?,
          logoUrl = ?, pixKey = ?, bankName = ?, agency = ?, accountNumber = ?,
          billingNotes = ?, isActive = ?, isDefault = ?, updatedAt = ?
        WHERE id = ?
      `).run(
        companyName.trim(),
        (tradeName || companyName).trim(),
        formattedCnpj,
        (stateRegistration || '').trim() || null,
        (municipalRegistration || '').trim() || null,
        (phone || '').trim() || null,
        (email || '').trim() || null,
        (zipCode || '').trim() || null,
        (address || '').trim() || null,
        (number || '').trim() || null,
        (complement || '').trim() || null,
        (neighborhood || '').trim() || null,
        (city || '').trim() || null,
        (state || '').trim() || null,
        (legalRepresentative || '').trim() || null,
        (legalRepresentativeCpf || '').trim() || null,
        (legalRepresentativeRole || '').trim() || null,
        logoUrl !== undefined ? logoUrl : existing.logoUrl,
        (pixKey || '').trim() || null,
        (bankName || '').trim() || null,
        (agency || '').trim() || null,
        (accountNumber || '').trim() || null,
        (billingNotes || '').trim() || null,
        requestedActive,
        requestedDefault ? 1 : 0,
        now,
        id
      );
    });

    updateTx();

    const updated: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(id);
    res.json({
      ...updated,
      isActive: Boolean(updated.isActive),
      isDefault: Boolean(updated.isDefault)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar empresa de faturamento: ' + err.message });
  }
});

// PATCH /api/billing-companies/:id/set-default - Set company as the single active default
router.patch('/:id/set-default', (req, res) => {
  try {
    const { id } = req.params;
    const company: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa de faturamento não encontrada.' });
    }

    if (!company.isActive) {
      return res.status(400).json({
        error: 'A empresa precisa estar ativa para ser definida como empresa padrão.'
      });
    }

    const now = new Date().toISOString();

    const setTx = db.transaction(() => {
      db.prepare('UPDATE billing_companies SET isDefault = 0, updatedAt = ? WHERE isDefault = 1').run(now);
      db.prepare('UPDATE billing_companies SET isDefault = 1, updatedAt = ? WHERE id = ?').run(now, id);
    });

    setTx();

    const updated: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(id);
    res.json({
      message: `Empresa "${updated.companyName}" definida como padrão com sucesso.`,
      company: {
        ...updated,
        isActive: Boolean(updated.isActive),
        isDefault: Boolean(updated.isDefault)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao definir empresa padrão: ' + err.message });
  }
});

// PATCH /api/billing-companies/:id/toggle-active - Toggle active status
router.patch('/:id/toggle-active', (req, res) => {
  try {
    const { id } = req.params;
    const company: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa de faturamento não encontrada.' });
    }

    const newActive = company.isActive ? 0 : 1;

    // Rule: Cannot deactivate the default company
    if (company.isDefault && newActive === 0) {
      return res.status(400).json({
        error: 'Não é permitido desativar a empresa padrão do sistema. Defina outra empresa como padrão antes de desativar esta.'
      });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE billing_companies SET isActive = ?, updatedAt = ? WHERE id = ?').run(newActive, now, id);

    const updated: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(id);
    res.json({
      message: `Empresa "${updated.companyName}" ${newActive ? 'ativada' : 'desativada'} com sucesso.`,
      company: {
        ...updated,
        isActive: Boolean(updated.isActive),
        isDefault: Boolean(updated.isDefault)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao alterar status da empresa: ' + err.message });
  }
});

// DELETE /api/billing-companies/:id - Delete company if NOT used
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const company: any = db.prepare('SELECT * FROM billing_companies WHERE id = ?').get(id);
    if (!company) {
      return res.status(404).json({ error: 'Empresa de faturamento não encontrada.' });
    }

    // Rule: Cannot delete default company
    if (company.isDefault) {
      return res.status(400).json({
        error: 'Não é permitido excluir a empresa padrão do sistema. Defina outra empresa como padrão antes.'
      });
    }

    // Rule: Check usage in proposals, contracts, receivables
    const propCount = (db.prepare('SELECT COUNT(*) as count FROM proposals WHERE billingCompanyId = ? AND isDeleted = 0').get(id) as any)?.count || 0;
    const ctrCount = (db.prepare('SELECT COUNT(*) as count FROM contracts WHERE billingCompanyId = ? AND isDeleted = 0').get(id) as any)?.count || 0;
    const recCount = (db.prepare('SELECT COUNT(*) as count FROM financial_receivables WHERE billingCompanyId = ? AND isDeleted = 0').get(id) as any)?.count || 0;

    const totalUsage = propCount + ctrCount + recCount;
    if (totalUsage > 0) {
      return res.status(400).json({
        error: `Não é possível excluir a empresa "${company.companyName}" pois ela está vinculada a ${propCount} proposta(s), ${ctrCount} contrato(s) e ${recCount} lançamento(s) financeiro(s). Para preservar o histórico, você pode desativá-la.`
      });
    }

    db.prepare('DELETE FROM billing_companies WHERE id = ?').run(id);

    res.json({ message: `Empresa "${company.companyName}" excluída com sucesso.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir empresa de faturamento: ' + err.message });
  }
});

export default router;
