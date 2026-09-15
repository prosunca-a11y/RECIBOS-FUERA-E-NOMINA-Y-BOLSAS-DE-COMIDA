import React, { useState } from 'react';
import { CompanyConfig, Employee } from '../types';
import { formatBs, formatUSD, convertBsToUSD } from '../utils/bcv';
import { exportContractAdendaToWord } from '../utils/docxExport';
import {
  Users,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  DollarSign,
  FileCheck,
  Check,
  X,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  UserX,
  Server,
} from 'lucide-react';

interface EmployeesManagerProps {
  employees: Employee[];
  company: CompanyConfig;
  companies?: CompanyConfig[];
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee?: (empId: string) => void;
  onNavigateTab: (tab: string) => void;
}

const VENEZUELAN_BANKS = [
  'Banco de Venezuela (0102)',
  'Banco Mercantil (0105)',
  'Banesco (0134)',
  'Banco Provincial - BBVA (0108)',
  'Banco Nacional de Crédito - BNC (0191)',
  'Bancamiga (0172)',
  'Banco del Tesoro (0163)',
  'Banco Bicentenario (0175)',
  'Banco Fondo Común - BFC (0151)',
  'Banco Exterior (0115)',
  'Bancaribe (0114)',
  'Banplus (0174)',
  '100% Banco (0156)',
  'Pago Móvil Interbancario',
  'Efectivo Divisas / Otra entidad',
];

const DEPARTMENTS = [
  'Operaciones',
  'Administración y Finanzas',
  'Ventas y Comercialización',
  'Logística y Distribución',
  'Tecnología y Sistemas',
  'Mantenimiento',
  'Recursos Humanos',
  'Dirección General',
];

