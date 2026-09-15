import React, { useState } from 'react';
import { BenefitReceipt, CompanyConfig, Employee, TriadStatus } from '../types';
import { formatBs, formatUSD } from '../utils/bcv';
import { exportReceiptToWord, exportBatchReceiptsToWord } from '../utils/docxExport';
import { exportReceiptsToExcel } from '../utils/excelExport';
import { printReceiptsDirectly, downloadBatchReceiptsPDF } from '../utils/pdfExport';
import { BatchPrintModal } from './BatchPrintModal';
import {
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  FileText,
  Clock,
  Printer,
  ExternalLink,
  Layers,
  CheckSquare,
  Square,
} from 'lucide-react';

interface TheVaultProps {
  receipts: BenefitReceipt[];
  company: CompanyConfig;
  employees: Employee[];
  onSelectReceipt: (receipt: BenefitReceipt) => void;
  onUpdateReceiptStatus: (id: string, newStatus: TriadStatus) => void;
  onToggleThumbprint: (id: string) => void;
  onOpenBatchPrint?: (receipts: BenefitReceipt[]) => void;
  onMarkBatchSigned?: (ids: string[]) => void;
}

export const TheVault: React.FC<TheVaultProps> = ({
  receipts,
  company,
  employees,
  onSelectReceipt,
  onUpdateReceiptStatus,
  onToggleThumbprint,
  onOpenBatchPrint,
  onMarkBatchSigned,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'pending-transfer' | 'pending-signature' | 'archived'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [localBatchModalOpen, setLocalBatchModalOpen] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Filter logic
  const companyReceipts = receipts.filter((r) => !r.companyId || r.companyId === company.id);

  const filteredReceipts = companyReceipts.filter((r) => {
    // Tab filter
    if (filterTab === 'pending-transfer' && r.triadStatus !== 'parametrizado') return false;
    if (filterTab === 'pending-signature' && (r.hasWetThumbprint || r.triadStatus === 'parametrizado')) return false;
    if (filterTab === 'archived' && r.triadStatus !== 'archivado') return false;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = r.employeeName.toLowerCase().includes(q);
      const matchCedula = r.employeeCedula.toLowerCase().includes(q);
      const matchNum = r.receiptNumber.toLowerCase().includes(q);
      const matchConcept = r.conceptTitle.toLowerCase().includes(q);
      return matchName || matchCedula || matchNum || matchConcept;
    }

    return true;
  });

  const selectedReceipts = companyReceipts.filter((r) => selectedIds.includes(r.id));
  const effectiveBatchReceipts = selectedReceipts.length > 0 ? selectedReceipts : filteredReceipts;

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filteredReceipts.length && filteredReceipts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReceipts.map((r) => r.id));
    }
  };

  const handleOpenBatchModal = () => {
    if (onOpenBatchPrint) {
      onOpenBatchPrint(effectiveBatchReceipts);
    } else {
      setLocalBatchModalOpen(true);
    }
  };

  const handleDirectBatchPdfDownload = () => {
    if (effectiveBatchReceipts.length === 0) return;
    setIsDownloadingPdf(true);
    setStatusBanner(`Generando PDF con ${effectiveBatchReceipts.length} comprobantes en formato ahorro de tóner...`);
    setTimeout(() => {
      try {
        downloadBatchReceiptsPDF(
          effectiveBatchReceipts,
          company,
          `Lote_${effectiveBatchReceipts.length}_Recibos_${company.rif}`
        );
        setStatusBanner(`¡Se generó y descargó el archivo PDF con ${effectiveBatchReceipts.length} recibos exitosamente!`);
      } catch (err) {
        console.error('Error generating batch PDF:', err);
        setStatusBanner('Ocurrió un inconveniente al generar el PDF.');
      } finally {
        setIsDownloadingPdf(false);
        setTimeout(() => setStatusBanner(null), 5000);
      }
    }, 150);
  };

  const countPendingSignature = companyReceipts.filter((r) => !r.hasWetThumbprint).length;
  const countArchived = companyReceipts.filter((r) => r.triadStatus === 'archivado').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <span>Bóveda Documental y Tríada de Control</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Control de expedientes probatorios físicos para {company.razonSocial} (RIF: {company.rif})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-batch-print-vault"
            onClick={handleOpenBatchModal}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Abrir cuadro de impresión y visualización por lote con ahorro de tóner"
          >
            <Printer className="w-4 h-4" />
            <span>
              Imprimir Lote ({effectiveBatchReceipts.length})
            </span>
          </button>
          <button
            id="btn-direct-download-batch-pdf-vault"
            onClick={handleDirectBatchPdfDownload}
            disabled={isDownloadingPdf || effectiveBatchReceipts.length === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Descargar directamente el PDF de múltiples páginas con todos los recibos"
          >
            <Download className="w-4 h-4" />
            <span>
              {isDownloadingPdf ? 'Creando PDF...' : `Descargar PDF (${effectiveBatchReceipts.length})`}
            </span>
          </button>
          <button
            id="btn-export-vault-excel"
            onClick={() => exportReceiptsToExcel(receipts, company, employees)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Libro Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Notification banner for batch actions */}
      {statusBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer ml-3 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Batch Selection Banner if some are selected */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-indigo-950 font-bold">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{selectedIds.length} comprobantes seleccionados para acciones por lote</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-vault-print-selected"
              onClick={handleOpenBatchModal}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
              title="Abrir cuadro de impresión y opciones de lote para los comprobantes seleccionados"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Seleccionados ({selectedReceipts.length})</span>
            </button>
            <button
              id="btn-vault-download-pdf-selected"
              onClick={() => {
                downloadBatchReceiptsPDF(selectedReceipts, company, `Lote_${selectedReceipts.length}_Recibos_${company.rif}`);
                setStatusBanner(`¡Descargando PDF con ${selectedReceipts.length} recibos seleccionados!`);
                setTimeout(() => setStatusBanner(null), 4000);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PDF ({selectedReceipts.length})</span>
            </button>
            <button
              id="btn-vault-download-word-selected"
              onClick={() => {
                exportBatchReceiptsToWord(selectedReceipts, company, `Lote_${selectedReceipts.length}_Recibos_${company.rif}`);
                setStatusBanner(`¡Descargando Word con ${selectedReceipts.length} recibos seleccionados!`);
                setTimeout(() => setStatusBanner(null), 4000);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Descargar Word</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1.5 text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      )}

      {/* Tríada Explanation Cards - Soft Pastel Accents */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200/80 shadow-2xs">
          <div className="flex items-center space-x-2 font-bold text-amber-900 mb-1">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[11px] font-bold">1</span>
            <span>Paso 1: Parametrizado</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Comprobante legal emitido en el sistema con tasa BCV y cláusula de exclusión salarial calculada.
          </p>
        </div>

        <div className="bg-sky-50/40 p-4 rounded-xl border border-sky-200/80 shadow-2xs">
          <div className="flex items-center space-x-2 font-bold text-sky-900 mb-1">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center text-[11px] font-bold">2</span>
            <span>Paso 2: Dispersión / Entrega</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Pago transferido por cuenta independiente de nómina o bolsa de comida entregada en físico.
          </p>
        </div>

        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center space-x-2 font-bold text-emerald-900 mb-1">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">3</span>
            <span>Paso 3: Archivado con Huella</span>
          </div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Documento impreso con firma autógrafa y huella dactilar húmeda resguardado en el archivo físico.
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Todos', count: receipts.length },
            { id: 'pending-signature', label: 'Pendientes de Huella/Firma', count: countPendingSignature, isAlert: countPendingSignature > 0 },
            { id: 'pending-transfer', label: 'Pendientes por Transferir', count: receipts.filter((r) => r.triadStatus === 'parametrizado').length },
            { id: 'archived', label: 'Archivados 100% Blindados', count: countArchived },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`filter-vault-${tab.id}`}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                filterTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  tab.isAlert
                    ? 'bg-rose-500 text-white'
                    : filterTab === tab.id
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-vault-search"
            type="text"
            placeholder="Buscar por cédula, nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-slate-600 hover:text-slate-900 cursor-pointer"
                    title={selectedIds.length === filteredReceipts.length && filteredReceipts.length > 0 ? "Deseleccionar todos" : "Seleccionar todos"}
                  >
                    {selectedIds.length === filteredReceipts.length && filteredReceipts.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 inline" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 inline" />
                    )}
                  </button>
                </th>
                <th className="px-3 py-3">Comprobante</th>
                <th className="px-4 py-3">Trabajador Beneficiario</th>
                <th className="px-4 py-3">Concepto Legal (Art. 105)</th>
                <th className="px-4 py-3 text-right">Monto (BCV)</th>
                <th className="px-4 py-3 text-center">Tríada de Control</th>
                <th className="px-4 py-3 text-center">Huella Húmeda</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron expedientes con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredReceipts.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelect(r.id)}
                          className="cursor-pointer text-slate-500 hover:text-indigo-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 inline" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 inline" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">
                        {r.receiptNumber}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {r.issueDate} • {r.coveragePeriod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <strong className="text-slate-900 block">{r.employeeName}</strong>
                        <span className="text-slate-500 text-[11px]">{r.employeeCedula} • {r.employeeCargo}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="font-medium text-slate-800 line-clamp-1">
                          {r.conceptTitle}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {r.paymentMethod === 'entrega_especie'
                            ? 'Dotación de Alimentos en Especie'
                            : `Transferencia ${r.bankName || ''} - Ref: ${r.referenceNumber || 'Pendiente'}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        <div className="font-bold text-slate-900">{formatUSD(r.amountUSD)}</div>
                        <div className="text-[11px] text-emerald-700">{formatBs(r.amountBs)}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          id={`select-status-${r.id}`}
                          value={r.triadStatus}
                          onChange={(e) => onUpdateReceiptStatus(r.id, e.target.value as TriadStatus)}
                          className={`text-[11px] font-bold rounded-lg px-2 py-1 border cursor-pointer ${
                            r.triadStatus === 'archivado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : r.triadStatus === 'transferido'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          <option value="parametrizado">1. Parametrizado</option>
                          <option value="transferido">2. Transferido/Entregado</option>
                          <option value="archivado">3. Archivado Físico</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          id={`btn-toggle-thumb-vault-${r.id}`}
                          onClick={() => onToggleThumbprint(r.id)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                            r.hasWetThumbprint
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                          title="Haga clic para cambiar estatus de huella dactilar húmeda"
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${r.hasWetThumbprint ? 'text-emerald-600' : 'text-rose-500'}`} />
                          <span>{r.hasWetThumbprint ? 'Archivada' : 'Pendiente'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                        <button
                          id={`btn-print-vault-${r.id}`}
                          type="button"
                          onClick={() => printReceiptsDirectly([r], company)}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-semibold text-[11px] transition cursor-pointer"
                          title="Imprimir comprobante físico con ahorro de tóner"
                        >
                          Imprimir
                        </button>
                        <button
                          id={`btn-pdf-vault-${r.id}`}
                          type="button"
                          onClick={() => downloadBatchReceiptsPDF([r], company, r.receiptNumber)}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded font-semibold text-[11px] transition cursor-pointer"
                          title="Descargar en PDF"
                        >
                          PDF
                        </button>
                        <button
                          id={`btn-word-vault-${r.id}`}
                          type="button"
                          onClick={() => exportReceiptToWord(r, company)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold text-[11px] transition cursor-pointer"
                          title="Descargar en Microsoft Word (.doc)"
                        >
                          Word
                        </button>
                        <button
                          id={`btn-view-vault-${r.id}`}
                          type="button"
                          onClick={() => onSelectReceipt(r)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-[11px] transition cursor-pointer"
                        >
                          Ver
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

      {/* Fallback local batch modal if onOpenBatchPrint is not provided */}
      {localBatchModalOpen && !onOpenBatchPrint && (
        <BatchPrintModal
          receipts={effectiveBatchReceipts}
          company={company}
          onClose={() => setLocalBatchModalOpen(false)}
          onMarkBatchSigned={onMarkBatchSigned}
        />
      )}
    </div>
  );
};
