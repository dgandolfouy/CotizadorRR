
import { GoogleGenAI } from "@google/genai";
import { Quote, QuoteStatus, QuoteItem, User } from "../types";
import { USERS, COTIZADOR_EMAIL, GERENTE_VENTAS_EMAIL } from '../constants';
import { safeStorage } from '../storage';
import useSystemData from '../hooks/useSystemData';

// Clave para guardar en el navegador
export const API_KEY_STORAGE_KEY = 'rr_gemini_api_key';

// Intentar obtener la clave de varias fuentes:
// 1. LocalStorage (Configurado desde AdminPanel)
// 2. Variable de entorno (Si se usara un proceso de build)
const getApiKey = () => {
    try {
        const stored = safeStorage.getItem(API_KEY_STORAGE_KEY);
        if (stored) return stored;
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) {
        console.warn("Error accediendo a storage para API Key");
    }
    return undefined;
};

const API_KEY = getApiKey();

if (!API_KEY) {
  console.warn("API_KEY for Gemini is not set. Using mocked responses.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// This function simulates sending an email by logging it to the console
const logEmail = (emailDetails: { to: string; cc?: string; subject: string; body: string }) => {
    console.log("--- SIMULANDO ENVÍO DE EMAIL ---");
    console.log(`Para: ${emailDetails.to}`);
    if (emailDetails.cc) {
        console.log(`CC: ${emailDetails.cc}`);
    }
    console.log(`Asunto: ${emailDetails.subject}`);
    console.log("Cuerpo del Email:");
    console.log(emailDetails.body);
    console.log("-------------------------------");
};


const generateMockNotification = (quote: Quote, oldQuote?: Quote, users: User[] = USERS): string => {
    const salesperson = users.find(s => s.id === quote.vendedorId);
    const notificationTarget = salesperson ? salesperson.nombre : `Vendedor ID ${quote.vendedorId}`;

    switch (quote.estado) {
        case QuoteStatus.Pendiente:
            return `Email de nueva cotización SIMULADO para ${COTIZADOR_EMAIL}. Revisa la consola del desarrollador para ver el contenido.`;
        case QuoteStatus.Cotizado:
             return `Email de cotización procesada SIMULADO para ${notificationTarget} (CC: Gerencia). Revisa la consola.`;
        case QuoteStatus.Aprobado:
            return `Email de aprobación SIMULADO para Gerencia (Fin del flujo). Revisa la consola.`;
        case QuoteStatus.Rechazado:
            return `Email de cotización rechazada SIMULADO para Cotizador y Gerencia. Revisa la consola.`;
        default:
            return `Actualización en cotización #${quote.id}.`;
    }
}

// Updated signature to accept optional dynamic users list, default to constant if not provided (backward compatibility)
export const generateNotification = async (quote: Quote, oldQuote?: Quote, users: User[] = USERS): Promise<string> => {
  // Re-check API Key in case it was added after load
  const currentKey = getApiKey();
  const currentAI = currentKey ? new GoogleGenAI({ apiKey: currentKey }) : null;

  if (!currentAI) {
    return generateMockNotification(quote, oldQuote, users);
  }

  // Load Inventory for Lookup (Mocked since we can't use hooks here directly, 
  // in a real app we'd pass this data or fetch it)
  // For now, we'll just check if selectedMaterialId exists to indicate it.
  const getMaterialInfo = (id?: string) => id ? `(Bobina Asignada ID: ${id})` : '(Bobina NO Asignada)';

  const salesperson = users.find(s => s.id === quote.vendedorId);
  const currencySymbol = quote.moneda === 'USD' ? '$' : '$U';
  let prompt = '';
  let emailDetails: { to: string; cc?: string; subject: string; body: string, notificationText: string };

  const formatItemsForPrompt = (items: QuoteItem[], includePrice = false, currency: string, includeTechnical = false) => {
    return items.map((item, index) => {
      if (item.tipoTrabajo === 'Venta de Insumos (Ribbon)') {
           return `
    **Ítem #${index + 1}: Venta de Insumo**
    - Producto: Ribbon ${item.ribbon}
    - Cantidades Solicitadas:${item.quantities.map(q => `
      - ${q.cantidad} unidades ${includePrice ? `| Precio Unit.: ${currency}${(q.precioCotizado ?? 'N/A').toLocaleString()}` : ''}`).join('')}
           `;
      }

      let technicalInfo = '';
      if (includeTechnical) {
          technicalInfo = `
    > [USO INTERNO ARTE/PRODUCCIÓN]
    > Bobina Papel Seleccionada: ${item.selectedMaterialId || 'PENDIENTE'}
    > Bobina Laminado Seleccionada: ${item.selectedLaminateId || 'N/A'}
    > Carreras Producción: ${item.produccionCarreras || 1}
    > Consumo Est. (Papel): ${Math.round(item.consumoLinealEstimado || 0)} metros
          `;
      }

      let repetitionDetails = '';
      if (item.tipoTrabajo.startsWith('Repetición')) {
          repetitionDetails = `
    - Tipo de Trabajo: ${item.tipoTrabajo} (Código: ${item.codigoEtiqueta || 'N/A'})
    - Cambios: ${item.trabajoAnteriorCambios || 'Ninguno'}`;
      } else {
          repetitionDetails = `- Tipo de Trabajo: ${item.tipoTrabajo}`;
      }

      const terminaciones: string[] = [];
      if (item.laminado) terminaciones.push(`Laminado: ${item.laminado}`);
      if (item.barniz) terminaciones.push(`Barniz: ${item.barniz.tipo} ${item.barniz.acabado}`);
      if (item.terminacionesEspeciales && item.terminacionesEspeciales.length > 0) {
        terminaciones.push(...item.terminacionesEspeciales);
      }
      const terminacionesStr = terminaciones.length > 0 ? terminaciones.join(', ') : 'Ninguna';

      return `
    **Ítem #${index + 1}: ${item.referencia}**
    ${repetitionDetails}
    - Producto: ${item.material} de ${item.ancho}x${item.largo}mm. ${item.cantidadModelos} modelo(s).
    - Impresión: ${item.tipoImpresion?.join(', ') || 'N/A'} con ${item.tintas} tinta(s). ${item.tipoImpresion?.some(t => ['TLP', 'Inkjet'].includes(t)) ? `Dato Variable: ${item.datoVariableTipo} - ${item.datoVariableDetalle || 'No especificado'}` : ''}
    - Troquel: ${item.tipoTroquel}, estado ${item.troquelEstado}${item.troquelEstado === 'Existente' ? ` (ID: ${item.troquelId || 'N/A'}, Carreras: ${item.troquelCarreras || 'N/A'})` : ''}
    - Presentación: ${item.tipoProducto} con ${item.cantidadEtiquetasPorRollo} et./rollo. Buje ${item.buje}. Rebobinado ${item.sentidoRebobinado}.
    - Terminaciones: ${terminacionesStr}
    - Aplicación: ${item.aplicacion}. ${item.usaRibbon === 'Si' ? `Usa Ribbon (${item.ribbon || 'no espec.'})` : ''}
    - Diseño: ${item.diseno}. Muestra física: ${item.tieneMuestra}.
    - Observaciones (ítem): ${item.observaciones || 'Ninguna'}
    ${technicalInfo}
    - Cantidades Solicitadas:${item.quantities.map(q => `
      - ${q.cantidad} unidades ${includePrice ? `| Precio Unit.: ${currency}${(q.precioCotizado ?? 'N/A').toLocaleString()}` : ''}`).join('')}
      `;
    }).join('');
  };
  
  const getClientDetails = (quote: Quote) => {
      return `
        - Cliente: ${quote.cliente}
        - Estado del Cliente: ${quote.estadoCliente}
        - Potencial (Vendedor): ${quote.potencialCliente}/5 estrellas
        - Admite Stock: ${quote.clienteAdmiteStock || 'No especificado'}
      `;
  }

  switch (quote.estado) {
    case QuoteStatus.Pendiente:
      emailDetails = {
        to: COTIZADOR_EMAIL,
        subject: `Nueva Cotización Pendiente: #${quote.id} - ${quote.cliente}`,
        notificationText: `Email de nueva cotización GENERADO por IA para ${COTIZADOR_EMAIL}. Revisa la consola.`,
        body: ''
      };
      prompt = `
        Eres un asistente de sistema para RR Etiquetas. Redacta un email claro y conciso para el Cotizador.
        Asunto: ${emailDetails.subject}
        Cuerpo: Informa que se ha recibido una nueva solicitud de cotización con los siguientes detalles y que requiere su atención para asignar precios.
        - ID Cotización: ${quote.id}
        - Vendedor: ${salesperson?.nombre}
        ${getClientDetails(quote)}
        - Moneda a Cotizar: ${quote.moneda}
        - Otras Informaciones del Vendedor: "${quote.otrasInformaciones || 'Ninguna'}"
        
        --- Detalles de Ítems ---
        ${formatItemsForPrompt(quote.items, false, currencySymbol)}
      `;
      break;
    
    case QuoteStatus.Cotizado:
      emailDetails = {
        to: salesperson?.email || '',
        cc: GERENTE_VENTAS_EMAIL,
        subject: `Cotización Lista para Cliente: #${quote.id} - ${quote.cliente}`,
        notificationText: `Email de cotización procesada GENERADO por IA para ${salesperson?.nombre} (CC: Gerencia). Revisa la consola.`,
        body: ''
      };
      prompt = `
        Eres un asistente de sistema para RR Etiquetas. Redacta un email para el vendedor ${salesperson?.nombre} con copia a Gerencia.
        Asunto: ${emailDetails.subject}
        Cuerpo: Informa que la cotización para el cliente ${quote.cliente} ha sido procesada y está lista para ser presentada. Incluye los precios para cada cantidad solicitada.
        - ID Cotización: ${quote.id}
        - Cliente: ${quote.cliente}
        - Moneda: ${quote.moneda}
        - Importe Total (referencial): ${currencySymbol}${quote.importeTotal?.toFixed(2) || 'N/A'}
        - Notas del Cotizador: "${quote.notasCotizador || 'Ninguna'}"
        
        --- Desglose de Precios ---
        ${formatItemsForPrompt(quote.items, true, currencySymbol)}
      `;
      break;

    case QuoteStatus.Aprobado:
        emailDetails = {
            to: GERENTE_VENTAS_EMAIL,
            subject: `Cotización Aprobada - Producción: #${quote.id} - ${quote.cliente}`,
            notificationText: `Email de aprobación GENERADO por IA para Gerencia. Revisa la consola.`,
            body: ''
        };
        const expeditionAlert = quote.alertarExpedicion ? `\n⚠️ **ALERTA DE EXPEDICIÓN:** ${quote.notaExpedicion}` : '';
        
        prompt = `
          Eres un asistente de sistema para RR Etiquetas. Redacta un email para Gerencia y Arte.
          Asunto: ${emailDetails.subject}
          Cuerpo: Informa que la cotización para ${quote.cliente} ha sido APROBADA y pasa a producción.
          
          ${expeditionAlert}

          **Información de Preprensa (del Cotizador):**
          "${quote.notasParaPreprensa || 'No se proporcionaron notas de preprensa.'}"

          **Resumen de Ítems a Producir (Incluye Datos Técnicos de Bobinas):**
          ${formatItemsForPrompt(quote.items, false, currencySymbol, true)}
        `;
        break;

    case QuoteStatus.Rechazado:
        emailDetails = {
            to: COTIZADOR_EMAIL,
            cc: GERENTE_VENTAS_EMAIL,
            subject: `Cotización Rechazada: #${quote.id} - ${quote.cliente}`,
            notificationText: `Email de cotización rechazada GENERADO por IA para Cotizador y Gerencia. Revisa la consola.`,
            body: ''
        };
        prompt = `
          Eres un asistente de sistema para RR Etiquetas. Redacta un email formal para el Cotizador y Gerencia.
          Asunto: ${emailDetails.subject}
          Cuerpo: Informa que la cotización para ${quote.cliente} ha sido RECHAZADA por el vendedor.
          - ID Cotización: ${quote.id}
          - Vendedor: ${salesperson?.nombre}
          - **Motivo del Rechazo:** "${quote.motivoRechazo || 'No se proporcionó un motivo.'}"
          Indica que esta información es para análisis interno y seguimiento.
        `;
        break;

    default:
      return `Actualización en la cotización ${quote.id}.`;
  }

  try {
    const response = await currentAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tarea: Genera solo el cuerpo del email basado en la siguiente instrucción. No repitas el asunto.\n\n${prompt}`,
    });

    const responseText = response.text;

    if (!responseText) {
      throw new Error('La respuesta de la API de Gemini no contenía texto.');
    }
    
    emailDetails.body = responseText.trim();
    logEmail(emailDetails);
    return `${emailDetails.notificationText}`;
  } catch (error) {
    console.error("Error calling Gemini API or processing its response:", error);
    logEmail({ ...emailDetails, body: `Error al generar contenido del email. Por favor, revise manualmente. Detalles: ${JSON.stringify(quote)}` });
    return `Error al generar notificación IA para la cotización ${quote.id}. Verifica tu API KEY.`;
  }
};
