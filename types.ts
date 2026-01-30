export enum QuoteStatus {
  Pendiente = 'Pendiente',
  Cotizado = 'Cotizado',
  Aprobado = 'Aprobado',
  Rechazado = 'Rechazado', // Rechazo por parte del Cliente (Asistente Comercial)
  RechazadoCotizador = 'Rechazado por Cotizador', // Rechazo Técnico/Interno (Cotizador)
  Abandonada = 'Abandonada', // Nuevo: Vencida por tiempo (10 días)
  Eliminado = 'Eliminado', // Eliminado por el usuario antes de ser cotizado
}

export enum UserRole {
  AsistenteComercial = 'Asistente Comercial', // Antes Vendedor
  Cotizador = 'Cotizador',
  Gerencia = 'Gerencia',
  Admin = 'Admin',
  Director = 'Director', // Nuevo Rol
}

export interface NotificationPreferences {
    emailNewQuote: boolean;
    emailApproved: boolean;
    emailRejected: boolean;
    emailQuoted: boolean; // Cuando el cotizador pone precio
}

export interface User {
  id: string;
  nombre: string;
  email: string;
  role: UserRole;
  password?: string;
  notificationPreferences?: NotificationPreferences;
}

export interface DieCut {
    id: string; // Código del troquel (ej: T-105)
    ancho: number;
    largo: number;
    carreras: number; // Eje
    forma: string; // Rectangular, Circular, etc.
    gap?: number; // Calle (horizontal/vertical)
    radio?: number; // Radio de esquina
}

export interface Attachment {
  id: string;
  file?: File;
  fileName: string;
  fileUrl: string;
  descripcion: string;
}

export interface QuantityPrice {
  id: string;
  cantidad: number | '';
  precioCotizado?: number;
  precioTotal?: number; // Nuevo: Para cálculo bidireccional
  descuento?: number; // Nuevo: Porcentaje de descuento (0-100)
}

// Estructura para Costos de Herramental (Clisés, Troqueles, etc.)
export interface ToolingCost {
    id: string;
    tipo: 'Clisé' | 'Troquel' | 'Matriz Serigrafía' | 'Cuño Hot Stamping' | 'Diseño' | 'Otro';
    detalle?: string; // Ej: "Clisé color Negro"
    cantidad: number;
    precioUnitario: number; // SIEMPRE EN DÓLARES BASE EN BD
    esSinCargo: boolean; // Si es true, aparece "Sin Cargo" en PDF pero se guarda el precio ref
    descuento?: number; // Nuevo: Descuento específico para el herramental (0-100)
}

// Datos de historial de compra anterior (Ingresados por Vendedor en Repeticiones)
export interface PurchaseHistory {
    fechaUltimaCompra?: string;
    cantidadUltimaCompra?: number;
    precioUltimaCompra?: number;
    monedaUltimaCompra?: 'USD' | 'UYU';
}

// Interfaz para el ítem de inventario (Importado de Google Sheets)
export interface InventoryItem {
  id: string;
  codigo: string;
  nombre: string; // Ej: Ilustración, Ribbon S040
  tipo: 'Sustrato' | 'Laminado' | 'Ribbon' | 'Hot Stamping' | 'Cold Stamping' | 'Tinta' | 'Otro';
  ancho: number; // mm
  stockMetros: number; // Stock Físico actual en metros lineales (o unidades para ribbon si se desea)
  // Nuevos campos para Gestión de Stock Visual
  minStock?: number; // Punto de alerta
  colorHex?: string; // Color personalizado para la gráfica
}

// --- TIPOS PARA ORDEN DE COMPRA (JUMBO SLITTER) ---
export interface CutDefinition {
    id: string;
    width: number;
    quantity: number; // "Bajadas"
}

export interface JumboDefinition {
    id: string;
    materialId: string;
    materialName: string;
    materialCode: string;
    jumboWidth: number;
    cuts: CutDefinition[];
    totalQuantity: number; // Suma de bajadas (informativo)
    runs?: number;
}

export interface GeneralPurchaseItem {
    item: InventoryItem;
    orderQty: number;
}

export interface PurchaseOrder {
    id: string; // OC-2024-001
    date: string;
    status: 'Generada' | 'Enviada' | 'Recibida';
    type?: 'Slitter' | 'General'; // Nuevo campo para distinguir el tipo de OC
    items: JumboDefinition[]; // Para Slitter
    generalItems?: GeneralPurchaseItem[]; // Nuevo: Para OC General
    notes?: string;
}
// --------------------------------------------------

export interface QuoteItem {
  id: string;
  
  // Especificaciones del trabajo
  tipoTrabajo: string;
  referencia?: string; // Opcional para Ribbon
  codigoEtiqueta?: string;
  
