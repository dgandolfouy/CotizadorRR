
import { User, UserRole, QuoteStatus, Quote, InventoryItem, FieldConfig, NotificationPreferences } from './types';

// --- CONFIGURACIÓN DE DATOS EXTERNOS (GOOGLE SHEETS) ---
export const GOOGLE_SHEET_TROQUELES_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTnLzRUWd21hCEk1J_zUTTifsX-D8u9RS8hSIOTOAlnmczkbfOJbWp8wURe4W4lsuIvseJf--m1qVhd/pub?gid=0&single=true&output=csv";
export const GOOGLE_SHEET_BOBINAS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTtYapOTtVQmV5gCTxdq3Pv6G6uF5vfRAZink6AX00Zl582tMyhzg7Ct4z3aOSiVaO_APy9Mfn3YYiA/pub?gid=0&single=true&output=csv";
export const GOOGLE_SHEET_RIBBONS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSf5QhK4GBdjb7DY1PybLErIYg2s1kkzRIbyXLamJI4i16dMrHOg9LIMFQ2d_F586JAx5iHcfcgYGnc/pub?gid=0&single=true&output=csv";
export const GOOGLE_SHEET_LAMINADOS_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJdbhqlvE61EKdZjlqwHasM-KaR_20gt4W5fPLSrp76JfHFpuV5SKOCJihQVEepTH0CNODbDeXUdnb/pub?gid=0&single=true&output=csv";
export const GOOGLE_SHEET_HOT_FOIL_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQ0oqBL5Dfcz_jIGeGkcKtte2PES3FOl0HyxF_Js40n_ZPYJS6FQTFWbKUnIZ8Tamo_XJqGXLA5Gy7/pub?gid=0&single=true&output=csv";
export const GOOGLE_SHEET_COLD_FOIL_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR7ka6AEDqMBXqTrdHlnLeu14Ei3gTsgTFWG27vlWkaOe_3zvmEuj5SqT35M_e8M7L8D9paoYHjdZ6J/pub?gid=0&single=true&output=csv";

// URL Base para imágenes de etiquetas
export const LABEL_IMAGE_BASE_URL = "https://placehold.co/600x400?text="; 

// -------------------------------------------------------

const DEFAULT_NOTIFS: NotificationPreferences = {
    emailNewQuote: false,
    emailApproved: false,
    emailRejected: true,
    emailQuoted: false
};

const COTIZADOR_NOTIFS: NotificationPreferences = {
    emailNewQuote: true,
    emailApproved: true, 
    emailRejected: true,
    emailQuoted: false
};

const VENDEDOR_NOTIFS: NotificationPreferences = {
    emailNewQuote: false,
    emailApproved: true, 
    emailRejected: true, 
    emailQuoted: true
};

export const USERS: User[] = [
  { id: 'admin', nombre: 'Administrador', email: 'admin@rretiquetas.com', role: UserRole.Admin, password: 'class123', notificationPreferences: {...DEFAULT_NOTIFS} },
  { id: 'director', nombre: 'Gonzalo Viñas', email: 'director@rretiquetas.com', role: UserRole.Director, password: 'class123', notificationPreferences: {...DEFAULT_NOTIFS} },
  { id: 'v2', nombre: 'Adriana Silveira', email: 'adriana.silveira@example.com', role: UserRole.AsistenteComercial, password: 'class123', notificationPreferences: {...VENDEDOR_NOTIFS} },
  { id: 'v3', nombre: 'Marcela Sampayo', email: 'marcela.sampayo@example.com', role: UserRole.AsistenteComercial, password: 'class123', notificationPreferences: {...VENDEDOR_NOTIFS} },
  { id: 'v4', nombre: 'Manuel Fontaina', email: 'manuel.fontaina@example.com', role: UserRole.AsistenteComercial, password: 'class123', notificationPreferences: {...VENDEDOR_NOTIFS} },
  { id: 'v5', nombre: 'Silena Fernández', email: 'silena.fernandez@example.com', role: UserRole.AsistenteComercial, password: 'class123', notificationPreferences: {...VENDEDOR_NOTIFS} },
  { id: 'cotizador', nombre: 'Pablo Candia', email: 'cotizador@example.com', role: UserRole.Cotizador, password: 'class123', notificationPreferences: {...COTIZADOR_NOTIFS} },
  { id: 'gerencia', nombre: 'Gerencia Comercial', email: 'gerencia@example.com', role: UserRole.Gerencia, password: 'class123', notificationPreferences: { emailNewQuote: false, emailApproved: true, emailRejected: true, emailQuoted: false } },
];

export const COTIZADOR_EMAIL = 'cotizador@example.com';
export const GERENTE_VENTAS_EMAIL = 'gerencia@example.com';

// Opciones para el formulario
export const MONEDA_OPTIONS: Quote['moneda'][] = ['USD', 'UYU'];
export const ESTADO_CLIENTE_OPTIONS = ['Nuevo', 'Activo', 'Inactivo'];
export const SI_NO_OPTIONS: ('Si' | 'No')[] = ['Si', 'No'];

// Agregado Pack y Venta de Impresora
export const TIPO_TRABAJO_OPTIONS = [
    'Nuevo', 
    'Repetición sin cambios', 
    'Repetición con cambios', 
    'Pack', 
    'Venta de Insumos (Ribbon)', 
    'Venta de Impresora/Hardware'
];

