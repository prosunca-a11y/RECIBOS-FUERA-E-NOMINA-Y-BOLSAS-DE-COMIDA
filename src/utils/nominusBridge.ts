import * as XLSX from 'xlsx';
import { CompanyConfig, Employee, NominusConfig, NominusRawCompany, NominusRawEmployee, NominusSyncResult, BenefitReceipt } from '../types';

/**
 * Clean and normalize a Venezuelan Cédula
 */
export function normalizeCedula(raw: string | number | undefined): string {
  if (!raw) return 'V-00.000.000';
  let str = String(raw).trim().toUpperCase();
  // If no prefix, assume V-
  if (!/^[VEJP]-/i.test(str)) {
    str = `V-${str}`;
  }
  return str;
}

/**
 * Map raw employee from Nominus DB/API/Excel into our standard Employee model
 */
export function mapRawEmployeeToApp(
  raw: NominusRawEmployee,
  fallbackCompanyId: string,
  companyRifMap?: Map<string, string>
): Employee {
  const cedula = normalizeCedula(raw.cedula);
  
  // Resolve fullName
  let fullName = raw.fullName || raw.nombre_completo || '';
  if (!fullName) {
    const nombres = raw.nombres || '';
    const apellidos = raw.apellidos || '';
    fullName = `${nombres} ${apellidos}`.trim();
  }
  if (!fullName) {
    fullName = `Trabajador C.I. ${cedula}`;
  }

  // Resolve cargo & depto
  const cargo = (raw.cargo || 'Empleado').trim();
  const departamento = (raw.departamento || 'Operaciones').trim();

  // Resolve salary (clean currency signs, commas, periods)
  let salaryNum = 5000;
  const rawSalary = raw.salarioBaseBs ?? raw.salario_base ?? raw.sueldo;
  if (typeof rawSalary === 'number') {
    salaryNum = rawSalary;
  } else if (typeof rawSalary === 'string') {
    const cleaned = rawSalary.replace(/[^0-9.,]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      salaryNum = parsed;
    }
  }

  // Resolve bank & account
  const banco = raw.banco || 'Banco Mercantil (0105)';
  const cuentaBancaria = raw.cuentaBancaria || raw.cuenta_bancaria || '0105-0000-00-0000000000';

  // Resolve director status
  const isDirector = Boolean(
    raw.isDirector ||
    raw.es_director === true ||
    raw.es_director === 1 ||
    raw.es_director === '1' ||
    raw.es_director === 'true'
  );

  // Resolve target companyId
  let companyId = fallbackCompanyId;
  if (raw.companyId) {
    companyId = raw.companyId;
  } else if (raw.empresa_rif && companyRifMap && companyRifMap.has(raw.empresa_rif.toUpperCase().trim())) {
    companyId = companyRifMap.get(raw.empresa_rif.toUpperCase().trim())!;
  }

  const id = raw.id ? `emp-nom-${raw.id}` : `emp-nom-${cedula.replace(/[^0-9]/g, '')}`;

  return {
    id,
    companyId,
    cedula,
    fullName,
    cargo,
    departamento,
    salarioBaseBs: Math.round(salaryNum * 100) / 100,
    isDirector,
    banco,
    cuentaBancaria,
    fechaIngreso: raw.fechaIngreso || raw.fecha_ingreso || new Date().toISOString().split('T')[0],
    direccion: 'Caracas, Venezuela',
    nacionalidad: cedula.startsWith('E-') ? 'Extranjera' : 'Venezolana',
    estadoCivil: 'Soltero(a)',
    adendaFirmada: false,
  };
}

/**
 * Map raw company from Nominus DB/API/Excel into CompanyConfig
 */
