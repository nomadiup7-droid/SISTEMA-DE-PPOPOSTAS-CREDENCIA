import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field, inputClassName, selectClassName, textareaClassName } from '../ui/Form';
import { BillingCompany } from '../../types';
import { Building2, Save, AlertCircle } from 'lucide-react';

interface BillingCompanyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<BillingCompany>) => Promise<void>;
  company?: BillingCompany | null;
  isSaving?: boolean;
}

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function BillingCompanyFormModal({
  isOpen,
  onClose,
  onSave,
  company,
  isSaving = false
}: BillingCompanyFormModalProps) {
  const isEditing = !!company;

  // Main fields
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [stateRegistration, setStateRegistration] = useState('');
  const [municipalRegistration, setMunicipalRegistration] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [responsibleName, setResponsibleName] = useState('');

  // Address
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Banking
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('');
  const [bank, setBank] = useState('');
  const [agency, setAgency] = useState('');
  const [account, setAccount] = useState('');
  const [accountType, setAccountType] = useState('');
  const [billingNotes, setBillingNotes] = useState('');

  const [activeSection, setActiveSection] = useState<'dados' | 'endereco' | 'financeiro'>('dados');

  useEffect(() => {
    if (!isOpen) return;
    if (company) {
      setCompanyName(company.companyName || '');
      setTradeName(company.tradeName || '');
      setCnpj(company.cnpj || '');
      setStateRegistration(company.stateRegistration || '');
      setMunicipalRegistration(company.municipalRegistration || '');
      setPhone(company.phone || '');
      setEmail(company.email || '');
      setResponsibleName(company.responsibleName || '');
      setZipCode(company.zipCode || '');
      setStreet(company.street || '');
      setAddressNumber(company.number || '');
      setComplement(company.complement || '');
      setNeighborhood(company.neighborhood || '');
      setCity(company.city || '');
      setState(company.state || '');
      setPixKey(company.pixKey || '');
      setPixKeyType(company.pixKeyType || '');
      setBank(company.bank || '');
      setAgency(company.agency || '');
      setAccount(company.account || '');
      setAccountType(company.accountType || '');
      setBillingNotes(company.billingNotes || '');
    } else {
      setCompanyName('');
      setTradeName('');
      setCnpj('');
      setStateRegistration('');
      setMunicipalRegistration('');
      setPhone('');
      setEmail('');
      setResponsibleName('');
      setZipCode('');
      setStreet('');
      setAddressNumber('');
      setComplement('');
      setNeighborhood('');
      setCity('');
      setState('');
      setPixKey('');
      setPixKeyType('');
      setBank('');
      setAgency('');
      setAccount('');
      setAccountType('');
      setBillingNotes('');
      setActiveSection('dados');
    }
  }, [isOpen, company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cnpjDigits = cnpj.replace(/\D/g, '');
    if (cnpjDigits.length !== 14) {
      alert('CNPJ inválido. Informe os 14 dígitos completos.');
      return;
    }
    await onSave({
      companyName: companyName.trim(),
      tradeName: tradeName.trim() || undefined,
      cnpj: cnpjDigits,
      stateRegistration: stateRegistration.trim() || undefined,
      municipalRegistration: municipalRegistration.trim() || undefined,
      phone: phone.replace(/\D/g, ''),
      email: email.trim(),
      responsibleName: responsibleName.trim() || undefined,
      zipCode: zipCode.replace(/\D/g, '') || undefined,
      street: street.trim() || undefined,
      number: addressNumber.trim() || undefined,
      complement: complement.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      pixKey: pixKey.trim() || undefined,
      pixKeyType: pixKeyType || undefined,
      bank: bank.trim() || undefined,
      agency: agency.trim() || undefined,
      account: account.trim() || undefined,
      accountType: accountType || undefined,
      billingNotes: billingNotes.trim() || undefined
    });
  };

  const sectionBtn = (key: typeof activeSection, label: string) => (
    <button
      type="button"
      onClick={() => setActiveSection(key)}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
        activeSection === key
          ? 'bg-[#073f12] text-white shadow-xs'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Empresa de Faturamento' : 'Nova Empresa de Faturamento'}
      subtitle={
        isEditing
          ? `Editando: ${company?.companyName || ''}`
          : 'Cadastre uma nova empresa emissora de propostas, contratos e recibos'
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          {sectionBtn('dados', '① Dados Principais')}
          {sectionBtn('endereco', '② Endereço')}
          {sectionBtn('financeiro', '③ Financeiro & PIX')}
        </div>

        {/* === SEÇÃO DADOS === */}
        {activeSection === 'dados' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Razão Social" required>
                <input
                  type="text"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className={inputClassName}
                  placeholder="Nome empresarial completo"
                  required
                />
              </Field>
              <Field label="Nome Fantasia / Marca">
                <input
                  type="text"
                  value={tradeName}
                  onChange={e => setTradeName(e.target.value)}
                  className={inputClassName}
                  placeholder="Opcional — aparece em documentos"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="CNPJ" required>
                <input
                  type="text"
                  value={cnpj}
                  onChange={e => setCnpj(maskCnpj(e.target.value))}
                  className={inputClassName}
                  placeholder="00.000.000/0001-00"
                  required
                />
              </Field>
              <Field label="Inscrição Estadual">
                <input
                  type="text"
                  value={stateRegistration}
                  onChange={e => setStateRegistration(e.target.value)}
                  className={inputClassName}
                  placeholder="Isento ou nº IE"
                />
              </Field>
              <Field label="Inscrição Municipal">
                <input
                  type="text"
                  value={municipalRegistration}
                  onChange={e => setMunicipalRegistration(e.target.value)}
                  className={inputClassName}
                  placeholder="Nº IM (opcional)"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Telefone Comercial" required>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(maskPhone(e.target.value))}
                  className={inputClassName}
                  placeholder="(11) 99999-9999"
                  required
                />
              </Field>
              <Field label="E-mail de Contato" required>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClassName}
                  placeholder="contato@empresa.com.br"
                  required
                />
              </Field>
              <Field label="Responsável / Representante">
                <input
                  type="text"
                  value={responsibleName}
                  onChange={e => setResponsibleName(e.target.value)}
                  className={inputClassName}
                  placeholder="Nome do sócio ou diretor"
                />
              </Field>
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <span>
                O <strong>CNPJ</strong> é a chave única da empresa. Não é possível cadastrar duas empresas com o mesmo CNPJ.
                Os dados desta empresa serão incorporados aos snapshots de propostas, contratos e recibos emitidos com ela.
              </span>
            </div>
          </div>
        )}

        {/* === SEÇÃO ENDEREÇO === */}
        {activeSection === 'endereco' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="CEP">
                <input
                  type="text"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9))}
                  className={inputClassName}
                  placeholder="00000-000"
                />
              </Field>
              <Field label="Logradouro / Rua" className="sm:col-span-2">
                <input
                  type="text"
                  value={street}
                  onChange={e => setStreet(e.target.value)}
                  className={inputClassName}
                  placeholder="Rua, Av., Praça..."
                />
              </Field>
              <Field label="Número">
                <input
                  type="text"
                  value={addressNumber}
                  onChange={e => setAddressNumber(e.target.value)}
                  className={inputClassName}
                  placeholder="123 ou S/N"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Complemento">
                <input
                  type="text"
                  value={complement}
                  onChange={e => setComplement(e.target.value)}
                  className={inputClassName}
                  placeholder="Sala, Andar, Bloco..."
                />
              </Field>
              <Field label="Bairro">
                <input
                  type="text"
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  className={inputClassName}
                  placeholder="Bairro"
                />
              </Field>
              <Field label="Cidade">
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className={inputClassName}
                  placeholder="Cidade"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="UF">
                <select
                  value={state}
                  onChange={e => setState(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">— UF —</option>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* === SEÇÃO FINANCEIRO === */}
        {activeSection === 'financeiro' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Chave PIX">
                <input
                  type="text"
                  value={pixKey}
                  onChange={e => setPixKey(e.target.value)}
                  className={inputClassName}
                  placeholder="CNPJ, e-mail, celular ou chave aleatória"
                />
              </Field>
              <Field label="Tipo da Chave PIX">
                <select
                  value={pixKeyType}
                  onChange={e => setPixKeyType(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">— Selecione o tipo —</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="CPF">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Celular</option>
                  <option value="random">Chave Aleatória</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Banco">
                <input
                  type="text"
                  value={bank}
                  onChange={e => setBank(e.target.value)}
                  className={inputClassName}
                  placeholder="Nome do banco"
                />
              </Field>
              <Field label="Agência">
                <input
                  type="text"
                  value={agency}
                  onChange={e => setAgency(e.target.value)}
                  className={inputClassName}
                  placeholder="0000"
                />
              </Field>
              <Field label="Conta">
                <input
                  type="text"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  className={inputClassName}
                  placeholder="00000-0"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tipo de Conta">
                <select
                  value={accountType}
                  onChange={e => setAccountType(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">— Selecione —</option>
                  <option value="Conta Corrente">Conta Corrente</option>
                  <option value="Conta Poupança">Conta Poupança</option>
                  <option value="Conta de Pagamento">Conta de Pagamento</option>
                </select>
              </Field>
            </div>

            <Field label="Observações de Faturamento" hint="Instruções de pagamento, dados adicionais para notas, etc.">
              <textarea
                value={billingNotes}
                onChange={e => setBillingNotes(e.target.value)}
                rows={3}
                className={textareaClassName}
                placeholder="Ex: Pagamentos devem ser realizados apenas via PIX CNPJ para a conta indicada..."
              />
            </Field>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            {activeSection !== 'dados' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveSection(activeSection === 'financeiro' ? 'endereco' : 'dados')}
              >
                ← Anterior
              </Button>
            )}
            {activeSection !== 'financeiro' ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setActiveSection(activeSection === 'dados' ? 'endereco' : 'financeiro')}
              >
                Próximo →
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              leftIcon={<Save size={15} />}
            >
              {isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Empresa'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
