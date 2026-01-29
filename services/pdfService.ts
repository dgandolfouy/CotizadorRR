
import { Quote, QuoteItem, User, ToolingCost } from "../types";
import { USERS } from "../constants";

declare global {
  interface Window {
    jspdf: any;
  }
}

const LOGO_SVG_STRING = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 445.41 237.71">
  <g>
    <path fill="#ef7d00" d="M312.16,3.22c-52.77,0-95.56,42.79-95.56,95.56s42.79,95.56,95.56,95.56v-3.19c-51.01,0-92.38-41.37-92.38-92.38S261.15,6.4,312.16,6.4v-3.19h0Z"/>
    <path fill="#1d1d1b" d="M101.92,3.22C49.15,3.22,6.35,46.01,6.35,98.78s42.79,95.56,95.56,95.56,95.56-42.79,95.56-95.56S154.69,3.22,101.92,3.22ZM82.59,137.01c-7.81,0-11.25-5.46-13.67-9.31-2.47-4.18-5.08-8.62-7.83-13.4-2-3.49-2.28-5.71-2.28-9.7v-9.92h10.17c4.68-.01,9.27-4.1,9.28-9.01,0-4.61-4.23-8.36-9.81-8.36h-13.82v52.68c0,3.86-3.16,7.03-7.03,7.03h-15.19V60.55h40.04c16.36,0,25.95,11.68,26.2,23.54.22,10.01-6.02,20.16-17.59,23.51l18.53,29.4h-17.01.01ZM156.19,137.01c-7.81,0-11.25-5.46-13.67-9.31-2.47-4.18-5.09-8.62-7.83-13.4-2-3.49-2.28-5.71-2.28-9.7v-9.92h10.17c4.68-.01,9.28-4.1,9.28-9,0-4.61-4.23-8.36-9.81-8.36h-13.82v52.68c0,3.86-3.16,7.03-7.03,7.03h-15.19V60.55h40.04c16.36,0,25.95,11.68,26.2,23.54.22,10.01-6.02,20.15-17.59,23.51l18.53,29.4h-17.01,0Z"/>
  </g>