  // Datos para Packs (Autocompletados desde BD)
  packCodigo?: string; 
  packStockEtiqueta?: number; 
  packCodigoRibbon?: string; 
  packStockRibbon?: number; 
  packDescripcionRibbon?: string; // Nuevo
  packCantEtiquetasPorRollo?: number; // Nuevo
  packBuje?: string; // Nuevo
  packSentido?: number; // Nuevo

  // Datos para Impresoras
  impresoraModelo?: string; 
  
  // Datos para Repetición
  stockActualEtiqueta?: number; // Cuánto hay físico de esta etiqueta ya impresa
  trabajoAnteriorCambios?: string;
  historial?: PurchaseHistory; // Datos de la compra anterior

  // Especificaciones del producto
  cantidadModelos?: number | '';
  material?: string;
  ancho?: number | '';
  largo?: number | '';
  tipoImpresion?: string[];
  impresoDorso?: boolean; // Nuevo: Checkbox para indicar si lleva impresión atrás
  datoVariableTipo?: string; 
  datoVariableDetalle?: string; 
  tintas?: number | ''; // Allow 0
  tipoTroquel?: string;
  troquelEstado?: string;
  troquelId?: string;
  troquelCarreras?: number | '';
  cantidadEtiquetasPorRollo?: number | '';
  tipoProducto?: string;
  buje?: string;
  sentidoRebobinado?: number; // 1 to 8
  
  // Nuevas Terminaciones Jerárquicas
  laminado?: 'Brillo' | 'Mate' | null;
  barniz?: {
      tipo: 'Total' | 'Sectorizado';
      acabado: string;
  };
  terminacionesEspeciales: string[]; // Multiselect

  // Información para cotización
  aplicacion?: string;
  usaRibbon: 'Si' | 'No' | 'NO ESPECIFICADO';
  ribbon?: string;
  diseno?: string;
  tieneMuestra?: 'Si' | 'No';
  
  // Campos generales
  observaciones?: string;
  quantities: QuantityPrice[];
  adjuntos: Attachment[];

  // --- CAMPOS TÉCNICOS DE COTIZACIÓN (Seleccionados por el Cotizador) ---
  selectedMaterialId?: string; // ID del InventoryItem seleccionado (Bobina)
  selectedLaminateId?: string; // ID del InventoryItem seleccionado (Laminado)
  produccionCarreras?: number; // Bandas de producción definidas por Cotizador
  consumoLinealEstimado?: number; // Metros lineales calculados para este trabajo
  pricingUnit?: 'Unidad' | 'Millar' | 'Pack'; // Unidad de venta para el precio (Nuevo)
}

export interface Quote {
  id:string;
  fechaSolicitud: string;
  vendedorId: string;
  
  // Datos del cliente
  cliente: string;
  estadoCliente: string;
  potencialCliente: number;
  condicionPago: string; // Nueva: Contado, Crédito, etc.
  
  // Estado y moneda
  estado: QuoteStatus;
  moneda: 'USD' | 'UYU';
  tipoCambio?: number; // Valor del dólar manual

  // Información adicional
  clienteAdmiteStock?: 'Si' | 'No';
  entregasParciales?: 'Si' | 'No'; // Nuevo campo solicitado
  otrasInformaciones?: string;

  // Notas internas
  notasCotizador?: string; // Notas del Cotizador sobre precios/técnica
  notasParaPreprensa?: string; // Notas para Arte/Producción (Se libera al aprobar)
  motivoRechazo?: string;
  
  // Notas Logística (Nuevo)
  notaExpedicion?: string;
  alertarExpedicion?: boolean;

  // Campos calculados y de sistema
  costosHerramental?: ToolingCost[]; // Lista global de costos unicos
  importeTotal?: number; // Suma aproximada
  items: QuoteItem[];
  notification?: string;

  // Métricas ocultas
  fechaCotizacion?: string; // Fecha en que pasó a estado Cotizado
  tiempoRespuestaMinutos?: number; // Diferencia entre solicitud y cotización
}

// Configuración de Campos Obligatorios
export type FieldKey = 
    'cliente' | 'referencia' | 'codigoEtiqueta' | 'material' | 'ancho' | 
    'largo' | 'tintas' | 'tipoTroquel' | 'cantidadEtiquetasPorRollo' | 
    'tipoProducto' | 'buje' | 'sentidoRebobinado' | 'aplicacion' | 'diseno' | 'adjuntos';

export type FieldConfig = Record<FieldKey, boolean>;

// Global Config Structure (Admin Message)
export interface SystemConfig {
    adminMessage?: string;
}