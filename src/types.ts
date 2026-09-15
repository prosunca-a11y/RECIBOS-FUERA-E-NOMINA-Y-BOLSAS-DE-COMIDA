export type BenefitCategory =
  | 'alimentacion_complementaria'
  | 'bolsa_comida'
  | 'gastos_medicos'
  | 'transporte'
  | 'utiles_juguetes'
  | 'becas_capacitacion'
  | 'otro_personalizado';

export type PaymentMethod =
  | 'transferencia_independiente'
  | 'efectivo_divisas'
  | 'entrega_especie'
  | 'pago_movil';

export type TriadStatus = 'parametrizado' | 'transferido' | 'archivado';

export interface GroceryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string; // kg, litros, unidades, paquetes
}

export interface Employee {
  id: string;
  companyId?: string;
  cedula: string;
  fullName: string;
  cargo: string;
  departamento: string;
  salarioBaseBs: number;
  isDirector: boolean;
  banco: string;
  cuentaBancaria: string;
  fechaIngreso: string;
  direccion: string;
  nacionalidad: string;
  estadoCivil: string;
  adendaFirmada: boolean;
  fechaFirmaAdenda?: string;
}

export interface CompanyConfig {
  id: string;
  razonSocial: string;
  rif: string;
  direccionFiscal: string;
  ciudad: string;
  registroMercantil: string;
  representanteLegal: string;
  cedulaRepresentante: string;
  cargoRepresentante: string;
  tasaBCV: number;
  fechaTasaBCV: string;
  telefono?: string;
  email?: string;
}

export interface BenefitReceipt {
  id: string;
  companyId?: string;
  receiptNumber: string;
  employeeId: string;
  employeeName: string;
  employeeCedula: string;
  employeeCargo: string;
  category: BenefitCategory;
  conceptTitle: string;
  conceptDescription: string;
  amountUSD: number;
  tasaBCV: number;
  amountBs: number;
  paymentMethod: PaymentMethod;
  bankName?: string;
  referenceNumber?: string;
  issueDate: string;
  coveragePeriod: string; // ej: "Septiembre 2026"
  
  // Soportes específicos
  // Para bolsas de comida:
  groceryItems?: GroceryItem[];
  
  // Para gastos médicos / reembolsos:
  clinicalInvoiceNumber?: string;
  clinicalInvoiceRIF?: string;
  patientName?: string;
  patientRelation?: string;
  
  // Tríada de control interno
  triadStatus: TriadStatus;
  dateTransferred?: string;
  dateArchivedPhysical?: string;
  archivedNotes?: string;
  hasWetThumbprint: boolean;
  hasPhysicalSignature: boolean;
  
  // Métricas
  salarioBaseBsAtTime: number;
  desalarizationRiskRatio: number; // gamma: bonos / (salario + bonos)
  riskLevel: 'verde' | 'amarillo' | 'rojo';
}

export interface CorporateFoodPurchaseInvoice {
  id: string;
  companyId?: string;
  invoiceNumber: string;
  providerName: string;
  providerRIF: string;
  invoiceDate: string;
  totalAmountBs: number;
  totalAmountUSD: number;
  totalBasketsCovered: number;
  itemsDescription: string;
  hasFiscalControlSENIAT: boolean;
}

export interface ContractAdenda {
  id: string;
  companyId?: string;
  employeeId: string;
  tipoBeneficio: 'bolsa_comida' | 'bono_transferencia';
  fechaSuscripcion: string;
  ciudad: string;
  periodicidad: 'MENSUAL' | 'QUINCENAL';
  diasEntrega: number; // primeros X dias
  firmada: boolean;
}

// Nominus Integration Types
export interface NominusConfig {
  apiUrl: string;
  apiKey: string;
  autoSync: boolean;
  lastSyncTime?: string;
  status: 'disconnected' | 'connected' | 'syncing' | 'error';
  lastError?: string;
  isEmbedded: boolean;
  hostingFolder: string;
}

export interface NominusRawEmployee {
  id?: string | number;
  cedula: string;
  nombres?: string;
  apellidos?: string;
  nombre_completo?: string;
  fullName?: string;
  cargo?: string;
  departamento?: string;
  salario_base?: number | string;
  salarioBaseBs?: number | string;
  sueldo?: number | string;
  banco?: string;
  cuenta_bancaria?: string;
  cuentaBancaria?: string;
  fecha_ingreso?: string;
  fechaIngreso?: string;
  es_director?: boolean | number | string;
  isDirector?: boolean;
  empresa_rif?: string;
  empresa_id?: string;
  companyId?: string;
}

export interface NominusRawCompany {
  id?: string | number;
  razon_social?: string;
  razonSocial?: string;
  nombre?: string;
  rif: string;
  direccion?: string;
  direccionFiscal?: string;
  representante_legal?: string;
  representanteLegal?: string;
  cedula_representante?: string;
  cedulaRepresentante?: string;
  cargo_representante?: string;
  cargoRepresentante?: string;
  tasa_bcv?: number;
  tasaBCV?: number;
  telefono?: string;
  email?: string;
}

export interface NominusSyncResult {
  success: boolean;
  companiesCount: number;
  employeesCount: number;
  message: string;
  timestamp: string;
  companies: CompanyConfig[];
  employees: Employee[];
}