export const MATERIAL_OPTIONS = ["Ilustración", "Obra", "Térmico Top", "Térmico Eco", "OPP Blanco", "OPP Transparente", "Cartulina"];
export const IMPRESION_OPTIONS = ['Flexografía', 'Digital', 'Serigrafía', 'TLP', 'Inkjet'];
// Actualizado 'Figuras' en plural para coincidir con excel
export const TIPO_TROQUEL_OPTIONS = ['Rectangular', 'Circular', 'Figuras', 'Tag-Pai', 'Corte recto (sin calle)', 'Continuo (sin fin)'];
export const TROQUEL_ESTADO_OPTIONS = ['Nuevo', 'Existente'];

// Actualizado: Opciones de tipo de producto
export const TIPO_PRODUCTO_OPTIONS = [
    'Etiquetas', 
    'Unidad (Rollo)', 
    'Juegos', 
    'Servicio', 
    'Unidad'
]; 

export const BUJE_OPTIONS = ['3" (76mm)', '42mm', '1" (25mm)'];
export const SENTIDO_REBOBINADO_OPTIONS = [
    { id: 1, label: '1', icon: 'ArrowSolidDownIcon' },
    { id: 2, label: '2', icon: 'ArrowSolidUpIcon' },
    { id: 3, label: '3', icon: 'ArrowSolidRightIcon' },
    { id: 4, label: '4', icon: 'ArrowSolidLeftIcon' },
    { id: 5, label: '5', icon: 'ArrowHollowDownIcon' },
    { id: 6, label: '6', icon: 'ArrowHollowUpIcon' },
    { id: 7, label: '7', icon: 'ArrowHollowRightIcon' },
    { id: 8, label: '8', icon: 'ArrowHollowLeftIcon' },
];

export const CONDICION_PAGO_OPTIONS = ['Contado', 'Crédito 30 días', 'Crédito 60 días', 'Crédito 90 días'];

// Modelos de Impresoras
export const IMPRESORA_MODELOS = ['Datamax E-Class', 'Datamax M-Class', 'Datamax I-Class', 'Datamax H-Class', 'Cabezal Térmico', 'Zebra Series', 'Sato Series', 'Otros'];

// VALORES BASE EN DÓLARES PARA HERRAMENTAL (Lógica Automatización)
export const TOOLING_PRICES_DEFAULT = {
    'Clisé': 80,
    'Troquel': 150,
    'Matriz Serigrafía': 80, 
    'Cuño Hot Stamping': 150, 
    'Diseño': 100, 
};

export const PRICING_UNIT_OPTIONS = ['Millar', 'Unidad', 'Pack'];

export const LAMINADO_OPCIONES = ['Brillo', 'Mate'];
export const BARNIZ_TIPO_OPCIONES = ['Total', 'Sectorizado'];
export const BARNIZ_ACABADO_OPCIONES = [
    'UV BRILLO', 'UV MATE', 'UV LUMINISCENTE', 'AL AGUA BRILLO', 
    'AL AGUA MATE', 'IMPRIMIBLE TLP', 'SOLVENTE BRILLO', 'SOLVENTE MATE'
];
export const TERMINACIONES_ESPECIALES_OPCIONES = [
    'HOT STAMPING', 'COLD STAMPING', 'CAST & CURE', 'SERIGRAFIA CON RELIEVE', 
    'BARNIZ CRAQUELADO', 'OTRO (Definir en observaciones)'
];

export const DATO_VARIABLE_TIPO_OPTIONS = ['Numeración', 'Código de Barras', 'QR', 'Base de Datos Externa', 'Otro'];
export const APLICACION_OPTIONS = ['Manual', 'Etiquetadora', 'Impresora Térmica', 'No especificado'];
export const USA_RIBBON_OPTIONS: ('Si' | 'No' | 'NO ESPECIFICADO')[] = ['Si', 'No', 'NO ESPECIFICADO'];
export const RIBBON_OPTIONS = ['S040', 'S236', 'Otro'];
export const DISENO_OPTIONS = ['Original enviado por el cliente', 'Modificación RR a original del cliente', 'Diseño RR', 'No aplica'];


// --- MOCK DATABASE FOR PACKS ---
// Base de datos de packs VACÍA para producción real.
// Se irá llenando a medida que se implemente la gestión de Packs.
export const MOCK_PACKS_DB: Record<string, any> = {
    // Ejemplos eliminados para limpieza
};

// Inventario Inicial VACÍO. Se debe cargar vía CSV desde Admin.
export const INITIAL_INVENTORY: InventoryItem[] = [];

export const DEFAULT_FIELD_CONFIG: FieldConfig = {
    cliente: true,
    referencia: false, 
    codigoEtiqueta: false,
    material: true,
    ancho: true,
    largo: true,
    tintas: true, 
    tipoTroquel: true,
    cantidadEtiquetasPorRollo: false,
    tipoProducto: true,
    buje: true,
    sentidoRebobinado: false,
    aplicacion: false,
    diseno: false,
    adjuntos: false
};

// Cotizaciones de prueba eliminadas. El sistema arranca limpio.
export const MOCK_QUOTES: Quote[] = [];

export const STATUS_COLORS: { [key in QuoteStatus]: string } = {
  [QuoteStatus.Pendiente]: 'bg-yellow-900 text-yellow-300 border border-yellow-700',
  [QuoteStatus.Cotizado]: 'bg-blue-900 text-blue-300 border border-blue-700',
  [QuoteStatus.Aprobado]: 'bg-green-900 text-green-300 border border-green-700',
  [QuoteStatus.Rechazado]: 'bg-red-900 text-red-300 border border-red-700',
  [QuoteStatus.RechazadoCotizador]: 'bg-gray-800 text-gray-300 border border-gray-600',
  [QuoteStatus.Abandonada]: 'bg-purple-900 text-purple-300 border border-purple-700', // COLOR PARA ABANDONADA
  [QuoteStatus.Eliminado]: 'bg-gray-300 text-gray-600 border border-gray-400 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700',
};
