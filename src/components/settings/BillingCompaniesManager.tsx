import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/Loading';
import { Modal } from '../ui/Modal';
import { BillingCompany } from '../../types';
import { api } from '../../services/api';
import { BillingCompanyFormModal } from './BillingCompanyFormModal';
import { BillingCompanyUsageModal } from './BillingCompanyUsageModal';
import {
  Building2,
  Plus,
  Star,
  StarOff,
  Eye,
  Edit,
  Trash2,
  Power,
  PowerOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Phone,
  Mail
} from 'lucide-react';

interface BillingCompaniesManagerProps {
  onAddToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export function BillingCompaniesManager({ onAddToast }: BillingCompaniesManagerProps) {
  const [companies, setCompanies] = useState<BillingCompany[]>([]);
  const [loading, setLoading] = useState(true);

  // Form modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<BillingCompany | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Usage modal
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [selectedForUsage, setSelectedForUsage] = useState<BillingCompany | null>(null);

  // Delete confirm modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState<BillingCompany | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await api.billingCompanies.list();
      setCompanies(data);
    } catch (err: any) {
      onAddToast('error', 'Erro ao listar empresas de faturamento: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleOpenNew = () => {
    setEditingCompany(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (company: BillingCompany) => {
    setEditingCompany(company);
    setFormModalOpen(true);
  };

  const handleSave = async (data: Partial<BillingCompany>) => {
    try {
      setIsSaving(true);
      if (editingCompany) {
        const updated = await api.billingCompanies.update(editingCompany.id, data);
        setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
        onAddToast('success', `Empresa "${updated.companyName}" atualizada com sucesso!`);
      } else {
        const created = await api.billingCompanies.create(data);
        setCompanies(prev => [...prev, created]);
        onAddToast('success', `Empresa "${created.companyName}" cadastrada com sucesso!`);
      }
      setFormModalOpen(false);
      setEditingCompany(null);
    } catch (err: any) {
      onAddToast('error', err.message || 'Erro ao salvar empresa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (company: BillingCompany) => {
    if (company.isDefault) return;
    try {
      const res = await api.billingCompanies.setDefault(company.id);
      setCompanies(prev => prev.map(c => ({
        ...c,
        isDefault: c.id === company.id
      })));
      onAddToast('success', `"${res.company.companyName}" definida como empresa padrão.`);
    } catch (err: any) {
      onAddToast('error', 'Erro ao definir padrão: ' + err.message);
    }
  };

  const handleToggleActive = async (company: BillingCompany) => {
    try {
      const res = await api.billingCompanies.toggleActive(company.id);
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, isActive: res.isActive } : c));
      onAddToast(
        res.isActive ? 'success' : 'info',
        `Empresa "${company.companyName}" ${res.isActive ? 'ativada' : 'desativada'} com sucesso.`
      );
    } catch (err: any) {
      onAddToast('error', 'Erro ao alterar status: ' + err.message);
    }
  };

  const handleOpenUsage = (company: BillingCompany) => {
    setSelectedForUsage(company);
    setUsageModalOpen(true);
  };

  const handleOpenDelete = (company: BillingCompany) => {
    setDeletingCompany(company);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCompany) return;
    try {
      setIsDeleting(true);
      await api.billingCompanies.delete(deletingCompany.id);
      setCompanies(prev => prev.filter(c => c.id !== deletingCompany.id));
      onAddToast('success', `Empresa "${deletingCompany.companyName}" excluída.`);
      setDeleteModalOpen(false);
      setDeletingCompany(null);
    } catch (err: any) {
      onAddToast('error', err.message || 'Erro ao excluir empresa');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Carregando empresas de faturamento..." />;
  }

  const formatCnpj = (cnpj: string) => {
    const d = cnpj.replace(/\D/g, '');
    if (d.length === 14) {
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
    }
    return cnpj;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 size={16} className="text-emerald-700" />
            Empresas de Faturamento
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Gerencie as empresas emissoras de propostas, contratos e recibos.
            Cada proposta deve ter uma empresa de faturamento selecionada.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus size={14} />}
          onClick={handleOpenNew}
        >
          Nova Empresa
        </Button>
      </div>

      {/* Info box */}
      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
        <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Numeração Global:</strong> A numeração de propostas e contratos é
          única e sequencial, independentemente da empresa emissora. Empresa A e B compartilham a
          mesma sequência <code className="font-mono bg-blue-100 px-1 rounded">PROP-2026-XXXX</code>.
        </div>
      </div>

      {/* Companies List */}
      {companies.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <Building2 size={32} className="mx-auto text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Nenhuma empresa de faturamento cadastrada.</p>
          <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={handleOpenNew}>
            Cadastrar Primeira Empresa
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map(company => (
            <div
              key={company.id}
              className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                company.isDefault
                  ? 'border-[#12e000]/40 bg-emerald-50/40 shadow-[0_0_0_2px_rgba(18,224,0,0.12)]'
                  : company.isActive
                    ? 'border-slate-200/80 bg-white hover:border-slate-300'
                    : 'border-slate-200/60 bg-slate-50/60 opacity-70'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Left: Company Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 font-extrabold text-base ${
                    company.isDefault
                      ? 'bg-[#12e000]/10 border-[#12e000]/30 text-[#073f12]'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    <Building2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="font-extrabold text-slate-900 text-sm truncate">
                        {company.companyName}
                      </span>
                      {company.tradeName && (
                        <span className="text-xs text-slate-500 font-medium truncate">
                          ({company.tradeName})
                        </span>
                      )}
                      {company.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#12e000]/20 text-[#073f12] border border-[#12e000]/40 flex items-center gap-1">
                          <Star size={10} className="fill-current" />
                          Padrão
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        company.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {company.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      <span className="font-mono font-bold text-slate-700">
                        {formatCnpj(company.cnpj)}
                      </span>
                      {(company.city || company.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {[company.city, company.state].filter(Boolean).join(' / ')}
                        </span>
                      )}
                      {company.phone && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} />
                          {company.phone}
                        </span>
                      )}
                      {company.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={10} />
                          {company.email}
                        </span>
                      )}
                    </div>

                    {/* Usage counts */}
                    {company.usage && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                        <span className="bg-slate-100 rounded-lg px-2 py-0.5 font-medium">
                          {company.usage.proposalsCount} proposta{company.usage.proposalsCount !== 1 ? 's' : ''}
                        </span>
                        <span className="bg-slate-100 rounded-lg px-2 py-0.5 font-medium">
                          {company.usage.contractsCount} contrato{company.usage.contractsCount !== 1 ? 's' : ''}
                        </span>
                        <span className="bg-slate-100 rounded-lg px-2 py-0.5 font-medium">
                          {company.usage.receivablesCount} lançamento{company.usage.receivablesCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {/* Ver Vínculos */}
                  <button
                    type="button"
                    onClick={() => handleOpenUsage(company)}
                    title="Ver propostas, contratos e lançamentos vinculados"
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <Eye size={15} />
                  </button>

                  {/* Editar */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(company)}
                    title="Editar dados da empresa"
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  >
                    <Edit size={15} />
                  </button>

                  {/* Definir como Padrão */}
                  {!company.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(company)}
                      title="Definir como empresa padrão para novas propostas"
                      className="p-2 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                    >
                      <Star size={15} />
                    </button>
                  )}

                  {/* Ativar / Desativar */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(company)}
                    title={company.isActive ? 'Desativar empresa' : 'Ativar empresa'}
                    className={`p-2 rounded-lg transition-colors ${
                      company.isActive
                        ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                        : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    {company.isActive ? <PowerOff size={15} /> : <Power size={15} />}
                  </button>

                  {/* Excluir (apenas se não for padrão) */}
                  {!company.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(company)}
                      title="Excluir empresa (bloqueado se houver vínculos)"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <BillingCompanyFormModal
        isOpen={formModalOpen}
        onClose={() => { setFormModalOpen(false); setEditingCompany(null); }}
        onSave={handleSave}
        company={editingCompany}
        isSaving={isSaving}
      />

      {/* Usage Modal */}
      <BillingCompanyUsageModal
        isOpen={usageModalOpen}
        onClose={() => { setUsageModalOpen(false); setSelectedForUsage(null); }}
        company={selectedForUsage}
      />

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setDeletingCompany(null); }}
        title="Excluir Empresa de Faturamento"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
            <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
            <div>
              Esta ação é <strong className="font-bold">permanente e irreversível</strong>. Se a empresa
              possuir propostas, contratos ou lançamentos vinculados, a exclusão será <strong>bloqueada
              automaticamente</strong> pelo sistema.
            </div>
          </div>
          <p className="text-sm text-slate-700 font-medium">
            Confirmar exclusão da empresa{' '}
            <strong className="text-slate-900">"{deletingCompany?.companyName}"</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setDeleteModalOpen(false); setDeletingCompany(null); }}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 size={14} />}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
