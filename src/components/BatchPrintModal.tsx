import React, { useState } from 'react';
import { BenefitReceipt, CompanyConfig } from '../types';
import { formatBs, formatUSD } from '../utils/bcv';
import { printReceiptsDirectly, downloadBatchReceiptsPDF, generateReceiptPrintHtml } from '../utils/pdfExport';
import { exportBatchReceiptsToWord } from '../utils/docxExport';
import {
  Printer,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ShieldCheck,
  Check,
  Building2,
  Calendar,
  Users,
} from 'lucide-react';

interface BatchPrintModalProps {
  receipts: BenefitReceipt[];
  company: CompanyConfig;
  onClose: () => void;
  onMarkBatchSigned?: (ids: string[]) => void;
}

export function BatchPrintModal({
  receipts: initialReceipts,
  company,
  onClose,
  onMarkBatchSigned,
}: BatchPrintModalProps) {
  const [selectedReceipts, setSelectedReceipts] = useState<BenefitReceipt[]>(initialReceipts);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);
  const [previewLimit, setPreviewLimit] = useState<number>(6);

  const totalUSD = selectedReceipts.reduce((acc, r) => acc + r.amountUSD, 0);
  const totalBs = selectedReceipts.reduce((acc, r) => acc + r.amountBs, 0);
  const withThumbprintCount = selectedReceipts.filter((r) => r.hasWetThumbprint).length;

  const handleToggleSelect = (receipt: BenefitReceipt) => {
    if (selectedReceipts.some((r) => r.id === receipt.id)) {
      setSelectedReceipts(selectedReceipts.filter((r) => r.id !== receipt.id));
    } else {
      setSelectedReceipts([...selectedReceipts, receipt]);
    }
  };

  const handleSelectAll = () => {
    if (selectedReceipts.length === initialReceipts.length) {
      setSelectedReceipts([]);
    } else {
      setSelectedReceipts([...initialReceipts]);
    }
  };

  // Direct Print
  const handlePrintBatch = async () => {
    if (selectedReceipts.length === 0) return;
    setIsPrinting(true);
    setStatusNotification('Enviando lote al diálogo de impresión...');
    try {
      const success = await printReceiptsDirectly(selectedReceipts, company);
      if (success) {
        setStatusNotification('¡Lote procesado! Se abrió el diálogo de impresión.');
      } else {
        // Fallback to direct PDF download if browser blocks printing
        setStatusNotification('El navegador bloqueó la ventana emergente. Descargando lote en PDF automáticamente...');
        downloadBatchReceiptsPDF(selectedReceipts, company, `Lote_${selectedReceipts.length}_Recibos`);
      }
    } catch (err) {
      console.error(err);
      downloadBatchReceiptsPDF(selectedReceipts, company, `Lote_${selectedReceipts.length}_Recibos`);
    } finally {
      setIsPrinting(false);
      setTimeout(() => setStatusNotification(null), 5000);
    }
  };

  // Direct PDF Download
  const handleDownloadPdfBatch = () => {
    if (selectedReceipts.length === 0) return;
    setIsGeneratingPdf(true);
    setStatusNotification('Generando archivo PDF con todas las páginas...');
    setTimeout(() => {
      try {
        downloadBatchReceiptsPDF(selectedReceipts, company, `Lote_${selectedReceipts.length}_Recibos`);
        setStatusNotification(`¡Archivo PDF generado exitosamente (${selectedReceipts.length} páginas)!`);
      } catch (err) {
        console.error('Error generating PDF batch:', err);
        setStatusNotification('Ocurrió un inconveniente al generar el PDF.');
      } finally {
        setIsGeneratingPdf(false);
        setTimeout(() => setStatusNotification(null), 4000);
      }
    }, 150);
  };

  // Word Batch Export
  const handleDownloadWordBatch = () => {
    if (selectedReceipts.length === 0) return;
    exportBatchReceiptsToWord(selectedReceipts, company, `Lote_${selectedReceipts.length}_Comprobantes`);
    setStatusNotification(`¡Documento Word (.doc) con ${selectedReceipts.length} recibos descargado!`);
    setTimeout(() => setStatusNotification(null), 4000);
  };

  // Mark all selected as signed/with wet thumbprint
  const handleMarkAllSigned = () => {
    if (onMarkBatchSigned && selectedReceipts.length > 0) {
      const ids = selectedReceipts.map((r) => r.id);
      onMarkBatchSigned(ids);
      setSelectedReceipts((prev) =>
        prev.map((r) => ({
          ...r,
          hasWetThumbprint: true,
          hasPhysicalSignature: true,
          triadStatus: 'archivado',
        }))
      );
      setStatusNotification('¡Se marcaron todos los recibos seleccionados con firma y huella física en la bóveda!');
      setTimeout(() => setStatusNotification(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-4 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold tracking-tight">Impresión y Exportación por Lotes</h2>
                <span className="px-2 py-0.5 bg-indigo-600/60 text-indigo-100 rounded-full text-[11px] font-mono">
                  {selectedReceipts.length} de {initialReceipts.length} seleccionados
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center space-x-2 mt-0.5">
                <span>{company.razonSocial} (RIF: {company.rif})</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusNotification && (
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2.5 text-xs text-indigo-900 font-semibold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{statusNotification}</span>
            </div>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-indigo-400 hover:text-indigo-700"
            >
              ×
            </button>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-4 sm:p-5 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Summary KPIs */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-slate-500">Recibos: </span>
              <strong className="text-slate-900 font-bold">{selectedReceipts.length}</strong>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-mono">
              <span className="text-slate-500 font-sans">Total USD: </span>
              <strong className="text-indigo-950 font-bold">{formatUSD(totalUSD)}</strong>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg font-mono">
              <span className="text-slate-500 font-sans">Total Bs: </span>
              <strong className="text-slate-900 font-bold">{formatBs(totalBs)}</strong>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className="text-slate-500">Con Huella: </span>
              <strong className={withThumbprintCount === selectedReceipts.length ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                {withThumbprintCount} / {selectedReceipts.length}
              </strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-batch-print-action"
              disabled={selectedReceipts.length === 0 || isPrinting}
              onClick={handlePrintBatch}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              title="Abre el cuadro de impresión para todo el lote"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Preparando...' : 'Imprimir Lote'}</span>
            </button>

            <button
              id="btn-batch-pdf-action"
              disabled={selectedReceipts.length === 0 || isGeneratingPdf}
              onClick={handleDownloadPdfBatch}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              title="Descarga un PDF de múltiples páginas con todos los recibos"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Creando PDF...' : 'Descargar PDF (.pdf)'}</span>
            </button>

            <button
              id="btn-batch-word-action"
              disabled={selectedReceipts.length === 0}
              onClick={handleDownloadWordBatch}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center space-x-1.5 cursor-pointer"
              title="Descarga documento de Word con saltos de página"
            >
              <FileText className="w-4 h-4" />
              <span>Word (.doc)</span>
            </button>

            {onMarkBatchSigned && (
              <button
                onClick={handleMarkAllSigned}
                disabled={selectedReceipts.length === 0}
                className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                title="Marcar firma y huella en físico para todo este lote"
              >
                <Check className="w-4 h-4 inline mr-1 text-emerald-600" />
                <span>Marcar Huellas</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content Area: Split View with List and Preview */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Column: List of receipts in batch with checkboxes */}
          <div className="md:col-span-4 border-r border-slate-200 overflow-y-auto p-4 bg-slate-50/40 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <button
                onClick={handleSelectAll}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
              >
                {selectedReceipts.length === initialReceipts.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </button>
              <span className="text-[11px] text-slate-500 font-mono">
                {selectedReceipts.length} seleccionados
              </span>
            </div>

            <div className="space-y-2">
              {initialReceipts.map((receipt) => {
                const isChecked = selectedReceipts.some((r) => r.id === receipt.id);
                return (
                  <div
                    key={receipt.id}
                    onClick={() => handleToggleSelect(receipt)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-start space-x-3 ${
                      isChecked
                        ? 'bg-indigo-50/60 border-indigo-300 text-indigo-950'
                        : 'bg-white border-slate-200 text-slate-600 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="mt-0.5 rounded text-indigo-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate">{receipt.employeeName}</span>
                        <span className="font-mono text-[10px] text-indigo-700 font-bold">
                          {formatUSD(receipt.amountUSD)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5 font-mono">
                        <span>{receipt.employeeCedula}</span>
                        <span>{receipt.receiptNumber}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1 text-[10px]">
                        {receipt.hasWetThumbprint ? (
                          <span className="text-emerald-700 flex items-center space-x-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Con huella</span>
                          </span>
                        ) : (
                          <span className="text-amber-700 flex items-center space-x-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>Pendiente huella</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Printable Sheets Preview */}
          <div className="md:col-span-8 overflow-y-auto p-6 bg-slate-200/50 space-y-6">
            <div className="flex items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-300">
              <span className="font-bold uppercase tracking-wider text-[11px]">
                Previsualización de Hojas Impresas ({selectedReceipts.length} Páginas)
              </span>
              <span className="text-slate-500">
                Formato Carta (Letter) • Ahorro de Tóner Activo
              </span>
            </div>

            {selectedReceipts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <Layers className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold">No ha seleccionado ningún recibo para el lote.</p>
                <p className="text-xs text-slate-400 mt-1">Marque las casillas en la columna izquierda para incluir comprobantes.</p>
              </div>
            ) : (
              <>
                {selectedReceipts.length > previewLimit && (
                  <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between">
                    <span>
                      Mostrando {previewLimit} de {selectedReceipts.length} páginas en previsualización rápida. (El PDF y la impresión incluirán las {selectedReceipts.length} páginas).
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewLimit(selectedReceipts.length)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] cursor-pointer ml-3 flex-shrink-0"
                    >
                      Cargar todas ({selectedReceipts.length})
                    </button>
                  </div>
                )}
                {selectedReceipts.slice(0, previewLimit).map((receipt, idx) => (
                  <div
                    key={receipt.id}
                    className="bg-white rounded-xl border border-slate-300 shadow-sm p-6 relative"
                  >
                    <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      Página {idx + 1} de {selectedReceipts.length}
                    </div>
                    {/* Clean preview card */}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateReceiptPrintHtml(receipt, company),
                      }}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Todos los comprobantes incluyen jurisprudencia vinculante Sentencia N° 523 TSJ y Art. 105 LOTTT</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </div>
  );
}