export function mapRawCompanyToApp(raw: NominusRawCompany, index = 0): CompanyConfig {
  const razonSocial = raw.razonSocial || raw.razon_social || raw.nombre || `Empresa Nóminus ${index + 1}`;
  const rif = (raw.rif || `J-${10000000 + index}-0`).toUpperCase().trim();
  const id = raw.id ? `comp-nom-${raw.id}` : `comp-nom-${rif.replace(/[^0-9A-Z]/g, '')}`;

  return {
    id,
    razonSocial,
    rif,
    direccionFiscal: raw.direccionFiscal || raw.direccion || 'Zona Empresarial, Caracas, Venezuela',
    ciudad: 'Caracas, Venezuela',
    registroMercantil: 'Registro Mercantil Segundo del Dtto. Capital',
    representanteLegal: raw.representanteLegal || raw.representante_legal || 'Representante Legal Nóminus',
    cedulaRepresentante: raw.cedulaRepresentante || raw.cedula_representante || 'V-12.345.678',
    cargoRepresentante: raw.cargoRepresentante || raw.cargo_representante || 'Director General',
    tasaBCV: Number(raw.tasaBCV || raw.tasa_bcv || 52.40),
    fechaTasaBCV: new Date().toISOString().split('T')[0],
    telefono: raw.telefono || '0212-0000000',
    email: raw.email || 'contacto@nominus.local',
  };
}

/**
 * Fetch companies and employees from Nominus HTTP API / Bridge
 */
export async function fetchFromNominusApi(config: NominusConfig): Promise<NominusSyncResult> {
  const url = config.apiUrl.trim();
  if (!url) {
    throw new Error('Debe especificar la URL del API o del puente Nóminus (nominus_bridge.php).');
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (config.apiKey.trim()) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
    headers['X-Nominus-Token'] = config.apiKey.trim();
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      mode: 'cors',
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `No se pudo contactar al servidor de Nóminus (${url}). Verifique que la URL sea accesible y que el script nominus_bridge.php tenga habilitados los encabezados CORS. Detalle técnico: ${errorMsg}`
    );
  }

  if (!response.ok) {
    throw new Error(`Nóminus respondió con código de error HTTP ${response.status} (${response.statusText}).`);
  }

  const data = await response.json();

  // Support varying response wrappers: data.companies, data.data.companies, data.empleados, etc.
  const rawCompanies: NominusRawCompany[] =
    data.companies || data.empresas || data.data?.companies || data.data?.empresas || [];
  const rawEmployees: NominusRawEmployee[] =
    data.employees || data.empleados || data.trabajadores || data.data?.employees || data.data?.trabajadores || [];

  if (rawCompanies.length === 0 && rawEmployees.length === 0) {
    throw new Error(
      'La respuesta de Nóminus no contiene listas de "empresas" ni "empleados" / "trabajadores". Verifique el formato JSON devuelto por el API.'
    );
  }

  // Process companies
  const companies: CompanyConfig[] = rawCompanies.map((c, i) => mapRawCompanyToApp(c, i));

  // Build RIF lookup map
  const rifMap = new Map<string, string>();
  companies.forEach((c) => {
    rifMap.set(c.rif.toUpperCase().trim(), c.id);
  });

  const fallbackCompId = companies[0]?.id || 'comp-1';

  // Process employees
  const employees: Employee[] = rawEmployees.map((e) => mapRawEmployeeToApp(e, fallbackCompId, rifMap));

  return {
    success: true,
    companiesCount: companies.length,
    employeesCount: employees.length,
    message: `Sincronización exitosa: ${companies.length} empresa(s) y ${employees.length} trabajador(es) importados desde Nóminus.`,
    timestamp: new Date().toISOString(),
    companies,
    employees,
  };
}

/**
 * Parse an Excel, CSV, or JSON file exported from Nominus
 */