</svg>
`;

export const generateQuotePDF = async (quote: Quote, currentUser: User, allUsers: User[]) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();

    const ORANGE = [239, 125, 0];
    const DARK_GREY = [60, 60, 60];
    const LIGHT_GREY = [240, 240, 240];

    const addHeader = () => {
        doc.addSvgAsImage(LOGO_SVG_STRING, 15, 10, 50, 26);
        doc.setFontSize(8);
        doc.setTextColor(...DARK_GREY);
        const rightX = width - 15;
        doc.text("RR Etiquetas", rightX, 15, { align: "right" });
        doc.text("Ruta 101 Km 23.500", rightX, 19, { align: "right" });
        doc.text("Canelones, Uruguay", rightX, 23, { align: "right" });
        doc.text("www.rretiquetas.com", rightX, 27, { align: "right" });
        doc.text("Tel: +598 2683 8383", rightX, 31, { align: "right" });
        doc.setDrawColor(220, 220, 220);
        doc.line(15, 40, width - 15, 40);
    };

    const addFooter = (pageNumber: number, totalPages: number) => {
        const footerY = doc.internal.pageSize.getHeight() - 15;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${pageNumber} de ${totalPages}`, width - 15, footerY, { align: "right" });
        doc.text(`Cotización #${quote.id} - Generado el ${new Date().toLocaleDateString()}`, 15, footerY, { align: "left" });
    };

    addHeader();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("COTIZACIÓN", 15, 55);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_GREY);
    
    doc.text(`Cliente:`, 15, 65);
    doc.setFont("helvetica", "bold");
    doc.text(`${quote.cliente}`, 35, 65);
    doc.setFont("helvetica", "normal");
    
    doc.text(`Fecha:`, 15, 71);
    doc.text(`${new Date(quote.fechaSolicitud).toLocaleDateString()}`, 35, 71);

    const col2X = width / 2 + 10;
    const seller = allUsers.find(u => u.id === quote.vendedorId);
    
    doc.text(`Cotización N°:`, col2X, 65);
    doc.setFont("helvetica", "bold");
    doc.text(`${quote.id}`, col2X + 30, 65);
    doc.setFont("helvetica", "normal");

    doc.text(`Vendedor:`, col2X, 71);
    doc.text(`${seller ? seller.nombre : 'RR Etiquetas'}`, col2X + 30, 71);

    doc.text(`Moneda:`, col2X, 77);
    doc.text(`${quote.moneda}`, col2X + 30, 77);
    
    doc.text(`Condición Pago:`, col2X, 83);
    doc.text(`${quote.condicionPago}`, col2X + 30, 83);

    const tableBody: any[] = [];
    const currency = quote.moneda === 'USD' ? 'U$S' : '$';

    quote.items.forEach((item, index) => {
        let desc = "";
        
        if (item.tipoTrabajo === 'Venta de Insumos (Ribbon)') {
            desc += `Ribbon ${item.ribbon || ''}`;
        } else if (item.tipoTrabajo === 'Venta de Impresora/Hardware') {
            desc += `Impresora ${item.impresoraModelo || ''}\n${item.observaciones || ''}`;
        } else {
            if (item.referencia) desc += `${item.referencia}\n`;
            
            const materialClean = item.material?.split('(')[0].trim() || item.material;
            
            if (item.tipoProducto !== 'Servicio') {
                desc += `${materialClean} - ${item.ancho}x${item.largo}mm`;
                desc += `\nTroquel: ${item.tipoTroquel} (Estado: ${item.troquelEstado})`;
                if(item.troquelId) desc += ` ID: ${item.troquelId}`;
                
                desc += `\nBuje: ${item.buje} | Rebobinado: ${item.sentidoRebobinado}`;
            } else {
                desc += `SERVICIO: ${materialClean}`;
            }

            if (item.tintas && Number(item.tintas) > 0) {
                 desc += `\nImpresión: ${item.tintas} tintas`;
            }
            if (item.impresoDorso) {
                desc += ` + DORSO`;
            }
            
            const finishes = [];
            if (item.laminado) finishes.push(`Laminado ${item.laminado}`);
            if (item.barniz) finishes.push(`Barniz ${item.barniz.tipo}`);
            if (item.terminacionesEspeciales && item.terminacionesEspeciales.length > 0) finishes.push(...item.terminacionesEspeciales);
            
            if (finishes.length > 0) {
                desc += `\nTerminaciones: ${finishes.join(', ')}`;
            }

            if (item.tipoProducto === 'Etiquetas' || item.tipoProducto === 'Unidad (Rollo)') {
                desc += `\nPresentación: Rollos de ${item.cantidadEtiquetasPorRollo} u.`;
            }

            if (item.observaciones) {
                desc += `\nNota: ${item.observaciones}`;
            }
        }

        item.quantities.forEach((qty, qtyIndex) => {
            const isSoldByRoll = item.tipoProducto === 'Unidad (Rollo)';
            const isSets = item.tipoProducto === 'Juegos';
            const isServiceOrUnit = item.tipoProducto === 'Servicio' || item.tipoProducto === 'Unidad';
            
            let unitLabel = 'Etiquetas';
            if (isSoldByRoll) unitLabel = 'Rollos';
            else if (isSets) unitLabel = 'Juegos';
            else if (isServiceOrUnit) unitLabel = 'Unid.';

            const unitPrice = Number(qty.precioCotizado) || 0;
            const quantity = Number(qty.cantidad);
            
            const subtotal = unitPrice * quantity;
            const discount = qty.descuento || 0;
            const totalFinal = subtotal * (1 - (discount / 100));
            
            // Texto de unidad de precio (ej: "x Millar")
            const priceUnitText = item.pricingUnit ? `x ${item.pricingUnit}` : '';

            tableBody.push([
                qtyIndex === 0 ? String(index + 1) : '',
                qtyIndex === 0 ? desc : '',
                `${quantity.toLocaleString()} ${unitLabel}`, 
                `${currency} ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n${priceUnitText}`, 
                discount > 0 ? `${discount}%` : '', 
                `${currency} ${totalFinal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
            ]);
        });
    });

    if (quote.costosHerramental && quote.costosHerramental.length > 0) {
        quote.costosHerramental.forEach((tool, i) => {
            const toolTotal = tool.cantidad * tool.precioUnitario * (quote.moneda === 'UYU' && quote.tipoCambio ? quote.tipoCambio : 1);
            const toolDesc = tool.descuento || 0;
            const toolFinal = toolTotal * (1 - toolDesc/100);

            // Si tiene 100% de descuento, mostrarlo en $0 pero evidenciar el descuento
            tableBody.push([
                `H-${i+1}`,
                `${tool.tipo} ${tool.detalle || ''}`,
                `${tool.cantidad} Unid.`,
                `${currency} ${toolTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`,
                toolDesc > 0 ? `${toolDesc}%` : '',
                `${currency} ${toolFinal.toLocaleString(undefined, {minimumFractionDigits: 2})}`
            ]);
        });
    }

    doc.autoTable({
        startY: 95,
        head: [['Ítem', 'Descripción Técnica', 'Cantidad', 'Precio Lista', 'Desc.', 'Total Final']],
        body: tableBody,
        theme: 'grid',
        headStyles: { 
            fillColor: ORANGE, 
            textColor: 255, 
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, 
            1: { cellWidth: 'auto' }, 
            2: { cellWidth: 35, halign: 'center' }, 
            3: { cellWidth: 30, halign: 'right' }, 
            4: { cellWidth: 15, halign: 'center' }, 
            5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } 
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            valign: 'middle'
        },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Notas / Observaciones:", 15, finalY);
    doc.setFont("helvetica", "normal");
    
    const notes = quote.notasCotizador ? quote.notasCotizador : "Sin observaciones adicionales.";
    const splitNotes = doc.splitTextToSize(notes, width - 30);
    doc.text(splitNotes, 15, finalY + 5);

    const sigY = finalY + 40;
    doc.setDrawColor(150, 150, 150);
    doc.line(15, sigY, 85, sigY);
    doc.text("Firma del Cliente", 15, sigY + 5);
    
    doc.line(width - 85, sigY, width - 15, sigY);
    doc.text("Por RR Etiquetas", width - 85, sigY + 5);

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        addFooter(i, pageCount);
    }

    doc.save(`Cotizacion_RR_${quote.id}_${quote.cliente.replace(/\s+/g, '_')}.pdf`);
};
