import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  BenefitCategory,
  BenefitReceipt,
  CloudArchiveFile,
  CloudFileType,
  CompanyConfig,
  CorporateFoodPurchaseInvoice,
  Employee,
  GroceryItem,
  PaymentMethod,
  TriadStatus,
} from './types';

// Initialize Firebase App, Firestore (with named database ID), and Auth
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore on boot as required by guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Track known cloud document IDs per collection to distinguish CREATE vs UPDATE cleanly
const knownCloudIds = {
  companies: new Set<string>(),
  employees: new Set<string>(),
  receipts: new Set<string>(),
  invoices: new Set<string>(),
  cloud_files: new Set<string>(),
};

// Sanitize IDs to strictly match ^[a-zA-Z0-9_\-]+$ and length 1..128
export function sanitizeFirestoreId(rawId: string, prefix = 'doc'): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const result = cleaned.length > 0 ? cleaned : `${prefix}-${Date.now()}`;
  return result.slice(0, 128);
}

// Defensive string truncation helper matching firebase-blueprint.json maxLength
function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const str = String(val ?? fallback).trim();
  const effective = str.length > 0 ? str : fallback;
  return effective.slice(0, maxLen);
}

function clampNum(val: number | undefined | null, min = 0, max = 1000000000, fallback = 0): number {
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function formatTimestamp(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toISOString();
  }
  if (typeof ts === 'string' && ts.length > 0) {
    return ts;
  }
  return new Date().toISOString();
}