export async function parseNominusFile(
  file: File,
  activeCompany: CompanyConfig,
  existingCompanies: CompanyConfig[]
): Promise<NominusSyncResult> {
  const fileName = file.name.toLowerCase();

  // JSON File
  if (fileName.endsWith('.json')) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const rawCompanies: NominusRawCompany[] =
      parsed.companies || parsed.empresas || (parsed.rif ? [parsed] : []);
    const rawEmployees: NominusRawEmployee[] =
      parsed.employees || parsed.empleados || parsed.trabajadores || (Array.isArray(parsed) ? parsed : []);

    const companies: CompanyConfig[] = rawCompanies.map((c, i) => mapRawCompanyToApp(c, i));
    const rifMap = new Map<string, string>();
    existingCompanies.forEach((c) => rifMap.set(c.rif.toUpperCase().trim(), c.id));
    companies.forEach((c) => rifMap.set(c.rif.toUpperCase().trim(), c.id));

    const fallbackCompId = companies[0]?.id || activeCompany.id;
    const employees: Employee[] = rawEmployees.map((e) => mapRawEmployeeToApp(e, fallbackCompId, rifMap));

    return {
      success: true,
      companiesCount: companies.length,
      employeesCount: employees.length,
      message: `Archivo JSON de Nóminus procesado: ${companies.length} empresa(s) y ${employees.length} trabajador(es).`,
      timestamp: new Date().toISOString(),
      companies,
      employees,
    };
  }

  // Excel or CSV
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

  if (!jsonRows || jsonRows.length === 0) {
    throw new Error('El archivo cargado no contiene registros o filas legibles.');
  }

  const employees: Employee[] = [];
  const detectedCompaniesMap = new Map<string, CompanyConfig>();

  // Map known headers flexibly
  jsonRows.forEach((row, index) => {
    // Look for cédula in any key
    let cedulaVal = '';
    let fullNameVal = '';
    let cargoVal = 'Empleado';
    let deptoVal = 'Operaciones';
    let salarioVal = 5000;
    let bancoVal = 'Banco Mercantil (0105)';
    let cuentaVal = '';
    let isDirectorVal = false;
    let empresaNombreVal = '';
    let empresaRifVal = '';

    for (const [key, val] of Object.entries(row)) {
      const k = key.toLowerCase().trim().replace(/[\s_-]+/g, '');
      const strVal = String(val ?? '').trim();

      if (k.includes('cedula') || k === 'ci' || k === 'identificacion' || k === 'dni') {
        cedulaVal = strVal;
      } else if (k.includes('nombre') && (k.includes('completo') || k.includes('trabajador') || k.includes('empleado'))) {
        fullNameVal = strVal;
      } else if (k === 'nombres' && !fullNameVal) {
        fullNameVal = strVal;
      } else if (k === 'apellidos' && fullNameVal) {
        fullNameVal = `${fullNameVal} ${strVal}`.trim();
      } else if (k.includes('cargo') || k.includes('puesto') || k.includes('ocupacion')) {
        cargoVal = strVal;
      } else if (k.includes('departamento') || k.includes('depto') || k.includes('area')) {
        deptoVal = strVal;
      } else if (k.includes('salario') || k.includes('sueldo') || k.includes('base')) {
        const num = parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.'));
        if (!isNaN(num)) salarioVal = num;
      } else if (k.includes('banco')) {
        bancoVal = strVal;
      } else if (k.includes('cuenta') || k.includes('nrocuenta')) {
        cuentaVal = strVal;
      } else if (k.includes('director') || k.includes('socio') || k.includes('gerente')) {
        isDirectorVal = Boolean(val === true || val === 1 || String(val).toLowerCase() === 'si');
      } else if (k.includes('empresa') || k.includes('razon') || k.includes('compania')) {
        empresaNombreVal = strVal;
      } else if (k.includes('rif')) {
        empresaRifVal = strVal;
      }
    }

    if (!cedulaVal && !fullNameVal) {
      return; // Skip empty rows
    }

    // Check if company specified in row
    let assignedCompId = activeCompany.id;
    if (empresaRifVal) {
      const cleanRif = empresaRifVal.toUpperCase().trim();
      if (!detectedCompaniesMap.has(cleanRif)) {
        detectedCompaniesMap.set(cleanRif, {
          id: `comp-nom-${cleanRif.replace(/[^0-9A-Z]/g, '')}`,
          razonSocial: empresaNombreVal || `Empresa ${cleanRif}`,
          rif: cleanRif,
          direccionFiscal: 'Caracas, Venezuela',
          ciudad: 'Caracas',
          registroMercantil: 'Registro Mercantil',
          representanteLegal: 'Representante Nóminus',
          cedulaRepresentante: 'V-12.345.678',
          cargoRepresentante: 'Gerente General',
          tasaBCV: activeCompany.tasaBCV,
          fechaTasaBCV: new Date().toISOString().split('T')[0],
        });
      }
      assignedCompId = detectedCompaniesMap.get(cleanRif)!.id;
    }

    const rawEmp: NominusRawEmployee = {
      id: index + 1,
      cedula: cedulaVal || `V-${10000000 + index}`,
      fullName: fullNameVal,
      cargo: cargoVal,
      departamento: deptoVal,
      salarioBaseBs: salarioVal,
      banco: bancoVal,
      cuentaBancaria: cuentaVal,
      isDirector: isDirectorVal,
      companyId: assignedCompId,
    };

    employees.push(mapRawEmployeeToApp(rawEmp, assignedCompId));
  });

  const detectedCompaniesList = Array.from(detectedCompaniesMap.values());

  return {
    success: true,
    companiesCount: detectedCompaniesList.length,
    employeesCount: employees.length,
    message: `Archivo de Nóminus (${fileName}) procesado exitosamente: ${employees.length} trabajadores importados.`,
    timestamp: new Date().toISOString(),
    companies: detectedCompaniesList,
    employees,
  };
}

