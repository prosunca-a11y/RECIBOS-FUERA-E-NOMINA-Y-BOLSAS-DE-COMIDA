import React, { useState } from 'react';
import { CompanyConfig } from '../types';
import { Shield, FileText, ShoppingBag, FileCheck, Layers, Award, Users, RefreshCw, Check, Building2, ChevronDown, Plus, Server } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  company: CompanyConfig;
  companies?: CompanyConfig[];
  onSelectCompany?: (comp: CompanyConfig) => void;
  onUpdateBCVRate: (newRate: number) => void;
  pendingThumbprintsCount: number;
  nominusStatus?: 'connected' | 'disconnected' | 'syncing' | 'error';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  company,
  companies = [],
  onSelectCompany,
  onUpdateBCVRate,
  pendingThumbprintsCount,
  nominusStatus = 'disconnected',
}) => {
  const [isEditingBCV, setIsEditingBCV] = useState(false);
  const [rateInput, setRateInput] = useState(company.tasaBCV.toString());
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  const handleSaveRate = () => {
    const val = parseFloat(rateInput);
    if (!isNaN(val) && val > 0) {
      onUpdateBCVRate(val);
      setIsEditingBCV(false);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Panel General', icon: Layers },
    { id: 'companies', label: 'Empresas', icon: Building2 },
    { id: 'receipts', label: 'Emitir Recibo', icon: FileText },
    { id: 'food-basket', label: 'Bolsas de Comida', icon: ShoppingBag },
    { id: 'contracts', label: 'Contrato / Adenda', icon: FileCheck },
    { id: 'vault', label: 'Bóveda y Tríada', icon: Shield, badge: pendingThumbprintsCount },
    { id: 'seniat', label: 'Auditoría SENIAT', icon: Award },
    { id: 'employees', label: 'Trabajadores', icon: Users },
    { id: 'nominus', label: 'Conector Nóminus', icon: Server },
  ];

  return (
    <header className="no-print bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/80 shadow-xs sticky top-0 z-40">
      {/* Top Banner with Company Info and BCV Engine */}
      <div className="border-b border-slate-100 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 shadow-2xs">
            <Shield className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2">
              <button
                id="btn-company-switcher"
                onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                className="font-extrabold text-sm text-slate-900 tracking-tight flex items-center gap-1.5 hover:text-indigo-600 transition cursor-pointer text-left"
                title="Cambiar de Empresa"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                <span>{company.razonSocial}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              <span className="bg-slate-100 text-slate-700 font-mono text-[10px] px-1.5 py-0.5 rounded border border-slate-200 font-bold">
                {company.rif}
              </span>

              {showCompanyMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowCompanyMenu(false)}
                  />
                  <div className="absolute left-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                      <span>Empresas Registradas ({companies.length})</span>
                      <span className="text-indigo-600 font-normal lowercase">multiempresa</span>
                    </div>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {companies.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            if (onSelectCompany) onSelectCompany(c);
                            setShowCompanyMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition cursor-pointer flex flex-col ${
                            c.id === company.id
                              ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 truncate">{c.razonSocial}</span>
                            {c.id === company.id && (
                              <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full ml-1 shrink-0">
                                Activa
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">RIF: {c.rif} • {c.ciudad}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setCurrentTab('companies');
                          setShowCompanyMenu(false);
                        }}
                        className="w-full text-center py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Agregar / Gestionar Empresas</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="text-[11px] text-slate-500">
              Sistema de Recibos Fuera de Nómina • LOTTT Art. 105 • Sentencia 523 TSJ
            </div>
          </div>
        </div>

        {/* BCV Tasa Widget - Pastel Mint */}
        <div className="flex items-center space-x-2 bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-3 py-1.5 shadow-2xs">
          <span className="text-emerald-900/80 text-[11px] font-medium">Tasa Oficial BCV:</span>
          {isEditingBCV ? (
            <div className="flex items-center space-x-1">
              <span className="font-mono text-emerald-800 font-bold text-xs">Bs.</span>
              <input
                id="input-bcv-rate"
                type="number"
                step="0.01"
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="w-20 bg-white border border-emerald-400 rounded px-1.5 py-0.5 text-xs text-slate-900 font-mono shadow-2xs"
                autoFocus
              />
              <button
                id="btn-save-bcv-rate"
                onClick={handleSaveRate}
                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition shadow-2xs"
                title="Guardar Tasa"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="font-mono text-emerald-800 font-bold text-xs">
                Bs. {company.tasaBCV.toFixed(2)}
              </span>
              <button
                id="btn-edit-bcv-rate"
                onClick={() => {
                  setRateInput(company.tasaBCV.toString());
                  setIsEditingBCV(true);
                }}
                className="text-emerald-700 hover:text-emerald-950 p-0.5 cursor-pointer transition"
                title="Ajustar Tasa Oficial BCV"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          )}
          <span className="text-[10px] text-emerald-700/80 hidden sm:inline">
            ({company.fechaTasaBCV})
          </span>
        </div>

        {/* Nominus Integration Quick Button */}
        <button
          id="btn-nav-nominus-status"
          type="button"
          onClick={() => setCurrentTab('nominus')}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs"
          title="Abrir Conector e Integración con Nóminus"
        >
          <Server className="w-3.5 h-3.5 text-indigo-600" />
          <span>Nóminus</span>
          <span
            className={`w-2 h-2 rounded-full ${
              nominusStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
            }`}
          />
        </button>
      </div>

      {/* Main Tab Navigation - Soft Pastel Pill Tabs */}
      <div className="px-4 sm:px-6 flex overflow-x-auto space-x-1 py-1.5 scrollbar-none">
        {navItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap cursor-pointer border ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
