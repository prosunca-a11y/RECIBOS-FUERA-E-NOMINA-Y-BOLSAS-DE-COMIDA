import React, { useState } from 'react';
import { BenefitCategory, BenefitReceipt, CompanyConfig, Employee, PaymentMethod } from '../types';
import { calculateDesalarizationRisk, convertBsToUSD, convertUSDToBs, formatBs, formatUSD } from '../utils/bcv';
import { exportReceiptToWord } from '../utils/docxExport';
import { printReceiptsDirectly, downloadBatchReceiptsPDF } from '../utils/pdfExport';
import { DEFAULT_GROCERY_ITEMS } from '../data/initialData';
import { FileText, Download, ShieldCheck, AlertCircle, Sparkles, Check, Printer, Users, Layers, Server } from 'lucide-react';

interface ReceiptGeneratorProps {
  company: CompanyConfig;
  employees: Employee[];
  onAddReceipt: (receipt: BenefitReceipt) => void;
  onSelectReceipt: (receipt: BenefitReceipt) => void;
  onBatchEmit?: (receipts: BenefitReceipt[]) => void;
  onOpenBatchPrint?: (receipts: BenefitReceipt[]) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ReceiptGenerator: React.FC<ReceiptGeneratorProps> = ({
  company,
  employees,
  onAddReceipt,
  onSelectReceipt,
  onBatchEmit,
  onOpenBatchPrint,
  onNavigateTab,
}) => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees[0]?.id || '');
  const [category, setCategory] = useState<BenefitCategory>('alimentacion_complementaria');
  const [amountUSD, setAmountUSD] = useState<number>(60);
  const [amountBs, setAmountBs] = useState<number>(convertUSDToBs(60, company.tasaBCV));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transferencia_independiente');
  const [bankName, setBankName] = useState<string>('Banco Mercantil');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [coveragePeriod, setCoveragePeriod] = useState<string>('Septiembre 2026');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Medical fields
  const [clinicalInvoiceNumber, setClinicalInvoiceNumber] = useState<string>('FAC-009182');
  const [clinicalInvoiceRIF, setClinicalInvoiceRIF] = useState<string>('J-40192834-5');
  const [patientName, setPatientName] = useState<string>('');
  const [patientRelation, setPatientRelation] = useState<string>('Hijo menor');

  // Success state
  const [justEmitted, setJustEmitted] = useState<BenefitReceipt | null>(null);
  const [batchGeneratedCount, setBatchGeneratedCount] = useState<number | null>(null);

  // Filter workers for active company
  const companyEmployees = employees.filter((e) => !e.companyId || e.companyId === company.id);
  const availableEmployees = companyEmployees.length > 0 ? companyEmployees : employees;

  const selectedEmployee = availableEmployees.find((e) => e.id === selectedEmployeeId) || availableEmployees[0];
  const salarioBase = selectedEmployee ? selectedEmployee.salarioBaseBs : 4500;

  // Real-time risk calculation
  const risk = calculateDesalarizationRisk(amountBs, salarioBase);

  // Handle USD input change
  const handleUSDChange = (val: number) => {
    setAmountUSD(val);
    setAmountBs(convertUSDToBs(val, company.tasaBCV));
  };

  // Handle Bs input change
  const handleBsChange = (val: number) => {
    setAmountBs(val);
    setAmountUSD(convertBsToUSD(val, company.tasaBCV));
  };

  // Helper texts per category
  const getCategoryDetails = (cat: BenefitCategory) => {
    switch (cat) {
      case 'alimentacion_complementaria':
        return {
          title: 'Ayuda Complementaria de Alimentación de Carácter Social No Remunerativo',
          desc: 'Ayuda asistencial complementaria para la protección del sustento y bienestar del grupo familiar frente a la coyuntura económica nacional, amparada en la Sentencia N° 523 de la Sala de Casación Social del TSJ (Caso INDULAC) y Art. 105 Numeral 2 de la LOTTT.',
          method: 'transferencia_independiente' as PaymentMethod,
        };
      case 'bolsa_comida':
        return {
          title: 'Beneficio Social en Especie: Bolsa / Cesta de Alimentos Básicos',
          desc: 'Dotación mensual en especie de víveres esenciales para la protección nutricional del trabajador y su carga familiar conforme al Art. 105 Numeral 2 de la LOTTT y Art. 73 del RLOT.',
          method: 'entrega_especie' as PaymentMethod,
        };
      case 'gastos_medicos':
        return {
          title: 'Reintegro de Gastos Médicos, Odontológicos y Farmacéuticos',
          desc: 'Reembolso asistencial de gastos médicos extraordinarios con soporte de factura fiscal original del centro clínico emitida con RIF válido para su deducibilidad en ISLR (Art. 105 #3 LOTTT y Art. 27 LISLR).',
          method: 'transferencia_independiente' as PaymentMethod,
        };
      case 'transporte':
        return {
          title: 'Ayuda de Traslado y Movilidad (Medio de Trabajo)',
          desc: 'Asignación indispensable para garantizar el transporte del trabajador desde su domicilio al centro laboral. Excluido de salario según el Art. 73 RLOT por constituir un medio necesario para la ejecución del servicio.',
          method: 'transferencia_independiente' as PaymentMethod,
        };
      case 'utiles_juguetes':
        return {
          title: 'Aporte para Útiles Escolares y Dotación Infantil',
          desc: 'Beneficio social de asistencia escolar para los hijos del trabajador en etapa educativa, fundamentado taxativamente en el Art. 105 Numeral 5 de la LOTTT.',
          method: 'transferencia_independiente' as PaymentMethod,
        };
      case 'becas_capacitacion':
        return {
          title: 'Aporte para Capacitación y Desarrollo Laboral',
          desc: 'Asignación no salarial para formación técnica y desarrollo profesional amparada en el Art. 105 Numeral 6 de la LOTTT.',
          method: 'transferencia_independiente' as PaymentMethod,
        };
    }
  };

  const handleCategorySelect = (newCat: BenefitCategory) => {
    setCategory(newCat);
    const details = getCategoryDetails(newCat);
    setPaymentMethod(details.method);
  };

  const handleGenerateReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    const details = getCategoryDetails(category);
    const receiptNum = `BN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newReceipt: BenefitReceipt = {
      id: `rec-${Date.now()}`,
      companyId: company.id,
      receiptNumber: receiptNum,
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.fullName,
      employeeCedula: selectedEmployee.cedula,
      employeeCargo: selectedEmployee.cargo,
      category,
      conceptTitle: details.title,
      conceptDescription: details.desc,
      amountUSD,
      tasaBCV: company.tasaBCV,
      amountBs,
      paymentMethod,
      bankName: paymentMethod === 'transferencia_independiente' ? bankName : undefined,
      referenceNumber: paymentMethod === 'transferencia_independiente' ? (referenceNumber || 'REF-DISPERSION-PEND') : undefined,
      issueDate,
      coveragePeriod,
      groceryItems: category === 'bolsa_comida' ? DEFAULT_GROCERY_ITEMS : undefined,
      clinicalInvoiceNumber: category === 'gastos_medicos' ? clinicalInvoiceNumber : undefined,
      clinicalInvoiceRIF: category === 'gastos_medicos' ? clinicalInvoiceRIF : undefined,
      patientName: category === 'gastos_medicos' ? (patientName || selectedEmployee.fullName) : undefined,
      patientRelation: category === 'gastos_medicos' ? patientRelation : undefined,
      triadStatus: paymentMethod === 'entrega_especie' ? 'transferido' : 'parametrizado',
      dateTransferred: paymentMethod === 'entrega_especie' ? issueDate : undefined,
      hasWetThumbprint: false,
      hasPhysicalSignature: false,
      salarioBaseBsAtTime: salarioBase,
      desalarizationRiskRatio: risk.gamma,
      riskLevel: risk.level,
    };

    onAddReceipt(newReceipt);
    setJustEmitted(newReceipt);
    setBatchGeneratedCount(null);
  };

  // Generate batch for all employees of current company
  const handleBatchEmitAll = () => {
    if (availableEmployees.length === 0) return;
    const details = getCategoryDetails(category);
    const timestamp = Date.now();

    const newBatch: BenefitReceipt[] = availableEmployees.map((emp, idx) => {
      const empSalario = emp.salarioBaseBs || 4500;
      const empRisk = calculateDesalarizationRisk(amountBs, empSalario);
      const rNum = `REC-${(timestamp + idx).toString().slice(-6)}`;

      return {
        id: `rec-${timestamp}-${idx}`,
        companyId: company.id,
        receiptNumber: rNum,
        employeeId: emp.id,
        employeeName: emp.fullName,
        employeeCedula: emp.cedula,
        employeeCargo: emp.cargo,
        category,
        conceptTitle: details.title,
        conceptDescription: details.desc,
        amountUSD,
        tasaBCV: company.tasaBCV,
        amountBs,
        paymentMethod,
        bankName: paymentMethod === 'transferencia_independiente' ? (emp.banco || bankName) : undefined,
        referenceNumber: paymentMethod === 'transferencia_independiente' ? `LOTE-${timestamp.toString().slice(-4)}-${idx + 1}` : undefined,
        issueDate,
        coveragePeriod,
        groceryItems: category === 'bolsa_comida' ? DEFAULT_GROCERY_ITEMS : undefined,
        triadStatus: paymentMethod === 'entrega_especie' ? 'transferido' : 'parametrizado',
        dateTransferred: paymentMethod === 'entrega_especie' ? issueDate : undefined,
        hasWetThumbprint: false,
        hasPhysicalSignature: false,
        salarioBaseBsAtTime: empSalario,
        desalarizationRiskRatio: empRisk.gamma,
        riskLevel: empRisk.level,
      };
    });

    if (onBatchEmit) {
      onBatchEmit(newBatch);
    } else {
      newBatch.forEach((r) => onAddReceipt(r));
    }

    setBatchGeneratedCount(newBatch.length);
    setJustEmitted(null);

    if (onOpenBatchPrint) {
      onOpenBatchPrint(newBatch);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Emisor de Recibos Fuera de Nómina
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Formato con cláusula expresa de exclusión salarial, Sentencia 523 TSJ y tasa oficial BCV
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            id="btn-quick-batch-all"
            type="button"
            onClick={handleBatchEmitAll}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Genera e imprime el lote de recibos para todos los trabajadores de la empresa activa"
          >
            <Layers className="w-4 h-4" />
            <span>Emitir e Imprimir Lote ({availableEmployees.length} Trabajadores)</span>
          </button>
        </div>
      </div>

      {/* Success Banner for Batch Generation */}
      {batchGeneratedCount !== null && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-indigo-950 text-sm">
                ¡Lote de {batchGeneratedCount} comprobantes generado exitosamente para {company.razonSocial}!
              </h4>
              <p className="text-xs text-indigo-800">
                Se registraron en la bóveda con tasa BCV Bs. {company.tasaBCV.toFixed(2)}. Listos para imprimir o exportar en bloque.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBatchGeneratedCount(null)}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-950"
          >
            Cerrar aviso
          </button>
        </div>
      )}

      {/* Success Banner if just emitted */}
      {justEmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-emerald-950 text-sm">
                ¡Comprobante {justEmitted.receiptNumber} emitido exitosamente!
              </h4>
              <p className="text-xs text-emerald-800">
                Registrado para <strong>{justEmitted.employeeName}</strong> ({formatUSD(justEmitted.amountUSD)} / {formatBs(justEmitted.amountBs)})
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-emitted-print"
              type="button"
              onClick={() => printReceiptsDirectly([justEmitted], company)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
              title="Imprimir directamente este recibo"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              id="btn-emitted-download-pdf"
              type="button"
              onClick={() => downloadBatchReceiptsPDF([justEmitted], company, justEmitted.receiptNumber)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
              title="Descargar en PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
            <button
              id="btn-emitted-download-word"
              type="button"
              onClick={() => exportReceiptToWord(justEmitted, company)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center space-x-1.5 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Word (.doc)</span>
            </button>
            <button
              id="btn-emitted-view-modal"
              type="button"
              onClick={() => onSelectReceipt(justEmitted)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Ver Comprobante
            </button>
          </div>
        </div>
      )}

      {/* Main Generator Form */}
      <form onSubmit={handleGenerateReceipt} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form inputs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          {/* 1. Worker Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
              <label htmlFor="select-employee" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Seleccionar Trabajador Beneficiario ({availableEmployees.length} disponibles):
              </label>
              {onNavigateTab && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('nominus')}
                    className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 cursor-pointer transition hover:underline bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200"
                    title="Traer o sincronizar trabajadores desde el sistema Nóminus en su hosting"
                  >
                    <Server className="w-3 h-3 text-indigo-600" />
                    <span>Traer de Nóminus</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('employees')}
                    className="text-[11px] text-slate-600 hover:text-slate-800 font-bold flex items-center gap-1 cursor-pointer transition hover:underline"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Expedientes</span>
                  </button>
                </div>
              )}
            </div>
            <select
              id="select-employee"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.cedula}) — {emp.cargo} [Salario Base: {formatBs(emp.salarioBaseBs)}]
                </option>
              ))}
            </select>
            {selectedEmployee && !selectedEmployee.adendaFirmada && (
              <div className="mt-2 text-xs text-amber-700 flex items-center space-x-1 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  <strong>Aviso preventivo:</strong> Este trabajador aún no registra Adenda Contractual firmada. Se recomienda suscribir la adenda antes de entregar el beneficio.
                </span>
              </div>
            )}
          </div>

          {/* 2. Category of Benefit */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              2. Categoría del Beneficio No Remunerativo (Art. 105 LOTTT):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                {
                  id: 'alimentacion_complementaria',
                  name: 'Alimentación Complementaria (USD/Bs.)',
                  badge: 'Sentencia 523 TSJ',
                },
                {
                  id: 'bolsa_comida',
                  name: 'Bolsa de Comida en Especie',
                  badge: 'Art. 105 #2 LOTTT',
                },
                {
                  id: 'gastos_medicos',
                  name: 'Reintegro de Gastos Médicos',
                  badge: 'Art. 105 #3 LOTTT',
                },
                {
                  id: 'transporte',
                  name: 'Ayuda de Traslado / Movilidad',
                  badge: 'Art. 73 RLOT',
                },
                {
                  id: 'utiles_juguetes',
                  name: 'Útiles Escolares / Juguetes',
                  badge: 'Art. 105 #5 LOTTT',
                },
                {
                  id: 'becas_capacitacion',
                  name: 'Becas / Capacitación Laboral',
                  badge: 'Art. 105 #6 LOTTT',
                },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  id={`btn-cat-${cat.id}`}
                  onClick={() => handleCategorySelect(cat.id as BenefitCategory)}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                    category === cat.id
                      ? 'border-indigo-400 bg-indigo-50/80 text-indigo-950 font-bold shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <span className="text-xs leading-snug">{cat.name}</span>
                  <span className="text-[10px] font-mono text-indigo-600 mt-1">{cat.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Amounts in USD and Bs. with BCV dynamic sync */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-slate-700">
                3. Monto y Conversión Cambiaria BCV:
              </span>
              <span className="font-mono text-slate-500 font-semibold">
                Tasa BCV: Bs. {company.tasaBCV.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Monto Pactado en Divisas (USD):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    id="input-amount-usd"
                    type="number"
                    step="0.01"
                    min="1"
                    value={amountUSD}
                    onChange={(e) => handleUSDChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Equivalente Liquidado en Bolívares (Bs.):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold font-mono">Bs.</span>
                  <input
                    id="input-amount-bs"
                    type="number"
                    step="0.01"
                    min="1"
                    value={amountBs}
                    onChange={(e) => handleBsChange(parseFloat(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Payment method & Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Método de Dispersión / Entrega:
              </label>
              <select
                id="select-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="transferencia_independiente">Transferencia Bancaria Independiente (Fuera de Nómina)</option>
                <option value="entrega_especie">Entrega Física en Especie (Bolsa de Víveres)</option>
                <option value="efectivo_divisas">Efectivo en Divisas (Con Firma y Huella)</option>
                <option value="pago_movil">Pago Móvil Interbancario Independiente</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Banco y Nro. de Referencia:
              </label>
              <div className="flex space-x-2">
                <input
                  id="input-bank-name"
                  type="text"
                  placeholder="Banco"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-1/2 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
                />
                <input
                  id="input-reference-number"
                  type="text"
                  placeholder="Nro. Referencia"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-1/2 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Fecha de Emisión:
              </label>
              <input
                id="input-issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Período Correspondiente:
              </label>
              <input
                id="input-period"
                type="text"
                placeholder="ej: Septiembre 2026"
                value={coveragePeriod}
                onChange={(e) => setCoveragePeriod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
              />
            </div>
          </div>

          {/* Soportes Médicos específicos */}
          {category === 'gastos_medicos' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3 text-xs">
              <span className="font-bold text-blue-950 uppercase tracking-wider block">
                Soporte Fiscal SENIAT del Reembolso (Art. 27 LISLR):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Nro. Factura Fiscal Clínica / Farmacia:</label>
                  <input
                    id="input-clinic-invoice"
                    type="text"
                    value={clinicalInvoiceNumber}
                    onChange={(e) => setClinicalInvoiceNumber(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">R.I.F. del Emisor de Salud:</label>
                  <input
                    id="input-clinic-rif"
                    type="text"
                    value={clinicalInvoiceRIF}
                    onChange={(e) => setClinicalInvoiceRIF(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded px-2.5 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Paciente / Beneficiario Indirecto:</label>
                  <input
                    id="input-patient-name"
                    type="text"
                    placeholder={selectedEmployee?.fullName}
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Parentesco Familiar:</label>
                  <input
                    id="input-patient-relation"
                    type="text"
                    value={patientRelation}
                    onChange={(e) => setPatientRelation(e.target.value)}
                    className="w-full bg-white border border-blue-300 rounded px-2.5 py-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              id="btn-submit-receipt"
              type="submit"
              className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl transition shadow-2xs cursor-pointer flex items-center justify-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Emitir Recibo y Registrar en Bóveda</span>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Live Desalarization Risk Gauge & Legal Doctrine */}
        <div className="space-y-4">
          {/* Risk Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Semáforo de Desalarización
              </h3>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${risk.badgeClass}`}>
                {risk.label}
              </span>
            </div>

            {/* Gauge */}
            <div className="mt-4">
              <div className="flex justify-between text-xs font-mono mb-1">
                <span className="text-slate-500">Índice γ:</span>
                <span className="font-bold text-slate-900">{risk.percentage}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    risk.level === 'verde'
                      ? 'bg-emerald-500'
                      : risk.level === 'amarillo'
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, risk.percentage))}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600 leading-relaxed border border-slate-200">
              {risk.description}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Salario Base Registrado:</span>
                <span className="text-slate-900 font-bold">{formatBs(salarioBase)}</span>
              </div>
              <div className="flex justify-between">
                <span>Monto del Beneficio:</span>
                <span className="text-emerald-700 font-bold">{formatBs(amountBs)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Paquete Mensual:</span>
                <span>{formatBs(salarioBase + amountBs)}</span>
              </div>
            </div>
          </div>

          {/* Legal Exemption Clauses Card - Soft Pastel Slate / Indigo */}
          <div className="bg-gradient-to-br from-indigo-50/50 via-sky-50/30 to-slate-50 border border-indigo-100/80 rounded-xl p-5 shadow-2xs text-xs space-y-3 text-slate-800">
            <div className="flex items-center space-x-2 text-indigo-900 font-bold uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>Protección Ante el SENIAT e Inspectoría</span>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Cada recibo emitido y descargado en <strong className="text-slate-800">Word (.doc)</strong> o impreso en papel incorpora:
            </p>

            <ul className="space-y-1.5 text-slate-600 text-[11px]">
              <li className="flex items-start space-x-1.5">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Cláusula expresa de exclusión de prestaciones sociales y utilidades (Art. 105 LOTTT).</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Cita jurisprudencial vinculante de la <strong className="text-slate-800">Sentencia N° 523 TSJ</strong> (Caso INDULAC).</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Recuadro específico para <strong className="text-slate-800">firma y huella dactilar húmeda (pulgar derecho)</strong>.</span>
              </li>
              <li className="flex items-start space-x-1.5">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Deducibilidad fiscal amparada en el <strong className="text-slate-800">Art. 27 Numeral 22</strong> de la Ley de ISLR.</span>
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
};