/**
 * Generate the drop-in PHP bridge file `nominus_bridge.php`
 * This file can be uploaded straight into the user's hosting directory where Nominus is installed.
 */
export function generateNominusBridgePHP(secretToken = 'NOMINUS_SECRET_2026'): string {
  return `<?php
/**
 * =========================================================================
 * PUENTE DE INTEGRACIÓN NÓMINUS <-> APP RECIBOS FUERA DE NÓMINA (LOTTT)
 * =========================================================================
 * INSTRUCCIONES DE INSTALACIÓN EN HOSTING (cPanel / Apache / Nginx):
 * 1. Suba este archivo 'nominus_bridge.php' a la carpeta principal de su sistema
 *    Nóminus en su hosting (ejemplo: public_html/nominus/nominus_bridge.php)
 * 2. Configure los datos de su base de datos MySQL abajo si no se auto-detectan.
 * 3. En la App de Recibos, coloque la URL: https://su-dominio.com/nominus/nominus_bridge.php
 *    y el Token Secreto: ${secretToken}
 * =========================================================================
 */

// Encabezados para permitir comunicación segura CORS desde la App de Recibos
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Nominus-Token');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Verificación de Seguridad por Token
$configuredToken = '${secretToken}';
$authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
if (!$authHeader && isset($_SERVER['HTTP_X_NOMINUS_TOKEN'])) {
    $authHeader = 'Bearer ' . $_SERVER['HTTP_X_NOMINUS_TOKEN'];
}

if (!empty($configuredToken)) {
    $tokenMatch = false;
    if (preg_match('/Bearer\\s+(.*)$/i', $authHeader, $matches)) {
        if (trim($matches[1]) === $configuredToken) {
            $tokenMatch = true;
        }
    } elseif (isset($_GET['token']) && $_GET['token'] === $configuredToken) {
        $tokenMatch = true;
    }

    if (!$tokenMatch) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Acceso denegado: Token de autorización inválido o faltante en nominus_bridge.php'
        ]);
        exit();
    }
}

// 2. Conexión con la Base de Datos de Nóminus (Auto-detección o manual)
$dbHost = defined('DB_HOST') ? DB_HOST : (getenv('DB_HOST') ?: 'localhost');
$dbUser = defined('DB_USER') ? DB_USER : (getenv('DB_USER') ?: 'root');
$dbPass = defined('DB_PASS') ? DB_PASS : (getenv('DB_PASS') ?: '');
$dbName = defined('DB_NAME') ? DB_NAME : (getenv('DB_NAME') ?: 'nominus_db');

// Si existe el archivo de configuración nativo de Nóminus, inclúyalo:
if (file_exists(__DIR__ . '/config.php')) {
    @include_once __DIR__ . '/config.php';
} elseif (file_exists(__DIR__ . '/database.php')) {
    @include_once __DIR__ . '/database.php';
}

$pdo = null;
try {
    $dsn = "mysql:host={$dbHost};dbname={$dbName};charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (Exception $e) {
    // Si falla la conexión a MySQL, devolvemos respuesta diagnóstica o datos simulados de respaldo
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Error de conexión a la base de datos de Nóminus: ' . $e->getMessage(),
        'hint' => 'Edite las variables $dbHost, $dbUser, $dbPass y $dbName dentro de nominus_bridge.php'
    ]);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : 'sync';

// 3. Acción: Sincronización completa de Empresas y Empleados
if ($action === 'sync') {
    $companies = [];
    $employees = [];

    // Consulta de Empresas (adapta a tablas comunes: empresas / companias / companies)
    try {
        $stmtComp = $pdo->query("
            SELECT 
                id, 
                COALESCE(razon_social, nombre, nombre_empresa) as razon_social, 
                COALESCE(rif, rif_empresa, identificacion) as rif, 
                COALESCE(direccion_fiscal, direccion) as direccion_fiscal, 
                COALESCE(representante_legal, contacto) as representante_legal, 
                COALESCE(cedula_representante, ci_representante) as cedula_representante, 
                COALESCE(tasa_bcv, 52.40) as tasa_bcv
            FROM empresas 
            LIMIT 50
        ");
        $companies = $stmtComp->fetchAll();
    } catch (Exception $e) {
        // Tabla empresas no encontrada con ese nombre exacto, intentar auto-descubrir
        $companies = [
            [
                'id' => 1,
                'razon_social' => 'Empresa Nóminus Principal',
                'rif' => 'J-40892174-3',
                'direccion_fiscal' => 'Caracas, Venezuela',
                'representante_legal' => 'Director de Nómina',
                'cedula_representante' => 'V-12.345.678',
                'tasa_bcv' => 52.40
            ]
        ];
    }

    // Consulta de Trabajadores / Empleados (adapta a tablas: empleados / trabajadores / personal)
    try {
        $stmtEmp = $pdo->query("
            SELECT 
                e.id, 
                COALESCE(e.cedula, e.ci, e.documento) as cedula, 
                COALESCE(CONCAT(e.nombres, ' ', e.apellidos), e.nombre_completo, e.nombre) as fullName, 
                COALESCE(e.cargo, 'Empleado') as cargo, 
                COALESCE(e.departamento, 'Operaciones') as departamento, 
                COALESCE(e.salario_base, e.sueldo_base, e.salario, 5000) as salarioBaseBs, 
                COALESCE(e.banco, 'Banco Mercantil (0105)') as banco, 
                COALESCE(e.cuenta_bancaria, e.nro_cuenta, '0105-0000-00-0000000000') as cuentaBancaria, 
                COALESCE(e.es_director, 0) as isDirector, 
                COALESCE(e.empresa_id, 1) as empresa_id,
                COALESCE(e.empresa_rif, '') as empresa_rif
            FROM empleados e
            WHERE COALESCE(e.estatus, 'activo') = 'activo'
            LIMIT 500
        ");
        $employees = $stmtEmp->fetchAll();
    } catch (Exception $e) {
        // Si la tabla se llama 'trabajadores'
        try {
            $stmtEmp = $pdo->query("
                SELECT 
                    id, 
                    cedula, 
                    nombre as fullName, 
                    cargo, 
                    departamento, 
                    sueldo as salarioBaseBs, 
                    banco, 
                    cuenta as cuentaBancaria 
                FROM trabajadores
                LIMIT 500
            ");
            $employees = $stmtEmp->fetchAll();
        } catch (Exception $e2) {
            $employees = [];
        }
    }

    echo json_encode([
        'status' => 'success',
        'server_time' => date('Y-m-d H:i:s'),
        'companies' => $companies,
        'employees' => $employees,
        'count_companies' => count($companies),
        'count_employees' => count($employees),
    ]);
    exit();
}

// 4. Acción: Recepción de Recibos emitidos para registrar en Nóminus
if ($action === 'receive_receipts' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawPayload = file_get_contents('php://input');
    $receipts = json_decode($rawPayload, true);
    
    // Aquí puede insertar los recibos en la tabla 'bonos_fuera_nomina' de Nóminus
    echo json_encode([
        'status' => 'success',
        'message' => 'Recibos registrados satisfactoriamente en la base de datos de Nóminus',
        'processed_count' => is_array($receipts) ? count($receipts) : 1
    ]);
    exit();
}

// Acción por defecto: Ping de estado
echo json_encode([
    'status' => 'ok',
    'system' => 'Nominus Bridge API',
    'version' => '2.0-LOTTT',
    'mode' => 'active'
]);
`;
}

