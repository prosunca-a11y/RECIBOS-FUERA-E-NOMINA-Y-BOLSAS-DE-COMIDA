import React, { useState } from 'react';
import { BenefitReceipt, CompanyConfig, Employee, GroceryItem } from '../types';
import { formatBs, formatUSD } from '../utils/bcv';
import { exportReceiptToWord, exportContractAdendaToWord } from '../utils/docxExport';
import { DEFAULT_GROCERY_ITEMS } from '../data/initialData';
import { GROCERY_PRESETS } from '../data/groceryPresets';
import {
  ShoppingBag,
  FileText,
  Download,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  Eye,
  Edit3,
  Check,
  Sparkles,
  RotateCcw,
  Users,
} from 'lucide-react';

interface FoodBasketModuleProps {
  company: CompanyConfig;
  employees: Employee[];
  receipts: BenefitReceipt[];
  onAddReceipt: (receipt: BenefitReceipt) => void;
  onSelectReceipt: (receipt: BenefitReceipt) => void;
  onUpdateReceipt?: (receipt: BenefitReceipt) => void;
  onToggleThumbprint: (id: string) => void;
  onNavigateTab: (tab: string) => void;
  onPreviewDraftReceipt?: (draft: BenefitReceipt) => void;
  onOpenBatchPrint?: (receipts: BenefitReceipt[]) => void;
}

