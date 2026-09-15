import React, { useState } from 'react';
import { CompanyConfig } from '../types';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  TrendingUp,
} from 'lucide-react';

interface CompanyManagerModalProps {
  companies: CompanyConfig[];
  activeCompanyId: string;
  onSelectCompany: (id: string) => void;
  onSaveCompany: (company: CompanyConfig) => void;
  onDeleteCompany: (id: string) => void;
  onClose: () => void;
}

export function CompanyManagerModal({
  companies,
  activeCompanyId,
  onSelectCompany,
  onSaveCompany,
  onDeleteCompany,
  onClose,
}: CompanyManagerModalProps) {
  const [editingCompany, setEditingCompany] = useState<CompanyConfig | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Blank template for new company
  const emptyCompany: CompanyConfig = {
    id: `comp-${Date.now()}`,
    razonSocial: '',
    rif: 'J-',
    direccionFiscal: '',
    ciudad: 'Caracas, Dto. Capital',
    registroMercantil: '',
    representanteLegal: '',
    cedulaRepresentante: 'V-',
    cargoRepresentante: 'Director General',
    tasaBCV: 52.40,
    fechaTasaBCV: new Date().toISOString().split('T')[0],
    telefono: '',
    email: '',
  };

  const handleStartCreate = () => {
    setEditingCompany(emptyCompany);
    setIsCreating(true);
    setErrorMessage(null);
  };

  const handleStartEdit = (comp: CompanyConfig) => {
    setEditingCompany({ ...comp });
    setIsCreating(false);
    setErrorMessage(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;

    if (!editingCompany.razonSocial.trim()) {
      setErrorMessage('La Razón Social es requerida.');
      return;
    }
    let formattedRif = editingCompany.rif.trim().toUpperCase();
    if (!formattedRif || formattedRif.length < 3) {
      setErrorMessage('El RIF es requerido (ej: J-29711947-7).');
      return;
    }
    if (!formattedRif.startsWith('J-') && !formattedRif.startsWith('G-') && !formattedRif.startsWith('V-') && !formattedRif.startsWith('E-')) {
      formattedRif = `J-${formattedRif}`;
    }

    const completeCompany: CompanyConfig = {
      ...editingCompany,
      razonSocial: editingCompany.razonSocial.trim(),
      rif: formattedRif,
      ciudad: editingCompany.ciudad?.trim() || 'Caracas, Dto. Capital',
      direccionFiscal: editingCompany.direccionFiscal?.trim() || 'Caracas, Venezuela',
      registroMercantil: editingCompany.registroMercantil?.trim() || 'Registro Mercantil de la Circunscripción Judicial',
      representanteLegal: editingCompany.representanteLegal?.trim() || 'Representante Legal',
      cedulaRepresentante: editingCompany.cedulaRepresentante?.trim() || 'V-15.000.000',
      cargoRepresentante: editingCompany.cargoRepresentante?.trim() || 'Director General',
    };

    onSaveCompany(completeCompany);
    onSelectCompany(completeCompany.id);
    setEditingCompany(null);
    setIsCreating(false);
    setErrorMessage(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (companies.length <= 1) {
      alert('Debe mantener al menos una empresa registrada en el sistema.');
      return;
    }
    if (window.confirm(`¿Está seguro de eliminar la empresa "${name}"? Los datos asociados no se perderán pero quedarán archivados.`)) {
      onDeleteCompany(id);
      if (editingCompany?.id === id) {
        setEditingCompany(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Gestión Multiempresa</h2>
              <p className="text-xs text-indigo-200">
                Administre las razones sociales, RIF y representantes de sus entidades de trabajo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form when editing or creating */}
          {editingCompany ? (
            <form onSubmit={handleSave} className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  <span>{isCreating ? 'Registrar Nueva Empresa' : 'Editar Datos de la Empresa'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Razón Social de la Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCompany.razonSocial}
                    onChange={(e) => setEditingCompany({ ...editingCompany, razonSocial: e.target.value })}
                    placeholder="Ej: Distribuidora & Alimentos Los Llanos, C.A."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    R.I.F. *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCompany.rif}
                    onChange={(e) => setEditingCompany({ ...editingCompany, rif: e.target.value.toUpperCase() })}
                    placeholder="Ej: J-40892174-3"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Ciudad / Estado *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCompany.ciudad}
                    onChange={(e) => setEditingCompany({ ...editingCompany, ciudad: e.target.value })}
                    placeholder="Ej: Caracas, Dto. Capital"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Dirección Fiscal Completa
                  </label>
                  <input
                    type="text"
                    value={editingCompany.direccionFiscal}
                    onChange={(e) => setEditingCompany({ ...editingCompany, direccionFiscal: e.target.value })}
                    placeholder="Av., Calle, Edificio, Piso, Oficina, Urbanización..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Representante Legal *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCompany.representanteLegal}
                    onChange={(e) => setEditingCompany({ ...editingCompany, representanteLegal: e.target.value })}
                    placeholder="Nombres y Apellidos"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cédula Representante *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCompany.cedulaRepresentante}
                    onChange={(e) => setEditingCompany({ ...editingCompany, cedulaRepresentante: e.target.value })}
                    placeholder="Ej: V-14.892.410"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cargo del Representante
                  </label>
                  <input
                    type="text"
                    value={editingCompany.cargoRepresentante}
                    onChange={(e) => setEditingCompany({ ...editingCompany, cargoRepresentante: e.target.value })}
                    placeholder="Director General, Gerente General..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tasa Oficial BCV por Defecto (Bs./USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={editingCompany.tasaBCV}
                    onChange={(e) => setEditingCompany({ ...editingCompany, tasaBCV: parseFloat(e.target.value) || 52.40 })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Datos del Registro Mercantil
                  </label>
                  <input
                    type="text"
                    value={editingCompany.registroMercantil}
                    onChange={(e) => setEditingCompany({ ...editingCompany, registroMercantil: e.target.value })}
                    placeholder="Tomo, Número, Registro Mercantil..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCompany(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar Empresa</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Empresas Registradas ({companies.length})
                </span>
              </div>
              <button
                id="btn-add-company"
                onClick={handleStartCreate}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nueva Empresa</span>
              </button>
            </div>
          )}

          {/* Companies List */}
          <div className="space-y-3">
            {companies.map((comp) => {
              const isActive = comp.id === activeCompanyId;
              return (
                <div
                  key={comp.id}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{comp.razonSocial}</span>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                          Activa
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-mono">
                      <span>RIF: <strong className="text-slate-700">{comp.rif}</strong></span>
                      <span>•</span>
                      <span>Ciudad: <span className="font-sans text-slate-600">{comp.ciudad}</span></span>
                      <span>•</span>
                      <span>BCV: <strong className="text-indigo-700">Bs. {comp.tasaBCV.toFixed(2)}</strong></span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Representante: <strong className="text-slate-800">{comp.representanteLegal}</strong> ({comp.cargoRepresentante})
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {!isActive && (
                      <button
                        onClick={() => {
                          onSelectCompany(comp.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
                      >
                        Activar Esta
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(comp)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                      title="Editar Empresa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {companies.length > 1 && (
                      <button
                        onClick={() => handleDelete(comp.id, comp.razonSocial)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Eliminar Empresa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Independencia Legal de Entidades de Trabajo</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Al cambiar de empresa activa, el generador de recibos, la bóveda documental, los cálculos de riesgo y las adendas contractuales se contextualizan automáticamente con el RIF, razón social y representante legal correspondiente.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