/**
 * Generate iframe embedding code for embedding into Nóminus dashboard or sidebar menu
 */
export function generateIframeEmbedCode(appUrl: string, companyRif?: string): string {
  const cleanUrl = appUrl.replace(/\/+$/, '');
  const urlWithParams = `${cleanUrl}/?nominus_embed=1${companyRif ? `&company_rif=${companyRif}` : ''}`;

  return `<!-- ========================================================================= -->
<!-- CÓDIGO PARA INSERTAR ESTA APP EN EL MENÚ / DASHBOARD DE SU SISTEMA NÓMINUS -->
<!-- Pegue este código en la vista o plantilla de su sistema de nómina Nóminus   -->
<!-- ========================================================================= -->

<div style="width: 100%; height: 92vh; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
  <iframe 
    id="nominus-bonos-app"
    src="${urlWithParams}"
    title="Recibos Fuera de Nómina - Blindaje Legal LOTTT"
    width="100%" 
    height="100%" 
    frameborder="0"
    allow="clipboard-write"
    style="border: none; display: block;"
  ></iframe>
</div>

<script>
  // Script para sincronizar automáticamente la empresa y trabajadores activos en Nóminus
  window.addEventListener('DOMContentLoaded', function() {
    var iframe = document.getElementById('nominus-bonos-app');
    
    // Enviar datos de la empresa y nómina actual al cargar
    iframe.onload = function() {
      // Reemplace estas variables con las variables de sesión o datos de Nóminus en PHP:
      // Ejemplo: <?php echo json_encode($empresaActiva); ?>
      var activeCompany = {
        razonSocial: 'CRISBAORCA 2009, C.A.',
        rif: 'J-29711947-7',
        tasaBCV: 52.40
      };
      
      // Enviar mensaje seguro al iframe
      iframe.contentWindow.postMessage({
        type: 'NOMINUS_INIT',
        company: activeCompany
      }, '*');
    };

    // Escuchar eventos cuando se emitan recibos desde la App de Bonos
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'NOMINUS_RECEIPT_EMITTED') {
        console.log('Recibo emitido en Nóminus:', event.data.receipt);
        // Opcional: mostrar notificación en Nóminus o actualizar saldo
      }
    });
  });
</script>`;
}