export const FoodBasketModule: React.FC<FoodBasketModuleProps> = ({
  company,
  employees,
  receipts,
  onAddReceipt,
  onSelectReceipt,
  onUpdateReceipt,
  onToggleThumbprint,
  onNavigateTab,
  onPreviewDraftReceipt,
  onOpenBatchPrint,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [coveragePeriod, setCoveragePeriod] = useState<string>('Septiembre 2026');
  const [valueUSD, setValueUSD] = useState<number>(55);
  const [items, setItems] = useState<GroceryItem[]>(DEFAULT_GROCERY_ITEMS);

  // Form states for adding new grocery
  const [newItemName, setNewItemName] = useState<string>('');
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemUnit, setNewItemUnit] = useState<string>('kg');

  // Inline editing state for an item in the form list
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const foodReceipts = receipts.filter(
    (r) => (!r.companyId || r.companyId === company.id) && r.category === 'bolsa_comida'
  );
  const companyEmployees = employees.filter((e) => !e.companyId || e.companyId === company.id);
  const selectedEmployee = companyEmployees.find((e) => e.id === selectedEmployeeId) || companyEmployees[0] || employees[0];
  const valueBs = Math.round(valueUSD * company.tasaBCV * 100) / 100;

  // Add a new grocery item to the draft list
  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const newItem: GroceryItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: newItemName.trim(),
      quantity: newItemQty,
      unit: newItemUnit,
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemQty(1);
  };

  // Remove an item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // Update specific fields of an existing item
  const handleUpdateItemField = (id: string, field: 'name' | 'quantity' | 'unit', value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: field === 'quantity' ? Math.max(1, Number(value) || 1) : value,
          };
        }
        return item;
      })
    );
  };

  // Quick preset loader
  const handleLoadPreset = (presetKey: string) => {
    const preset = GROCERY_PRESETS[presetKey];
    if (!preset) return;
    setItems([...preset.items]);
    if (preset.defaultUSD) {
      setValueUSD(preset.defaultUSD);
    }
  };

  // Construct draft receipt object for preview or emission
  const buildCurrentReceiptObject = (isDraft = false): BenefitReceipt => {
    const receiptNum = `BOLSA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const emp = selectedEmployee || employees[0];

    return {
      id: isDraft ? `draft-preview-${Date.now()}` : `rec-food-${Date.now()}`,
      companyId: company.id,
      receiptNumber: receiptNum,
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeCedula: emp.cedula,
      employeeCargo: emp.cargo,
      category: 'bolsa_comida',
      conceptTitle: 'Beneficio Social en Especie: Bolsa / Cesta de Alimentos Básicos',
      conceptDescription:
        'Dotación mensual en especie de víveres esenciales para la protección y sustento del núcleo familiar amparado en el Art. 105, Numeral 2 de la LOTTT y Art. 73 del RLOT.',
      amountUSD: valueUSD,
      tasaBCV: company.tasaBCV,
      amountBs: valueBs,
      paymentMethod: 'entrega_especie',
      issueDate: deliveryDate,
      coveragePeriod,
      groceryItems: [...items],
      triadStatus: 'transferido',
      dateTransferred: deliveryDate,
      hasWetThumbprint: false,
      hasPhysicalSignature: false,
      salarioBaseBsAtTime: emp.salarioBaseBs,
      desalarizationRiskRatio: valueBs / (emp.salarioBaseBs + valueBs),
      riskLevel: 'verde',
    };
  };

  // Batch Emit Food Baskets for all employees in current company
  const handleBatchEmitFoodBasketsAll = () => {
    if (employees.length === 0) return;
    const timestamp = Date.now();

    const newBatch: BenefitReceipt[] = employees.map((emp, idx) => {
      const rNum = `BOLSA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        id: `rec-food-${timestamp}-${idx}`,
        companyId: company.id,
        receiptNumber: rNum,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeCedula: emp.cedula,
        employeeCargo: emp.cargo,
        category: 'bolsa_comida',
        conceptTitle: 'Beneficio Social en Especie: Bolsa / Cesta de Alimentos Básicos',
        conceptDescription:
          'Dotación mensual en especie de víveres esenciales para la protección y sustento del núcleo familiar amparado en el Art. 105, Numeral 2 de la LOTTT y Art. 73 del RLOT.',
        amountUSD: valueUSD,
        tasaBCV: company.tasaBCV,
        amountBs: valueBs,
        paymentMethod: 'entrega_especie',
        issueDate: deliveryDate,
        coveragePeriod,
        groceryItems: [...items],
        triadStatus: 'transferido',
        dateTransferred: deliveryDate,
        hasWetThumbprint: false,
        hasPhysicalSignature: false,
        salarioBaseBsAtTime: emp.salarioBaseBs,
        desalarizationRiskRatio: valueBs / (emp.salarioBaseBs + valueBs),
        riskLevel: 'verde',
      };
    });

    newBatch.forEach((r) => onAddReceipt(r));
    if (onOpenBatchPrint) {
      onOpenBatchPrint(newBatch);
    }
  };

  // Preview receipt action
  const handlePreviewReceipt = () => {
    if (!selectedEmployee) return;
    const draft = buildCurrentReceiptObject(true);
    if (onPreviewDraftReceipt) {
      onPreviewDraftReceipt(draft);
    } else {
      onSelectReceipt(draft);
    }
  };

  // Emit receipt action
  const handleEmitDeliveryReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const newReceipt = buildCurrentReceiptObject(false);
    onAddReceipt(newReceipt);
    onSelectReceipt(newReceipt);
  };

  return (
    <div className="space-y-6">
      {/* Module Title Banner - Pastel Sage Palette */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-emerald-100/40 text-slate-800 p-6 sm:p-7 rounded-2xl shadow-2xs border border-emerald-200/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100/80 text-emerald-800 border border-emerald-200/90 text-xs font-semibold mb-2">
            <ShoppingBag className="w-4 h-4 text-emerald-700" />
            <span>Art. 105 Numeral 2 LOTTT & Art. 73 RLOT</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Gestión de Bolsas de Comida y Dotación en Especie
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Emita y previsualice comprobantes de recepción física con relación detallada de víveres, valor referencial oficial BCV y espacio obligatorio para firma manuscrita y huella dactilar húmeda, garantizando la deducibilidad en el ISLR ante el SENIAT.
          </p>
        </div>
        <div className="text-right bg-white/90 p-4 rounded-xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] text-emerald-800 uppercase font-semibold block">
            Bolsas Entregadas este Mes:
          </span>
          <span className="text-3xl font-black font-mono text-emerald-950">
            {foodReceipts.length} unidades
          </span>
        </div>
      </div>

      {/* Main Grid: Form Left, Items/Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form to Configure & Issue New Basket Receipt */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider">
                Configurar Entrega y Víveres de la Bolsa
              </h3>
              <p className="text-xs text-slate-500">
                Ajuste los datos, introduzca o modifique los víveres y previsualice el comprobante oficial.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
              Tasa BCV: Bs. {company.tasaBCV.toFixed(2)}
            </span>
          </div>

          <form onSubmit={handleEmitDeliveryReceipt} className="space-y-4">
            {/* Worker Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="select-food-worker" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Trabajador que Recibe la Bolsa:
                </label>
                <button
                  type="button"
                  onClick={() => onNavigateTab('employees')}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer transition hover:underline"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Gestionar / + Nuevo Trabajador</span>
                </button>
              </div>
              <select
                id="select-food-worker"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {companyEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.cedula}) — {emp.cargo}
                  </option>
                ))}
              </select>
            </div>

            {/* Dates & Values */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Fecha de Entrega:
                </label>
                <input
                  id="input-food-date"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Período:
                </label>
                <input
                  id="input-food-period"
                  type="text"
                  value={coveragePeriod}
                  onChange={(e) => setCoveragePeriod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Valor Estimado (USD):
                </label>
                <input
                  id="input-food-usd"
                  type="number"
                  step="1"
                  min="1"
                  value={valueUSD}
                  onChange={(e) => setValueUSD(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Calculated Bs */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-900 font-medium">Valor Referencial Liquidado (BCV):</span>
              <strong className="text-emerald-950 font-bold text-sm">{formatBs(valueBs)}</strong>
            </div>

            {/* Grocery items checklist and editor */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Víveres a Entregar ({items.length} productos en la cesta):
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Haga clic en cualquier vívere para editar nombre o cantidad directamente.
                  </span>
                </div>

                {/* Preset Combos */}
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-semibold text-slate-600 flex items-center space-x-1 mr-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Cestas Rápidas:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('basica')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded text-[11px] font-medium border border-slate-200 cursor-pointer"
                    title="Cargar Cesta Básica (10 productos)"
                  >
                    Básica
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('proteica')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded text-[11px] font-medium border border-slate-200 cursor-pointer"
                    title="Cargar Cesta Proteica (8 productos)"
                  >
                    Proteica
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('higiene')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded text-[11px] font-medium border border-slate-200 cursor-pointer"
                    title="Cargar Cesta Higiene (7 productos)"
                  >
                    Higiene
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset('completa')}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded text-[11px] font-medium border border-slate-200 cursor-pointer"
                    title="Cargar Cesta Integral Completa (12 productos)"
                  >
                    Completa
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded text-[11px] font-medium border border-slate-200 cursor-pointer"
                    title="Vaciar lista de víveres"
                  >
                    Vaciar
                  </button>
                </div>
              </div>

              {/* Items List with Direct Modification Support */}
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 text-xs">
                {items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition"
                  >
                    {/* Item Name Input or Display */}
                    <div className="flex items-center space-x-2 flex-1 mr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItemField(item.id, 'name', e.target.value)}
                        className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-emerald-500 rounded px-1.5 py-0.5 font-medium text-slate-800 transition"
                        title="Haga clic para modificar el nombre del vívere"
                      />
                    </div>

                    {/* Quantity controls and unit selector */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {/* Stepper buttons */}
                      <button
                        type="button"
                        onClick={() => handleUpdateItemField(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                        className="w-5 h-5 flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer"
                        title="Disminuir cantidad"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemField(item.id, 'quantity', e.target.value)}
                        className="w-12 bg-white border border-slate-300 rounded px-1 py-0.5 text-center font-mono font-bold text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateItemField(item.id, 'quantity', item.quantity + 1)}
                        className="w-5 h-5 flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer"
                        title="Aumentar cantidad"
                      >
                        +
                      </button>

                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateItemField(item.id, 'unit', e.target.value)}
                        className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-700"
                      >
                        <option value="kg">kg</option>
                        <option value="litros">litros</option>
                        <option value="unidades">unid.</option>
                        <option value="latas">latas</option>
                        <option value="paquetes">paq.</option>
                        <option value="frascos">frascos</option>
                        <option value="bolsas">bolsas</option>
                        <option value="cartones">cartones</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition ml-1"
                        title="Eliminar producto de la cesta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-slate-500">
                    La lista está vacía. Añada víveres abajo o elija una &quot;Cesta Rápida&quot;.
                  </div>
                )}
              </div>

              {/* Add item row */}
              <div className="pt-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 uppercase block mb-1.5">
                  + Introducir Nuevo Vívere a la Lista:
                </span>
                <div className="flex gap-2">
                  <input
                    id="input-new-item-name"
                    type="text"
                    placeholder="Nuevo producto (ej: Enlatado Atún 140g, Harina PAN...)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem();
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs placeholder:text-slate-400"
                  />
                  <input
                    id="input-new-item-qty"
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                    className="w-16 bg-white border border-slate-300 rounded px-2 py-1.5 text-xs text-center font-mono font-bold"
                  />
                  <select
                    id="select-new-item-unit"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-20 bg-white border border-slate-300 rounded px-2 py-1.5 text-xs"
                  >
                    <option value="kg">kg</option>
                    <option value="litros">litros</option>
                    <option value="unidades">unid.</option>
                    <option value="latas">latas</option>
                    <option value="paquetes">paq.</option>
                    <option value="frascos">frascos</option>
                    <option value="bolsas">bolsas</option>
                    <option value="cartones">cartones</option>
                  </select>
                  <button
                    id="btn-add-food-item"
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold cursor-pointer flex items-center space-x-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Actions: PREVIEW & EMIT & BATCH */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap gap-2.5">
              {/* Previsualizar Recibo Button */}
              <button
                id="btn-preview-food-receipt"
                type="button"
                onClick={handlePreviewReceipt}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer flex items-center justify-center space-x-2"
                title="Previsualizar el comprobante antes de emitirlo"
              >
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Previsualizar Recibo</span>
              </button>

              {/* Emit Receipt Button */}
              <button
                id="btn-emit-food-receipt"
                type="submit"
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer flex items-center justify-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Emitir para {selectedEmployee.fullName.split(' ')[0]}</span>
              </button>

              {/* Batch Emit for All */}
              <button
                id="btn-batch-emit-food-all"
                type="button"
                onClick={handleBatchEmitFoodBasketsAll}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow cursor-pointer flex items-center justify-center space-x-2"
                title="Genera los comprobantes de alimentos para todos los trabajadores y abre la ventana de impresión masiva"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Emitir Lote para Todo el Personal ({employees.length})</span>
              </button>

              {/* Word Adenda */}
              <button
                id="btn-download-adenda-worker"
                type="button"
                onClick={() => exportContractAdendaToWord(selectedEmployee, company, 'bolsa_comida')}
                className="px-3.5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5"
                title="Generar Adenda Contractual para este trabajador en Word"
              >
                <Download className="w-4 h-4" />
                <span>Adenda Word (.doc)</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Legal Rules & SENIAT Resguardo */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center space-x-2 text-emerald-800 font-bold uppercase tracking-wider text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Resguardo Documental Exigido</span>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed">
              <p>
                Para sustentar la entrega de alimentos en especie ante el <strong>SENIAT (ISLR Art. 27)</strong> e{' '}
                <strong>Inspectoría del Trabajo</strong>:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 font-medium text-slate-700">
                <li>
                  <strong>Adenda previa firmada:</strong> Debe existir la adenda al contrato laboral suscrita antes o durante el primer beneficio.
                </li>
                <li>
                  <strong>Comprobante físico de entrega:</strong> Firmado con huella dactilar húmeda por el trabajador en cada entrega mensual.
                </li>
                <li>
                  <strong>Factura fiscal corporativa:</strong> A nombre de la empresa con RIF para conciliar las bolsas compradas con las entregadas.
                </li>
              </ol>
            </div>

            <div className="pt-2">
              <button
                id="btn-goto-contract-adenda-tab"
                onClick={() => onNavigateTab('contracts')}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition text-center cursor-pointer block"
              >
                Ver Constructor de Adendas →
              </button>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs text-xs space-y-2">
            <h4 className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
              ¿Llevan IVA las Bolsas de Comida?
            </h4>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              • <strong>Entrega al trabajador:</strong> NO genera IVA. Es un beneficio social asistencial exento de naturaleza laboral.
            </p>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              • <strong>Compra a proveedores:</strong> Los víveres esenciales de la cesta básica (harina, arroz, pasta, granos, aceite) gozan de exención fiscal de IVA en Venezuela.
            </p>
          </div>
        </div>
      </div>

      {/* Historical Deliveries of Food Baskets */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Historial de Bolsas de Comida Entregadas
            </h3>
            <p className="text-xs text-slate-500">
              Expedientes físicos con relación de víveres y verificación de firma/huella
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500 font-semibold">
            {foodReceipts.length} entregas registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Fecha Entrega</th>
                <th className="px-4 py-3">Trabajador Beneficiario</th>
                <th className="px-4 py-3 text-center">Ítems Dotados</th>
                <th className="px-4 py-3 text-right">Valor Estimado</th>
                <th className="px-4 py-3 text-center">Huella Húmeda</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {foodReceipts.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">
                    {r.receiptNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.issueDate}
                  </td>
                  <td className="px-4 py-3">
                    <strong className="text-slate-900 block">{r.employeeName}</strong>
                    <span className="text-slate-500 text-[11px]">{r.employeeCedula} • {r.employeeCargo}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-mono">
                      {r.groceryItems?.length || 0} víveres
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <div className="font-bold text-slate-900">{formatUSD(r.amountUSD)}</div>
                    <div className="text-[11px] text-emerald-700">{formatBs(r.amountBs)}</div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      id={`btn-toggle-food-thumb-${r.id}`}
                      onClick={() => onToggleThumbprint(r.id)}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer ${
                        r.hasWetThumbprint
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{r.hasWetThumbprint ? 'Archivada' : 'Pendiente'}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      id={`btn-word-food-${r.id}`}
                      onClick={() => exportReceiptToWord(r, company)}
                      className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-semibold text-xs transition cursor-pointer"
                      title="Descargar en Word (.doc)"
                    >
                      Word (.doc)
                    </button>
                    <button
                      id={`btn-view-food-${r.id}`}
                      onClick={() => onSelectReceipt(r)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-semibold text-xs transition cursor-pointer inline-flex items-center space-x-1"
                      title="Previsualizar comprobante y modificar víveres"
                    >
                      <Eye className="w-3 h-3 text-emerald-300" />
                      <span>Previsualizar / Modificar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
