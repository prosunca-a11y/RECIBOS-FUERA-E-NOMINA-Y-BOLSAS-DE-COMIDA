import React, { useState } from 'react';
import { CompanyConfig, Employee } from '../types';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Users,
  ArrowRight,
  ShieldCheck,
  Search,
  Check,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CompaniesManagerProps {
  companies: CompanyConfig[];
  activeCompany: CompanyConfig;
  employees: Employee[];
  onSelectCompany: (company: CompanyConfig) => void;
  onSaveCompany: (company: CompanyConfig) => void;
  onDeleteCompany: (companyId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const CompaniesManager: React.FC<CompaniesManagerProps> = ({
  companies,
  activeCompany,
  employees,
  onSelectCompany,
  onSaveCompany,
  onDeleteCompany,
  onNavigateTab,
}) => {
  // Quick Add Form state
  const [quickName, setQuickName] = useState('');
  const [quickRif, setQuickRif] = useState('');
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  
  // Advanced / Optional fields for new company
  const [newCity, setNewCity] = useState('Caracas, Dto. Capital');
  const [newAddress, setNewAddress] = useState('');
  const [newRepName, setNewRepName] = useState('');
  const [newRepCedula, setNewRepCedula] = useState('V-');
  const [newRepCargo, setNewRepCargo] = useState('Director General');
  const [newBcvRate, setNewBcvRate] = useState(activeCompany.tasaBCV || 52.40);

  // Edit modal / inline edit state
  const [editingCompany, setEditingCompany] = useState<CompanyConfig | null>(null);

  // Feedback states
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle Quick Add Company
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = quickName.trim();
    let cleanRif = quickRif.trim().toUpperCase();

    if (!cleanName) {
      setErrorMessage('Por favor introduzca el Nombre o Razón Social de la empresa.');
      return;
    }

    if (!cleanRif) {
      setErrorMessage('Por favor introduzca el RIF de la empresa.');
      return;
    }

    // Autoformat RIF if user just typed numbers without prefix
    if (!cleanRif.startsWith('J-') && !cleanRif.startsWith('G-') && !cleanRif.startsWith('V-') && !cleanRif.startsWith('E-')) {
      cleanRif = `J-${cleanRif}`;
    }

    // Check if RIF already registered
    const existing = companies.find(
      (c) => c.rif.replace(/[^A-Z0-9]/gi, '') === cleanRif.replace(/[^A-Z0-9]/gi, '')
    );
    if (existing) {
      setErrorMessage(`El RIF ${cleanRif} ya está registrado en la empresa "${existing.razonSocial}".`);
      return;
    }

    const newCompany: CompanyConfig = {
      id: `comp-${Date.now()}`,
      razonSocial: cleanName,
      rif: cleanRif,
      ciudad: newCity.trim() || 'Caracas, Dto. Capital',
      direccionFiscal: newAddress.trim() || `${newCity.trim() || 'Caracas'}, Venezuela`,
      registroMercantil: 'Registro Mercantil de la Circunscripción Judicial',
      representanteLegal: newRepName.trim() || 'Representante Legal',
      cedulaRepresentante: newRepCedula.trim() || 'V-15.000.000',
      cargoRepresentante: newRepCargo.trim() || 'Director General',
      tasaBCV: newBcvRate > 0 ? newBcvRate : activeCompany.tasaBCV,
      fechaTasaBCV: new Date().toISOString().split('T')[0],
      telefono: '',
      email: '',
    };

    onSaveCompany(newCompany);
    onSelectCompany(newCompany);

    // Reset inputs
    setQuickName('');
    setQuickRif('');
    setNewAddress('');
    setNewRepName('');
    setShowAdvancedFields(false);

    setSuccessMessage(`¡Empresa "${cleanName}" (${cleanRif}) agregada con éxito y seleccionada como empresa activa!`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 6000);
  };

  // Handle Save Edited Company
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    if (!editingCompany.razonSocial.trim()) {
      setErrorMessage('La Razón Social no puede estar vacía.');
      return;
    }
    if (!editingCompany.rif.trim()) {
      setErrorMessage('El RIF no puede estar vacío.');
      return;
    }

    onSaveCompany({
      ...editingCompany,
      razonSocial: editingCompany.razonSocial.trim(),
      rif: editingCompany.rif.trim().toUpperCase(),
    });

    setSuccessMessage(`Datos de la empresa "${editingCompany.razonSocial}" actualizados.`);
    setEditingCompany(null);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Filtered companies
  const filteredCompanies = companies.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.razonSocial.toLowerCase().includes(term) ||
      c.rif.toLowerCase().includes(term) ||
      c.ciudad.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Building2 className="w-6 h-6" />
            </div>
            <span>Gestión de Empresas (Multiempresa)</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Agregue empresas introduciendo su Nombre y RIF. Cada entidad opera de forma independiente con sus trabajadores, recibos y adendas legales.
          </p>
        </div>

        {/* Current Active Badge */}
        <div className="flex items-center space-x-2 bg-indigo-50/80 border border-indigo-200/90 rounded-xl px-3.5 py-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-xs">
            <span className="text-slate-500 block text-[10px] font-semibold uppercase">Empresa en Uso:</span>
            <span className="font-bold text-indigo-950">{activeCompany.razonSocial}</span>
            <span className="font-mono text-indigo-700 ml-1.5 font-semibold">({activeCompany.rif})</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs sm:text-sm text-emerald-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs sm:text-sm text-rose-900 flex items-center justify-between shadow-2xs">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-bold px-2 py-1"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Primary Card: Quick Company Registration by Name & RIF */}
      <div className="bg-white border-2 border-indigo-100/80 rounded-2xl p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex items-center space-x-2 pb-3 mb-4 border-b border-slate-100">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Agregar Empresa a la App
            </h3>
            <p className="text-xs text-slate-500">
              Introduzca el <strong>Nombre o Razón Social</strong> y el <strong>R.I.F.</strong> de la empresa para darla de alta inmediatamente.
            </p>
          </div>
        </div>

        <form onSubmit={handleQuickAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Name / Razon Social Input */}
            <div className="sm:col-span-7">
              <label htmlFor="input-company-name" className="block text-xs font-bold text-slate-700 mb-1">
                Nombre o Razón Social de la Empresa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-company-name"
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Ej: CRISBAORCA 2009, C.A. o Inversiones Alfa, S.A."
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Denominación legal completa tal como figura en el documento constitutivo y en el RIF.
              </p>
            </div>

            {/* RIF Input */}
            <div className="sm:col-span-5">
              <label htmlFor="input-company-rif" className="block text-xs font-bold text-slate-700 mb-1">
                R.I.F. (Registro de Información Fiscal) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="input-company-rif"
                  type="text"
                  required
                  value={quickRif}
                  onChange={(e) => setQuickRif(e.target.value.toUpperCase())}
                  placeholder="Ej: J-29711947-7"
                  className="w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Formato: J-12345678-0 (se auto-formatea en mayúsculas).
              </p>
            </div>
          </div>

          {/* Toggle for optional advanced fields */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedFields(!showAdvancedFields)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
            >
              <span>{showAdvancedFields ? 'Ocultar datos adicionales' : '+ Completar datos adicionales opcionales (Ciudad, Representante, Dirección)'}</span>
              {showAdvancedFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Advanced / Optional Fields */}
          {showAdvancedFields && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs animate-in fade-in duration-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ciudad / Jurisdicción</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Caracas, Dto. Capital"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Representante Legal</label>
                <input
                  type="text"
                  value={newRepName}
                  onChange={(e) => setNewRepName(e.target.value)}
                  placeholder="Nombres y Apellidos del Representante"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cédula Representante</label>
                <input
                  type="text"
                  value={newRepCedula}
                  onChange={(e) => setNewRepCedula(e.target.value)}
                  placeholder="V-15.000.000"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Dirección Fiscal Completa</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Av., Calle, Edificio, Oficina, Urbanización..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cargo Representante</label>
                <input
                  type="text"
                  value={newRepCargo}
                  onChange={(e) => setNewRepCargo(e.target.value)}
                  placeholder="Director General / Gerente General"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="flex items-center justify-end pt-2">
            <button
              id="btn-submit-new-company"
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Empresa a la App</span>
            </button>
          </div>
        </form>
      </div>

      {/* List of Registered Companies */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Empresas Registradas ({companies.length})
            </h3>
            <p className="text-xs text-slate-500">
              Seleccione la empresa sobre la cual desea generar recibos, contratos o nóminas.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o RIF..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Company Cards Grid */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompanies.map((comp) => {
            const isActive = comp.id === activeCompany.id;
            const compWorkers = employees.filter((e) => e.companyId === comp.id);

            return (
              <div
                key={comp.id}
                id={`card-company-${comp.id}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'bg-gradient-to-br from-indigo-50/90 to-white border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                          {comp.razonSocial}
                        </h4>
                        {isActive && (
                          <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider shadow-2xs">
                            Activa
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {comp.rif}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{comp.ciudad}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => setEditingCompany({ ...comp })}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                        title="Editar datos legales"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      {companies.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Está seguro de eliminar la empresa "${comp.razonSocial}"?`)) {
                              onDeleteCompany(comp.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Representative & Details */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Representante Legal:</span>
                      <span className="font-semibold text-slate-800">
                        {comp.representanteLegal} ({comp.cedulaRepresentante})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Tasa Oficial BCV:</span>
                      <span className="font-mono font-bold text-emerald-700">
                        Bs. {comp.tasaBCV.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Trabajadores en Nómina:</span>
                      <span className="font-semibold text-indigo-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{compWorkers.length} registrados</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  {isActive ? (
                    <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-bold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Empresa seleccionada</span>
                    </div>
                  ) : (
                    <button
                      id={`btn-select-company-${comp.id}`}
                      onClick={() => onSelectCompany(comp)}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>Seleccionar Empresa</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        onSelectCompany(comp);
                        onNavigateTab('receipts');
                      }}
                      className="text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:underline px-2 py-1 cursor-pointer"
                    >
                      Emitir Recibo
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => {
                        onSelectCompany(comp);
                        onNavigateTab('contracts');
                      }}
                      className="text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:underline px-2 py-1 cursor-pointer"
                    >
                      Adendas
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-sm sm:text-base">Editar Datos Legales de la Empresa</h3>
              </div>
              <button
                onClick={() => setEditingCompany(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Razón Social *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.razonSocial}
                    onChange={(e) => setEditingCompany({ ...editingCompany, razonSocial: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">R.I.F. *</label>
                  <input
                    type="text"
                    required
                    value={editingCompany.rif}
                    onChange={(e) => setEditingCompany({ ...editingCompany, rif: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ciudad / Jurisdicción</label>
                  <input
                    type="text"
                    value={editingCompany.ciudad}
                    onChange={(e) => setEditingCompany({ ...editingCompany, ciudad: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Dirección Fiscal Completa</label>
                  <input
                    type="text"
                    value={editingCompany.direccionFiscal}
                    onChange={(e) => setEditingCompany({ ...editingCompany, direccionFiscal: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Representante Legal</label>
                  <input
                    type="text"
                    value={editingCompany.representanteLegal}
                    onChange={(e) => setEditingCompany({ ...editingCompany, representanteLegal: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cédula Representante</label>
                  <input
                    type="text"
                    value={editingCompany.cedulaRepresentante}
                    onChange={(e) => setEditingCompany({ ...editingCompany, cedulaRepresentante: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo Representante</label>
                  <input
                    type="text"
                    value={editingCompany.cargoRepresentante}
                    onChange={(e) => setEditingCompany({ ...editingCompany, cargoRepresentante: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tasa BCV por Defecto (Bs./USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCompany.tasaBCV}
                    onChange={(e) => setEditingCompany({ ...editingCompany, tasaBCV: parseFloat(e.target.value) || 52.40 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Registro Mercantil</label>
                  <input
                    type="text"
                    value={editingCompany.registroMercantil}
                    onChange={(e) => setEditingCompany({ ...editingCompany, registroMercantil: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Legal shield footer notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 block">Independencia Operativa y Cumplimiento LOTTT</strong>
          <span className="text-[11px] text-slate-500 leading-relaxed">
            Al registrar entidades como CRISBAORCA 2009, C.A., cada recibo fuera de nómina emitido llevará impreso el membrete oficial, el RIF y la firma legal correspondiente, blindando la deducibilidad tributaria (Art. 27 LISLR) y evitando la solidaridad laboral improcedente.
          </span>
        </div>
      </div>
    </div>
  );
};
