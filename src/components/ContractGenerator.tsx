import React, { useState, useMemo } from 'react';
import { CompanyConfig, Employee } from '../types';
import { exportContractAdendaToWord, exportBatchContractAdendasToWord } from '../utils/docxExport';
import { printBatchContractsDirectly, ContractPrintConfig, formatContractSpanishDate } from '../utils/pdfExport';
import {
  FileCheck,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  CheckSquare,
  Square,
  Calendar,
  DollarSign,
  Building2,
  FileText,
  Sliders,
  Sparkles,
  Edit3,
  X,
  Save,
  Check,
  ArrowRight,
  ShieldCheck,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { INITIAL_EMPLOYEES } from '../data/initialData';

interface ContractGeneratorProps {
  company: CompanyConfig;
  employees: Employee[];
  onUpdateEmployee: (updated: Employee) => void;
  onUpdateMultipleEmployees?: (updated: Employee[]) => void;
}

export const ContractGenerator: React.FC<ContractGeneratorProps> = ({
  company,
  employees,
  onUpdateEmployee,
  onUpdateMultipleEmployees,
}) => {
  // Filter employees for the active company
  const companyEmployees = useMemo(() => {
    return employees.filter((e) => !e.companyId || e.companyId === company.id);
  }, [employees, company.id]);

  // Active view: 'batch' (Lotes y Nómina) or 'preview' (Vista Previa Individual)
  const [activeView, setActiveView] = useState<'batch' | 'preview'>('batch');

  // Selected employee for single preview
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    companyEmployees[0]?.id || ''
  );

  // Batch selection set
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(companyEmployees.map((e) => e.id))
  );

  // Contract Parameters (configured easily and applied to batch & single)
  const [tipoBeneficio, setTipoBeneficio] = useState<'bolsa_comida' | 'bono_transferencia'>('bolsa_comida');
  const [periodicidad, setPeriodicidad] = useState<'MENSUAL' | 'QUINCENAL' | 'SEMANAL'>('MENSUAL');
  const [diasEntrega, setDiasEntrega] = useState<number>(5);
  const [fechaDocumento, setFechaDocumento] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [montoUSD, setMontoUSD] = useState<string>('60.00');
  const [ciudadFirma, setCiudadFirma] = useState<string>(company.ciudad || 'Caracas, Dto. Capital');

  // Filters for employee table in batch mode
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'SIGNED' | 'PENDING'>('ALL');

  // Quick edit employee modal state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Feedback notification
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const showAlert = (text: string, type: 'success' | 'info' = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 3500);
  };

  // Distinct departments for filter
  const departments = useMemo(() => {
    const set = new Set(companyEmployees.map((e) => e.departamento).filter(Boolean));
    return Array.from(set).sort();
  }, [companyEmployees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return companyEmployees.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept =
        filterDepartment === 'ALL' || emp.departamento === filterDepartment;

      const matchesStatus =
        filterStatus === 'ALL'
          ? true
          : filterStatus === 'SIGNED'
          ? Boolean(emp.adendaFirmada)
          : !emp.adendaFirmada;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [companyEmployees, searchTerm, filterDepartment, filterStatus]);

  // Current single employee for preview
  const currentSingleEmployee =
    companyEmployees.find((e) => e.id === selectedEmployeeId) ||
    companyEmployees[0] ||
    employees[0];

  const isBolsa = tipoBeneficio === 'bolsa_comida';
  const numericUSD = parseFloat(montoUSD) || 0;

  // Print configuration object
  const printConfig: ContractPrintConfig = {
    tipoBeneficio,
    periodicidad,
    diasEntrega,
    fechaDocumento,
    montoUSD: numericUSD,
  };

  // Toggle selection for a single employee
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all visible filtered employees
  const handleSelectAllVisible = () => {
    if (selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  // Select entire company employees (e.g. all 25)
  const handleSelectAllCompany = () => {
    setSelectedIds(new Set(companyEmployees.map((e) => e.id)));
  };

  // Selected employees array
  const selectedEmployeesList = useMemo(() => {
    return companyEmployees.filter((e) => selectedIds.has(e.id));
  }, [companyEmployees, selectedIds]);

  // Action: Print Batch
  const handlePrintBatch = async () => {
    if (selectedEmployeesList.length === 0) {
      showAlert('Seleccione al menos un trabajador para imprimir.', 'info');
      return;
    }
    showAlert(`Enviando ${selectedEmployeesList.length} contrato(s) a la cola de impresión...`);
    await printBatchContractsDirectly(selectedEmployeesList, company, printConfig);
  };

  // Action: Download Word (.doc) Batch
  const handleDownloadWordBatch = () => {
    if (selectedEmployeesList.length === 0) {
      showAlert('Seleccione al menos un trabajador para exportar.', 'info');
      return;
    }
    exportBatchContractAdendasToWord(
      selectedEmployeesList,
      company,
      tipoBeneficio,
      periodicidad,
      diasEntrega,
      fechaDocumento,
      numericUSD
    );
    showAlert(`Descargando lote de ${selectedEmployeesList.length} contrato(s) en Word (.doc)...`);
  };

  // Action: Mark selected employees as signed in batch
  const handleMarkBatchSigned = () => {
    if (selectedEmployeesList.length === 0) {
      showAlert('Seleccione al menos un trabajador para actualizar.', 'info');
      return;
    }
    const updatedEmployees = selectedEmployeesList.map((emp) => ({
      ...emp,
      adendaFirmada: true,
      fechaFirmaAdenda: fechaDocumento,
    }));

    if (onUpdateMultipleEmployees) {
      onUpdateMultipleEmployees(updatedEmployees);
    } else {
      updatedEmployees.forEach((emp) => onUpdateEmployee(emp));
    }
    showAlert(`${selectedEmployeesList.length} contrato(s) marcados como firmados con fecha ${fechaDocumento}.`);
  };

  // Action: Unmark selected employees in batch
  const handleUnmarkBatchSigned = () => {
    if (selectedEmployeesList.length === 0) {
      showAlert('Seleccione al menos un trabajador para actualizar.', 'info');
      return;
    }
    const updatedEmployees = selectedEmployeesList.map((emp) => ({
      ...emp,
      adendaFirmada: false,
      fechaFirmaAdenda: undefined,
    }));

    if (onUpdateMultipleEmployees) {
      onUpdateMultipleEmployees(updatedEmployees);
    } else {
      updatedEmployees.forEach((emp) => onUpdateEmployee(emp));
    }
    showAlert(`${selectedEmployeesList.length} contrato(s) desmarcados.`);
  };

  // Action: Print Single
  const handlePrintSingle = async (employeeToPrint: Employee) => {
    showAlert(`Imprimiendo contrato de ${employeeToPrint.fullName}...`);
    await printBatchContractsDirectly([employeeToPrint], company, printConfig);
  };

  // Action: Download Single Word
  const handleDownloadSingleWord = (employeeToExport: Employee) => {
    exportContractAdendaToWord(
      employeeToExport,
      company,
      tipoBeneficio,
      periodicidad,
      diasEntrega,
      fechaDocumento,
      numericUSD
    );
    showAlert(`Descargando adenda de ${employeeToExport.fullName} en Word...`);
  };

  // Action: Toggle signature on single employee
  const handleToggleSingleSigned = (emp: Employee) => {
    const nextSigned = !emp.adendaFirmada;
    onUpdateEmployee({
      ...emp,
      adendaFirmada: nextSigned,
      fechaFirmaAdenda: nextSigned ? fechaDocumento : undefined,
    });
    showAlert(
      nextSigned
        ? `Adenda de ${emp.fullName} marcada como firmada.`
        : `Adenda de ${emp.fullName} marcada como pendiente.`
    );
  };

  // Load 25 demo employees if current list has fewer
  const handleLoadFull25Demo = () => {
    const comp1Initial = INITIAL_EMPLOYEES.filter(
      (e) => e.companyId === 'comp-1' || !e.companyId
    ).map((e) => ({
      ...e,
      companyId: company.id,
    }));

    if (onUpdateMultipleEmployees) {
      onUpdateMultipleEmployees(comp1Initial);
    } else {
      comp1Initial.forEach((emp) => onUpdateEmployee(emp));
    }
    setSelectedIds(new Set(comp1Initial.map((e) => e.id)));
    showAlert(`Se cargaron los 25 trabajadores de nómina para ${company.razonSocial}.`);
  };

  // Stats calculation
  const totalInCompany = companyEmployees.length;
  const signedCount = companyEmployees.filter((e) => e.adendaFirmada).length;
  const pendingCount = totalInCompany - signedCount;
  const coveragePercent = totalInCompany > 0 ? Math.round((signedCount / totalInCompany) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {alertMessage && (
        <div
          className={`no-print fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center space-x-2 transition-all animate-in fade-in slide-in-from-bottom-3 ${
            alertMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-indigo-50 text-indigo-900 border-indigo-300'
          }`}
        >
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="no-print bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Blindaje Legal • LOTTT Art. 105 • Sentencia 523 TSJ</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Constructor de Adendas al Contrato de Trabajo
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
              Genera, redacta e imprime en bloque las adendas para los trabajadores de{' '}
              <strong className="text-slate-900">{company.razonSocial}</strong> ({company.rif}),
              vinculando automáticamente los datos de la nómina y blindando la exclusión salarial.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center">
              <button
                id="btn-tab-batch-mode"
                onClick={() => setActiveView('batch')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeView === 'batch'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Nómina y Lotes ({companyEmployees.length})</span>
                {selectedIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full text-[10px]">
                    {selectedIds.size}
                  </span>
                )}
              </button>

              <button
                id="btn-tab-preview-mode"
                onClick={() => setActiveView('preview')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeView === 'preview'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Vista Previa del Documento</span>
              </button>
            </div>

            {totalInCompany < 25 && (
              <button
                id="btn-load-25-demo"
                onClick={handleLoadFull25Demo}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
                title="Carga la nómina completa de 25 trabajadores para probar el lote masivo"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Cargar Nómina Demo (25 Empleados)</span>
              </button>
            )}
          </div>
        </div>

        {/* Legal Shield Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <div className="text-slate-500 font-medium text-[11px]">Total Trabajadores</div>
            <div className="text-lg font-extrabold text-slate-900 mt-0.5">{totalInCompany}</div>
            <div className="text-[10px] text-slate-400">Nómina activa de {company.razonSocial.split(' ')[0]}</div>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
            <div className="text-emerald-800 font-medium text-[11px]">Adendas Firmadas</div>
            <div className="text-lg font-extrabold text-emerald-900 mt-0.5">{signedCount}</div>
            <div className="text-[10px] text-emerald-700 font-semibold">{coveragePercent}% de cobertura legal</div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
            <div className="text-amber-800 font-medium text-[11px]">Pendientes de Firma</div>
            <div className="text-lg font-extrabold text-amber-900 mt-0.5">{pendingCount}</div>
            <div className="text-[10px] text-amber-700">Requieren firma manuscrita y huella</div>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3">
            <div className="text-indigo-800 font-medium text-[11px]">Seleccionados en Lote</div>
            <div className="text-lg font-extrabold text-indigo-900 mt-0.5">{selectedEmployeesList.length}</div>
            <div className="text-[10px] text-indigo-700">Listos para imprimir o descargar</div>
          </div>
        </div>
      </div>

      {/* PARAMETERS CONFIGURATION CARD (Easy Data Entry) */}
      <div className="no-print bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Parámetros de la Adenda (Se aplican automáticamente a todo el lote)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            Modifica aquí los términos del beneficio y se reflejarán en todos los contratos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Tipo de Beneficio */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Tipo de Beneficio Social:
            </label>
            <select
              id="select-param-benefit-type"
              value={tipoBeneficio}
              onChange={(e) => setTipoBeneficio(e.target.value as 'bolsa_comida' | 'bono_transferencia')}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="bolsa_comida">Bolsas de Comida en Especie (Víveres - Art. 105 LOTTT)</option>
              <option value="bono_transferencia">Ayuda Complementaria de Alimentación (USD / Bs.)</option>
            </select>
          </div>

          {/* Periodicidad */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Periodicidad de Entrega:
            </label>
            <select
              id="select-param-periodicity"
              value={periodicidad}
              onChange={(e) => setPeriodicidad(e.target.value as 'MENSUAL' | 'QUINCENAL' | 'SEMANAL')}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="MENSUAL">Mensual (Primeros {diasEntrega} días)</option>
              <option value="QUINCENAL">Quincenal (Días 15 y 30 de cada mes)</option>
              <option value="SEMANAL">Semanal (Día viernes)</option>
            </select>
          </div>

          {/* Días de Entrega */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Días Hábiles para Entrega:
            </label>
            <div className="relative">
              <input
                id="input-param-delivery-days"
                type="number"
                min="1"
                max="31"
                value={diasEntrega}
                onChange={(e) => setDiasEntrega(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
              <span className="absolute right-3 top-2 text-slate-400 text-[11px] pointer-events-none">
                primeros días
              </span>
            </div>
          </div>

          {/* Fecha de Firma / Suscripción */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
              <span>Fecha de Suscripción:</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <input
              id="input-param-doc-date"
              type="date"
              value={fechaDocumento}
              onChange={(e) => setFechaDocumento(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Monto Referencial en USD */}
          <div>
            <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
              <span>Valor Ref. USD (Opcional):</span>
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-500 font-bold">$</span>
              <input
                id="input-param-usd"
                type="number"
                step="0.01"
                value={montoUSD}
                onChange={(e) => setMontoUSD(e.target.value)}
                placeholder="60.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Ciudad de Suscripción */}
          <div className="sm:col-span-1 lg:col-span-2">
            <label className="block text-slate-700 font-bold mb-1">
              Ciudad y Jurisdicción Legal de Firma:
            </label>
            <input
              id="input-param-city"
              type="text"
              value={ciudadFirma}
              onChange={(e) => setCiudadFirma(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              placeholder="Caracas, Dto. Capital"
            />
          </div>

          {/* Vista previa de redacción de fecha */}
          <div className="sm:col-span-2 lg:col-span-1 bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Redacción Legal en el Contrato:
            </div>
            <div
              className="text-[11px] text-slate-700 font-serif italic mt-0.5 truncate"
              dangerouslySetInnerHTML={{
                __html: formatContractSpanishDate(fechaDocumento, ciudadFirma),
              }}
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: BATCH PROCESSING & PAYROLL TABLE */}
      {activeView === 'batch' && (
        <div className="no-print space-y-4">
          {/* Batch Actions Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-select-all-filtered"
                onClick={handleSelectAllVisible}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                {selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0 ? (
                  <>
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    <span>Deseleccionar Todos</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 text-slate-400" />
                    <span>Seleccionar Visibles ({filteredEmployees.length})</span>
                  </>
                )}
              </button>

              <button
                id="btn-select-all-company"
                onClick={handleSelectAllCompany}
                className="px-2.5 py-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline decoration-dotted"
              >
                Seleccionar Toda la Nómina ({companyEmployees.length})
              </button>
            </div>

            {/* Main Batch Execution Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-print-batch-contracts"
                onClick={handlePrintBatch}
                disabled={selectedEmployeesList.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                title="Imprime todos los contratos seleccionados en un solo trabajo con separación de página"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Lote ({selectedEmployeesList.length})</span>
              </button>

              <button
                id="btn-download-word-batch"
                onClick={handleDownloadWordBatch}
                disabled={selectedEmployeesList.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                title="Descarga un solo archivo .doc con todos los contratos seleccionados y saltos de página"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Lote Word (.doc) ({selectedEmployeesList.length})</span>
              </button>

              <button
                id="btn-mark-batch-signed"
                onClick={handleMarkBatchSigned}
                disabled={selectedEmployeesList.length === 0}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 disabled:opacity-50 text-xs font-bold rounded-xl transition cursor-pointer"
                title="Marca los seleccionados como firmados y archivados"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Marcar Firmados</span>
              </button>

              <button
                id="btn-unmark-batch-signed"
                onClick={handleUnmarkBatchSigned}
                disabled={selectedEmployeesList.length === 0}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 text-xs font-semibold rounded-xl transition cursor-pointer"
                title="Desmarcar contratos seleccionados"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Desmarcar</span>
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-1 min-w-[240px] items-center space-x-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus-within:bg-white focus-within:border-indigo-500">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                id="input-search-employees"
                type="text"
                placeholder="Buscar por nombre, cédula o cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-slate-900 text-xs font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold">Departamento:</span>
              <select
                id="select-filter-department"
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
              >
                <option value="ALL">Todos los Departamentos</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold">Estado:</span>
              <select
                id="select-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium"
              >
                <option value="ALL">Todos ({companyEmployees.length})</option>
                <option value="SIGNED">Firmados ({signedCount})</option>
                <option value="PENDING">Pendientes ({pendingCount})</option>
              </select>
            </div>
          </div>

          {/* Interactive Payroll Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.size === filteredEmployees.length &&
                          filteredEmployees.length > 0
                        }
                        onChange={handleSelectAllVisible}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3">Trabajador / Cédula</th>
                    <th className="px-4 py-3">Cargo y Departamento</th>
                    <th className="px-4 py-3">Salario Base (Bs.)</th>
                    <th className="px-4 py-3">Estado Adenda</th>
                    <th className="px-4 py-3 text-right">Acciones Individuales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500 text-xs">
                        No se encontraron trabajadores con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const isSelected = selectedIds.has(emp.id);
                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50/60 transition ${
                            isSelected ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(emp.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            <div className="flex items-center space-x-2">
                              <span>{emp.fullName}</span>
                              {emp.isDirector && (
                                <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                  Director
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {emp.cedula} • {emp.nacionalidad} • {emp.estadoCivil}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-medium text-slate-900">{emp.cargo}</div>
                            <div className="text-[11px] text-slate-500">{emp.departamento}</div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">
                            Bs. {emp.salarioBaseBs?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '0,00'}
                          </td>
                          <td className="px-4 py-3">
                            {emp.adendaFirmada ? (
                              <button
                                onClick={() => handleToggleSingleSigned(emp)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[10px] cursor-pointer hover:bg-emerald-100 transition"
                                title="Haga clic para desmarcar"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Firmada ({emp.fechaFirmaAdenda || 'Vigente'})</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleSingleSigned(emp)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full font-bold text-[10px] cursor-pointer hover:bg-amber-100 transition"
                                title="Haga clic para marcar como firmada"
                              >
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span>Pendiente de Firma</span>
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Ver Documento Individual */}
                              <button
                                onClick={() => {
                                  setSelectedEmployeeId(emp.id);
                                  setActiveView('preview');
                                }}
                                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer"
                                title="Ver Vista Previa de la Adenda"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>

                              {/* Imprimir Individual */}
                              <button
                                onClick={() => handlePrintSingle(emp)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Imprimir Adenda de este trabajador"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Descargar Word Individual */}
                              <button
                                onClick={() => handleDownloadSingleWord(emp)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer"
                                title="Descargar Word (.doc) de este trabajador"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>

                              {/* Editar Datos de Nómina */}
                              <button
                                onClick={() => setEditingEmployee(emp)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                title="Editar Datos del Trabajador"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer with Summary */}
            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between text-xs text-slate-600">
              <div>
                Mostrando <strong>{filteredEmployees.length}</strong> de{' '}
                <strong>{companyEmployees.length}</strong> trabajadores registrados.
              </div>
              <div className="font-semibold text-slate-700">
                {selectedEmployeesList.length} seleccionados para acción masiva
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SINGLE DOCUMENT PREVIEW & CUSTOMIZATION */}
      {activeView === 'preview' && currentSingleEmployee && (
        <div className="space-y-4">
          {/* Top Control Bar for Single View */}
          <div className="no-print bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold text-slate-700">
                Trabajador a Visualizar:
              </label>
              <select
                id="select-single-preview-emp"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 min-w-[280px]"
              >
                {companyEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.cedula}) — {emp.cargo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleToggleSingleSigned(currentSingleEmployee)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition flex items-center space-x-1.5 ${
                  currentSingleEmployee.adendaFirmada
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                }`}
              >
                {currentSingleEmployee.adendaFirmada ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Firmada ({currentSingleEmployee.fechaFirmaAdenda || 'Vigente'})</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Marcar como Firmada</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handlePrintSingle(currentSingleEmployee)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Este Contrato</span>
              </button>

              <button
                onClick={() => handleDownloadSingleWord(currentSingleEmployee)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar en Word (.doc)</span>
              </button>

              <button
                onClick={() => setEditingEmployee(currentSingleEmployee)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Ficha</span>
              </button>
            </div>
          </div>

          {/* The Printable Contract Sheet (Toner-friendly, legal fidelity) */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-14 text-slate-900 text-xs sm:text-sm leading-relaxed text-justify space-y-4 font-serif max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 font-sans">
              <div className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                {company.razonSocial} • R.I.F.: {company.rif}
              </div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950 pt-1">
                ADENDA AL CONTRATO INDIVIDUAL DE TRABAJO
              </h1>
              <h2 className="text-xs sm:text-sm font-bold uppercase text-slate-700">
                OTORGAMIENTO DE BENEFICIO SOCIAL NO REMUNERATIVO{' '}
                {isBolsa
                  ? 'DE PROVISIÓN DE ALIMENTOS EN ESPECIE (BOLSAS DE COMIDA)'
                  : 'DE ALIMENTACIÓN COMPLEMENTARIA'}
              </h2>
              <p className="text-[11px] text-slate-500 italic">
                Amparado taxativamente en el Artículo 105, Numeral 2 de la LOTTT • Art. 73 del RLOT • Sentencia N° 523 TSJ
              </p>
            </div>

            {/* Introductory Clause */}
            <p className="indent-6">
              Entre la entidad de trabajo <strong>{company.razonSocial}</strong>, sociedad mercantil debidamente
              domiciliada en <strong>{ciudadFirma}</strong>, inscrita por ante el{' '}
              <strong>{company.registroMercantil}</strong>, bajo el Registro de Información Fiscal (R.I.F.) N°{' '}
              <strong>{company.rif}</strong>, representada en este acto por el ciudadano{' '}
              <strong>{company.representanteLegal}</strong>, titular de la Cédula de Identidad N°{' '}
              <strong>{company.cedulaRepresentante}</strong>, en su carácter de{' '}
              <strong>{company.cargoRepresentante}</strong>, en lo sucesivo denominada <strong>"LA EMPRESA"</strong>,
              por una parte; y por la otra, el ciudadano(a) <strong>{currentSingleEmployee.fullName}</strong>,
              titular de la Cédula de Identidad N° <strong>{currentSingleEmployee.cedula}</strong>, de nacionalidad{' '}
              <strong>{currentSingleEmployee.nacionalidad}</strong>, de estado civil{' '}
              <strong>{currentSingleEmployee.estadoCivil}</strong>, domiciliado en{' '}
              <strong>{currentSingleEmployee.direccion}</strong>, quien desempeña el cargo de{' '}
              <strong>{currentSingleEmployee.cargo}</strong> adscrito al departamento de{' '}
              <strong>{currentSingleEmployee.departamento}</strong>, en lo sucesivo denominado(a){' '}
              <strong>"EL TRABAJADOR"</strong>, se ha convenido de mutuo acuerdo en suscribir la presente{' '}
              <strong>ADENDA AL CONTRATO INDIVIDUAL DE TRABAJO</strong>, la cual se regirá por las siguientes cláusulas:
            </p>

            {/* Clause 1 */}
            <p className="indent-6">
              <strong><u>PRIMERA (OBJETO):</u></strong> En el marco de la protección integral a la familia y con el propósito
              de coadyuvar a la seguridad alimentaria y bienestar socioeconómico del TRABAJADOR y su núcleo familiar frente
              a las contingencias de la economía nacional, LA EMPRESA decide otorgar de manera directa y voluntaria un
              beneficio social no remunerativo{' '}
              {isBolsa
                ? 'consistente en una (1) BOLSA / CESTA DE PRODUCTOS ALIMENTICIOS de primera necesidad e higiene básica'
                : `consistente en una ayuda complementaria de alimentación liquidada mediante dispersión bancaria independiente${
                    numericUSD > 0 ? ` con una asignación referencial de USD $${numericUSD.toFixed(2)}` : ''
                  }`}.
            </p>

            {/* Clause 2 */}
            <p className="indent-6">
              <strong><u>SEGUNDA (PERIODICIDAD Y LUGAR DE ENTREGA):</u></strong>{' '}
              {isBolsa
                ? `La entrega de los productos alimenticios se efectuará con una periodicidad ${periodicidad}, dentro de los primeros ${diasEntrega} días de cada período, directamente en las instalaciones del centro de trabajo de LA EMPRESA. LA EMPRESA entregará junto con los víveres una relación descriptiva de los productos que integran la dotación para su correspondiente verificación y cotejo.`
                : `El pago complementario se efectuará con periodicidad ${periodicidad}, mediante transferencia bancaria efectuada desde cuentas bancarias independientes de la cuenta ordinaria de nómina.`}
            </p>

            {/* Clause 3 - The TSJ Shield */}
            <div className="bg-slate-50/90 p-4 border-l-2 border-slate-600 my-3 font-sans text-xs leading-relaxed">
              <strong><u>TERCERA (NATURALEZA JURÍDICA Y EXCLUSIÓN SALARIAL TAXATIVA):</u></strong> Ambas partes
              declaran, reconocen y aceptan de manera expresa, libre, consciente e irrevocable que el presente beneficio{' '}
              {isBolsa ? 'en especie' : 'económico complementario'} constituye taxativamente un{' '}
              <strong>BENEFICIO SOCIAL DE CARÁCTER NO REMUNERATIVO</strong>, plenamente fundamentado en el{' '}
              <strong>Artículo 105, Numeral 2 de la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT)</strong>,
              en concordancia con el <strong>Artículo 73 del Reglamento de la Ley Orgánica del Trabajo (RLOT)</strong> y la
              doctrina pacífica y reiterada sentada en la <strong>Sentencia N° 523 de la Sala de Casación Social del Tribunal Supremo de Justicia (TSJ)</strong>.
              En consecuencia, las partes ratifican que:<br />
              a) <strong>NO TIENE CARÁCTER SALARIAL</strong> y no constituye contraprestación directa por el servicio prestado;<br />
              b) <strong>NO FORMA PARTE DEL SALARIO NORMAL NI INTEGRAL</strong> del TRABAJADOR;<br />
              c) Queda <strong>ESTRICTAMENTE EXCLUIDO</strong> de la base de cálculo de las prestaciones sociales
              (garantía trimestral y cálculo retroactivo según Art. 142 LOTTT), utilidades de fin de año, bonificación
              vacacional, vacaciones anuales, horas extras, bono nocturno, recargos de días feriados o descansos, e
              indemnizaciones por terminación de la relación de trabajo;<br />
              d) No integra la base de cálculo de las contribuciones parafiscales al Seguro Social Obligatorio (IVSS),
              Fondo de Ahorro Obligatorio para la Vivienda (FAOV) ni Instituto Nacional de Capacitación y Educación Socialista (INCES).
            </div>

            {/* Clause 4 */}
            <p className="indent-6">
              <strong><u>CUARTA (CARÁCTER ASISTENCIAL Y ADECUACIONES):</u></strong> El presente beneficio reviste carácter
              estrictamente asistencial y de protección a la economía del hogar.{' '}
              {isBolsa
                ? 'LA EMPRESA se reserva el derecho de adecuar la composición o sustituir marcas de los productos que integran la bolsa en función de la disponibilidad y abastecimiento del mercado, garantizando siempre la idoneidad y calidad nutricional de los víveres, sin que ello pueda interpretarse bajo ninguna circunstancia como desmejora de las condiciones laborales.'
                : 'LA EMPRESA evaluará periódicamente la cuantía del aporte según la evolución de los índices de precios.'}
            </p>

            {/* Clause 5 */}
            <p className="indent-6">
              <strong><u>QUINTA (OBLIGACIÓN DE SUSCRIPCIÓN DE COMPROBANTE Y HUELLA DACTILAR):</u></strong> EL TRABAJADOR
              asume la obligación ineludible de suscribir el comprobante o recibo físico de recepción{' '}
              {isBolsa ? 'al momento de recibir cada dotación de alimentos' : 'al momento de liquidarse el beneficio'},
              estampando su firma manuscrita y su huella dactilar húmeda (pulgar derecho), ratificando en cada oportunidad
              la recepción a satisfacción y la naturaleza no salarial del beneficio.
            </p>

            {/* Clause 6 */}
            <p className="indent-6">
              <strong><u>SEXTA (VIGENCIA Y ADHESIÓN AL CONTRATO):</u></strong> La presente Adenda entra en vigencia a partir
              de la fecha de su suscripción y se adhiere de forma permanente al Contrato Individual de Trabajo suscrito
              previamente entre las partes, manteniendo sus demás cláusulas plenamente vigentes e inalteradas.
            </p>

            <p className="indent-0 pt-2 font-sans text-xs">
              Se firman dos (2) ejemplares de un mismo tenor y a un solo efecto, haciéndosele entrega al TRABAJADOR de un
              ejemplar original debidamente sellado y firmado, en cumplimiento de los Artículos 58 y 59 de la LOTTT.
            </p>

            <p
              className="indent-0 font-sans text-xs"
              dangerouslySetInnerHTML={{
                __html: formatContractSpanishDate(fechaDocumento, ciudadFirma),
              }}
            />

            {/* Signatures & Thumbprint Block */}
            <div className="grid grid-cols-12 gap-4 pt-10 font-sans">
              {/* Employer Signature */}
              <div className="col-span-5 text-center">
                <div className="h-14 border-b-2 border-slate-900 flex items-end justify-center pb-1"></div>
                <p className="mt-2 font-black text-xs uppercase text-slate-950">
                  POR LA EMPRESA
                </p>
                <p className="text-xs text-slate-800 font-semibold">{company.representanteLegal}</p>
                <p className="text-[11px] text-slate-600">C.I.: {company.cedulaRepresentante}</p>
                <p className="text-[10px] text-slate-500">{company.cargoRepresentante}</p>
              </div>

              {/* Employee Signature */}
              <div className="col-span-4 text-center">
                <div className="h-14 border-b-2 border-slate-900 flex items-end justify-center pb-1"></div>
                <p className="mt-2 font-black text-xs uppercase text-slate-950">
                  EL TRABAJADOR
                </p>
                <p className="text-xs text-slate-800 font-semibold">{currentSingleEmployee.fullName}</p>
                <p className="text-[11px] text-slate-600">C.I.: {currentSingleEmployee.cedula}</p>
                <p className="text-[10px] text-slate-500">{currentSingleEmployee.cargo}</p>
              </div>

              {/* Wet Thumbprint Box */}
              <div className="col-span-3 flex flex-col items-center justify-end text-center">
                <div className="w-20 h-24 border-2 border-dashed border-slate-500 flex flex-col items-center justify-center p-1 bg-slate-50/50">
                  <span className="text-[9px] font-black text-slate-700 uppercase leading-tight">
                    HUELLA DACTILAR
                  </span>
                  <span className="text-[8px] text-slate-500">Pulgar Derecho</span>
                  <span className="text-[7px] text-slate-400 mt-1">(Tinta Húmeda)</span>
                </div>
                <span className="text-[8px] text-slate-400 font-mono mt-1">Soporte TSJ 523</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK EMPLOYEE EDIT MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Editar Datos de Nómina para el Contrato
                </h3>
              </div>
              <button
                onClick={() => setEditingEmployee(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={editingEmployee.fullName}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, fullName: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cédula de Identidad:</label>
                <input
                  type="text"
                  value={editingEmployee.cedula}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, cedula: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nacionalidad:</label>
                <input
                  type="text"
                  value={editingEmployee.nacionalidad}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, nacionalidad: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Estado Civil:</label>
                <input
                  type="text"
                  value={editingEmployee.estadoCivil}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, estadoCivil: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Salario Base (Bs.):</label>
                <input
                  type="number"
                  value={editingEmployee.salarioBaseBs}
                  onChange={(e) =>
                    setEditingEmployee({
                      ...editingEmployee,
                      salarioBaseBs: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cargo Desempeñado:</label>
                <input
                  type="text"
                  value={editingEmployee.cargo}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, cargo: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Departamento:</label>
                <input
                  type="text"
                  value={editingEmployee.departamento}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, departamento: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Dirección de Habitación:</label>
                <input
                  type="text"
                  value={editingEmployee.direccion}
                  onChange={(e) =>
                    setEditingEmployee({ ...editingEmployee, direccion: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditingEmployee(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onUpdateEmployee(editingEmployee);
                  setEditingEmployee(null);
                  showAlert(`Ficha de ${editingEmployee.fullName} actualizada.`);
                }}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