export const EmployeesManager: React.FC<EmployeesManagerProps> = ({
  employees,
  company,
  companies = [],
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onNavigateTab,
}) => {
  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Delete confirmation modal state
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'adenda-ok' | 'adenda-pending' | 'directors'>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(company.id);

  // Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(
    null
  );

  const showNotification = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Form input states
  const [nationalityPrefix, setNationalityPrefix] = useState<'V-' | 'E-' | 'J-' | 'P-'>('V-');
  const [cedulaNumber, setCedulaNumber] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [cargo, setCargo] = useState<string>('');
  const [departamento, setDepartamento] = useState<string>('Operaciones');
  const [salarioBaseBs, setSalarioBaseBs] = useState<number>(5000);
  const [isDirector, setIsDirector] = useState<boolean>(false);
  const [banco, setBanco] = useState<string>('Banco Mercantil (0105)');
  const [cuentaBancaria, setCuentaBancaria] = useState<string>('');
  const [direccion, setDireccion] = useState<string>('Caracas, Venezuela');
  const [nacionalidad, setNacionalidad] = useState<string>('Venezolana');
  const [estadoCivil, setEstadoCivil] = useState<string>('Soltero(a)');
  const [fechaIngreso, setFechaIngreso] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adendaFirmada, setAdendaFirmada] = useState<boolean>(false);
  const [targetCompanyId, setTargetCompanyId] = useState<string>(company.id);

  // Open modal for creating new worker
  const handleOpenCreateModal = () => {
    setEditingEmployee(null);
    setNationalityPrefix('V-');
    setCedulaNumber('');
    setFullName('');
    setCargo('');
    setDepartamento('Operaciones');
    setSalarioBaseBs(5000);
    setIsDirector(false);
    setBanco('Banco Mercantil (0105)');
    setCuentaBancaria('');
    setDireccion('Caracas, Venezuela');
    setNacionalidad('Venezolana');
    setEstadoCivil('Soltero(a)');
    setFechaIngreso(new Date().toISOString().split('T')[0]);
    setAdendaFirmada(false);
    setTargetCompanyId(company.id);
    setShowModal(true);
  };

  // Open modal for editing existing worker
  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    const prefixMatch = emp.cedula.match(/^([VEJP]-)(.+)$/i);
    if (prefixMatch) {
      setNationalityPrefix((prefixMatch[1].toUpperCase()) as 'V-' | 'E-' | 'J-' | 'P-');
      setCedulaNumber(prefixMatch[2]);
    } else {
      setNationalityPrefix('V-');
      setCedulaNumber(emp.cedula.replace(/^[VEJP]-/i, ''));
    }
    setFullName(emp.fullName);
    setCargo(emp.cargo);
    setDepartamento(emp.departamento || 'Operaciones');
    setSalarioBaseBs(emp.salarioBaseBs);
    setIsDirector(emp.isDirector || false);
    setBanco(emp.banco || 'Banco Mercantil (0105)');
    setCuentaBancaria(emp.cuentaBancaria || '');
    setDireccion(emp.direccion || 'Caracas, Venezuela');
    setNacionalidad(emp.nacionalidad || 'Venezolana');
    setEstadoCivil(emp.estadoCivil || 'Soltero(a)');
    setFechaIngreso(emp.fechaIngreso || new Date().toISOString().split('T')[0]);
    setAdendaFirmada(emp.adendaFirmada || false);
    setTargetCompanyId(emp.companyId || company.id);
    setShowModal(true);
  };

  // Save worker (Create or Update)
  const handleSubmitEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCedulaNum = cedulaNumber.trim().replace(/^([VEJP]-)/i, '');
    if (!fullName.trim() || !cleanCedulaNum) {
      showNotification('error', 'Por favor ingrese el nombre completo y número de cédula.');
      return;
    }

    const fullCedula = `${nationalityPrefix}${cleanCedulaNum}`;

    if (editingEmployee) {
      // Update existing
      const updated: Employee = {
        ...editingEmployee,
        companyId: targetCompanyId,
        cedula: fullCedula,
        fullName: fullName.trim(),
        cargo: cargo.trim() || 'Empleado',
        departamento,
        salarioBaseBs,
        isDirector,
        banco,
        cuentaBancaria: cuentaBancaria.trim() || '0105-0000-00-0000000000',
        fechaIngreso,
        direccion: direccion.trim(),
        nacionalidad,
        estadoCivil,
        adendaFirmada,
        fechaFirmaAdenda: adendaFirmada ? (editingEmployee.fechaFirmaAdenda || fechaIngreso) : undefined,
      };

      onUpdateEmployee(updated);
      showNotification('success', `Datos de "${updated.fullName}" actualizados exitosamente.`);
    } else {
      // Create new
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        companyId: targetCompanyId,
        cedula: fullCedula,
        fullName: fullName.trim(),
        cargo: cargo.trim() || 'Empleado',
        departamento,
        salarioBaseBs,
        isDirector,
        banco,
        cuentaBancaria: cuentaBancaria.trim() || '0105-0000-00-0000000000',
        fechaIngreso,
        direccion: direccion.trim(),
        nacionalidad,
        estadoCivil,
        adendaFirmada,
        fechaFirmaAdenda: adendaFirmada ? fechaIngreso : undefined,
      };

      onAddEmployee(newEmp);
      showNotification('success', `Trabajador "${newEmp.fullName}" ingresado a la nómina con éxito.`);
    }

    setShowModal(false);
    setEditingEmployee(null);
  };

  // Execute deletion of worker
  const handleConfirmDelete = () => {
    if (!employeeToDelete) return;
    const name = employeeToDelete.fullName;
    if (onDeleteEmployee) {
      onDeleteEmployee(employeeToDelete.id);
      showNotification('info', `El trabajador "${name}" ha sido retirado de la nómina.`);
    }
    setEmployeeToDelete(null);
  };

  // Toggle adenda status directly from table
  const toggleAdendaStatus = (emp: Employee) => {
    const nextStatus = !emp.adendaFirmada;
    onUpdateEmployee({
      ...emp,
      adendaFirmada: nextStatus,
      fechaFirmaAdenda: nextStatus ? new Date().toISOString().split('T')[0] : undefined,
    });
    showNotification(
      'success',
      nextStatus
        ? `Adenda contractual de "${emp.fullName}" marcada como suscrita.`
        : `Adenda contractual de "${emp.fullName}" marcada como pendiente de firma.`
    );
  };

  // Filtered employees for the active company
  const companyEmployees = employees.filter((e) => !e.companyId || e.companyId === company.id);

  const filteredEmployees = companyEmployees.filter((emp) => {
    // Filter chip
    if (filterType === 'adenda-ok' && !emp.adendaFirmada) return false;
    if (filterType === 'adenda-pending' && emp.adendaFirmada) return false;
    if (filterType === 'directors' && !emp.isDirector) return false;

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = emp.fullName.toLowerCase().includes(q);
      const matchCedula = emp.cedula.toLowerCase().includes(q);
      const matchCargo = emp.cargo.toLowerCase().includes(q);
      const matchDepto = (emp.departamento || '').toLowerCase().includes(q);
      return matchName || matchCedula || matchCargo || matchDepto;
    }

    return true;
  });

  // Payroll statistics
  const totalPayrollBs = companyEmployees.reduce((acc, e) => acc + (e.salarioBaseBs || 0), 0);
  const totalPayrollUSD = convertBsToUSD(totalPayrollBs, company.tasaBCV);
  const signedAdendasCount = companyEmployees.filter((e) => e.adendaFirmada).length;
  const directorsCount = companyEmployees.filter((e) => e.isDirector).length;
  const compliancePct = companyEmployees.length > 0 ? Math.round((signedAdendasCount / companyEmployees.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-md text-xs font-semibold animate-fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Nómina y Expedientes de Trabajadores
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Gestión de trabajadores de <strong className="text-slate-800">{company.razonSocial}</strong> ({company.rif}) • Tasa BCV: Bs. {company.tasaBCV.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-sync-nominus-from-employees"
            type="button"
            onClick={() => onNavigateTab('nominus')}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Sincronizar trabajadores desde el sistema Nóminus en su hosting"
          >
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            <span>Traer desde Nóminus</span>
          </button>

          <button
            id="btn-add-worker-modal"
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ingresar Nuevo Trabajador</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Trabajadores Activos</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">{companyEmployees.length}</div>
          <p className="text-[10px] text-slate-400 mt-0.5">En nómina de {company.razonSocial.slice(0, 18)}...</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Masa Salarial Base</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900">{formatBs(totalPayrollBs)}</div>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">≈ {formatUSD(totalPayrollUSD)} (Tasa BCV)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Adendas Suscritas</span>
            <FileCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {signedAdendasCount} / {companyEmployees.length}
          </div>
          <p className="text-[10px] text-blue-700 font-semibold mt-0.5">{compliancePct}% con blindaje contractual</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Directores / Socios</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{directorsCount}</div>
          <p className="text-[10px] text-purple-700 font-semibold mt-0.5">Sujetos a tope 15% deducible ISLR</p>
        </div>
      </div>

      {/* Toolbar: Search and Filter Chips */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-employees"
            type="text"
            placeholder="Buscar por nombre, cédula o cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({companyEmployees.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('adenda-ok')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
              filterType === 'adenda-ok'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Adenda Vigente ({signedAdendasCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('adenda-pending')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
              filterType === 'adenda-pending'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Sin Adenda ({companyEmployees.length - signedAdendasCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('directors')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === 'directors'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            Directores ({directorsCount})
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Trabajador Beneficiario</th>
                <th className="px-4 py-3">Cédula</th>
                <th className="px-4 py-3">Cargo / Depto.</th>
                <th className="px-4 py-3 text-right">Salario Base (Bs.)</th>
                <th className="px-4 py-3 text-center">Adenda LOTTT</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => {
                  const salaryUSD = convertBsToUSD(emp.salarioBaseBs, company.tasaBCV);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Bank info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center text-xs shrink-0 border border-slate-200">
                            {emp.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong className="text-slate-900 block text-xs">{emp.fullName}</strong>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span>{emp.banco}</span>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-600">Cta: {emp.cuentaBancaria}</span>
                            </div>
                            {emp.isDirector && (
                              <span className="inline-block mt-0.5 px-2 py-0.2 bg-purple-100 text-purple-800 rounded font-bold text-[10px]">
                                Director / Socio (Tope 15% ISLR)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cedula */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-800">
                        {emp.cedula}
                      </td>

                      {/* Cargo & Department */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block">{emp.cargo}</span>
                        <span className="text-[11px] text-slate-500">{emp.departamento || 'Operaciones'}</span>
                      </td>

                      {/* Salario Base */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-bold text-slate-900 block">{formatBs(emp.salarioBaseBs)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">≈ {formatUSD(salaryUSD)}</span>
                      </td>

                      {/* Adenda Contractual */}
                      <td className="px-4 py-3 text-center">
                        <button
                          id={`btn-toggle-emp-adenda-${emp.id}`}
                          type="button"
                          onClick={() => toggleAdendaStatus(emp)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                            emp.adendaFirmada
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="Haga clic para alternar estatus de firma de la adenda"
                        >
                          {emp.adendaFirmada ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Suscrita ({emp.fechaFirmaAdenda || 'Vigente'})</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>Pendiente de Firma</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Download Word Adenda */}
                          <button
                            id={`btn-download-emp-adenda-${emp.id}`}
                            type="button"
                            onClick={() => exportContractAdendaToWord(emp, company, 'bolsa_comida')}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition cursor-pointer flex items-center space-x-1"
                            title="Descargar Adenda Contractual en Word (.doc)"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                            <span>Adenda .doc</span>
                          </button>

                          {/* Edit worker */}
                          <button
                            id={`btn-edit-employee-${emp.id}`}
                            type="button"
                            onClick={() => handleOpenEditModal(emp)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition cursor-pointer"
                            title="Editar datos del trabajador"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete worker */}
                          <button
                            id={`btn-delete-employee-${emp.id}`}
                            type="button"
                            onClick={() => setEmployeeToDelete(emp)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition cursor-pointer"
                            title="Eliminar trabajador de la nómina"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <UserX className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">
                      {searchTerm
                        ? `No se encontraron trabajadores que coincidan con "${searchTerm}"`
                        : `No hay trabajadores registrados para ${company.razonSocial}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchTerm
                        ? 'Intente modificar los términos de búsqueda o limpie los filtros.'
                        : 'Utilice el botón "Ingresar Nuevo Trabajador" para registrar a los empleados de esta empresa.'}
                    </p>
                    {!searchTerm && (
                      <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="mt-3 inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer transition shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ingresar Primer Trabajador</span>
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add or Edit Worker */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5 my-8 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  {editingEmployee ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingEmployee ? 'Editar Datos del Trabajador' : 'Ingresar Nuevo Trabajador'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingEmployee
                      ? `Modificando expediente de ${editingEmployee.fullName}`
                      : `Se incorporará a la nómina de ${company.razonSocial}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEmployee} className="space-y-4 text-xs">
              {/* Full Name */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nombres y Apellidos Completos: <span className="text-rose-500">*</span>
                </label>
                <input
                  id="input-new-emp-name"
                  type="text"
                  placeholder="ej: Carlos Alberto Mendoza"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              {/* Cedula and Nationality */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">Tipo:</label>
                  <select
                    id="select-nationality-prefix"
                    value={nationalityPrefix}
                    onChange={(e) => setNationalityPrefix(e.target.value as 'V-' | 'E-' | 'J-' | 'P-')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="V-">V (Venezolano)</option>
                    <option value="E-">E (Extranjero)</option>
                    <option value="J-">J (Jurídico)</option>
                    <option value="P-">P (Pasaporte)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    Número de Cédula / Identificación: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-new-emp-cedula"
                    type="text"
                    placeholder="18.234.567"
                    value={cedulaNumber}
                    onChange={(e) => setCedulaNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Cargo and Departamento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Cargo Laboral: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="input-new-emp-cargo"
                    type="text"
                    placeholder="ej: Supervisor de Almacén"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Departamento:</label>
                  <select
                    id="select-new-emp-depto"
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salario Base with live BCV USD equivalency */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">
                    Salario Base Mensual (Bs. en Nómina): <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-indigo-700 font-bold font-mono">
                    ≈ {formatUSD(convertBsToUSD(salarioBaseBs, company.tasaBCV))} (Tasa: Bs. {company.tasaBCV.toFixed(2)})
                  </span>
                </div>
                <input
                  id="input-new-emp-salary"
                  type="number"
                  min="0"
                  step="100"
                  value={salarioBaseBs}
                  onChange={(e) => setSalarioBaseBs(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Este salario sirve para la verificación automática del riesgo de desalarización (ratio gamma) de los bonos.
                </p>
              </div>

              {/* Bank & Bank Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Entidad Bancaria:</label>
                  <select
                    id="select-new-emp-bank"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {VENEZUELAN_BANKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Número de Cuenta Bancaria (20 dígitos):</label>
                  <input
                    id="input-new-emp-account"
                    type="text"
                    placeholder="0105-0000-00-0000000000"
                    value={cuentaBancaria}
                    onChange={(e) => setCuentaBancaria(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multi-company selection if more than 1 company */}
              {companies.length > 1 && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Empresa a la que pertenece:</label>
                  <select
                    id="select-emp-company"
                    value={targetCompanyId}
                    onChange={(e) => setTargetCompanyId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razonSocial} ({c.rif})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Checkboxes: Director & Adenda */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    id="chk-is-director"
                    type="checkbox"
                    checked={isDirector}
                    onChange={(e) => setIsDirector(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      Es Director / Administrador / Socio
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Aplica el tope del 15% del total de sueldos pagados para deducibilidad del ISLR (Art. 27 Ley ISLR).
                    </span>
                  </div>
                </label>

                <label className="flex items-center space-x-2.5 cursor-pointer pt-1 border-t border-slate-200">
                  <input
                    id="chk-adenda-signed"
                    type="checkbox"
                    checked={adendaFirmada}
                    onChange={(e) => setAdendaFirmada(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-800 text-xs block">
                      Adenda Contractual ya suscrita
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Marcar si el trabajador ya tiene firmada la cláusula de beneficios sociales no salariales LOTTT Art. 105.
                    </span>
                  </div>
                </label>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer transition"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-new-employee"
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition shadow-sm flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEmployee ? 'Guardar Cambios' : 'Registrar Trabajador'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Worker */}
      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  ¿Confirmar eliminación de trabajador?
                </h3>
                <p className="text-xs text-rose-600 font-semibold">Esta acción retirará al empleado de la nómina activa</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Trabajador:</span>
                <strong className="text-slate-900">{employeeToDelete.fullName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cédula:</span>
                <span className="font-mono font-bold text-slate-800">{employeeToDelete.cedula}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cargo:</span>
                <span className="text-slate-800 font-semibold">{employeeToDelete.cargo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Salario Base:</span>
                <span className="font-mono text-slate-800">{formatBs(employeeToDelete.salarioBaseBs)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Los comprobantes y recibos previamente emitidos a este trabajador permanecerán resguardados en la{' '}
              <strong className="text-slate-800">Bóveda Documental</strong> como archivo histórico y probatorio legal.
            </p>

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEmployeeToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer transition text-xs"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-employee"
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer transition text-xs flex items-center space-x-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Trabajador</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
