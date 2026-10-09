import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingState } from '../ui/Loading';
import { BillingCompany } from '../../types';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Building2,
  FileText,
  FileSignature,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface BillingCompanyUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: BillingCompany | null;
}

export function BillingCompanyUsageModal({
  isOpen,
  onClose,
  company
}: BillingCompanyUsageModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'proposals' | 'contracts' | 'receivables'>('proposals');
  const [usageData, setUsageData] = useState<{
    proposals: any[];
    contracts: any[];
    receivables: any[];
    totals: {
      proposalsCount: number;
      contractsCount: number;
      receivablesCount: number;
      total: number;
    };
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !company) {
      setUsageData(null);
      return;
    }

    const fetchUsage = async () => {
      try {
        setLoading(true);
        const data = await api.billingCompanies.getUsage(company.id);
        setUsageData(data);
      } catch (err) {
        console.error('Erro ao buscar uso da empresa:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [isOpen, company]);

  if (!company) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vínculos da Empresa: ${company.tradeName || company.companyName}`}
      subtitle={`CNPJ: ${company.cnpj} — Histórico de emissões e lançamentos`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Company Header Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#12e000] flex items-center justify-center font-bold text-lg border border-emerald-200">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">
                  {company.companyName}
                </span>
                {company.isDefault && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#12e000]/20 text-[#073f12] border border-[#12e000]/40">
                    Padrão
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    company.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {company.isActive ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {[company.tradeName, company.cnpj, [company.city, company.state].filter(Boolean).join('/')]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold text-slate-700">
              Total de Vínculos:{' '}
              <strong className="text-emerald-700 font-bold">
                {usageData?.totals.total ?? company.usage?.totalUsage ?? 0}
              </strong>
            </span>
          </div>
        </div>

        {/* Tab Selectors */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('proposals')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'proposals'
                ? 'bg-[#073f12] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText size={14} />
            Propostas ({usageData?.totals.proposalsCount ?? company.usage?.proposalsCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contracts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'contracts'
                ? 'bg-[#073f12] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileSignature size={14} />
            Contratos ({usageData?.totals.contractsCount ?? company.usage?.contractsCount ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receivables')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              activeTab === 'receivables'
                ? 'bg-[#073f12] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <DollarSign size={14} />
            Contas a Receber ({usageData?.totals.receivablesCount ?? company.usage?.receivablesCount ?? 0})
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <LoadingState label="Carregando registros vinculados..." />
        ) : (
          <div>
            {activeTab === 'proposals' && (
              <div>
                {(!usageData?.proposals || usageData.proposals.length === 0) ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhuma proposta comercial vinculada a esta empresa até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5">Número</th>
                          <th className="px-3 py-2.5">Cliente</th>
                          <th className="px-3 py-2.5">Evento</th>
                          <th className="px-3 py-2.5">Valor</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {usageData.proposals.map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{p.number}</td>
                            <td className="px-3 py-2 max-w-[150px] truncate">{p.clientName || '-'}</td>
                            <td className="px-3 py-2 max-w-[150px] truncate">{p.eventName || '-'}</td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{formatCurrency(p.finalAmount)}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {p.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{formatDate(p.issueDate || p.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'contracts' && (
              <div>
                {(!usageData?.contracts || usageData.contracts.length === 0) ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhum contrato oficial vinculado a esta empresa até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5">Contrato</th>
                          <th className="px-3 py-2.5">Proposta</th>
                          <th className="px-3 py-2.5">Versão</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Criado em</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {usageData.contracts.map((c: any) => (
                          <tr key={c.id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{c.number}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">{c.proposalNumber}</td>
                            <td className="px-3 py-2">v{c.currentVersion || 1}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {c.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{formatDate(c.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'receivables' && (
              <div>
                {(!usageData?.receivables || usageData.receivables.length === 0) ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhum lançamento financeiro vinculado a esta empresa até o momento.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5">Código</th>
                          <th className="px-3 py-2.5">Evento</th>
                          <th className="px-3 py-2.5">Valor Total</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Criado em</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {usageData.receivables.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-50/70">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{r.code}</td>
                            <td className="px-3 py-2 max-w-[150px] truncate">{r.eventName || '-'}</td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{formatCurrency(r.finalAmount)}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {r.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{formatDate(r.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Protection Alert */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Regra de integridade histórica:</strong> Empresas com registros vinculados não podem ser excluídas fisicamente do banco de dados para evitar inconsistência fiscal e contratual. Caso não deseje mais utilizá-la em novas propostas, utilize a opção <strong>Desativar</strong>.
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
