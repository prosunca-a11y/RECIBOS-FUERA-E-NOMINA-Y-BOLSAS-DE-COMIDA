import React, { useState, useEffect } from 'react';
import { BenefitReceipt, CompanyConfig, GroceryItem } from '../types';
import { formatBs, formatUSD } from '../utils/bcv';
import { exportReceiptToWord } from '../utils/docxExport';
import { printReceiptsDirectly, downloadBatchReceiptsPDF } from '../utils/pdfExport';
import { GROCERY_PRESETS } from '../data/groceryPresets';
import {
  FileText,
  Printer,
  CheckCircle,
  AlertTriangle,
  X,
  Shield,
  Download,
  Edit3,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Check,
  Eye,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

interface ReceiptModalProps {
  receipt: BenefitReceipt;
  company: CompanyConfig;
  onClose: () => void;
  onToggleStatus?: (id: string, newStatus: 'parametrizado' | 'transferido' | 'archivado') => void;
  onToggleThumbprint?: (id: string) => void;
  onUpdateReceipt?: (updatedReceipt: BenefitReceipt) => void;
  isPreview?: boolean;
  onConfirmEmit?: (receipt: BenefitReceipt) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  company,
  onClose,
  onToggleStatus,
  onToggleThumbprint,
  onUpdateReceipt,
  isPreview = false,
  onConfirmEmit,
}) => {
  const isBolsa = receipt.category === 'bolsa_comida';

  // State for grocery items editing
  const [isEditingItems, setIsEditingItems] = useState<boolean>(false);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(receipt.groceryItems || []);
  const [amountUSD, setAmountUSD] = useState<number>(receipt.amountUSD);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // State for adding a new item inside modal
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState<string>('kg');

  // Synchronize when receipt prop changes
  useEffect(() => {
    setGroceryItems(receipt.groceryItems || []);
    setAmountUSD(receipt.amountUSD);
  }, [receipt]);

  const currentTasaBCV = receipt.tasaBCV || company.tasaBCV;
  const currentAmountBs = Math.round(amountUSD * currentTasaBCV * 100) / 100;

  const getEffectiveReceipt = (): BenefitReceipt => ({
    ...receipt,
    groceryItems,
    amountUSD,
    amountBs: currentAmountBs,
  });

  // Direct Print handler using hidden iframe (reliable across all browsers and modals)
  const handlePrint = async () => {
    const receiptToPrint = getEffectiveReceipt();
    const success = await printReceiptsDirectly([receiptToPrint], company);
    if (!success) {
      // If print iframe or dialog was blocked by browser security, fallback directly to PDF download
      downloadBatchReceiptsPDF([receiptToPrint], company, receipt.receiptNumber);
    }
  };

  // Direct PDF Download handler
  const handlePdfDownload = () => {
    const receiptToPdf = getEffectiveReceipt();
    downloadBatchReceiptsPDF([receiptToPdf], company, receipt.receiptNumber);
  };

  // Word export handler - uses current edited items
  const handleWordDownload = () => {
    const receiptToExport = getEffectiveReceipt();
    exportReceiptToWord(receiptToExport, company);
  };

  // Add new item to grocery list
  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newItem: GroceryItem = {
      id: `modal-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newItemName.trim(),
      quantity: newItemQty,
      unit: newItemUnit,
    };
    setGroceryItems([...groceryItems, newItem]);
    setNewItemName('');
    setNewItemQty(1);
    setSaveSuccessMessage(null);
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setGroceryItems(groceryItems.filter((i) => i.id !== id));
    setSaveSuccessMessage(null);
  };

  // Update existing item field
  const handleUpdateItem = (id: string, field: 'name' | 'quantity' | 'unit', value: string | number) => {
    setGroceryItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === 'quantity' ? Math.max(1, Number(value) || 1) : value,
          };
        }
        return item;
      })
    );
    setSaveSuccessMessage(null);
  };

  // Load preset combo
  const handleLoadPreset = (presetKey: string) => {
    const preset = GROCERY_PRESETS[presetKey];
    if (!preset) return;
    setGroceryItems([...preset.items]);
    if (preset.defaultUSD) {
      setAmountUSD(preset.defaultUSD);
    }
    setSaveSuccessMessage(`Se cargaron los víveres de: "${preset.name}". Recuerde guardar los cambios.`);
  };

  // Save changes to parent state and storage
  const handleSaveChanges = () => {
    const updatedReceipt: BenefitReceipt = {
      ...receipt,
      groceryItems: [...groceryItems],
      amountUSD,
      amountBs: currentAmountBs,
    };

    if (onUpdateReceipt) {
      onUpdateReceipt(updatedReceipt);
    }

    setSaveSuccessMessage('¡Víveres y valores del recibo actualizados y guardados exitosamente!');
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 4000);
  };

  // Emit draft receipt
  const handleEmitDraft = () => {
    const receiptToEmit: BenefitReceipt = {
      ...receipt,
      groceryItems: [...groceryItems],
      amountUSD,
      amountBs: currentAmountBs,
    };
    if (onConfirmEmit) {
      onConfirmEmit(receiptToEmit);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden my-4 sm:my-8 max-h-[92vh] flex flex-col">
        {/* Top Notification if in Preview/Draft Mode */}
        {isPreview && (
          <div className="no-print bg-emerald-50 text-emerald-900 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-emerald-200">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span className="font-bold uppercase tracking-wide">
                Modo Previsualización (Borrador de Entrega de Víveres)
              </span>
              <span className="hidden sm:inline text-emerald-700">
                — Revise y modifique los víveres antes de emitir definitivamente.
              </span>
            </div>
            {onConfirmEmit && (
              <button
                id="btn-confirm-emit-from-modal"
                onClick={handleEmitDraft}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs shadow-2xs transition flex items-center space-x-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirmar y Emitir Comprobante</span>
              </button>
            )}
          </div>
        )}

        {/* Header - No print */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50/90 text-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg border ${isBolsa ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
              {isBolsa ? <ShoppingBag className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base sm:text-lg leading-tight text-slate-900">
                  {isPreview ? 'Previsualización:' : 'Comprobante Oficial:'} {receipt.receiptNumber}
                </h3>
                {isBolsa && (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-mono uppercase font-bold border border-emerald-200">
                    Bolsa de Víveres
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Fundamento: Art. 105 Numeral 2 LOTTT • Art. 73 RLOT • Sentencia 523 TSJ • Deducible ISLR Art. 27
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button
              id="btn-print-receipt-modal"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Imprimir directamente este recibo (Ahorro de Tóner)"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              id="btn-download-pdf-modal"
              onClick={handlePdfDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Descargar archivo PDF de alta resolución"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF (.pdf)</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              id="btn-download-word-modal"
              onClick={handleWordDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Descargar Comprobante en Microsoft Word editable"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Word (.doc)</span>
              <span className="sm:hidden">Word</span>
            </button>
            <button
              id="btn-close-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tríada Actions & Grocery Editor Controls - No print */}
        <div className="no-print bg-slate-50/60 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Estatus Tríada:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-medium text-[11px] ${
                receipt.triadStatus === 'archivado'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : receipt.triadStatus === 'transferido'
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {receipt.triadStatus === 'archivado'
                ? '3. Archivado Físico (100% Blindado)'
                : receipt.triadStatus === 'transferido'
                ? '2. Pago/Entrega Realizada'
                : '1. Parametrizado'}
            </span>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Toggle Grocery Editor if Bolsa */}
            {isBolsa && (
              <button
                id="btn-toggle-edit-groceries-modal"
                onClick={() => setIsEditingItems(!isEditingItems)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-semibold cursor-pointer transition ${
                  isEditingItems
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingItems ? 'Cerrar Editor de Víveres' : 'Modificar / Introducir Víveres'}</span>
              </button>
            )}

            {onToggleThumbprint && !isPreview && (
              <button
                id="btn-toggle-thumbprint"
                onClick={() => onToggleThumbprint(receipt.id)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border font-medium cursor-pointer transition-colors ${
                  receipt.hasWetThumbprint
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CheckCircle
                  className={`w-3.5 h-3.5 ${receipt.hasWetThumbprint ? 'text-emerald-600' : 'text-slate-400'}`}
                />
                <span>{receipt.hasWetThumbprint ? 'Huella Húmeda Registrada' : 'Marcar Huella Registrada'}</span>
              </button>
            )}

            {onToggleStatus && !isPreview && receipt.triadStatus !== 'archivado' && (
              <button
                id="btn-mark-archived"
                onClick={() => onToggleStatus(receipt.id, 'archivado')}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg cursor-pointer transition shadow-2xs"
              >
                Completar Archivo Físico
              </button>
            )}
          </div>
        </div>

        {/* Save Success Banner */}
        {saveSuccessMessage && (
          <div className="no-print bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-semibold text-emerald-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{saveSuccessMessage}</span>
            </div>
            <button onClick={() => setSaveSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white print-container">
          {/* Header */}
          <div className="border-b border-slate-300 pb-3 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-tight">
                  {company.razonSocial}
                </h1>
                <p className="text-xs font-semibold text-slate-600">R.I.F.: {company.rif}</p>
                <p className="text-xs text-slate-500 max-w-md">{company.direccionFiscal}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-2.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-xs font-bold text-slate-800">
                  COMPROBANTE N° {receipt.receiptNumber}
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  <strong>Emisión:</strong> {receipt.issueDate}
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Período:</strong> {receipt.coveragePeriod}
                </p>
              </div>
            </div>
          </div>

          {/* Title Banner - Clean & Low-Toner */}
          <div className="border border-slate-300 bg-slate-50/50 text-slate-800 text-center py-2 px-4 rounded mb-5">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
              {isBolsa
                ? 'COMPROBANTE DE RECEPCIÓN DE BENEFICIO EN ESPECIE (BOLSA DE COMIDA)'
                : 'RECIBO DE BENEFICIO SOCIAL NO REMUNERATIVO'}
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-600">
              Amparado en el Art. 105 Numeral 2 de la LOTTT, Art. 73 RLOT y Sentencia N° 523 TSJ (Caso INDULAC)
            </p>
          </div>

          {/* 1. Datos del Trabajador */}
          <div className="mb-4">
            <div className="border-b border-slate-200 pb-1 text-slate-800 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>1. Datos del Trabajador Beneficiario</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-white p-3 rounded border border-slate-200">
              <div>
                <span className="text-slate-500 block">Nombres y Apellidos:</span>
                <strong className="text-slate-900">{receipt.employeeName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Cédula de Identidad:</span>
                <strong className="text-slate-900">{receipt.employeeCedula}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Cargo Asignado:</span>
                <span className="text-slate-800">{receipt.employeeCargo}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Período de Aplicación:</span>
                <span className="text-slate-800 font-medium">{receipt.coveragePeriod}</span>
              </div>
            </div>
          </div>

          {/* 2. Detalle del Beneficio */}
          <div className="mb-4">
            <div className="border-b border-slate-200 pb-1 text-slate-800 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>2. Detalle del Beneficio Social Otorgado</span>
            </div>
            <div className="space-y-2 text-xs bg-white p-3 rounded border border-slate-200">
              <div>
                <span className="text-slate-500 block">Denominación Oficial:</span>
                <strong className="text-slate-900 text-sm">{receipt.conceptTitle}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Propósito Asistencial:</span>
                <p className="text-slate-700 leading-relaxed">{receipt.conceptDescription}</p>
              </div>

              {receipt.paymentMethod === 'transferencia_independiente' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Método de Dispersión:</span>
                    <span className="font-semibold text-slate-800">
                      Transferencia Bancaria Independiente (Fuera de Nómina)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Banco y Referencia:</span>
                    <span className="font-mono text-slate-900">
                      {receipt.bankName || 'Banco Comercial'} — Ref: {receipt.referenceNumber || 'N/A'}
                    </span>
                  </div>
                </div>
              )}

              {receipt.category === 'gastos_medicos' && receipt.clinicalInvoiceNumber && (
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-200 bg-slate-50/50 p-2 rounded">
                  <div>
                    <span className="text-slate-500 block">Factura Fiscal Clínica:</span>
                    <strong className="text-slate-900">{receipt.clinicalInvoiceNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">R.I.F. Emisor Salud:</span>
                    <strong className="text-slate-900">{receipt.clinicalInvoiceRIF}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Paciente Atendido:</span>
                    <span className="text-slate-800">
                      {receipt.patientName} ({receipt.patientRelation})
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GROCERY ITEMS SECTION (BOLSA DE COMIDA) */}
          {isBolsa && (
            <div className="mb-4">
              <div className="border-b border-slate-200 pb-1 text-slate-800 text-xs font-bold uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Relación Detallada de Víveres Entregados en Especie ({groceryItems.length} ítems)</span>
                <div className="no-print flex items-center space-x-2 font-normal lowercase">
                  <button
                    type="button"
                    onClick={() => setIsEditingItems(!isEditingItems)}
                    className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-semibold text-[11px] cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditingItems ? 'Ver comprobante limpio' : 'Modificar o añadir víveres'}</span>
                  </button>
                </div>
              </div>

              {/* EDIT MODE: Form & Inline inputs to introduce or modify items (No-print) */}
              {isEditingItems && (
                <div className="no-print mb-4 p-4 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-200">
                    <div>
                      <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wide flex items-center space-x-1.5">
                        <ShoppingBag className="w-4 h-4 text-emerald-700" />
                        <span>Editor de Víveres del Comprobante</span>
                      </h4>
                      <p className="text-[11px] text-emerald-800">
                        Introduzca nuevos productos, edite nombres, ajuste cantidades o cambie presentaciones.
                      </p>
                    </div>

                    {/* Presets Quick Load */}
                    <div className="flex items-center space-x-1 text-xs">
                      <span className="text-[11px] font-semibold text-emerald-900 mr-1 flex items-center space-x-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Cestas Rápidas:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset('basica')}
                        className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-[11px] font-medium text-slate-700 hover:bg-emerald-100 cursor-pointer"
                        title="Cargar Cesta Básica (10 víveres)"
                      >
                        Básica
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset('proteica')}
                        className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-[11px] font-medium text-slate-700 hover:bg-emerald-100 cursor-pointer"
                        title="Cargar Cesta Proteica (8 víveres)"
                      >
                        Proteica
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset('higiene')}
                        className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-[11px] font-medium text-slate-700 hover:bg-emerald-100 cursor-pointer"
                        title="Cargar Cesta Higiene (7 productos)"
                      >
                        Higiene
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadPreset('completa')}
                        className="px-2 py-0.5 bg-white border border-emerald-300 rounded text-[11px] font-medium text-slate-700 hover:bg-emerald-100 cursor-pointer"
                        title="Cargar Cesta Integral Completa (12 productos)"
                      >
                        Completa
                      </button>
                    </div>
                  </div>

                  {/* List of items with inline editable inputs */}
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {groceryItems.map((item, index) => (
                      <div
                        key={item.id || index}
                        className="flex items-center gap-2 bg-white p-2 rounded-lg border border-emerald-200 shadow-2xs"
                      >
                        <span className="text-slate-400 font-mono text-[11px] w-5 text-right">{index + 1}.</span>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          placeholder="Nombre del vívere"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-900 font-medium focus:bg-white focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                            className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer"
                            title="Disminuir cantidad"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                            className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-1 text-xs text-center font-mono font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, 'quantity', item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer"
                            title="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>
                        <select
                          value={item.unit}
                          onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                          className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800"
                        >
                          <option value="kg">kg</option>
                          <option value="litros">litros</option>
                          <option value="unidades">unidades</option>
                          <option value="latas">latas</option>
                          <option value="paquetes">paquetes</option>
                          <option value="frascos">frascos</option>
                          <option value="bolsas">bolsas</option>
                          <option value="cartones">cartones</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer transition"
                          title="Eliminar vívere de la lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {groceryItems.length === 0 && (
                      <p className="text-xs text-slate-500 italic text-center py-3">
                        No hay víveres en la lista. Introduzca uno abajo o seleccione una cesta predefinida.
                      </p>
                    )}
                  </div>

                  {/* Add New Item Inputs */}
                  <div className="pt-2 border-t border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase block mb-1.5">
                      + Introducir Nuevo Vívere a la Entrega:
                    </span>
                    <div className="flex flex-wrap sm:flex-nowrap gap-2">
                      <input
                        type="text"
                        placeholder="Ej: Harina de Trigo Todo Uso (1 kg)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItem();
                          }
                        }}
                        className="flex-1 bg-white border border-emerald-300 rounded px-2.5 py-1.5 text-xs placeholder:text-slate-400"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                        className="w-16 bg-white border border-emerald-300 rounded px-2 py-1.5 text-xs text-center font-mono font-bold"
                      />
                      <select
                        value={newItemUnit}
                        onChange={(e) => setNewItemUnit(e.target.value)}
                        className="w-24 bg-white border border-emerald-300 rounded px-2 py-1.5 text-xs"
                      >
                        <option value="kg">kg</option>
                        <option value="litros">litros</option>
                        <option value="unidades">unidades</option>
                        <option value="latas">latas</option>
                        <option value="paquetes">paquetes</option>
                        <option value="frascos">frascos</option>
                        <option value="bolsas">bolsas</option>
                        <option value="cartones">cartones</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-bold flex items-center space-x-1 cursor-pointer transition shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Añadir</span>
                      </button>
                    </div>
                  </div>

                  {/* Value adjustment & Save Buttons */}
                  <div className="pt-2 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-emerald-950 font-semibold">Valor Estimado:</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-500 font-mono">$</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={amountUSD}
                          onChange={(e) => setAmountUSD(parseFloat(e.target.value) || 0)}
                          className="w-20 bg-white border border-emerald-300 rounded px-2 py-1 font-mono font-bold text-xs"
                        />
                      </div>
                      <span className="text-slate-600 font-mono text-[11px]">
                        = {formatBs(currentAmountBs)} (BCV {currentTasaBCV.toFixed(2)})
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSaveChanges}
                        className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Cambios en Recibo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingItems(false)}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Ver Documento
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Clean Official Table (Displayed in Document and Printed) */}
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 text-slate-700">
                    <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold w-10">N°</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-left font-semibold">
                      Producto / Presentación Dotada
                    </th>
                    <th className="border border-slate-300 px-3 py-1.5 text-center font-semibold w-32">Cantidad</th>
                    <th className="border border-slate-300 px-3 py-1.5 text-center font-semibold w-24">Verificado</th>
                  </tr>
                </thead>
                <tbody>
                  {groceryItems.map((item, idx) => (
                    <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="border border-slate-200 px-2.5 py-1.5 text-slate-500 text-center font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-200 px-3 py-1.5 font-medium text-slate-800">{item.name}</td>
                      <td className="border border-slate-200 px-3 py-1.5 text-center font-mono font-semibold text-slate-900">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="border border-slate-200 px-3 py-1.5 text-center">
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] text-emerald-800 font-medium bg-white border border-emerald-300">
                          ✓ Entregado
                        </span>
                      </td>
                    </tr>
                  ))}
                  {groceryItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="border border-slate-200 px-3 py-3 text-center text-slate-500 italic">
                        Sin víveres asignados. Haga clic en &quot;Modificar o añadir víveres&quot; arriba.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. Conversión Cambiaria BCV - Low-Toner Minimalist */}
          <div className="mb-5 border border-slate-300 bg-slate-50/30 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-[10px] font-semibold text-slate-600 uppercase block">
                  Monto Estimado en Divisas
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">{formatUSD(amountUSD)}</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-[10px] font-semibold text-slate-600 uppercase block">
                  Tasa Oficial BCV ({receipt.issueDate})
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                  Bs. {currentTasaBCV.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-600 uppercase block">
                  Monto Referencial Liquidado
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                  {formatBs(currentAmountBs)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Declaración de Exclusión Salarial - Low-Toner Clean Frame */}
          <div className="mb-6 p-3.5 border border-slate-300 bg-slate-50/20 rounded text-xs text-slate-700 leading-relaxed text-justify">
            <strong className="block text-slate-900 font-bold mb-1 uppercase tracking-wide">
              Declaración de Conformidad y Exclusión Salarial Taxativa:
            </strong>
            Yo, <strong>{receipt.employeeName}</strong>, titular de la Cédula de Identidad N°{' '}
            <strong>{receipt.employeeCedula}</strong>, declaro haber recibido de mi patrono{' '}
            <strong>{company.razonSocial}</strong> el beneficio arriba especificado a mi entera y total satisfacción.
            De conformidad con lo consagrado en el <strong>Artículo 105 de la LOTTT</strong>, el{' '}
            <strong>Artículo 73 del Reglamento de la LOT</strong>, y la doctrina de la{' '}
            <strong>Sentencia N° 523 de la Sala de Casación Social del Tribunal Supremo de Justicia (Caso INDULAC, 13/11/2025)</strong>
            , reconozco y acepto de manera expresa que este concepto constituye un{' '}
            <strong>BENEFICIO SOCIAL DE CARÁCTER NO REMUNERATIVO</strong> destinado a la protección económica y
            nutricional de mi núcleo familiar. En consecuencia, <strong>NO CONSTITUYE SALARIO</strong>, no forma parte de
            mi salario normal ni integral, y se encuentra <strong>ESTRICTAMENTE EXCLUIDO</strong> de la base de cálculo de
            prestaciones sociales (tanto garantía como retroactividad), utilidades, bono vacacional, vacaciones o
            indemnizaciones derivadas de la relación de trabajo.
          </div>

          {/* 5. Firmas y Huella Dactilar Húmeda - Low Toner Minimalist */}
          <div className="grid grid-cols-2 gap-8 items-end pt-2 mb-4">
            <div className="text-center">
              <div className="h-14 border-b border-slate-400 flex items-end justify-center pb-1">
                {receipt.hasPhysicalSignature && (
                  <span className="text-xs font-serif italic text-slate-700">
                    [Firma física registrada en expediente]
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs font-bold text-slate-900 uppercase">{receipt.employeeName}</p>
              <p className="text-xs text-slate-600">C.I.: {receipt.employeeCedula}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                Firma del Trabajador Beneficiario
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-26 h-30 border border-dashed border-slate-400 rounded bg-white flex flex-col items-center justify-center p-2 text-center relative">
                {receipt.hasWetThumbprint ? (
                  <div className="flex flex-col items-center text-emerald-800">
                    <CheckCircle className="w-7 h-7 text-emerald-700 mb-1" />
                    <span className="text-[9px] font-bold uppercase">Huella Registrada en Archivo</span>
                  </div>
                ) : (
                  <>
                    <div className="w-9 h-12 border border-slate-300 rounded-full mb-1 opacity-40"></div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase leading-tight">
                      HUELLA DACTILAR
                      <br />
                      (PULGAR DERECHO)
                    </span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Huella Dactilar Húmeda</p>
            </div>
          </div>

          {/* Footer Fiscal */}
          <div className="border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
            Documento de control interno probatorio amparado en los Arts. 104, 105 de la LOTTT y Art. 27 Numeral 22 de
            la Ley de ISLR para su aceptación y deducibilidad ante el SENIAT.
            <br />
            ID Único de Seguridad:{' '}
            <span className="font-mono">
              {receipt.id}-{receipt.receiptNumber}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
