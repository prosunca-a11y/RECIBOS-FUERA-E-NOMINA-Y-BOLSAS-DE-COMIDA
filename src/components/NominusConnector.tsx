import React, { useState } from 'react';
import { CompanyConfig, Employee, NominusConfig, NominusSyncResult, BenefitReceipt } from '../types';
import {
  fetchFromNominusApi,
  parseNominusFile,
  generateNominusBridgePHP,
  generateIframeEmbedCode,
  getNominusSampleData,
} from '../utils/nominusBridge';
import { formatBs, formatUSD, convertBsToUSD } from '../utils/bcv';
import {
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  Code2,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  Send,
  Zap,
  HardDrive,
  LayoutTemplate,
  Layers,
  FileCheck,
  Sparkles,
} from 'lucide-react';

interface NominusConnectorProps {
  nominusConfig: NominusConfig;
  onSaveConfig: (config: NominusConfig) => void;
  onSyncData: (result: NominusSyncResult) => void;
  company: CompanyConfig;
  companies: CompanyConfig[];
  employees: Employee[];
  receipts: BenefitReceipt[];
  onNavigateTab: (tab: string) => void;
  onSelectCompany: (comp: CompanyConfig) => void;
}

export const NominusConnector: React.FC<NominusConnectorProps> = ({
  nominusConfig,
  onSaveConfig,
  onSyncData,
  company,
  companies,
  employees,
  receipts,
  onNavigateTab,
  onSelectCompany,
}) => {
  // Local config form state
  const [apiUrl, setApiUrl] = useState(nominusConfig.apiUrl || '');
  const [apiKey, setApiKey] = useState(nominusConfig.apiKey || 'NOMINUS_SECRET_2026');
  const [autoSync, setAutoSync] = useState(nominusConfig.autoSync ?? true);
  const [hostingFolder, setHostingFolder] = useState(nominusConfig.hostingFolder || '/public_html/bonos');

  // Sub-tabs in Nominus Connector
  const [activeSubTab, setActiveSubTab] = useState<'sync' | 'file-import' | 'guide' | 'code' | 'employees'>('sync');
  const [activeCodeTab, setActiveCodeTab] = useState<'bridge' | 'iframe' | 'api-spec'>('bridge');

  // Action states
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExportingReceipts, setIsExportingReceipts] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  } | null>(null);

  // File upload state
  const [uploadLoading, setUploadLoading] = useState(false);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  // Download PHP file helper
  const handleDownloadBridgePHP = () => {
    const code = generateNominusBridgePHP(apiKey);
    const blob = new Blob([code], { type: 'application/x-httpd-php;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nominus_bridge.php';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Save config changes
  const handleSaveSettings = () => {
    const updated: NominusConfig = {
      ...nominusConfig,
      apiUrl: apiUrl.trim(),
      apiKey: apiKey.trim(),
      autoSync,
      hostingFolder: hostingFolder.trim(),
    };
    onSaveConfig(updated);
    setFeedback({
      type: 'success',
      title: 'Configuración guardada',
      message: 'Los parámetros de enlace con Nóminus se han guardado exitosamente.',
    });
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!apiUrl.trim()) {
      setFeedback({
        type: 'error',
        title: 'URL Requerida',
        message: 'Por favor ingrese la URL donde instaló el puente de Nóminus (nominus_bridge.php) o su API.',
      });
      return;
    }

    setIsTesting(true);
    setFeedback(null);

    try {
      const pingUrl = `${apiUrl.replace(/\/+$/, '')}?action=ping&token=${encodeURIComponent(apiKey.trim())}`;
      const res = await fetch(pingUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: apiKey.trim() ? `Bearer ${apiKey.trim()}` : '',
          'X-Nominus-Token': apiKey.trim(),
        },
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          title: '¡Conexión Exitosa con Nóminus!',
          message: `El servidor de Nóminus respondió satisfactoriamente (HTTP ${res.status}). El puente está activo y listo para traer nóminas.`,
        });
        onSaveConfig({
          ...nominusConfig,
          apiUrl: apiUrl.trim(),
          apiKey: apiKey.trim(),
          status: 'connected',
        });
      } else {
        throw new Error(`Respuesta HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        title: 'Fallo al conectar con Nóminus',
        message: `No se pudo establecer contacto con ${apiUrl}. Causa probable: archivo nominus_bridge.php no encontrado en esa ruta o bloqueo CORS en el hosting. Si aún no ha subido el archivo a su hosting, pruebe el botón "Simular Sincronización de Prueba" para verificar el flujo de inmediato. Detalle: ${msg}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Sync real data from Nominus API
  const handleSyncFromNominus = async () => {
    if (!apiUrl.trim()) {
      setFeedback({
        type: 'error',
        title: 'URL Requerida',
        message: 'Debe ingresar la URL del puente de Nóminus en su hosting para realizar la sincronización.',
      });
      return;
    }

    setIsSyncing(true);
    setFeedback(null);

    try {
      const cfg: NominusConfig = {
        ...nominusConfig,
        apiUrl: apiUrl.trim(),
        apiKey: apiKey.trim(),
      };
      const result = await fetchFromNominusApi(cfg);
      onSyncData(result);
      onSaveConfig({
        ...cfg,
        status: 'connected',
        lastSyncTime: new Date().toISOString(),
      });
      setFeedback({
        type: 'success',
        title: 'Sincronización Completa con Nóminus',
        message: result.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        title: 'Error durante la sincronización',
        message: msg,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Simulate sync with mock Nóminus data (useful for demonstration & testing in preview)
  const handleSimulateSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const sample = getNominusSampleData();
      onSyncData(sample);
      onSaveConfig({
        ...nominusConfig,
        apiUrl: apiUrl || 'https://su-hosting.com/nominus/nominus_bridge.php',
        apiKey: apiKey || 'NOMINUS_SECRET_2026',
        status: 'connected',
        lastSyncTime: new Date().toISOString(),
      });
      setIsSyncing(false);
      setFeedback({
        type: 'success',
        title: 'Sincronización Demostrativa Exitosa',
        message: `Se trajeron ${sample.companiesCount} empresas y ${sample.employeesCount} trabajadores desde el modelo de datos de Nóminus. Ya puede seleccionarlos directamente al emitir recibos.`,
      });
    }, 600);
  };

  // Handle file upload (Excel / CSV / JSON)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setFeedback(null);

    try {
      const result = await parseNominusFile(file, company, companies);
      onSyncData(result);
      setFeedback({
        type: 'success',
        title: 'Archivo Importado Correctamente',
        message: result.message,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        title: 'Error al procesar el archivo',
        message: msg,
      });
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  // Filter employees for active company
  const activeCompanyEmployees = employees.filter((e) => !e.companyId || e.companyId === company.id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Conector de Nómina Nóminus
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                  nominusConfig.status === 'connected'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {nominusConfig.status === 'connected' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Conectado a Nóminus</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>Listo para enlazar</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Integración bidireccional: extrae empresas y trabajadores desde su sistema{' '}
              <strong className="text-slate-700">Nóminus</strong> en el hosting para emitir recibos no salariales amparados en el Art. 105 LOTTT.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-nominus-quick-sync"
            type="button"
            onClick={handleSyncFromNominus}
            disabled={isSyncing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Traer Trabajadores de Nóminus'}</span>
          </button>

          <button
            id="btn-nominus-simulate-demo"
            type="button"
            onClick={handleSimulateSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            title="Carga trabajadores de prueba del esquema Nóminus para verificar recibos de inmediato"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simular Datos Nóminus</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between text-xs animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-start space-x-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block font-extrabold text-sm">{feedback.title}</strong>
              <p className="mt-0.5 leading-relaxed">{feedback.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-Tabs Bar */}
      <div className="flex overflow-x-auto space-x-1 border-b border-slate-200 pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('sync')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeSubTab === 'sync'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Sincronización en Vivo (API / Hosting)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('file-import')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeSubTab === 'file-import'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Importar Excel / CSV de Nóminus</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('employees')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeSubTab === 'employees'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Trabajadores Sincronizados ({activeCompanyEmployees.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('guide')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeSubTab === 'guide'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Guía de Instalación en Hosting</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('code')}
          className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
            activeSubTab === 'code'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Código del Puente y Embebido</span>
        </button>
      </div>

      {/* SUB-TAB 1: LIVE API SYNC */}
      {activeSubTab === 'sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main configuration column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Parámetros de Conexión con el Servidor Nóminus
                  </h3>
                </div>
                {nominusConfig.lastSyncTime && (
                  <span className="text-[11px] text-slate-400">
                    Última sincronización: {new Date(nominusConfig.lastSyncTime).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Endpoint URL */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  URL del Puente o API de Nóminus en su Hosting: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="input-nominus-api-url"
                    type="url"
                    placeholder="https://su-dominio.com/nominus/nominus_bridge.php"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dirección donde subió el archivo <code className="text-indigo-600 font-bold">nominus_bridge.php</code> en su hosting o la ruta REST de su sistema Nóminus.
                </p>
              </div>

              {/* Security Key / Token */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Token de Seguridad / Secreto:
                  </label>
                  <input
                    id="input-nominus-token"
                    type="text"
                    placeholder="NOMINUS_SECRET_2026"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Debe coincidir con la variable <code className="text-slate-600 font-mono">$configuredToken</code> del archivo PHP.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Directorio de Instalación en Hosting:
                  </label>
                  <input
                    id="input-nominus-folder"
                    type="text"
                    placeholder="/public_html/bonos"
                    value={hostingFolder}
                    onChange={(e) => setHostingFolder(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Carpeta donde colocará los archivos generados de esta app.
                  </p>
                </div>
              </div>

              {/* Auto Sync Toggle */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    id="chk-nominus-autosync"
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      Sincronizar automáticamente trabajadores al abrir la aplicación
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Consulta a Nóminus en segundo plano para reflejar ingresos o retiros de trabajadores al instante.
                    </span>
                  </div>
                </label>
              </div>

              {/* Buttons: Test & Save */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-test-nominus-conn"
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Probando...' : 'Probar Conexión'}</span>
                  </button>

                  <button
                    id="btn-save-nominus-settings"
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Guardar Parámetros</span>
                  </button>
                </div>

                <button
                  id="btn-sync-nominus-now"
                  type="button"
                  onClick={handleSyncFromNominus}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isSyncing ? 'Trayendo nóminas...' : 'Sincronizar Empresas y Trabajadores'}</span>
                </button>
              </div>
            </div>

            {/* Quick how it works diagram */}
            <div className="bg-gradient-to-r from-indigo-50/70 to-blue-50/50 p-4 rounded-2xl border border-indigo-100 text-xs">
              <h4 className="font-extrabold text-indigo-950 flex items-center space-x-1.5 mb-2">
                <LayoutTemplate className="w-4 h-4 text-indigo-600" />
                <span>¿Cómo fluyen los datos entre Nóminus y esta App de Bonos?</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-slate-600">
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <strong className="text-indigo-900 block font-bold mb-0.5">1. Base de Datos Nóminus</strong>
                  <span>El sistema Nóminus almacena sus empresas y trabajadores activos en su hosting MySQL.</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <strong className="text-indigo-900 block font-bold mb-0.5">2. Puente nominus_bridge.php</strong>
                  <span>El script puente expone de forma segura y en formato JSON la nómina para cada empresa.</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <strong className="text-indigo-900 block font-bold mb-0.5">3. Emisión de Recibos LOTTT</strong>
                  <span>Esta app recibe los trabajadores, calcula los bonos, audita el ratio gamma y emite los recibos.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick status & stats sidebar */}
          <div className="space-y-4">
            {/* Active Company Status */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-slate-700">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Empresa Activa</h4>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <strong className="text-slate-900 block font-black text-sm">{company.razonSocial}</strong>
                <span className="font-mono text-indigo-600 font-bold block">{company.rif}</span>
                <span className="text-slate-500 text-[11px] block mt-1">{company.ciudad}</span>
                <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                  Tasa BCV: Bs. {company.tasaBCV.toFixed(2)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Trabajadores en nómina:</span>
                  <strong className="text-slate-900">{activeCompanyEmployees.length}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Recibos emitidos:</span>
                  <strong className="text-slate-900">
                    {receipts.filter((r) => !r.companyId || r.companyId === company.id).length}
                  </strong>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Total empresas registradas:</span>
                  <strong className="text-slate-900">{companies.length}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('receipts')}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Ir a Emitir Recibo</span>
              </button>
            </div>

            {/* Ready to Download Bridge Card */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-3">
              <div className="flex items-center space-x-2 text-indigo-300">
                <Code2 className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider">Archivo para su Hosting</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Descargue el archivo <span className="text-indigo-400 font-mono font-bold">nominus_bridge.php</span> y súbalo a la carpeta de Nóminus en su hosting para activar la conexión en 1 minuto.
              </p>
              <button
                type="button"
                onClick={handleDownloadBridgePHP}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar nominus_bridge.php</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FILE IMPORT (EXCEL / CSV / JSON) */}
      {activeSubTab === 'file-import' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Importar Trabajadores y Empresas desde Archivo Nóminus
              </h3>
              <p className="text-xs text-slate-500">
                Si no desea usar conexión directa de API o si prefiere cargar la exportación de su sistema Nóminus en formato Excel (.xlsx), CSV o JSON.
              </p>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-2xl p-8 text-center transition">
            <input
              id="input-file-nominus"
              type="file"
              accept=".xlsx,.xls,.csv,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="input-file-nominus"
              className="cursor-pointer flex flex-col items-center justify-center space-y-3"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                {uploadLoading ? (
                  <RefreshCw className="w-7 h-7 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-7 h-7" />
                )}
              </div>
              <div>
                <span className="text-sm font-extrabold text-indigo-900 block">
                  {uploadLoading ? 'Procesando archivo...' : 'Haga clic para seleccionar el archivo exportado de Nóminus'}
                </span>
                <span className="text-xs text-slate-500 mt-1 block">
                  Soporta libros de Excel (.xlsx, .xls), archivos separados por coma (.csv) o datos JSON
                </span>
              </div>
              <span className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg shadow-2xs">
                Examinar Archivos
              </span>
            </label>
          </div>

          {/* Column recognition info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
            <h4 className="font-extrabold text-slate-800 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Detección Inteligente de Columnas de Nóminus:</span>
            </h4>
            <p className="text-slate-600 leading-relaxed">
              El importador reconoce automáticamente columnas con nombres como:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="bg-white p-2 rounded border border-slate-200">
                <strong className="text-slate-700 block font-sans">Cédula:</strong>
                cedula, ci, documento
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <strong className="text-slate-700 block font-sans">Nombre:</strong>
                nombres, apellidos, trabajador
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <strong className="text-slate-700 block font-sans">Cargo / Depto:</strong>
                cargo, puesto, departamento
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <strong className="text-slate-700 block font-sans">Salario Base:</strong>
                sueldo, salario_base, base
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: EMPLOYEES LIST VIEW */}
      {activeSubTab === 'employees' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Trabajadores Disponibles para Recibos ({activeCompanyEmployees.length})
              </h3>
              <p className="text-xs text-slate-500">
                Asignados a la empresa: <strong className="text-slate-800">{company.razonSocial}</strong> ({company.rif})
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('employees')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Gestionar en Expedientes</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('receipts')}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Emitir Recibos a esta Nómina</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-3.5 py-2.5">Cédula</th>
                  <th className="px-3.5 py-2.5">Trabajador</th>
                  <th className="px-3.5 py-2.5">Cargo y Depto.</th>
                  <th className="px-3.5 py-2.5 text-right">Salario Base (Bs.)</th>
                  <th className="px-3.5 py-2.5">Banco y Cuenta</th>
                  <th className="px-3.5 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeCompanyEmployees.length > 0 ? (
                  activeCompanyEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-3.5 py-2 font-mono font-bold text-slate-800">{emp.cedula}</td>
                      <td className="px-3.5 py-2">
                        <strong className="text-slate-900 block">{emp.fullName}</strong>
                        {emp.isDirector && (
                          <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded-full">
                            Director / Tope 15%
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2">
                        <span className="text-slate-800 block font-medium">{emp.cargo}</span>
                        <span className="text-[10px] text-slate-400">{emp.departamento}</span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-bold text-slate-900">
                        {formatBs(emp.salarioBaseBs)}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          ≈ {formatUSD(convertBsToUSD(emp.salarioBaseBs, company.tasaBCV))}
                        </span>
                      </td>
                      <td className="px-3.5 py-2">
                        <span className="text-slate-700 block text-[11px]">{emp.banco}</span>
                        <span className="text-[10px] font-mono text-slate-400">{emp.cuentaBancaria}</span>
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => onNavigateTab('receipts')}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-bold text-[11px] transition cursor-pointer"
                        >
                          Emitir Recibo
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      <Users className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="font-bold text-slate-700">No hay trabajadores cargados para esta empresa.</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Utilice el botón "Sincronizar Empresas y Trabajadores" o "Simular Datos Nóminus" para importarlos.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: STEP-BY-STEP HOSTING GUIDE */}
      {activeSubTab === 'guide' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
          <div>
            <h3 className="font-black text-slate-900 text-lg">
              Guía de Instalación e Incorporación en su Hosting con Nóminus
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Siga estos 3 sencillos pasos para tener la aplicación funcionando en su servidor y conectada directamente con Nóminus.
            </p>
          </div>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start space-x-3.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                1
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <strong className="text-sm font-extrabold text-slate-900 block">
                  Paso 1: Subir la Aplicación a su Hosting
                </strong>
                <p>
                  Compile la aplicación ejecutando <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-600 font-mono font-bold">npm run build</code> (o descargue el archivo ZIP de producción).
                </p>
                <p>
                  Suba el contenido de la carpeta <code className="font-mono text-slate-800">dist/</code> a su hosting mediante cPanel (Administrador de Archivos) o FTP en una subcarpeta de su dominio, por ejemplo:
                  <br />
                  <code className="bg-white px-2 py-1 rounded border text-indigo-700 font-mono font-bold block mt-1">
                    public_html/bonos/ &nbsp;o&nbsp; public_html/nominus/bonos/
                  </code>
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start space-x-3.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                2
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <strong className="text-sm font-extrabold text-slate-900 block">
                  Paso 2: Subir el archivo puente nominus_bridge.php
                </strong>
                <p>
                  Descargue el archivo puente haciendo clic en{' '}
                  <button
                    type="button"
                    onClick={handleDownloadBridgePHP}
                    className="text-indigo-600 font-bold underline hover:text-indigo-800 cursor-pointer"
                  >
                    Descargar nominus_bridge.php
                  </button>{' '}
                  y súbalo a la carpeta donde está instalado su sistema Nóminus en su hosting.
                </p>
                <p>
                  Este archivo lee la nómina de cada empresa y la envía de forma instantánea y cifrada a esta app cada vez que haga clic en sincronizar.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start space-x-3.5">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                3
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <strong className="text-sm font-extrabold text-slate-900 block">
                  Paso 3: Integrar en el Menú de Nóminus (Opcional pero Recomendado)
                </strong>
                <p>
                  Para que sus usuarios no salgan de Nóminus, puede colocar un botón en el menú de Nóminus que apunte a:
                  <code className="bg-white px-2 py-0.5 rounded border text-slate-800 font-mono block mt-1">
                    https://su-dominio.com/bonos/
                  </code>
                </p>
                <p>
                  O también puede embeberlo como un marco interactivo (iframe) dentro de la plantilla de Nóminus (vea el código en la pestaña "Código del Puente y Embebido").
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: READY-TO-COPY CODE */}
      {activeSubTab === 'code' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Códigos de Integración Listos para Copiar
              </h3>
              <p className="text-xs text-slate-500">
                Seleccione el código que desea copiar para su instalación en el hosting.
              </p>
            </div>

            {/* Sub code selector */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveCodeTab('bridge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeCodeTab === 'bridge'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Puente PHP (nominus_bridge.php)
              </button>
              <button
                type="button"
                onClick={() => setActiveCodeTab('iframe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeCodeTab === 'iframe'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Iframe / Menú Nóminus
              </button>
            </div>
          </div>

          {activeCodeTab === 'bridge' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">
                  Script PHP autónomo con soporte CORS y consultas SQL multiempresa:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBridgePHP}
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar .php</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(generateNominusBridgePHP(apiKey), 'php')}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedCode === 'php' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'php' ? '¡Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 border border-slate-800">
                  {generateNominusBridgePHP(apiKey)}
                </pre>
              </div>
            </div>
          )}

          {activeCodeTab === 'iframe' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-semibold">
                  Código HTML / JS para incrustar esta app dentro de Nóminus:
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(generateIframeEmbedCode(window.location.origin, company.rif), 'iframe')
                  }
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                >
                  {copiedCode === 'iframe' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'iframe' ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-200 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96 border border-slate-800">
                  {generateIframeEmbedCode(window.location.origin, company.rif)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
