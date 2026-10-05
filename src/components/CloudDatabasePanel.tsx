import React, { useState } from 'react';
import {
  BenefitReceipt,
  CloudArchiveFile,
  CloudFileType,
  CompanyConfig,
  CorporateFoodPurchaseInvoice,
  Employee,
} from '../types';
import {
  User,
  signInWithGoogle,
  signOutFromFirebase,
  saveCloudFileToFirestore,
  deleteCloudFileFromFirestore,
  syncAllLocalDataToCloud,
  archiveReceiptDocumentToCloud,
} from '../firebase';
import {
  Cloud,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  ShieldCheck,
  LogOut,
  LogIn,
  Database,
  FolderOpen,
  Search,
  Sparkles,
  Building2,
  Users,
  FileCheck,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface CloudDatabasePanelProps {
  user: User | null;
  authReady: boolean;
  company: CompanyConfig;
  companies: CompanyConfig[];
  employees: Employee[];
  receipts: BenefitReceipt[];
  invoices: CorporateFoodPurchaseInvoice[];
  cloudFiles: CloudArchiveFile[];
}

export const CloudDatabasePanel: React.FC<CloudDatabasePanelProps> = ({
  user,
  authReady,
  company,
  companies,
  employees,
  receipts,
  invoices,
  cloudFiles,
}) => {
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isArchivingReceipts, setIsArchivingReceipts] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileTypeFilter, setSelectedFileTypeFilter] = useState<string>('all');
  const [onlyCurrentCompany, setOnlyCurrentCompany] = useState<boolean>(false);
  const [previewFile, setPreviewFile] = useState<CloudArchiveFile | null>(null);

  // Upload form state
  const [uploadFileType, setUploadFileType] = useState<CloudFileType>('expediente_escaneado');
  const [uploadEmployeeId, setUploadEmployeeId] = useState<string>('');
  const [uploadReceiptNumber, setUploadReceiptNumber] = useState<string>('');
  const [uploadDescription, setUploadDescription] = useState<string>('');

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const companyEmployees = employees.filter((e) => !e.companyId || e.companyId === company.id);
  const companyReceipts = receipts.filter((r) => !r.companyId || r.companyId === company.id);

  const handleLogin = async () => {
    try {
      setFeedback(null);
      await signInWithGoogle();
      setFeedback({
        type: 'success',
        message: 'Sesión iniciada correctamente con Google. Sincronización en tiempo real con Firebase Firestore activada.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: `No se pudo iniciar sesión con Google: ${msg}`,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOutFromFirebase();
      setFeedback({
        type: 'info',
        message: 'Sesión de Firebase cerrada. Los datos continúan disponibles localmente.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: `Error al cerrar sesión: ${msg}`,
      });
    }
  };

  const handleSyncAllToFirebase = async () => {
    if (!user) return;
    setIsSyncingAll(true);
    setFeedback(null);
    try {
      const res = await syncAllLocalDataToCloud({
        companies,
        employees,
        receipts,
        invoices,
      });
      setFeedback({
        type: 'success',
        message: `¡Sincronización completa en Firebase! Se respaldaron ${res.companiesCount} empresa(s), ${res.employeesCount} trabajador(es), ${res.receiptsCount} recibo(s) y ${res.invoicesCount} factura(s) en la nube.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: `Error al sincronizar datos con Firebase: ${msg}`,
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleArchiveAllCompanyReceiptsToCloud = async () => {
    if (!user) return;
    if (companyReceipts.length === 0) {
      setFeedback({
        type: 'info',
        message: 'No hay recibos emitidos para la empresa activa que archivar.',
      });
      return;
    }
    setIsArchivingReceipts(true);
    setFeedback(null);
    try {
      for (const r of companyReceipts) {
        await archiveReceiptDocumentToCloud(r, company);
      }
      setFeedback({
        type: 'success',
        message: `¡Se generaron y guardaron ${companyReceipts.length} expedientes digitales de comprobantes en la Bóveda en la Nube de Firebase!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: `Error al archivar comprobantes en la nube: ${msg}`,
      });
    } finally {
      setIsArchivingReceipts(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setFeedback({
        type: 'error',
        message: 'Inicie sesión con Google primero para subir archivos a Firebase.',
      });
      e.target.value = '';
      return;
    }

    // Firestore document limit is 1MB; Base64 adds ~33%, so limit raw file size to 650 KB
    const maxBytes = 650 * 1024;
    if (file.size > maxBytes) {
      setFeedback({
        type: 'error',
        message: `El archivo "${file.name}" (${Math.round(file.size / 1024)} KB) supera el límite de 650 KB por documento en Firestore. Por favor suba un PDF, imagen o documento optimizado menor a 650 KB.`,
      });
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setFeedback(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
        reader.readAsDataURL(file);
      });

      const emp = employees.find((w) => w.id === uploadEmployeeId);

      await saveCloudFileToFirestore({
        id: `file-${Date.now()}-${Math.floor(100 + Math.random() * 899)}`,
        companyId: company.id,
        companyRif: company.rif,
        companyName: company.razonSocial,
        fileName: file.name,
        fileType: uploadFileType,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        relatedReceiptId: uploadReceiptNumber.trim() || undefined,
        relatedEmployeeName: emp?.fullName || undefined,
        relatedEmployeeCedula: emp?.cedula || undefined,
        description:
          uploadDescription.trim() ||
          `Archivo respaldado en Firebase para ${company.razonSocial} (${company.rif})`,
        dataUrl,
      });

      setUploadDescription('');
      setUploadReceiptNumber('');
      setFeedback({
        type: 'success',
        message: `¡Archivo "${file.name}" subido y guardado exitosamente en Firebase Firestore!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: `Error al guardar el archivo en Firebase: ${msg}`,
      });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDownloadCloudFile = (file: CloudArchiveFile) => {
    const link = document.createElement('a');
    link.href = file.dataUrl;
    link.download = file.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCloudFile = async (file: CloudArchiveFile) => {
    try {
      await deleteCloudFileFromFirestore(file.id);
      setFeedback({
        type: 'info',
        message: `Archivo "${file.fileName}" eliminado de la nube.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({
        type: 'error',
        message: `No se pudo eliminar el archivo: ${msg}`,
      });
    }
  };

  const getFileTypeBadge = (type: CloudFileType) => {
    switch (type) {
      case 'recibo_pdf':
        return { label: 'Comprobante Art. 105', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'recibo_word':
        return { label: 'Recibo Word (.doc)', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'adenda_contrato':
        return { label: 'Adenda / Contrato', cls: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'factura_seniat':
        return { label: 'Factura Fiscal SENIAT', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'expediente_escaneado':
        return { label: 'Expediente con Huella', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'reporte_excel':
        return { label: 'Libro Excel (.xlsx)', cls: 'bg-teal-50 text-teal-700 border-teal-200' };
      default:
        return { label: 'Otro Documento', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const filteredFiles = cloudFiles.filter((f) => {
    if (onlyCurrentCompany && f.companyId && f.companyId !== company.id) return false;
    if (selectedFileTypeFilter !== 'all' && f.fileType !== selectedFileTypeFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        f.fileName.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.relatedEmployeeName || '').toLowerCase().includes(q) ||
        (f.relatedEmployeeCedula || '').toLowerCase().includes(q) ||
        (f.relatedReceiptId || '').toLowerCase().includes(q) ||
        f.companyName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Base de Datos y Bóveda de Archivos en la Nube (Firebase)
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  Firestore Enterprise
                </span>
              </div>
              <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-2xl">
                Sincronización automática en tiempo real de Empresas, Trabajadores, Recibos Art. 105 LOTTT, Facturas SENIAT y almacenamiento de expedientes digitales en la nube.
              </p>
            </div>
          </div>

          {/* Auth Controls & Direct Console Link */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              id="link-open-firebase-console"
              href="https://console.firebase.google.com/project/gen-lang-client-0333295882/firestore/databases/ai-studio-recibosfueradenm-c81df03f-f1a9-4ea2-bc43-c639f4ca677f/data"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Abrir la consola oficial de Firebase Firestore en una nueva pestaña"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-300" />
              <span>Abrir Consola Firebase</span>
            </a>

            {!authReady ? (
              <div className="text-xs text-indigo-200 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Conectando con Firebase...</span>
              </div>
            ) : user ? (
              <div className="flex flex-wrap items-center gap-3 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2">
                <div className="text-right">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{user.displayName || user.email}</span>
                  </div>
                  <div className="text-[10px] text-indigo-200 font-mono">{user.email}</div>
                </div>
                <button
                  id="btn-firebase-logout"
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Cerrar sesión de Firebase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Salir</span>
                </button>
              </div>
            ) : (
              <button
                id="btn-firebase-login"
                type="button"
                onClick={handleLogin}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Conectar Cuenta Google con Firebase</span>
              </button>
            )}
          </div>
        </div>

        {/* Cloud Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Empresas Sincronizadas</span>
            </div>
            <div className="text-xl font-black mt-1 font-mono">{companies.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trabajadores en Nube</span>
            </div>
            <div className="text-xl font-black mt-1 font-mono">{employees.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Recibos Art. 105</span>
            </div>
            <div className="text-xl font-black mt-1 font-mono">{receipts.length}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-[11px] text-indigo-200 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Facturas SENIAT</span>
            </div>
            <div className="text-xl font-black mt-1 font-mono">{invoices.length}</div>
          </div>
          <div className="bg-emerald-500/15 rounded-xl p-3 border border-emerald-400/30">
            <div className="text-[11px] text-emerald-200 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Archivos en la Nube</span>
            </div>
            <div className="text-xl font-black mt-1 font-mono text-emerald-300">{cloudFiles.length}</div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Not logged in prompt */}
      {!user && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-amber-700" />
              <span>Autenticación Requerida para Respaldo Seguro en Firebase Firestore</span>
            </h3>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              La base de datos en la nube cuenta con reglas de seguridad Zero-Trust que aíslan los expedientes, trabajadores y archivos por cuenta verificada. Haga clic en <strong>Conectar Cuenta Google</strong> para sincronizar sus datos actuales y subir archivos a la nube.
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogin}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Iniciar Sesión con Google</span>
          </button>
        </div>
      )}

      {/* Two-Column Action Grid: Bulk Sync + Upload File to Cloud */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sync & Auto-Archive Controls */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-600" />
                <span>Sincronización y Respaldo Masivo</span>
              </h3>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">
                {company.rif}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Todos los cambios que realice en Empresas, Trabajadores, Recibos y Facturas se guardan automáticamente en Firebase cuando su sesión está activa. También puede ejecutar un respaldo masivo o convertir sus recibos emitidos en documentos descargables en la nube:
            </p>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Empresa Activa:</span>
                <span className="font-bold text-slate-900">{company.razonSocial}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Recibos de esta empresa:</span>
                <span className="font-mono font-bold text-indigo-700">{companyReceipts.length} comprobantes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trabajadores vinculados:</span>
                <span className="font-mono font-bold text-emerald-700">{companyEmployees.length} trabajadores</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              id="btn-sync-all-firebase"
              type="button"
              disabled={!user || isSyncingAll}
              onClick={handleSyncAllToFirebase}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingAll
                  ? 'Sincronizando con Firebase Firestore...'
                  : 'Sincronizar Todos los Registros con Firebase'}
              </span>
            </button>

            <button
              id="btn-archive-receipts-cloud"
              type="button"
              disabled={!user || isArchivingReceipts || companyReceipts.length === 0}
              onClick={handleArchiveAllCompanyReceiptsToCloud}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isArchivingReceipts
                  ? 'Generando archivos en la nube...'
                  : `Guardar ${companyReceipts.length} Recibos como Archivos en la Nube`}
              </span>
            </button>
          </div>
        </div>

        {/* Right: File Upload Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Subir Archivo o Expediente Escaneado a la Nube</span>
            </h3>
            <span className="text-[10px] text-slate-500">Máx. 650 KB por documento (PDF, Imagen, Word, Excel)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipo de Documento</label>
              <select
                value={uploadFileType}
                onChange={(e) => setUploadFileType(e.target.value as CloudFileType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-medium"
              >
                <option value="expediente_escaneado">Expediente Firmado con Huella</option>
                <option value="recibo_pdf">Comprobante Art. 105 (PDF/HTML)</option>
                <option value="recibo_word">Recibo o Documento Word (.doc)</option>
                <option value="adenda_contrato">Contrato / Adenda Firmada</option>
                <option value="factura_seniat">Factura Fiscal SENIAT / Clínica</option>
                <option value="reporte_excel">Libro de Nómina / Excel (.xlsx)</option>
                <option value="otro_documento">Otro Soporte Probatorio</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Trabajador Asociado (Opcional)</label>
              <select
                value={uploadEmployeeId}
                onChange={(e) => setUploadEmployeeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
              >
                <option value="">-- General de la Empresa --</option>
                {companyEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.cedula})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">N° Recibo / Factura (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. BN-2026-0104 o FAC-0091"
                value={uploadReceiptNumber}
                onChange={(e) => setUploadReceiptNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-mono"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">
              Descripción o Nota de Auditoría del Archivo
            </label>
            <input
              type="text"
              placeholder="Ej. Comprobante escaneado con huella húmeda y firma original del mes de Septiembre 2026..."
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
            />
          </div>

          <label
            className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition cursor-pointer ${
              user
                ? 'border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50/80'
                : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
            }`}
          >
            <Upload className="w-6 h-6 text-indigo-600 mb-1.5" />
            <span className="text-xs font-bold text-slate-800">
              {isUploading
                ? 'Subiendo y cifrando archivo en Firebase Firestore...'
                : 'Haga clic aquí para seleccionar y subir un archivo a la nube'}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5">
              Soporta PDF, imágenes (JPG/PNG), Word (.doc/.docx), Excel (.xlsx) y HTML
            </span>
            <input
              id="input-cloud-file-upload"
              type="file"
              disabled={!user || isUploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Cloud Files Explorer Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              <span>Repositorio de Archivos Guardados en la Nube ({filteredFiles.length})</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Archivos disponibles para descarga inmediata desde cualquier dispositivo con su cuenta
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={onlyCurrentCompany}
                onChange={(e) => setOnlyCurrentCompany(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Solo {company.razonSocial}</span>
            </label>

            <select
              value={selectedFileTypeFilter}
              onChange={(e) => setSelectedFileTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            >
              <option value="all">Todas las categorías</option>
              <option value="expediente_escaneado">Expedientes con Huella</option>
              <option value="recibo_pdf">Comprobantes Art. 105</option>
              <option value="recibo_word">Recibos Word</option>
              <option value="adenda_contrato">Adendas / Contratos</option>
              <option value="factura_seniat">Facturas SENIAT</option>
              <option value="reporte_excel">Libros Excel</option>
              <option value="otro_documento">Otros Documentos</option>
            </select>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Buscar archivo, trabajador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Archivo / Documento</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Empresa / Trabajador</th>
                <th className="px-4 py-3">Descripción Probatoria</th>
                <th className="px-4 py-3 text-right">Tamaño / Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    {user
                      ? 'No hay archivos almacenados en la nube que coincidan con el filtro. Suba un documento o haga clic en "Guardar Recibos como Archivos en la Nube".'
                      : 'Inicie sesión con Google para visualizar y gestionar sus archivos almacenados en Firebase.'}
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file) => {
                  const badge = getFileTypeBadge(file.fileType);
                  return (
                    <tr key={file.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="truncate max-w-xs">{file.fileName}</span>
                        </div>
                        {file.relatedReceiptId && (
                          <span className="text-[10px] font-mono text-indigo-600 block mt-0.5">
                            Ref: {file.relatedReceiptId}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{file.companyName}</div>
                        <div className="text-[10px] text-slate-500">
                          {file.relatedEmployeeName
                            ? `${file.relatedEmployeeName} (${file.relatedEmployeeCedula || ''})`
                            : `RIF: ${file.companyRif}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 text-[11px]">{file.description}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[11px] text-slate-600">
                        <div className="font-bold">{Math.max(1, Math.round(file.fileSize / 1024))} KB</div>
                        <div className="text-[10px] text-slate-400">
                          {file.updatedAt.split('T')[0]}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {(file.mimeType.startsWith('image/') || file.mimeType === 'text/html') && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            title="Vista previa del archivo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownloadCloudFile(file)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                          title="Descargar archivo desde Firebase"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCloudFile(file)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg inline-flex items-center cursor-pointer"
                          title="Eliminar archivo de la nube"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal for HTML or Image files */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">{previewFile.fileName}</h4>
                <p className="text-[11px] text-slate-300">{previewFile.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadCloudFile(previewFile)}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Cerrar ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-slate-100 flex items-center justify-center">
              {previewFile.mimeType.startsWith('image/') ? (
                <img
                  src={previewFile.dataUrl}
                  alt={previewFile.fileName}
                  className="max-w-full max-h-[70vh] rounded-lg shadow-md"
                />
              ) : (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.fileName}
                  className="w-full h-[70vh] bg-white rounded-lg border border-slate-300 shadow-xs"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
