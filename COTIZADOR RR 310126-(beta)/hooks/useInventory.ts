
import { useMemo } from 'react';
import { Quote, QuoteStatus } from '../types';
import useSystemData from './useSystemData';

// Constante de calle entre etiquetas (en mm) para cálculo de consumo (Punto 5)
// Se aumentó a 5mm por solicitud del usuario
const GAP_BETWEEN_LABELS_MM = 5; 

const useInventory = (quotes: Quote[]) => {
    // Accedemos a los datos REALES del sistema
    const { inventory } = useSystemData();
    
    // Función para calcular metros lineales de UN ítem de cotización
    // Formula: ((Largo + Gap) * CantidadTotal) / Carreras / 1000
    const calculateLinearMeters = (largoMm: number, cantidad: number, carreras: number): number => {
        if (!largoMm || !cantidad || !carreras) return 0;
        const longitudEtiquetaConGap = largoMm + GAP_BETWEEN_LABELS_MM;
        // Cantidad de "golpes" o repeticiones necesarias
        const repeticiones = cantidad / carreras;
        // Metros totales
        return (longitudEtiquetaConGap * repeticiones) / 1000;
    };

    // Lógica principal: Calcula el stock "Comprometido"
    // REGLA (Punto 5): Reserva SOLO si estado es COTIZADO.
    // Si es Aprobado -> Se asume ingresado a producción (ya no reserva aquí virtualmente, pasa a proceso real).
    // Si es Pendiente -> Aún no cotizado, no reserva.
    // Si es Rechazado/Abandonada -> Libera (no entra en el if).
    const inventoryStatus = useMemo(() => {
        const statusMap: Record<string, { fisico: number; comprometido: number; disponible: number }> = {};

        // 1. Inicializar con stock físico del inventario real
        inventory.forEach(item => {
            statusMap[item.id] = {
                fisico: item.stockMetros,
                comprometido: 0,
                disponible: item.stockMetros
            };
        });

        // 2. Sumar stock comprometido de cotizaciones existentes
        quotes.forEach(quote => {
            // REGLA: Solo reservamos si está "Cotizado" (esperando respuesta cliente)
            if (quote.estado === QuoteStatus.Cotizado) {
                quote.items.forEach(item => {
                    if (item.selectedMaterialId && statusMap[item.selectedMaterialId]) {
                        // Usamos la cantidad más grande cotizada como referencia conservadora
                        const qty = item.quantities.length > 0 ? Math.max(...item.quantities.map(q => Number(q.cantidad))) : 0;
                        
                        // Calculamos consumo basado en los datos actuales del item
                        const consumo = calculateLinearMeters(
                            Number(item.largo), 
                            qty, 
                            Number(item.produccionCarreras) || Number(item.troquelCarreras) || 1
                        );
                        
                        statusMap[item.selectedMaterialId].comprometido += consumo;
                    }
                });
            }
        });

        // 3. Calcular disponible final
        Object.keys(statusMap).forEach(key => {
            statusMap[key].disponible = statusMap[key].fisico - statusMap[key].comprometido;
        });

        return statusMap;

    }, [quotes, inventory]);

    return {
        inventory,
        inventoryStatus,
        calculateLinearMeters
    };
};

export default useInventory;