// Authentication helpers
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFromFirebase(): Promise<void> {
  knownCloudIds.companies.clear();
  knownCloudIds.employees.clear();
  knownCloudIds.receipts.clear();
  knownCloudIds.invoices.clear();
  knownCloudIds.cloud_files.clear();
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

// ============================================================================
// 1. COMPANIES CRUD
// ============================================================================
export async function saveCompanyToCloud(company: CompanyConfig): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const docId = sanitizeFirestoreId(company.id, 'comp');
  const path = `companies/${docId}`;
  const isExisting = knownCloudIds.companies.has(docId);

  const mutableFields = {
    razonSocial: clampStr(company.razonSocial, 200, 'Empresa Registrada'),
    rif: clampStr(company.rif, 40, 'J-00000000-0'),
    direccionFiscal: clampStr(company.direccionFiscal, 500, ''),
    ciudad: clampStr(company.ciudad, 100, 'Caracas'),
    registroMercantil: clampStr(company.registroMercantil, 300, ''),
    representanteLegal: clampStr(company.representanteLegal, 150, ''),
    cedulaRepresentante: clampStr(company.cedulaRepresentante, 40, ''),
    cargoRepresentante: clampStr(company.cargoRepresentante, 100, ''),
    tasaBCV: clampNum(company.tasaBCV, 0.01, 1000000, 52.4),
    fechaTasaBCV: clampStr(company.fechaTasaBCV, 30, new Date().toISOString().split('T')[0]),
    telefono: clampStr(company.telefono, 50, ''),
    email: clampStr(company.email, 150, ''),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'companies', docId), mutableFields);
    } else {
      await setDoc(doc(db, 'companies', docId), {
        ownerId: user.uid,
        companyId: docId,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
      knownCloudIds.companies.add(docId);
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCompanyFromCloud(companyId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeFirestoreId(companyId, 'comp');
  const path = `companies/${docId}`;
  if (!knownCloudIds.companies.has(docId)) return;

  try {
    await deleteDoc(doc(db, 'companies', docId));
    knownCloudIds.companies.delete(docId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 2. EMPLOYEES CRUD
// ============================================================================
export async function saveEmployeeToCloud(employee: Employee): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const docId = sanitizeFirestoreId(employee.id, 'emp');
  const path = `employees/${docId}`;
  const isExisting = knownCloudIds.employees.has(docId);

  const mutableFields = {
    companyId: clampStr(employee.companyId ? sanitizeFirestoreId(employee.companyId, 'comp') : '', 128, ''),
    cedula: clampStr(employee.cedula, 40, 'V-00.000.000'),
    fullName: clampStr(employee.fullName, 150, 'Trabajador'),
    cargo: clampStr(employee.cargo, 120, ''),
    departamento: clampStr(employee.departamento, 120, ''),
    salarioBaseBs: clampNum(employee.salarioBaseBs, 0, 1000000000, 0),
    isDirector: Boolean(employee.isDirector),
    banco: clampStr(employee.banco, 120, ''),
    cuentaBancaria: clampStr(employee.cuentaBancaria, 60, ''),
    fechaIngreso: clampStr(employee.fechaIngreso, 30, ''),
    direccion: clampStr(employee.direccion, 400, ''),
    nacionalidad: clampStr(employee.nacionalidad, 60, 'Venezolana'),
    estadoCivil: clampStr(employee.estadoCivil, 60, 'Soltero(a)'),
    adendaFirmada: Boolean(employee.adendaFirmada),
    fechaFirmaAdenda: clampStr(employee.fechaFirmaAdenda, 30, ''),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'employees', docId), mutableFields);
    } else {
      await setDoc(doc(db, 'employees', docId), {
        ownerId: user.uid,
        employeeId: docId,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
      knownCloudIds.employees.add(docId);
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteEmployeeFromCloud(employeeId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeFirestoreId(employeeId, 'emp');
  const path = `employees/${docId}`;
  if (!knownCloudIds.employees.has(docId)) return;

  try {
    await deleteDoc(doc(db, 'employees', docId));
    knownCloudIds.employees.delete(docId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 3. RECEIPTS CRUD
// ============================================================================
function serializeGroceryItems(items?: GroceryItem[]): string {
  if (!items || items.length === 0) return '';
  return items
    .map(
      (it) =>
        `${String(it.id || '').replace(/[|;]/g, '')}|${String(it.name || '').replace(/[|;]/g, '')}|${Number(it.quantity) || 1}|${String(it.unit || 'unidades').replace(/[|;]/g, '')}`
    )
    .join(';')
    .slice(0, 2000);
}

function deserializeGroceryItems(summary: string): GroceryItem[] | undefined {
  if (!summary || !summary.trim()) return undefined;
  const parts = summary.split(';').filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.map((part, idx) => {
    const [id, name, qty, unit] = part.split('|');
    return {
      id: id || `item-${idx + 1}`,
      name: name || 'Rubro Alimenticio',
      quantity: Number(qty) || 1,
      unit: unit || 'unidades',
    };
  });
}

export async function saveReceiptToCloud(receipt: BenefitReceipt): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const docId = sanitizeFirestoreId(receipt.id, 'rec');
  const path = `receipts/${docId}`;
  const isExisting = knownCloudIds.receipts.has(docId);

  const mutableFields = {
    companyId: clampStr(receipt.companyId ? sanitizeFirestoreId(receipt.companyId, 'comp') : '', 128, ''),
    receiptNumber: clampStr(receipt.receiptNumber, 60, 'BN-0000'),
    employeeId: clampStr(receipt.employeeId ? sanitizeFirestoreId(receipt.employeeId, 'emp') : '', 128, ''),
    employeeName: clampStr(receipt.employeeName, 150, ''),
    employeeCedula: clampStr(receipt.employeeCedula, 40, ''),
    employeeCargo: clampStr(receipt.employeeCargo, 120, ''),
    category: clampStr(receipt.category, 60, 'alimentacion_complementaria'),
    conceptTitle: clampStr(receipt.conceptTitle, 300, 'Beneficio Social Art. 105 LOTTT'),
    conceptDescription: clampStr(receipt.conceptDescription, 2000, ''),
    amountUSD: clampNum(receipt.amountUSD, 0, 10000000, 0),
    tasaBCV: clampNum(receipt.tasaBCV, 0.01, 1000000, 52.4),
    amountBs: clampNum(receipt.amountBs, 0, 10000000000, 0),
    paymentMethod: clampStr(receipt.paymentMethod, 60, 'transferencia_independiente'),
    bankName: clampStr(receipt.bankName, 120, ''),
    referenceNumber: clampStr(receipt.referenceNumber, 100, ''),
    issueDate: clampStr(receipt.issueDate, 30, ''),
    coveragePeriod: clampStr(receipt.coveragePeriod, 80, ''),
    grocerySummary: serializeGroceryItems(receipt.groceryItems),
    clinicalInvoiceNumber: clampStr(receipt.clinicalInvoiceNumber, 80, ''),
    clinicalInvoiceRIF: clampStr(receipt.clinicalInvoiceRIF, 40, ''),
    patientName: clampStr(receipt.patientName, 150, ''),
    patientRelation: clampStr(receipt.patientRelation, 80, ''),
    triadStatus: clampStr(receipt.triadStatus, 40, 'parametrizado'),
    dateTransferred: clampStr(receipt.dateTransferred, 30, ''),
    dateArchivedPhysical: clampStr(receipt.dateArchivedPhysical, 30, ''),
    archivedNotes: clampStr(receipt.archivedNotes, 500, ''),
    hasWetThumbprint: Boolean(receipt.hasWetThumbprint),
    hasPhysicalSignature: Boolean(receipt.hasPhysicalSignature),
    salarioBaseBsAtTime: clampNum(receipt.salarioBaseBsAtTime, 0, 1000000000, 0),
    desalarizationRiskRatio: clampNum(receipt.desalarizationRiskRatio, 0, 100, 0),
    riskLevel: clampStr(receipt.riskLevel, 20, 'verde'),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'receipts', docId), mutableFields);
    } else {
      await setDoc(doc(db, 'receipts', docId), {
        ownerId: user.uid,
        receiptId: docId,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
      knownCloudIds.receipts.add(docId);
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteReceiptFromCloud(receiptId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeFirestoreId(receiptId, 'rec');
  const path = `receipts/${docId}`;
  if (!knownCloudIds.receipts.has(docId)) return;

  try {
    await deleteDoc(doc(db, 'receipts', docId));
    knownCloudIds.receipts.delete(docId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ============================================================================
// 4. INVOICES CRUD
// ============================================================================
export async function saveInvoiceToCloud(invoice: CorporateFoodPurchaseInvoice): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const docId = sanitizeFirestoreId(invoice.id, 'inv');
  const path = `invoices/${docId}`;
  const isExisting = knownCloudIds.invoices.has(docId);

  const mutableFields = {
    companyId: clampStr(invoice.companyId ? sanitizeFirestoreId(invoice.companyId, 'comp') : '', 128, ''),
    invoiceNumber: clampStr(invoice.invoiceNumber, 80, 'FAC-0000'),
    providerName: clampStr(invoice.providerName, 200, 'Proveedor'),
    providerRIF: clampStr(invoice.providerRIF, 40, ''),
    invoiceDate: clampStr(invoice.invoiceDate, 30, ''),
    totalAmountBs: clampNum(invoice.totalAmountBs, 0, 10000000000, 0),
    totalAmountUSD: clampNum(invoice.totalAmountUSD, 0, 100000000, 0),
    totalBasketsCovered: clampNum(invoice.totalBasketsCovered, 0, 1000000, 0),
    itemsDescription: clampStr(invoice.itemsDescription, 2000, ''),
    hasFiscalControlSENIAT: Boolean(invoice.hasFiscalControlSENIAT),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'invoices', docId), mutableFields);
    } else {
      await setDoc(doc(db, 'invoices', docId), {
        ownerId: user.uid,
        invoiceId: docId,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
      knownCloudIds.invoices.add(docId);
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

// ============================================================================
// 5. CLOUD ARCHIVE FILES CRUD (/cloud_files/{fileId})
// ============================================================================
export async function saveCloudFileToFirestore(
  fileInput: Omit<CloudArchiveFile, 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Debe iniciar sesión con Google para guardar archivos en la nube de Firebase.');
  }

  const docId = sanitizeFirestoreId(fileInput.id, 'file');
  const path = `cloud_files/${docId}`;
  const isExisting = knownCloudIds.cloud_files.has(docId);

  const allowedTypes: CloudFileType[] = [
    'recibo_pdf',
    'recibo_word',
    'adenda_contrato',
    'factura_seniat',
    'expediente_escaneado',
    'reporte_excel',
    'otro_documento',
  ];
  const validType: CloudFileType = allowedTypes.includes(fileInput.fileType)
    ? fileInput.fileType
    : 'otro_documento';

  const mutableFields = {
    companyId: clampStr(fileInput.companyId ? sanitizeFirestoreId(fileInput.companyId, 'comp') : '', 128, ''),
    companyRif: clampStr(fileInput.companyRif, 40, ''),
    companyName: clampStr(fileInput.companyName, 200, ''),
    fileName: clampStr(fileInput.fileName, 250, 'Documento_Respaldo.html'),
    fileType: validType,
    mimeType: clampStr(fileInput.mimeType, 120, 'text/html'),
    fileSize: clampNum(fileInput.fileSize, 0, 750000, 0),
    relatedReceiptId: clampStr(fileInput.relatedReceiptId, 128, ''),
    relatedEmployeeName: clampStr(fileInput.relatedEmployeeName, 150, ''),
    relatedEmployeeCedula: clampStr(fileInput.relatedEmployeeCedula, 40, ''),
    description: clampStr(fileInput.description, 1000, ''),
    dataUrl: clampStr(fileInput.dataUrl, 900000, ''),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'cloud_files', docId), mutableFields);
    } else {
      await setDoc(doc(db, 'cloud_files', docId), {
        ownerId: user.uid,
        fileId: docId,
        ...mutableFields,
        createdAt: serverTimestamp(),
      });
      knownCloudIds.cloud_files.add(docId);
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteCloudFileFromFirestore(fileId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeFirestoreId(fileId, 'file');
  const path = `cloud_files/${docId}`;

  try {
    await deleteDoc(doc(db, 'cloud_files', docId));
    knownCloudIds.cloud_files.delete(docId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Helper to build a printable HTML DataURL from a BenefitReceipt and save it as a CloudArchiveFile
export async function archiveReceiptDocumentToCloud(
  receipt: BenefitReceipt,
  company: CompanyConfig
): Promise<void> {
  const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Comprobante ${receipt.receiptNumber} - ${receipt.employeeName}</title>
<style>
  body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; line-height: 1.5; }
  .box { border: 2px solid #0f172a; padding: 24px; border-radius: 8px; max-width: 780px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; border-bottom: 2px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 16px; }
  .title { font-size: 16px; font-weight: bold; text-transform: uppercase; }
  .subtitle { font-size: 12px; color: #475569; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 13px; }
  .concept { background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px; border-radius: 6px; margin-bottom: 16px; }
  .legal { font-size: 11px; color: #334155; text-align: justify; border-top: 1px dashed #94a3b8; padding-top: 12px; }
  .sigs { display: flex; justify-content: space-between; margin-top: 40px; font-size: 12px; text-align: center; }
</style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div>
        <div class="title">${company.razonSocial}</div>
        <div class="subtitle">R.I.F.: ${company.rif} | ${company.direccionFiscal}</div>
      </div>
      <div style="text-align:right;">
        <div class="title">RECIBO N° ${receipt.receiptNumber}</div>
        <div class="subtitle">Fecha: ${receipt.issueDate} | Período: ${receipt.coveragePeriod}</div>
      </div>
    </div>
    <div class="grid">
      <div><strong>Trabajador:</strong> ${receipt.employeeName}</div>
      <div><strong>Cédula:</strong> ${receipt.employeeCedula}</div>
      <div><strong>Cargo:</strong> ${receipt.employeeCargo}</div>
      <div><strong>Estado Tríada:</strong> ${receipt.triadStatus.toUpperCase()}</div>
      <div><strong>Monto en Bolívares:</strong> Bs. ${receipt.amountBs.toFixed(2)}</div>
      <div><strong>Equivalente Ref. BCV:</strong> $${receipt.amountUSD.toFixed(2)} (Tasa BCV: Bs. ${receipt.tasaBCV.toFixed(2)})</div>
    </div>
    <div class="concept">
      <div style="font-weight:bold; margin-bottom:6px;">CONCEPTO NO REMUNERATIVO (ART. 105 LOTTT): ${receipt.conceptTitle}</div>
      <div style="font-size:12px;">${receipt.conceptDescription}</div>
    </div>
    <div class="legal">
      DECLARACIÓN EXPRESA DE EXCLUSIÓN SALARIAL: El beneficio social descrito en este comprobante se otorga con carácter estrictamente asistencial y no remunerativo conforme al Artículo 105 de la LOTTT, Artículo 73 del RLOT y la doctrina vinculante de la Sala de Casación Social del TSJ (Sentencia N° 523 - Caso INDULAC), sin incidencia en salario normal ni prestaciones sociales.
    </div>
    <div class="sigs">
      <div>_______________________________<br/>Por La Empresa (${company.razonSocial})</div>
      <div>_______________________________<br/>Firma del Trabajador (${receipt.employeeName})</div>
      <div>[ Huella Dactilar: ${receipt.hasWetThumbprint ? 'ARCHIVADA' : 'PENDIENTE'} ]</div>
    </div>
  </div>
</body>
</html>`;

  const base64 = btoa(unescape(encodeURIComponent(htmlContent)));
  const dataUrl = `data:text/html;base64,${base64}`;
  const byteSize = htmlContent.length;

  await saveCloudFileToFirestore({
    id: `file-rec-${sanitizeFirestoreId(receipt.id, 'rec')}`,
    companyId: company.id,
    companyRif: company.rif,
    companyName: company.razonSocial,
    fileName: `Comprobante_${receipt.receiptNumber}_${receipt.employeeCedula.replace(/[^0-9A-Z]/gi, '')}.html`,
    fileType: 'recibo_pdf',
    mimeType: 'text/html',
    fileSize: byteSize,
    relatedReceiptId: receipt.receiptNumber,
    relatedEmployeeName: receipt.employeeName,
    relatedEmployeeCedula: receipt.employeeCedula,
    description: `${receipt.conceptTitle} (${receipt.coveragePeriod}) - Bs. ${receipt.amountBs.toFixed(2)} / $${receipt.amountUSD.toFixed(2)}`,
    dataUrl,
  });
}

// ============================================================================
// 6. FULL BULK SYNC & REALTIME LISTENERS
// ============================================================================
export async function syncAllLocalDataToCloud(data: {
  companies: CompanyConfig[];
  employees: Employee[];
  receipts: BenefitReceipt[];
  invoices: CorporateFoodPurchaseInvoice[];
}): Promise<{
  companiesCount: number;
  employeesCount: number;
  receiptsCount: number;
  invoicesCount: number;
}> {
  for (const c of data.companies) {
    await saveCompanyToCloud(c);
  }
  for (const e of data.employees) {
    await saveEmployeeToCloud(e);
  }
  for (const r of data.receipts) {
    await saveReceiptToCloud(r);
  }
  for (const inv of data.invoices) {
    await saveInvoiceToCloud(inv);
  }

  return {
    companiesCount: data.companies.length,
    employeesCount: data.employees.length,
    receiptsCount: data.receipts.length,
    invoicesCount: data.invoices.length,
  };
}

export function subscribeToUserCloudData(
  userId: string,
  callbacks: {
    onCompanies: (companies: CompanyConfig[]) => void;
    onEmployees: (employees: Employee[]) => void;
    onReceipts: (receipts: BenefitReceipt[]) => void;
    onInvoices: (invoices: CorporateFoodPurchaseInvoice[]) => void;
    onCloudFiles: (files: CloudArchiveFile[]) => void;
  }
): () => void {
  const qCompanies = query(collection(db, 'companies'), where('ownerId', '==', userId));
  const unsubCompanies = onSnapshot(
    qCompanies,
    (snapshot) => {
      knownCloudIds.companies.clear();
      const list: CompanyConfig[] = [];
      snapshot.forEach((docSnap) => {
        knownCloudIds.companies.add(docSnap.id);
        const d = docSnap.data();
        list.push({
          id: d.companyId || docSnap.id,
          razonSocial: d.razonSocial || '',
          rif: d.rif || '',
          direccionFiscal: d.direccionFiscal || '',
          ciudad: d.ciudad || '',
          registroMercantil: d.registroMercantil || '',
          representanteLegal: d.representanteLegal || '',
          cedulaRepresentante: d.cedulaRepresentante || '',
          cargoRepresentante: d.cargoRepresentante || '',
          tasaBCV: Number(d.tasaBCV) || 52.4,
          fechaTasaBCV: d.fechaTasaBCV || '',
          telefono: d.telefono || undefined,
          email: d.email || undefined,
        });
      });
      callbacks.onCompanies(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'companies');
    }
  );

  const qEmployees = query(collection(db, 'employees'), where('ownerId', '==', userId));
  const unsubEmployees = onSnapshot(
    qEmployees,
    (snapshot) => {
      knownCloudIds.employees.clear();
      const list: Employee[] = [];
      snapshot.forEach((docSnap) => {
        knownCloudIds.employees.add(docSnap.id);
        const d = docSnap.data();
        list.push({
          id: d.employeeId || docSnap.id,
          companyId: d.companyId || undefined,
          cedula: d.cedula || '',
          fullName: d.fullName || '',
          cargo: d.cargo || '',
          departamento: d.departamento || '',
          salarioBaseBs: Number(d.salarioBaseBs) || 0,
          isDirector: Boolean(d.isDirector),
          banco: d.banco || '',
          cuentaBancaria: d.cuentaBancaria || '',
          fechaIngreso: d.fechaIngreso || '',
          direccion: d.direccion || '',
          nacionalidad: d.nacionalidad || 'Venezolana',
          estadoCivil: d.estadoCivil || 'Soltero(a)',
          adendaFirmada: Boolean(d.adendaFirmada),
          fechaFirmaAdenda: d.fechaFirmaAdenda || undefined,
        });
      });
      callbacks.onEmployees(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees');
    }
  );

  const qReceipts = query(collection(db, 'receipts'), where('ownerId', '==', userId));
  const unsubReceipts = onSnapshot(
    qReceipts,
    (snapshot) => {
      knownCloudIds.receipts.clear();
      const list: BenefitReceipt[] = [];
      snapshot.forEach((docSnap) => {
        knownCloudIds.receipts.add(docSnap.id);
        const d = docSnap.data();
        list.push({
          id: d.receiptId || docSnap.id,
          companyId: d.companyId || undefined,
          receiptNumber: d.receiptNumber || '',
          employeeId: d.employeeId || '',
          employeeName: d.employeeName || '',
          employeeCedula: d.employeeCedula || '',
          employeeCargo: d.employeeCargo || '',
          category: (d.category as BenefitCategory) || 'alimentacion_complementaria',
          conceptTitle: d.conceptTitle || '',
          conceptDescription: d.conceptDescription || '',
          amountUSD: Number(d.amountUSD) || 0,
          tasaBCV: Number(d.tasaBCV) || 52.4,
          amountBs: Number(d.amountBs) || 0,
          paymentMethod: (d.paymentMethod as PaymentMethod) || 'transferencia_independiente',
          bankName: d.bankName || undefined,
          referenceNumber: d.referenceNumber || undefined,
          issueDate: d.issueDate || '',
          coveragePeriod: d.coveragePeriod || '',
          groceryItems: deserializeGroceryItems(d.grocerySummary || ''),
          clinicalInvoiceNumber: d.clinicalInvoiceNumber || undefined,
          clinicalInvoiceRIF: d.clinicalInvoiceRIF || undefined,
          patientName: d.patientName || undefined,
          patientRelation: d.patientRelation || undefined,
          triadStatus: (d.triadStatus as TriadStatus) || 'parametrizado',
          dateTransferred: d.dateTransferred || undefined,
          dateArchivedPhysical: d.dateArchivedPhysical || undefined,
          archivedNotes: d.archivedNotes || undefined,
          hasWetThumbprint: Boolean(d.hasWetThumbprint),
          hasPhysicalSignature: Boolean(d.hasPhysicalSignature),
          salarioBaseBsAtTime: Number(d.salarioBaseBsAtTime) || 0,
          desalarizationRiskRatio: Number(d.desalarizationRiskRatio) || 0,
          riskLevel: (d.riskLevel as 'verde' | 'amarillo' | 'rojo') || 'verde',
        });
      });
      callbacks.onReceipts(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'receipts');
    }
  );

  const qInvoices = query(collection(db, 'invoices'), where('ownerId', '==', userId));
  const unsubInvoices = onSnapshot(
    qInvoices,
    (snapshot) => {
      knownCloudIds.invoices.clear();
      const list: CorporateFoodPurchaseInvoice[] = [];
      snapshot.forEach((docSnap) => {
        knownCloudIds.invoices.add(docSnap.id);
        const d = docSnap.data();
        list.push({
          id: d.invoiceId || docSnap.id,
          companyId: d.companyId || undefined,
          invoiceNumber: d.invoiceNumber || '',
          providerName: d.providerName || '',
          providerRIF: d.providerRIF || '',
          invoiceDate: d.invoiceDate || '',
          totalAmountBs: Number(d.totalAmountBs) || 0,
          totalAmountUSD: Number(d.totalAmountUSD) || 0,
          totalBasketsCovered: Number(d.totalBasketsCovered) || 0,
          itemsDescription: d.itemsDescription || '',
          hasFiscalControlSENIAT: Boolean(d.hasFiscalControlSENIAT),
        });
      });
      callbacks.onInvoices(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    }
  );

  const qCloudFiles = query(collection(db, 'cloud_files'), where('ownerId', '==', userId));
  const unsubCloudFiles = onSnapshot(
    qCloudFiles,
    (snapshot) => {
      knownCloudIds.cloud_files.clear();
      const list: CloudArchiveFile[] = [];
      snapshot.forEach((docSnap) => {
        knownCloudIds.cloud_files.add(docSnap.id);
        const d = docSnap.data();
        list.push({
          id: d.fileId || docSnap.id,
          ownerId: d.ownerId || userId,
          companyId: d.companyId || '',
          companyRif: d.companyRif || '',
          companyName: d.companyName || '',
          fileName: d.fileName || 'Archivo',
          fileType: (d.fileType as CloudFileType) || 'otro_documento',
          mimeType: d.mimeType || 'application/octet-stream',
          fileSize: Number(d.fileSize) || 0,
          relatedReceiptId: d.relatedReceiptId || undefined,
          relatedEmployeeName: d.relatedEmployeeName || undefined,
          relatedEmployeeCedula: d.relatedEmployeeCedula || undefined,
          description: d.description || '',
          dataUrl: d.dataUrl || '',
          createdAt: formatTimestamp(d.createdAt),
          updatedAt: formatTimestamp(d.updatedAt),
        });
      });
      // Sort newest first
      list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      callbacks.onCloudFiles(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'cloud_files');
    }
  );

  return () => {
    unsubCompanies();
    unsubEmployees();
    unsubReceipts();
    unsubInvoices();
    unsubCloudFiles();
  };
}