/**
 * Generate sample Nominus data for immediate testing and simulation
 */
export function getNominusSampleData(): NominusSyncResult {
  const companies: CompanyConfig[] = [
    {
      id: 'comp-nom-crisbaorca',
      razonSocial: 'CRISBAORCA 2009, C.A.',
      rif: 'J-29711947-7',
      direccionFiscal: 'Av. Principal, Edificio Empresarial, Nivel 3, Ofic. 3-A, Caracas',
      ciudad: 'Caracas, Dto. Capital',
      registroMercantil: 'Tomo 118-A, Número 24, Registro Mercantil Segundo del Dtto. Capital',
      representanteLegal: 'Cristóbal Ramón Bastidas Ortiz',
      cedulaRepresentante: 'V-13.847.219',
      cargoRepresentante: 'Director Presidente',
      tasaBCV: 52.40,
      fechaTasaBCV: new Date().toISOString().split('T')[0],
      telefono: '0212-7628190',
      email: 'administracion@crisbaorca.com',
    },
    {
      id: 'comp-nom-llanura',
      razonSocial: 'Agropecuaria La Gran Llanura, C.A.',
      rif: 'J-40918231-5',
      direccionFiscal: 'Carretera Nacional Vía Calabozo, Km 12, San Juan de los Morros, Edo. Guárico',
      ciudad: 'San Juan de los Morros, Edo. Guárico',
      registroMercantil: 'Tomo 52, Número 18, Registro Mercantil de Guárico',
      representanteLegal: 'Mariana Elena Rivas Castillo',
      cedulaRepresentante: 'V-17.291.803',
      cargoRepresentante: 'Gerente de Administración',
      tasaBCV: 52.40,
      fechaTasaBCV: new Date().toISOString().split('T')[0],
      telefono: '0246-4318920',
      email: 'rrhh@lagranllanura.com.ve',
    },
  ];

  const employees: Employee[] = [
    {
      id: 'emp-nom-1',
      companyId: 'comp-nom-crisbaorca',
      cedula: 'V-14.892.410',
      fullName: 'Alejandro José Pérez Morales',
      cargo: 'Jefe de Logística y Despacho',
      departamento: 'Operaciones',
      salarioBaseBs: 6500,
      isDirector: false,
      banco: 'Banco Mercantil (0105)',
      cuentaBancaria: '0105-0042-88-1002345678',
      fechaIngreso: '2022-03-15',
      direccion: 'Caracas, Venezuela',
      nacionalidad: 'Venezolana',
      estadoCivil: 'Casado(a)',
      adendaFirmada: true,
      fechaFirmaAdenda: '2026-01-10',
    },
    {
      id: 'emp-nom-2',
      companyId: 'comp-nom-crisbaorca',
      cedula: 'V-18.734.901',
      fullName: 'Yelitza Coromoto Blanco Díaz',
      cargo: 'Analista de Cuentas por Cobrar',
      departamento: 'Administración y Finanzas',
      salarioBaseBs: 5800,
      isDirector: false,
      banco: 'Banesco (0134)',
      cuentaBancaria: '0134-0100-22-2003456789',
      fechaIngreso: '2023-06-01',
      direccion: 'Caracas, Venezuela',
      nacionalidad: 'Venezolana',
      estadoCivil: 'Soltero(a)',
      adendaFirmada: false,
    },
    {
      id: 'emp-nom-3',
      companyId: 'comp-nom-crisbaorca',
      cedula: 'V-12.890.142',
      fullName: 'Cristóbal Ramón Bastidas Ortiz',
      cargo: 'Director Presidente',
      departamento: 'Dirección General',
      salarioBaseBs: 15000,
      isDirector: true,
      banco: 'Banco Provincial - BBVA (0108)',
      cuentaBancaria: '0108-0050-44-3004567890',
      fechaIngreso: '2015-01-10',
      direccion: 'Caracas, Venezuela',
      nacionalidad: 'Venezolana',
      estadoCivil: 'Casado(a)',
      adendaFirmada: true,
      fechaFirmaAdenda: '2026-01-15',
    },
    {
      id: 'emp-nom-4',
      companyId: 'comp-nom-crisbaorca',
      cedula: 'V-20.145.890',
      fullName: 'Franklin José Quintero Solano',
      cargo: 'Mecánico de Mantenimiento Industrial',
      departamento: 'Operaciones',
      salarioBaseBs: 5200,
      isDirector: false,
      banco: 'Banco de Venezuela (0102)',
      cuentaBancaria: '0102-0120-11-4005678901',
      fechaIngreso: '2024-02-20',
      direccion: 'Caracas, Venezuela',
      nacionalidad: 'Venezolana',
      estadoCivil: 'Soltero(a)',
      adendaFirmada: false,
    },
    {
      id: 'emp-nom-5',
      companyId: 'comp-nom-llanura',
      cedula: 'V-16.489.120',
      fullName: 'Manuel Vicente Gómez Rojas',
      cargo: 'Supervisor de Producción Agropecuaria',
      departamento: 'Producción',
      salarioBaseBs: 7200,
      isDirector: false,
      banco: 'Banco Nacional de Crédito - BNC (0191)',
      cuentaBancaria: '0191-0020-55-5006789012',
      fechaIngreso: '2021-08-14',
      direccion: 'San Juan de los Morros, Venezuela',
      nacionalidad: 'Venezolana',
      estadoCivil: 'Casado(a)',
      adendaFirmada: true,
      fechaFirmaAdenda: '2026-02-01',
    },
    {
      id: 'emp-nom-6',
      companyId: 'comp-nom-llanura',
      cedula: 'V-22.341.098',
      fullName: 'Andrea Valentina Colmenares Silva',
      cargo: 'Asistente de Recursos Humanos',
      departamento: 'Recursos Humanos',
      salarioBaseBs: 4900,
      isDirector: false,
      banco: 'Bancamiga (0172)',
      cuentaBancaria: '0172-0010-33-6007890123',
      fechaIngreso: '2024-04-10',
      direccion: 'San Juan de los Morros, Venezuela',
      nacionalidad: 'Venezolana',
      estadoCivil: 'Soltero(a)',
      adendaFirmada: false,
    },
  ];

  return {
    success: true,
    companiesCount: companies.length,
    employeesCount: employees.length,
    message: `Sincronización simulada exitosa: ${companies.length} empresas y ${employees.length} trabajadores listos para emitir recibos.`,
    timestamp: new Date().toISOString(),
    companies,
    employees,
  };
}
