
import React, { useState, useMemo, useEffect, useRef } from 'react';
import useSystemData from '../hooks/useSystemData';
import useInventory from '../hooks/useInventory';
import { InventoryItem, UserRole, PurchaseOrder, JumboDefinition, CutDefinition } from '../types';
import { CubeIcon, ExclamationIcon, DownloadIcon, SaveIcon, SearchIcon, XIcon, ClipboardCheckIcon, ShoppingCartIcon, PlusIcon, TrashIcon, CheckIcon, EditIcon, EyeIcon, UserIcon } from './IconComponents';
import { useOutletContext } from 'react-router-dom';
import type { QuoteOutletContext } from './Dashboard';
import { safeStorage } from '../storage';

declare global {
  interface Window {
    jspdf: any;
  }
}

// --- HELPER MATEMÁTICO: MÁXIMO COMÚN DIVISOR (GCD) ---
const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
};

// --- CÁLCULO DEL LAYOUT (CARRILES) ---
const calculateLayout = (cuts: CutDefinition[]) => {
    if (cuts.length === 0) return { lanes: [], baseRun: 0, totalLanes: 0, usedWidth: 0 };
    
    // 1. Encontrar el MCD de las cantidades para determinar las "Bajadas" base
    const quantities = cuts.map(c => c.quantity);
    const baseRun = quantities.reduce((a, b) => gcd(a, b));
    
    let lanes: { width: number, parentId: string, quantityLabel: number }[] = [];
    let usedWidth = 0;
    
    // 2. Expandir cortes en "Carriles" físicos
    cuts.forEach((cut) => {
        const numLanes = cut.quantity / baseRun; // Ej: 30 / 10 = 3 carriles
        for(let i=0; i<numLanes; i++) {
            lanes.push({
                width: cut.width,
                parentId: cut.id,
                quantityLabel: cut.quantity // Para referencia
            });
            usedWidth += cut.width;
        }
    });
    
    // Ordenar carriles por ancho (mayor a menor) para mejor visualización
    lanes.sort((a, b) => b.width - a.width);

    return { lanes, baseRun, totalLanes: lanes.length, usedWidth };
};

// --- HELPER PARA NOTAS DE FRACCIÓN (PDF) ---
const getFractionNote = (cut: CutDefinition, layout: { lanes: any[], totalLanes: number, baseRun: number }) => {
    const myLanes = cut.quantity / layout.baseRun;
    return `${myLanes}/${layout.totalLanes} partes de jumbo`;
};

// --- HELPER PARA CONSOLIDAR CORTES (AGRUPAR POR ANCHO) ---
const getConsolidatedCuts = (cuts: CutDefinition[]) => {
    const map = new Map<number, number>();
    cuts.forEach(c => {
        const current = map.get(c.width) || 0;
        map.set(c.width, current + c.quantity);
    });
    
    const result: { width: number, quantity: number }[] = [];
    map.forEach((qty, width) => {
        result.push({ width, quantity: qty });
    });
    
    return result.sort((a, b) => b.width - a.width);
};

// --- VISUALIZADOR DE JUMBO (DISEÑO TÉCNICO LIMPIO) ---
const JumboVisualizer: React.FC<{ 
    jumboWidth: number; 
    cuts: CutDefinition[]; 
    onDeleteCut?: (id: string) => void;
}> = ({ jumboWidth, cuts, onDeleteCut }) => {
    
    const { lanes, usedWidth } = useMemo(() => calculateLayout(cuts), [cuts]);
    const remainingWidth = jumboWidth - usedWidth;
    const isOverflow = remainingWidth < 0;
    const isFull = remainingWidth <= 0; // Si está lleno o pasado, la tapa debe tener color

    // Colores para diferenciar cortes adyacentes
    const getBgColor = (index: number) => {
        const colors = [
            'bg-gradient-to-b from-orange-400 to-orange-600',
            'bg-gradient-to-b from-amber-400 to-amber-600',
            'bg-gradient-to-b from-orange-500 to-orange-700',
            'bg-gradient-to-b from-yellow-500 to-yellow-700',
        ];
        return colors[index % colors.length];
    };

    // Calcular clase de color para la tapa derecha
    const rightCapClass = (isFull && lanes.length > 0) 
        ? getBgColor(lanes.length - 1) // Usar el color del último carril (el de más a la derecha)
        : 'bg-gray-300 dark:bg-gray-600';

    return (
        <div className="w-full flex flex-col items-center py-8 px-10 overflow-hidden select-none">
            {/* Header Datos */}
            <div className="w-full flex justify-between items-end mb-4 px-2 text-sm">
                <div className="text-center">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Ancho Jumbo</span>
                    <span className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3 py-1 rounded font-mono font-bold text-gray-900 dark:text-white inline-block">
                        {jumboWidth}mm
                    </span>
                </div>
                <div className="text-right">
                    <span className={`text-xs font-bold uppercase tracking-wider block ${isOverflow ? 'text-red-500' : 'text-gray-500'}`}>
                        {isOverflow ? 'Exceso' : 'Libre'}
                    </span>
                    <span className={`font-mono font-bold text-lg ${isOverflow ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.abs(remainingWidth)}mm
                    </span>
                </div>
            </div>

            {/* GRÁFICO CILINDRO */}
            <div className="relative h-40 w-full mx-auto max-w-5xl">
                {/* Sombra de Piso */}
                <div className="absolute -bottom-4 left-4 right-4 h-4 bg-black/20 rounded-[50%] blur-md z-0"></div>

                {/* CONTENEDOR PRINCIPAL DEL ROLLO */}
                <div className="relative h-full w-full z-10 flex items-center">
                    
                    {/* CARA IZQUIERDA (Lateral del rollo) */}
                    {/* Posicionada absolutamente con translate negativo para sobresalir a la izquierda */}
                    <div className="absolute left-0 top-0 h-full w-8 bg-[#555] rounded-[100%] z-30 border-l border-gray-600 shadow-2xl flex items-center justify-center transform -translate-x-1/2">
                        {/* Core Hole */}
                        <div className="w-3 h-16 bg-[#222] rounded-[100%] shadow-[inset_0_0_5px_#000]"></div>
                    </div>

                    {/* CUERPO DEL ROLLO (Rectángulo central que conecta las caras) */}
                    <div className="flex-1 h-full flex relative overflow-hidden z-20 w-full bg-gray-800">
                       
                       {/* Renderizado de Carriles */}
                       {lanes.map((lane, idx) => {
                           const widthPercent = (lane.width / jumboWidth) * 100;
                           return (
                               <div 
                                   key={`${lane.parentId}-${idx}`}
                                   style={{ width: `${widthPercent}%` }}
                                   className={`h-full relative group flex-shrink-0 border-r border-white/20 ${getBgColor(idx)}`}
                               >
                                   {/* Highlight superior para volumen */}
                                   <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
                                   {/* Sombra inferior para volumen */}
                                   <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

                                   {/* Etiqueta */}
                                   <div className="absolute inset-0 flex flex-col items-center justify-center text-white drop-shadow-md z-30 px-1 overflow-hidden">
                                       <span className="font-black text-lg sm:text-2xl leading-none">{lane.width}</span>
                                       <span className="text-[10px] uppercase opacity-90 font-bold">mm</span>
                                   </div>

                                   {/* Botón Eliminar */}
                                   {onDeleteCut && (
                                       <button 
                                           onClick={() => onDeleteCut(lane.parentId)}
                                           className="absolute top-2 right-2 z-50 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-sm border border-white"
                                           title="Eliminar"
                                       >
                                           <XIcon className="h-3 w-3" />
                                       </button>
                                   )}
                               </div>
                           );
                       })}

                       {/* Espacio Remanente */}
                       {!isOverflow && (
                           <div className="flex-1 h-full relative bg-gray-300 dark:bg-gray-600 min-w-0 flex items-center justify-center">
                               <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-white/10 to-black/10 pointer-events-none"></div>
                               <span className="text-gray-500 dark:text-gray-400 font-bold text-xs tracking-widest opacity-50 rotate-0 whitespace-nowrap">
                                   DISPONIBLE
                               </span>
                           </div>
                       )}
                    </div>

                    {/* CARA DERECHA (Tapa del rollo) */}
                    {/* Si está lleno, toma el color del último carril */}
                    <div className={`absolute right-0 top-0 h-full w-8 z-20 transform translate-x-1/2 rounded-[100%] shadow-md border-l border-white/10 overflow-hidden ${rightCapClass}`}>
                         <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20"></div>
                         {/* Espirales decorativas */}
                         <div className="absolute inset-2 border-2 border-gray-400/30 rounded-[100%]"></div>
                         <div className="absolute inset-4 border-2 border-gray-400/30 rounded-[100%]"></div>
                    </div>

                </div>
            </div>
        </div>
    );
};

// --- HELPER: COLOR MAPPING BASED ON PDF ---
const getColorForMaterial = (code: string, name: string): string => {
    const codePrefix = code.substring(0, 3);
    const upperName = name.toUpperCase();

    // Mapping exacto de la referencia visual
    if (codePrefix === '002') return '#00C2CB'; // Cyan
    if (codePrefix === '003') return 'linear-gradient(135deg, #E3C363 0%, #FFF3B5 50%, #E3C363 100%)'; // Holograma (Gold effect)
    if (codePrefix === '011') return '#7B5836'; // Andes Brown
    if (codePrefix === '013') return '#FFE900'; // BOPP Digital Yellow
    if (codePrefix === '014') return '#00A651'; // Arclad Green
    if (codePrefix === '015') return '#662D91'; // Ritrama Purple
    if (codePrefix === '017') return '#D6C6D8'; // Pastel Lilac/Pink
    if (codePrefix === '043') return '#D9D9D9'; // Metal Silver (Light Grey)
    if (codePrefix === '046') return '#231F20'; // Black
    if (codePrefix === '047') return 'linear-gradient(to right, #D4AF37, #FEE180)'; // Metal Gold
    if (codePrefix === '258') return '#F58220'; // Ultra Mate Orange
    if (codePrefix === '260') return '#0066B3'; // Perlado Blue
    if (codePrefix === '266') return '#EE4023'; // DDT Red/Orange
    if (codePrefix === '267') return '#8DC63F'; // Termico Light Green
    if (codePrefix === '268') return 'repeating-linear-gradient(45deg, #ffffff, #ffffff 10px, #ffcccc 10px, #ffcccc 11px)'; // Simulated White with red hints/border
    if (codePrefix === '355') return '#ED1C24'; // Couche Red
    if (codePrefix === '361') return '#2E3192'; // Pharma Dark Blue
    if (codePrefix === '459') return '#D9E021'; // Doble Liner Lime
    if (codePrefix === '601') return '#EC008C'; // PAI 220 Magenta
    if (codePrefix === '602') return '#C9E8E4'; // Film Cast Light Cyan
    if (codePrefix === '603') return '#00AEEF'; // PAI 100 Cyan
    if (codePrefix === '646') return '#0071BC'; // Transp ADC220 Blue
    if (codePrefix === '647') return '#939598'; // Transp ADC1200 Grey
    if (codePrefix === '648') return '#00594D'; // Transp ADC231 Dark Green
    if (codePrefix === '827') return '#808285'; // Termico ECP Grey
    if (codePrefix === '863') return '#92278F'; // Transtermico Purple
    
    // Fallbacks
    if (upperName.includes('RIBBON')) return '#212121';
    if (upperName.includes('LAMINADO')) return '#9e9e9e';
    if (upperName.includes('HOT')) return 'linear-gradient(to right, #b8860b, #ffd700)';
    if (upperName.includes('COLD')) return 'linear-gradient(to right, #c0c0c0, #e0e0e0)';
    
    return '#ea580c'; // Default RR Orange
};

// Helper para determinar si el texto debe ser negro (para fondos claros)
const shouldUseBlackText = (code: string): boolean => {
    const lightCodes = ['002', '013', '017', '043', '268', '459', '602', '003'];
    return lightCodes.includes(code.substring(0, 3));
};

// --- SELECTOR MATERIAL (CÓDIGO CORTO) ---
const StockMaterialSelect: React.FC<{ 
    value: string; 
    onChange: (id: string, code: string, name: string) => void; 
    inventory: InventoryItem[] 
}> = ({ value, onChange, inventory }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filtrar solo sustratos
    const options = useMemo(() => inventory.filter(i => i.tipo === 'Sustrato'), [inventory]);
    
    // Al seleccionar, actualizamos search para mostrar el nombre
    useEffect(() => {
        const selected = options.find(i => i.id === value);
        if (selected) {
            // MOSTRAR SOLO PRIMEROS 3 DIGITOS DEL CODIGO EN EL INPUT
            const shortCode = selected.codigo.substring(0,3);
            setSearch(`${shortCode} - ${selected.nombre}`);
        } else if (!value) {
            setSearch('');
        }
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter(i => 
        i.nombre.toLowerCase().includes(search.toLowerCase()) || 
        i.codigo.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Material (Sustrato)</label>
            <div className="relative">
                <input 
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setIsOpen(true); onChange('', '', ''); }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Buscar familia (ej: 014)..."
                    className="w-full p-2 pl-9 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-orange-500 font-bold"
                />
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                {value && (
                    <button onClick={() => {onChange('', '', ''); setSearch('');}} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500">
                        <XIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filtered.map(item => {
                        // CORTAR CÓDIGO A 3 DÍGITOS PARA LA LISTA TAMBIÉN
                        const shortCode = item.codigo.substring(0,3);
                        return (
                            <div 
                                key={item.id}
                                onClick={() => { onChange(item.id, shortCode, item.nombre); setIsOpen(false); }}
                                className="px-4 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 text-sm"
                            >
                                <span className="font-mono font-bold bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 px-2 rounded text-xs">{shortCode}</span>
                                <span className="dark:text-white truncate">{item.nombre}</span>
                                <span className="text-xs text-gray-400 ml-auto">{item.ancho}mm</span>
                            </div>
                        );
                    })}
                    {filtered.length === 0 && <div className="p-3 text-center text-gray-500 text-sm">No encontrado</div>}
                </div>
            )}
        </div>
    );
};

// --- LOGO SVG ACTUALIZADO ---
const svgToPngDataUrl = (svgString: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 4;
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/png'));
            } else reject(new Error('Canvas error'));
            URL.revokeObjectURL(url);
        };
        img.onerror = reject;
        img.src = url;
    });
};
const RR_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 445.41 237.71" width="445" height="237"><g><path fill="#1d1d1b" d="M201.77,211.05h1.74l7.49,16.56h-2l-1.93-4.34h-8.95l-1.95,4.34h-1.9l7.49-16.56h0ZM206.35,221.59l-3.73-8.38-3.76,8.38h7.49,0Z"/><path fill="#1d1d1b" d="M221.28,211.16h7c1.88,0,3.36.54,4.3,1.46.68.71,1.06,1.57,1.06,2.63v.05c0,2.14-1.31,3.24-2.61,3.8,1.95.59,3.52,1.71,3.52,3.97v.05c0,2.82-2.37,4.49-5.96,4.49h-7.3v-16.44h0ZM231.76,215.51c0-1.62-1.29-2.68-3.64-2.68h-5v5.66h4.86c2.23,0,3.78-1.01,3.78-2.94v-.05h0ZM228.3,220.14h-5.19v5.8h5.52c2.49,0,4.04-1.1,4.04-2.94v-.05c0-1.79-1.5-2.82-4.37-2.82h0Z"/><path fill="#1d1d1b" d="M237.18,221.57v-.05c0-3.5,2.46-6.32,5.82-6.32,3.59,0,5.66,2.87,5.66,6.41,0,.24,0,.38-.02.59h-9.63c.26,2.63,2.11,4.11,4.27,4.11,1.67,0,2.84-.68,3.83-1.71l1.13,1.01c-1.22,1.36-2.7,2.28-5,2.28-3.33,0-6.06-2.56-6.06-6.32h0ZM246.83,220.86c-.19-2.21-1.46-4.13-3.88-4.13-2.11,0-3.71,1.76-3.95,4.13h7.83Z"/><path fill="#1d1d1b" d="M251.08,221.59v-.05c0-3.43,2.68-6.34,6.34-6.34s6.32,2.87,6.32,6.29v.05c0,3.43-2.7,6.34-6.36,6.34s-6.29-2.87-6.29-6.29h-.01ZM261.88,221.59v-.05c0-2.61-1.95-4.74-4.51-4.74s-4.44,2.14-4.44,4.7v.05c0,2.61,1.93,4.72,4.49,4.72s4.46-2.11,4.46-4.67h0Z"/><path fill="#1d1d1b" d="M267,215.46h1.81v2.11c.8-1.32,2.07-2.37,4.16-2.37,2.94,0,4.65,1.97,4.65,4.86v7.54h-1.81v-7.09c0-2.25-1.22-3.66-3.36-3.66s-3.64,1.53-3.64,3.8v6.95h-1.81v-12.14Z"/><path fill="#1d1d1b" d="M282.1,224.39v-7.33h-1.69v-1.6h1.69v-3.66h1.81v3.66h3.85v1.6h-3.85v7.09c0,1.48.82,2.02,2.04,2.02.61,0,1.13-.12,1.76-.42v1.55c-.63.33-1.31.52-2.18.52-1.95,0-3.43-.96-3.43-3.43h0Z"/><path fill="#1d1d1b" d="M290.03,224.08v-.05c0-2.56,2.11-3.92,5.19-3.92,1.55,0,2.65.21,3.73.52v-.42c0-2.18-1.34-3.31-3.62-3.31-1.43,0-2.56.38-3.69.89l-.54-1.48c1.34-.61,2.65-1.01,4.42-1.01s3.03.45,3.92,1.34c.82.82,1.24,2,1.24,3.55v7.42h-1.74v-1.83c-.85,1.1-2.25,2.09-4.39,2.09-2.25,0-4.53-1.29-4.53-3.78h0ZM298.98,223.14v-1.17c-.89-.26-2.09-.52-3.57-.52-2.28,0-3.55.99-3.55,2.51v.05c0,1.53,1.41,2.42,3.05,2.42,2.23,0,4.06-1.36,4.06-3.29h.01Z"/><path fill="#1d1d1b" d="M304.41,229.72l.82-1.41c1.39,1.01,2.94,1.55,4.67,1.55,2.68,0,4.42-1.48,4.42-4.32v-1.43c-1.06,1.41-2.54,2.56-4.77,2.56-2.91,0-5.71-2.18-5.71-5.68v-.05c0-3.55,2.82-5.73,5.71-5.73,2.28,0,3.76,1.13,4.74,2.44v-2.18h1.81v10.03c0,1.88-.56,3.31-1.55,4.3-1.08,1.08-2.7,1.62-4.63,1.62s-3.9-.56-5.52-1.69h0ZM314.36,220.96v-.05c0-2.49-2.16-4.11-4.46-4.11s-4.2,1.6-4.2,4.09v.05c0,2.44,1.95,4.13,4.2,4.13s4.46-1.67,4.46-4.11Z"/><path fill="#1d1d1b" d="M326.76,219.43v-.05c0-4.65,3.48-8.5,8.31-8.5,2.98,0,4.77,1.06,6.41,2.61l-1.27,1.36c-1.39-1.32-2.94-2.25-5.17-2.25-3.64,0-6.36,2.96-6.36,6.74v.05c0,3.8,2.75,6.79,6.36,6.79,2.25,0,3.73-.87,5.31-2.37l1.22,1.2c-1.71,1.74-3.59,2.89-6.58,2.89-4.74,0-8.24-3.73-8.24-8.45v-.02Z"/><path fill="#1d1d1b" d="M343.62,221.59v-.05c0-3.43,2.68-6.34,6.34-6.34s6.32,2.87,6.32,6.29v.05c0,3.43-2.7,6.34-6.36,6.34s-6.29-2.87-6.29-6.29h-.01ZM354.42,221.59v-.05c0-2.61-1.95-4.74-4.51-4.74s-4.44,2.14-4.44,4.7v.05c0,2.61,1.93,4.72,4.49,4.72s4.46-2.11,4.46-4.67h0Z"/><path fill="#1d1d1b" d="M359.54,215.46h1.81v2.04c.8-1.2,1.88-2.3,3.92-2.3s3.24,1.06,3.9,2.42c.87-1.34,2.16-2.42,4.27-2.42,2.79,0,4.51,1.88,4.51,4.88v7.51h-1.81v-7.09c0-2.35-1.17-3.66-3.15-3.66-1.83,0-3.36,1.36-3.36,3.76v7h-1.78v-7.14c0-2.28-1.2-3.62-3.12-3.62s-3.38,1.6-3.38,3.83v6.93h-1.81v-12.14h0Z"/><path fill="#1d1d1b" d="M381.8,215.46h1.81v2.44c.99-1.46,2.42-2.7,4.65-2.7,2.91,0,5.8,2.3,5.8,6.29v.05c0,3.97-2.86,6.32-5.8,6.32-2.25,0-3.71-1.22-4.65-2.58v6.08h-1.81v-15.9h0ZM392.2,221.57v-.05c0-2.87-1.97-4.7-4.27-4.7s-4.39,1.9-4.39,4.67v.05c0,2.82,2.14,4.7,4.39,4.7s4.27-1.74,4.27-4.67Z"/><path fill="#1d1d1b" d="M396.47,224.08v-.05c0-2.56,2.11-3.92,5.19-3.92,1.55,0,2.65.21,3.73.52v-.42c0-2.18-1.34-3.31-3.62-3.31-1.43,0-2.56.38-3.69.89l-.54-1.48c1.34-.61,2.65-1.01,4.42-1.01s3.03.45,3.92,1.34c.82.82,1.24,2,1.24,3.55v7.42h-1.74v-1.83c-.85,1.1-2.25,2.09-4.39,2.09-2.25,0-4.53-1.29-4.53-3.78h0ZM405.42,223.14v-1.17c-.89-.26-2.09-.52-3.57-.52-2.28,0-3.55.99-3.55,2.51v.05c0,1.53,1.41,2.42,3.05,2.42,2.23,0,4.06-1.36,4.06-3.29h.01Z"/><path fill="#1d1d1b" d="M410.98,215.46h1.81v2.11c.8-1.32,2.07-2.37,4.16-2.37,2.94,0,4.65,1.97,4.65,4.86v7.54h-1.81v-7.09c0-2.25-1.22-3.66-3.36-3.66s-3.64,1.53-3.64,3.8v6.95h-1.81v-12.14Z"/><path fill="#1d1d1b" d="M434.18,215.46h1.93l-5.1,12.54c-1.03,2.51-2.21,3.43-4.04,3.43-1.01,0-1.76-.21-2.58-.61l.61-1.43c.59.3,1.13.45,1.9.45,1.08,0,1.76-.56,2.49-2.28l-5.52-12.09h2l4.41,10.12,3.9-10.12h0Z"/></g><g><path fill="#ef7d00" d="M312.16,3.22c-52.77,0-95.56,42.79-95.56,95.56s42.79,95.56,95.56,95.56v-3.19c-51.01,0-92.38-41.37-92.38-92.38S261.15,6.4,312.16,6.4v-3.19h0Z"/><path fill="#1d1d1b" d="M101.92,3.22C49.15,3.22,6.35,46.01,6.35,98.78s42.79,95.56,95.56,95.56,95.56-42.79,95.56-95.56S154.69,3.22,101.92,3.22ZM82.59,137.01c-7.81,0-11.25-5.46-13.67-9.31-2.47-4.18-5.08-8.62-7.83-13.4-2-3.49-2.28-5.71-2.28-9.7v-9.92h10.17c4.68-.01,9.27-4.1,9.28-9.01,0-4.61-4.23-8.36-9.81-8.36h-13.82v52.68c0,3.86-3.16,7.03-7.03,7.03h-15.19V60.55h40.04c16.36,0,25.95,11.68,26.2,23.54.22,10.01-6.02,20.16-17.59,23.51l18.53,29.4h-17.01.01ZM156.19,137.01c-7.81,0-11.25-5.46-13.67-9.31-2.47-4.18-5.09-8.62-7.83-13.4-2-3.49-2.28-5.71-2.28-9.7v-9.92h10.17c4.68-.01,9.28-4.1,9.28-9,0-4.61-4.23-8.36-9.81-8.36h-13.82v52.68c0,3.86-3.16,7.03-7.03,7.03h-15.19V60.55h40.04c16.36,0,25.95,11.68,26.2,23.54.22,10.01-6.02,20.15-17.59,23.51l18.53,29.4h-17.01,0Z"/><path fill="#ec6608" d="M430.5,108.13c0-.5-.14-.91-.43-1.23-.28-.32-.65-.58-1.11-.8-.46-.21-.99-.4-1.6-.56-.6-.16-1.23-.32-1.88-.47-.83-.23-1.63-.48-2.4-.78-.76-.3-1.44-.69-2.02-1.17-.58-.47-1.05-1.08-1.39-1.81-.34-.73-.52-1.62-.52-2.67,0-1.3.23-2.42.7-3.37.47-.95,1.09-1.74,1.88-2.37.79-.62,1.71-1.08,2.76-1.39,1.05-.3,2.15-.45,3.32-.45,1.42,0,2.75.11,4,.34,1.24.24,2.37.53,3.38.9v4.63c-.53-.18-1.08-.34-1.67-.49-.58-.16-1.17-.29-1.77-.4-.61-.11-1.2-.2-1.79-.28-.59-.07-1.15-.11-1.68-.11-.67,0-1.24.07-1.7.2-.46.12-.84.29-1.13.52-.29.21-.49.46-.62.75-.12.28-.19.57-.19.87,0,.53.14.97.42,1.3.28.34.67.61,1.16.81.5.21,1.02.38,1.56.52s1.07.27,1.58.4c.8.19,1.6.42,2.4.7.8.27,1.52.65,2.16,1.14.64.48,1.16,1.11,1.57,1.89.4.78.61,1.77.61,2.96,0,1.31-.25,2.46-.75,3.43-.49.97-1.19,1.79-2.07,2.43-.88.65-1.95,1.13-3.19,1.44-1.24.31-2.6.47-4.09.47s-2.79-.11-3.97-.34c-1.18-.24-2.15-.52-2.92-.88v-4.59c1.24.47,2.4.78,3.46.95,1.06.16,2.04.25,2.95.25.7,0,1.36-.06,1.97-.16.61-.11,1.14-.27,1.57-.49.44-.23.79-.51,1.05-.85.25-.34.38-.76.38-1.24M408.89,104.96c-.54-.13-1.16-.25-1.87-.34-.7-.11-1.42-.16-2.14-.16-1.39,0-2.49.27-3.3.83-.81.55-1.21,1.39-1.21,2.53,0,.52.09.98.28,1.38.18.39.43.72.74.97s.67.44,1.09.57c.42.13.85.2,1.32.2.57,0,1.12-.08,1.63-.23.52-.16.98-.34,1.42-.58.43-.23.82-.49,1.16-.78s.64-.57.88-.84v-3.55h0ZM409.34,112.4h-.1c-.32.34-.7.68-1.15,1.03-.44.35-.96.69-1.53,1s-1.21.56-1.92.75c-.7.2-1.47.29-2.28.29-1.11,0-2.13-.17-3.1-.52-.96-.34-1.78-.83-2.46-1.48-.69-.65-1.23-1.43-1.62-2.36-.39-.92-.59-1.94-.59-3.08,0-1.24.23-2.37.69-3.36.45-.99,1.09-1.83,1.9-2.52.82-.69,1.79-1.21,2.93-1.57,1.14-.36,2.39-.54,3.77-.54,1.01,0,1.93.07,2.78.2.84.13,1.59.28,2.23.46v-.94c0-.54-.09-1.06-.28-1.57-.18-.5-.47-.95-.88-1.34s-.94-.7-1.6-.93-1.46-.34-2.4-.34c-1.15,0-2.3.12-3.46.38-1.15.26-2.4.65-3.74,1.15v-4.44c1.17-.51,2.41-.9,3.72-1.17,1.32-.28,2.69-.42,4.13-.43,1.7,0,3.19.2,4.45.62,1.27.42,2.33.99,3.19,1.71.86.73,1.5,1.59,1.92,2.58.43.99.63,2.07.63,3.24v8.75c0,1.54.02,2.86.05,3.96s.07,2.09.1,2.95h-5.13l-.24-2.47h-.01ZM391.98,114.84c-.64.2-1.4.34-2.29.46-.88.11-1.71.16-2.48.16-1.95,0-3.55-.31-4.78-.94-1.24-.64-2.12-1.54-2.63-2.73-.37-.85-.55-2-.55-3.46v-12.04h-4.35v-4.68h4.35v-6.5h5.68v6.5h6.71v4.68h-6.71v11.3c0,.9.14,1.56.41,1.99.47.74,1.43,1.11,2.85,1.11.66,0,1.31-.05,1.96-.16s1.26-.24,1.83-.39v4.7h0ZM363.03,95.49c-.71,0-1.36.13-1.92.39-.56.26-1.04.62-1.45,1.08s-.74.99-.97,1.6c-.24.61-.4,1.25-.47,1.94h9.14c0-.69-.09-1.33-.28-1.94-.18-.61-.46-1.14-.81-1.6-.36-.46-.81-.82-1.35-1.08-.53-.26-1.16-.39-1.88-.39h0ZM365.31,110.89c1.11,0,2.25-.11,3.46-.34,1.2-.23,2.42-.55,3.64-.97v4.54c-.74.32-1.87.62-3.38.92-1.52.29-3.1.43-4.72.43s-3.21-.21-4.69-.63c-1.48-.43-2.77-1.11-3.87-2.06-1.11-.94-1.98-2.17-2.63-3.67-.65-1.51-.97-3.32-.97-5.47s.3-3.95.92-5.54c.61-1.58,1.42-2.89,2.45-3.93,1.02-1.04,2.19-1.82,3.51-2.34s2.68-.78,4.09-.78,2.82.22,4.07.67c1.24.45,2.31,1.15,3.21,2.11.91.96,1.61,2.19,2.11,3.7.51,1.51.76,3.3.76,5.36-.02.8-.04,1.48-.07,2.04h-15.24c.08,1.07.32,1.99.72,2.75.4.75.93,1.38,1.57,1.84.65.47,1.41.82,2.27,1.03s1.8.33,2.81.33h-.02ZM337.58,115.47c-2.33,0-4.27-.39-5.81-1.19-1.54-.79-2.69-1.86-3.48-3.2-.42-.72-.72-1.51-.93-2.37-.2-.86-.29-1.83-.29-2.88v-14.2h5.68v13.6c0,.79.06,1.46.16,2.03.11.57.29,1.06.51,1.47.38.7.93,1.23,1.63,1.57s1.55.52,2.52.52c1.02,0,1.9-.2,2.63-.57.72-.38,1.27-.97,1.64-1.75.37-.75.56-1.8.56-3.14v-13.72h5.68v14.2c0,1.89-.33,3.48-.98,4.78-.37.73-.84,1.4-1.42,2-.59.6-1.28,1.11-2.06,1.54-.79.42-1.69.74-2.69.98-1,.23-2.11.34-3.34.34h0ZM316.59,94.23l.25-2.61h4.99v34.4h-5.68v-9.66c0-.69,0-1.33.02-1.91.02-.59.02-1.04.04-1.36h-.04c-.35.29-.76.57-1.21.85-.46.28-.96.54-1.5.77-.55.23-1.14.42-1.78.55-.64.14-1.32.2-2.04.2-1.24,0-2.44-.22-3.61-.65-1.18-.44-2.23-1.14-3.14-2.09-.92-.95-1.65-2.18-2.21-3.68-.55-1.51-.83-3.28-.83-5.35s.29-3.87.85-5.47c.57-1.6,1.33-2.93,2.27-3.99.94-1.05,2.03-1.85,3.25-2.38,1.23-.53,2.48-.8,3.78-.8,1.39,0,2.64.29,3.75.88,1.11.58,2.03,1.35,2.75,2.31h.09ZM311.05,110.94c.57,0,1.11-.07,1.63-.22.51-.14.98-.33,1.42-.55.43-.23.82-.47,1.16-.74s.63-.54.88-.82v-10.31c-.6-.72-1.32-1.35-2.16-1.88-.85-.54-1.78-.82-2.78-.83-.57,0-1.18.11-1.81.34-.63.23-1.23.65-1.78,1.24-.56.59-1.02,1.41-1.36,2.46-.34,1.05-.52,2.33-.52,3.82,0,1.17.11,2.21.34,3.14.23.92.57,1.7,1.01,2.35.45.65,1.01,1.15,1.67,1.49s1.43.52,2.32.52h-.02ZM289.58,80.13h5.97v6.17h-5.97v-6.17ZM289.72,91.62h5.69v23.25h-5.69v-23.25ZM285.89,114.84c-.64.2-1.4.34-2.29.46-.88.11-1.71.16-2.48.16-1.95,0-3.55-.31-4.78-.94-1.24-.64-2.12-1.54-2.63-2.73-.37-.85-.55-2-.55-3.46v-12.04h-4.35v-4.68h4.35v-6.5h5.68v6.5h6.71v4.68h-6.71v11.3c0,.9.14,1.56.41,1.99.47.74,1.43,1.11,2.85,1.11.66,0,1.31-.05,1.96-.16s1.26-.24,1.83-.39v4.7h0ZM251.14,109.95h15.78v4.92h-21.66v-32.1h20.8v4.92h-14.92v8.29h12.81v4.92h-12.81v9.04h0Z" />
    </g>
  </svg>`;


const StockDashboard: React.FC = () => {
    const { inventory, updateInventoryItem } = useSystemData();
    const { user, quotes } = useOutletContext<QuoteOutletContext>();
    
    // --- ESTADO Y LÓGICA DE CONTROL DE STOCK (RESTAURADA) ---
    // Usamos el hook useInventory para obtener el estado calculado (fisico vs comprometido)
    const { inventoryStatus } = useInventory(quotes);

    const [categoryFilter, setCategoryFilter] = useState<'Sustrato' | 'Laminado' | 'Ribbon' | 'Hot Stamping' | 'Cold Stamping' | 'Tinta' | 'Otro'>('Sustrato');
    const [subCategoryFilter, setSubCategoryFilter] = useState<string>('');
    const [filterLowStock, setFilterLowStock] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editItem, setEditItem] = useState<InventoryItem | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // --- ESTADOS DE LA MODAL DE INFORMES / OC ---
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportType, setReportType] = useState<'inventory' | 'purchase' | 'history'>('inventory'); 
    
    // --- ESTADOS JUMBO SLITTER ---
    const [nextOCNumber, setNextOCNumber] = useState('');
    const [currentJumbo, setCurrentJumbo] = useState<{width: number, materialId: string, materialName: string, materialCode: string}>({ width: 1000, materialId: '', materialName: '', materialCode: '' });
    const [currentCuts, setCurrentCuts] = useState<CutDefinition[]>([]);
    const [inputCutWidth, setInputCutWidth] = useState<string>('');
    const [inputCutQty, setInputCutQty] = useState<string>('');
    const [pendingJumbos, setPendingJumbos] = useState<JumboDefinition[]>([]);
    const [ocHistory, setOcHistory] = useState<PurchaseOrder[]>([]);
    
    // NUEVO ESTADO: PROVEEDOR
    const [supplierName, setSupplierName] = useState('');
    const [supplierList, setSupplierList] = useState<string[]>([]);
    
    // NUEVO ESTADO: Para controlar si estamos editando un item existente en la lista
    const [editingId, setEditingId] = useState<string | null>(null);

    // Actualización de Permisos: Incluir Director
    const canEdit = user.role === UserRole.Admin || user.role === UserRole.Cotizador || user.role === UserRole.Gerencia || user.role === UserRole.Director;

    // --- CARGAR HISTORIAL Y PROVEEDORES AL INICIO ---
    useEffect(() => {
        const storedHistory = safeStorage.getItem('rr_oc_history');
        if (storedHistory) {
            try { setOcHistory(JSON.parse(storedHistory)); } catch {}
        }
        
        const storedSuppliers = safeStorage.getItem('rr_suppliers');
        if (storedSuppliers) {
            try { setSupplierList(JSON.parse(storedSuppliers)); } catch {}
        }
    }, []);

    // --- GENERAR NUMERO OC ---
    useEffect(() => {
        if (showReportModal && (reportType === 'purchase')) {
            const year = new Date().getFullYear();
            const lastSeq = parseInt(safeStorage.getItem('rr_last_oc_sequence') || '0');
            const nextSeq = lastSeq + 1;
            setNextOCNumber(`OC-${year}-${String(nextSeq).padStart(3, '0')}`);
        }
    }, [showReportModal, reportType]);

    // Check if ANY item is low stock for global alert
    const hasAnyLowStock = useMemo(() => {
        return inventory.some(i => (i.minStock || 0) > 0 && i.stockMetros <= (i.minStock || 0));
    }, [inventory]);

    // --- LOGICA DE AGRUPAMIENTO PARA VISTA PRINCIPAL (RESTAURADA) ---
    const groupedInventory = useMemo(() => {
        const groups: Record<string, InventoryItem[]> = {};
        
        let filtered = inventory.filter(item => {
            if (categoryFilter === 'Otro') return item.tipo === 'Otro';
            return item.tipo === categoryFilter;
        });

        if (subCategoryFilter) {
            filtered = filtered.filter(item => {
                const nameLower = item.nombre.toLowerCase();
                const subLower = subCategoryFilter.toLowerCase();
                if (categoryFilter === 'Laminado' && subCategoryFilter === 'Especial') {
                    return !nameLower.includes('mate') && !nameLower.includes('brillo');
                }
                return nameLower.includes(subLower);
            });
        }

        if (filterLowStock) {
            filtered = filtered.filter(item => (item.minStock || 0) > 0 && item.stockMetros <= (item.minStock || 0));
        }

        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.codigo.toLowerCase().includes(lowerTerm) || 
                item.nombre.toLowerCase().includes(lowerTerm) ||
                (item.ancho && item.ancho.toString().includes(lowerTerm))
            );
        }

        filtered.forEach(item => {
            let groupKey = item.codigo.substring(0, 3);
            if (groupKey.length < 3 || isNaN(parseInt(groupKey))) {
                groupKey = item.nombre.split(' ')[0]; // Fallback
            }
            if (item.codigo.includes('-')) {
                groupKey = item.codigo.split('-')[0];
            }
            const existing = groups[groupKey];
            if (!existing) groups[groupKey] = [];
            groups[groupKey].push(item);
        });

        return groups;
    }, [inventory, categoryFilter, subCategoryFilter, filterLowStock, searchTerm]);

    const handleEditClick = (item: InventoryItem) => {
        setEditItem({ ...item });
        setShowEditModal(true);
    };

    const handleSaveItem = async () => {
        if (editItem) {
            await updateInventoryItem(editItem);
            setShowEditModal(false);
            setEditItem(null);
        }
    };

    // Helper para botones de filtro
    const FilterButton = ({ active, onClick, label, className }: any) => (
        <button
            onClick={onClick}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-sm border ${
                active 
                ? 'bg-gray-800 text-white border-gray-900 transform scale-105' 
                : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
            } ${className}`}
        >
            {label}
        </button>
    );

    // Opciones para desplegable de "Otros"
    const uniqueOtherTypes = useMemo(() => {
        if(categoryFilter !== 'Otro') return [];
        const types = new Set(inventory.filter(i => i.tipo === 'Otro').map(i => i.nombre));
        return Array.from(types).sort();
    }, [inventory, categoryFilter]);

    // --- ACCIONES SLITTER / OC ---
    const addCut = () => {
        const w = parseInt(inputCutWidth);
        const q = parseInt(inputCutQty);
        
        if (!w || !q) return alert("Ingrese ancho y cantidad de bajadas.");
        
        // No validamos ancho máximo aquí porque depende de las bajadas (lanes). 
        // El visualizador mostrará si hay exceso.

        const newCut: CutDefinition = {
            id: `cut-${Date.now()}`,
            width: w,
            quantity: q
        };
        setCurrentCuts([...currentCuts, newCut]);
        setInputCutWidth('');
    };

    const deleteCut = (id: string) => {
        setCurrentCuts(currentCuts.filter(c => c.id !== id));
    };

    const addJumboToOC = () => {
        if (!currentJumbo.materialId) return alert("Seleccione un material.");
        if (currentCuts.length === 0) return alert("Defina al menos un corte.");

        const newJumboDef: JumboDefinition = {
            id: editingId || `jumbo-${Date.now()}`, // Usar ID existente si editamos, o nuevo
            materialId: currentJumbo.materialId,
            materialName: currentJumbo.materialName,
            materialCode: currentJumbo.materialCode,
            jumboWidth: currentJumbo.width,
            cuts: currentCuts,
            totalQuantity: currentCuts.reduce((acc, c) => acc + c.quantity, 0)
        };

        if (editingId) {
            // Actualizar existente
            setPendingJumbos(prev => prev.map(item => item.id === editingId ? newJumboDef : item));
            setEditingId(null);
        } else {
            // Agregar nuevo
            setPendingJumbos([...pendingJumbos, newJumboDef]);
        }
        
        // Limpiar formulario
        setCurrentCuts([]);
    };

    // --- FUNCIÓN EDITAR JUMBO PENDIENTE ---
    const editPendingJumbo = (jumboId: string) => {
        const jumboToEdit = pendingJumbos.find(j => j.id === jumboId);
        if (!jumboToEdit) return;

        // Cargar datos al editor
        setCurrentJumbo({
            width: jumboToEdit.jumboWidth,
            materialId: jumboToEdit.materialId,
            materialName: jumboToEdit.materialName,
            materialCode: jumboToEdit.materialCode
        });
        setCurrentCuts(jumboToEdit.cuts);
        
        // MARCAR COMO EDITANDO (NO BORRAMOS DE LA LISTA TODAVÍA)
        setEditingId(jumboId);
    };
    
    const cancelEditing = () => {
        setEditingId(null);
        setCurrentCuts([]);
    };

    const removePendingJumbo = (id: string) => {
        if (editingId === id) cancelEditing(); // Si borramos lo que estamos editando
        setPendingJumbos(pendingJumbos.filter(j => j.id !== id));
    };

    // --- FUNCIÓN CARGAR ORDEN DE HISTORIAL ---
    const loadOrderFromHistory = (order: PurchaseOrder) => {
        if (pendingJumbos.length > 0) {
            if (!confirm("Esto reemplazará la orden actual en curso. ¿Continuar?")) return;
        }
        
        // Cargar ítems
        setPendingJumbos(order.items);
        setNextOCNumber(order.id);
        setEditingId(null); // Asegurar que no estamos editando nada viejo
        setCurrentCuts([]);
        
        // Cambiar a la pestaña de edición
        setReportType('purchase');
    };

    const generateOrderPDF = async () => {
        if (pendingJumbos.length === 0) return alert("No hay ítems en la orden.");
        
        // GUARDAR PROVEEDOR EN MEMORIA SI NO EXISTE
        if (supplierName.trim() && !supplierList.includes(supplierName.trim())) {
            const newList = [...supplierList, supplierName.trim()];
            setSupplierList(newList);
            safeStorage.setItem('rr_suppliers', JSON.stringify(newList));
        }
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            try {
                const logoData = await svgToPngDataUrl(RR_LOGO_SVG, 445, 237);
                doc.addImage(logoData, 'PNG', 15, 10, 40, 21);
            } catch (e) {}

            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            // CAMBIO: TÍTULO EN DOS LÍNEAS
            doc.text("ORDEN DE COMPRA", 200, 20, { align: "right" });
            doc.setFontSize(14);
            doc.text("MATERIA PRIMA", 200, 27, { align: "right" });
            
            doc.setFontSize(12);
            doc.setTextColor(239, 125, 0);
            doc.text(nextOCNumber, 200, 35, { align: "right" });
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 200, 42, { align: "right" });
            
            // --- NUEVO BLOQUE: DESTINATARIO / INTRO ---
            let y = 60; // Ajustado por el título doble
            doc.setTextColor(0);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(`Sres. ${supplierName || '____________________'}`, 20, y);
            
            y += 6;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("De nuestra consideración:", 20, y);
            
            y += 6;
            doc.text("Por medio de la presente, solicitamos el suministro de los siguientes productos detallados a continuación:", 20, y);
            
            // Ajustar inicio de tabla más abajo
            y += 15;

            pendingJumbos.forEach((jumbo, idx) => {
                // Verificar si hay espacio, sino nueva página
                if (y > 230) { doc.addPage(); y = 20; }

                doc.setFillColor(245, 245, 245);
                doc.rect(15, y, 180, 15, 'F');
                doc.setFontSize(11);
                doc.setTextColor(0);
                doc.setFont("helvetica", "bold");
                doc.text(`Ítem #${idx + 1}: ${jumbo.materialCode} - ${jumbo.materialName}`, 20, y + 6);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.text(`Ancho Jumbo: ${jumbo.jumboWidth}mm`, 20, y + 11);

                y += 18;

                // --- CALCULAR ESQUEMA (LAYOUT) ---
                const layout = calculateLayout(jumbo.cuts);

                // --- CONSOLIDAR CORTES PARA PDF ---
                const consolidatedCuts = getConsolidatedCuts(jumbo.cuts);
                const tableBody = consolidatedCuts.map(c => {
                    const cutDef = jumbo.cuts.find(cut => cut.width === c.width); // Need raw for calculation if consolidated
                    // We need a representative cut definition for the fraction calc, can mock it with consolidated Qty
                    const mockCut = { ...c, id: '', quantity: c.quantity };
                    return [
                        `${c.width} mm`, 
                        `${c.quantity} bobinas`, 
                        getFractionNote(mockCut, layout) // NOTA INTELIGENTE DE FRACCIÓN (3/5 partes)
                    ];
                });

                doc.autoTable({
                    startY: y,
                    head: [['Ancho Corte', 'Cantidad (Bajadas)', 'Notas']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [234, 88, 12] },
                    margin: { left: 20 },
                    tableWidth: 170
                });

                y = (doc as any).lastAutoTable.finalY + 10;
                
                // --- DIBUJAR ESQUEMA BÁSICO (RECTÁNGULO) ---
                if (layout.lanes.length > 0) {
                    if (y > 230) { doc.addPage(); y = 20; }
                    
                    doc.setFontSize(9);
                    doc.setTextColor(100);
                    doc.text("Esquema de Corte (Distribución de Ancho):", 20, y);
                    y += 5;

                    const schemaWidth = 170;
                    const schemaHeight = 15;
                    const scale = schemaWidth / jumbo.jumboWidth;
                    let currentX = 20;

                    // Fondo Jumbo (Gris Claro)
                    doc.setFillColor(230, 230, 230);
                    doc.rect(20, y, schemaWidth, schemaHeight, 'F');
                    
                    // Carriles
                    layout.lanes.forEach((lane) => {
                        const w = lane.width * scale;
                        doc.setFillColor(200, 200, 200); // Gris más oscuro para cortes
                        doc.setDrawColor(0);
                        doc.rect(currentX, y, w, schemaHeight, 'FD'); // Fill and Draw border
                        
                        // Texto dentro del carril (centrado)
                        if (w > 10) {
                            doc.setFontSize(7);
                            doc.setTextColor(0);
                            doc.text(`${lane.width}`, currentX + (w/2), y + 10, { align: 'center' });
                        }
                        currentX += w;
                    });
                    
                    // Etiqueta Remanente
                    const remanente = jumbo.jumboWidth - layout.usedWidth;
                    if (remanente > 0) {
                        const remX = 20 + (layout.usedWidth * scale);
                        const remW = schemaWidth - (layout.usedWidth * scale);
                        if (remW > 15) {
                            doc.setTextColor(150);
                            doc.text(`Libre: ${remanente}mm`, remX + (remW/2), y + 10, { align: 'center' });
                        }
                    }

                    y += 20;
                }

                if (y > 250) { doc.addPage(); y = 20; }
            });

            y += 20;
            if (y > 250) { doc.addPage(); y = 40; }
            
            // --- FIRMA DINÁMICA SEGÚN ROL ---
            let signatureName = "Autorizado por";
            let signatureTitle = "";

            if (user.role === UserRole.Cotizador) {
                signatureName = "Pablo Candia";
                signatureTitle = "Gerente de Producción RR Etiquetas Uruguay S.A.";
            } else if (user.role === UserRole.Director) {
                signatureName = "Gonzalo Viñas";
                signatureTitle = "Director General RR Etiquetas Uruguay S.A.";
            } else {
                signatureName = user.nombre; // Default para Admin u otros
            }

            doc.setDrawColor(150);
            doc.line(20, y, 80, y);
            doc.text("Solicitado por", 20, y + 5);
            
            doc.line(130, y, 190, y);
            doc.text(signatureName, 130, y + 5);
            if (signatureTitle) {
                doc.setFontSize(8);
                doc.text(signatureTitle, 130, y + 10);
            }

            doc.save(`${nextOCNumber}.pdf`);

            const newOrder: PurchaseOrder = {
                id: nextOCNumber,
                date: new Date().toISOString(),
                status: 'Generada',
                items: pendingJumbos
            };
            
            // Verificar si ya existe para actualizar en lugar de duplicar (si editamos una vieja)
            const existingIndex = ocHistory.findIndex(o => o.id === nextOCNumber);
            let updatedHistory;
            
            if (existingIndex >= 0) {
                updatedHistory = [...ocHistory];
                updatedHistory[existingIndex] = newOrder;
            } else {
                updatedHistory = [newOrder, ...ocHistory];
                // Increment Sequence only if new
                const currentSeq = parseInt(nextOCNumber.split('-').pop() || '0');
                safeStorage.setItem('rr_last_oc_sequence', String(currentSeq));
            }

            setOcHistory(updatedHistory);
            safeStorage.setItem('rr_oc_history', JSON.stringify(updatedHistory));
            
            setPendingJumbos([]);
            setEditingId(null);
            setSupplierName(''); // Limpiar proveedor para la siguiente

        } catch (err) {
            console.error(err);
            alert("Error generando PDF");
        }
    };

    const deleteHistoryOrder = (id: string) => {
        if(confirm("¿Eliminar del historial?")) {
            const updated = ocHistory.filter(o => o.id !== id);
            setOcHistory(updated);
            safeStorage.setItem('rr_oc_history', JSON.stringify(updated));
        }
    };

    return (
        <div className="p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* --- HEADER PRINCIPAL --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <CubeIcon className="h-10 w-10 text-orange-600" />
                        Control de Stock Materia Prima
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión visual de bobinas, alertas y consumos.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowReportModal(true)} 
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-5 py-3 rounded-lg font-bold transition-colors shadow-lg transform hover:scale-105"
                    >
                        <ClipboardCheckIcon className="h-5 w-5" /> 
                        Gestión de Informes y Compras
                    </button>
                </div>
            </div>

            {/* --- TABS DE FILTRADO (VISTA ORIGINAL) --- */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 border-b border-gray-200 dark:border-gray-700 scrollbar-hide">
                {['Sustrato', 'Laminado', 'Ribbon', 'Tinta', 'Hot Stamping', 'Cold Stamping', 'Otro'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setCategoryFilter(tab as any); setSearchTerm(''); setSubCategoryFilter(''); }}
                        className={`px-6 py-2 rounded-t-lg font-bold text-sm whitespace-nowrap transition-all ${categoryFilter === tab ? 'bg-orange-600 text-white shadow-md' : 'bg-transparent text-gray-500 hover:text-orange-500 dark:text-gray-400'}`}
                    >
                        {tab === 'Sustrato' ? 'Bobinas Papel/Film' : tab === 'Tinta' ? 'Tintas' : tab === 'Otro' ? 'Otros Insumos' : tab}
                    </button>
                ))}
            </div>

            {/* --- CONTROLES DE FILTRO Y BÚSQUEDA (VISTA ORIGINAL) --- */}
            <div className="flex flex-col md:flex-row gap-4 items-center mb-6 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setFilterLowStock(!filterLowStock)}
                    className={`relative p-2 rounded-full border transition-all ${filterLowStock ? 'bg-red-100 border-red-300 text-red-600 ring-2 ring-red-400' : 'bg-gray-100 border-gray-200 text-gray-400 hover:text-red-500'}`}
                    title={filterLowStock ? "Ver todo" : "Ver solo alertas de stock"}
                >
                    <ExclamationIcon className={`h-6 w-6 ${hasAnyLowStock && !filterLowStock ? 'animate-pulse text-red-500' : ''}`} />
                    {hasAnyLowStock && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-600"></span>}
                </button>

                <div className="relative flex-grow w-full md:w-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors">
                            <XIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                    {categoryFilter === 'Tinta' && (
                        <>
                            <FilterButton active={subCategoryFilter === ''} onClick={() => setSubCategoryFilter('')} label="Todas" />
                            <FilterButton active={subCategoryFilter === 'Solvente'} onClick={() => setSubCategoryFilter('Solvente')} label="Solvente" />
                            <FilterButton active={subCategoryFilter === 'Acuosa'} onClick={() => setSubCategoryFilter('Acuosa')} label="Acuosa" />
                            <FilterButton active={subCategoryFilter === 'UV'} onClick={() => setSubCategoryFilter('UV')} label="UV" />
                        </>
                    )}
                    {categoryFilter === 'Ribbon' && (
                        <>
                            <FilterButton active={subCategoryFilter === ''} onClick={() => setSubCategoryFilter('')} label="Todos" />
                            <FilterButton active={subCategoryFilter === 'Cera'} onClick={() => setSubCategoryFilter('Cera')} label="Cera" />
                            <FilterButton active={subCategoryFilter === 'Mezcla'} onClick={() => setSubCategoryFilter('Mezcla')} label="Mezcla" />
                            <FilterButton active={subCategoryFilter === 'Resina'} onClick={() => setSubCategoryFilter('Resina')} label="Resina" />
                        </>
                    )}
                    {categoryFilter === 'Laminado' && (
                        <>
                            <FilterButton active={subCategoryFilter === ''} onClick={() => setSubCategoryFilter('')} label="Todos" />
                            <FilterButton active={subCategoryFilter === 'Brillo'} onClick={() => setSubCategoryFilter('Brillo')} label="Brillo" />
                            <FilterButton active={subCategoryFilter === 'Mate'} onClick={() => setSubCategoryFilter('Mate')} label="Mate" />
                            <FilterButton active={subCategoryFilter === 'Especial'} onClick={() => setSubCategoryFilter('Especial')} label="Especial" />
                        </>
                    )}
                    {categoryFilter === 'Otro' && (
                        <select 
                            value={subCategoryFilter} 
                            onChange={(e) => setSubCategoryFilter(e.target.value)}
                            className="px-4 py-1.5 rounded-full text-sm font-bold border border-gray-300 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">Todos los tipos</option>
                            {uniqueOtherTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {/* --- LISTA DE INVENTARIO (VISTA ORIGINAL) --- */}
            <div className="flex flex-col gap-2">
                {Object.keys(groupedInventory).length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400 text-lg">No se encontraron materiales con esa búsqueda.</p>
                    </div>
                ) : (
                    Object.entries(groupedInventory).map(([key, items]: [string, InventoryItem[]]) => {
                        const firstItem = items[0];
                        const cardColor = firstItem.colorHex || getColorForMaterial(firstItem.codigo, firstItem.nombre);
                        const isGradient = cardColor.includes('gradient');
                        const isSpecial268 = firstItem.codigo.startsWith('268');
                        const isTextBlack = shouldUseBlackText(firstItem.codigo) || isSpecial268;

                        const headerStyle = { 
                            background: cardColor,
                            border: isSpecial268 ? '2px solid #ffcccc' : 'none'
                        };

                        return (
                            <div key={key} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row animate-fade-in-up hover:shadow-md transition-shadow">
                                <div style={headerStyle} className={`p-3 md:w-1/4 lg:w-1/5 flex flex-col justify-center relative overflow-hidden ${isTextBlack ? 'text-gray-900' : 'text-white'}`}>
                                    <div className="absolute top-0 right-0 p-2 opacity-20">
                                        <CubeIcon className="h-12 w-12 transform rotate-12" />
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-extrabold drop-shadow-sm">{firstItem.codigo.substring(0, 3)}</h3>
                                        <p className="text-xs font-bold opacity-90 uppercase tracking-wide truncate" title={firstItem.nombre}>
                                            {firstItem.nombre.split(' ').slice(0, 4).join(' ')}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3 flex-1 flex flex-col justify-center gap-2">
                                    {items.sort((a,b) => b.ancho - a.ancho).map(item => {
                                        const min = item.minStock || 0;
                                        const current = item.stockMetros;
                                        const isLow = min > 0 && current <= min;
                                        const maxVisual = Math.max(10000, current * 1.2); 
                                        const percent = Math.min(100, (current / maxVisual) * 100);
                                        
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`group cursor-pointer p-2 rounded flex items-center gap-4 transition-all ${isLow ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 shadow-sm' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`} 
                                                onClick={() => canEdit && handleEditClick(item)}
                                            >
                                                <div className="w-16 flex-shrink-0 text-right">
                                                    <span className="text-base font-bold text-gray-800 dark:text-gray-200">{item.ancho}mm</span>
                                                </div>

                                                <div className="flex-1 relative">
                                                    <div className={`h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative border ${isLow ? 'border-red-200' : 'border-gray-300 dark:border-gray-600'}`}>
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-1000 relative ${isLow ? 'bg-red-600' : ''}`}
                                                            style={{ width: `${percent}%`, background: !isLow ? (isGradient ? cardColor : cardColor) : undefined }}
                                                        >
                                                            <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] opacity-30"></div>
                                                        </div>
                                                        {min > 0 && (
                                                            <div className="absolute top-0 bottom-0 w-0.5 bg-black dark:bg-white z-10 opacity-50" style={{ left: `${(min / maxVisual) * 100}%` }}></div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="w-48 flex-shrink-0 text-right flex flex-col justify-center">
                                                    <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {current.toLocaleString()} m
                                                    </span>
                                                    {min > 0 && (
                                                        <div className="flex items-center justify-end gap-1">
                                                            {isLow && <ExclamationIcon className="h-4 w-4 text-red-600 animate-pulse" />}
                                                            <span className={`text-xs ${isLow ? 'text-red-600 font-bold' : 'text-gray-400'}`}>Min: {min.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* EDIT MODAL (VISTA ORIGINAL) */}
            {showEditModal && editItem && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{editItem.nombre}</h3>
                        <p className="text-sm text-gray-500 mb-6">Código: {editItem.codigo} | Ancho: {editItem.ancho}mm</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Stock Físico Real (metros)</label>
                                <input type="number" value={editItem.stockMetros} onChange={(e) => setEditItem({ ...editItem, stockMetros: parseFloat(e.target.value) || 0 })} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-lg font-bold" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex justify-between">
                                    <span>Alerta de Stock Mínimo</span>
                                    <span className="text-xs font-normal text-gray-400">El sistema avisará al bajar de aquí</span>
                                </label>
                                <input type="number" value={editItem.minStock || ''} onChange={(e) => setEditItem({ ...editItem, minStock: parseFloat(e.target.value) || 0 })} className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-lg text-red-500" placeholder="0" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Color de Referencia (Opcional)</label>
                                <div className="flex gap-2 items-center">
                                    <input type="color" value={editItem.colorHex || getColorForMaterial(editItem.codigo, editItem.nombre)} onChange={(e) => setEditItem({ ...editItem, colorHex: e.target.value })} className="h-10 w-20 rounded cursor-pointer border-0 p-0" />
                                    <span className="text-xs text-gray-500">Sobrescribe el color estándar.</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3 justify-end">
                            <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-bold">Cancelar</button>
                            <button onClick={handleSaveItem} className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg"><SaveIcon className="h-5 w-5" /> Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* UNIFIED REPORT & OC MODAL */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-2 sm:p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-6xl border border-gray-200 dark:border-gray-700 flex flex-col h-[95vh] sm:h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-xl">
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <ClipboardCheckIcon className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                                Gestión de Informes y Compras
                            </h2>
                            <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-red-500"><XIcon className="h-6 w-6" /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                            <button onClick={() => setReportType('inventory')} className={`flex-1 py-3 px-4 font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap ${reportType === 'inventory' ? 'border-b-4 border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Reportes Stock</button>
                            <button onClick={() => setReportType('purchase')} className={`flex-1 py-3 px-4 font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap ${reportType === 'purchase' ? 'border-b-4 border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Generar OC (Slitter)</button>
                            <button onClick={() => setReportType('history')} className={`flex-1 py-3 px-4 font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap ${reportType === 'history' ? 'border-b-4 border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/10' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>Historial Órdenes</button>
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-6 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
                            
                            {/* --- TAB: REPORTES STOCK --- */}
                            {reportType === 'inventory' && (
                                <div className="flex flex-col items-center justify-center h-full space-y-6">
                                    <div className="text-center max-w-lg">
                                        <CubeIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                                        <h3 className="text-xl font-bold dark:text-white">Generar Reporte de Inventario</h3>
                                        <p className="text-gray-500 mt-2">Descarga un PDF detallado con el estado actual de todas las bobinas y materiales.</p>
                                    </div>
                                    <button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2">
                                        <DownloadIcon className="h-5 w-5" /> Descargar PDF Inventario
                                    </button>
                                </div>
                            )}

                            {/* --- TAB: SLITTER / OC --- */}
                            {reportType === 'purchase' && (
                                <div className="flex flex-col h-full gap-6">
                                    {/* 1. VISUALIZADOR Y CONTROLES SUPERIORES */}
                                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                        <div className="flex flex-col lg:flex-row gap-8">
                                            {/* IZQUIERDA: Inputs */}
                                            <div className="w-full lg:w-1/3 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-lg dark:text-white">
                                                        {editingId ? <span className="text-blue-600">Editando Ítem</span> : 'Definir Jumbo'}
                                                    </h3>
                                                    <span className="bg-blue-100 text-blue-800 text-xs font-mono px-2 py-1 rounded border border-blue-200">{nextOCNumber}</span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ancho Jumbo (mm)</label>
                                                        <input 
                                                            type="number" 
                                                            value={currentJumbo.width} 
                                                            onChange={e => setCurrentJumbo({...currentJumbo, width: parseInt(e.target.value) || 0})}
                                                            className="w-full p-2 border rounded-md font-bold text-center dark:bg-gray-700 dark:text-white" 
                                                        />
                                                    </div>
                                                    <div className="flex items-end">
                                                        <StockMaterialSelect 
                                                            value={currentJumbo.materialId} 
                                                            inventory={inventory}
                                                            onChange={(id, code, name) => setCurrentJumbo({...currentJumbo, materialId: id, materialCode: code, materialName: name})}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-800 space-y-3">
                                                    <h4 className="text-sm font-bold text-orange-800 dark:text-orange-300 uppercase">Agregar Cortes</h4>
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1">
                                                            <label className="block text-xs text-gray-500 mb-1">Ancho (mm)</label>
                                                            <input 
                                                                type="number" 
                                                                value={inputCutWidth}
                                                                onChange={e => setInputCutWidth(e.target.value)}
                                                                className="w-full p-2 border rounded text-center font-bold dark:bg-gray-700 dark:text-white" 
                                                                placeholder="220"
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <label className="block text-xs text-gray-500 mb-1">Bajadas (Cant.)</label>
                                                            <input 
                                                                type="number" 
                                                                value={inputCutQty}
                                                                onChange={e => setInputCutQty(e.target.value)}
                                                                className="w-full p-2 border rounded text-center font-bold dark:bg-gray-700 dark:text-white" 
                                                                placeholder="10"
                                                            />
                                                        </div>
                                                        <button 
                                                            onClick={addCut}
                                                            className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded shadow flex items-center justify-center w-10 h-10"
                                                        >
                                                            <PlusIcon className="h-6 w-6" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <button 
                                                        onClick={addJumboToOC}
                                                        className={`flex-1 py-3 rounded-lg font-bold shadow-lg text-sm flex items-center justify-center gap-2 text-white ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-black'}`}
                                                    >
                                                        <SaveIcon className="h-4 w-4" /> 
                                                        {editingId ? 'Actualizar Ítem' : 'Agregar a la OC'}
                                                    </button>
                                                    
                                                    {editingId && (
                                                        <button 
                                                            onClick={cancelEditing}
                                                            className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold text-xs"
                                                        >
                                                            Cancelar Edición
                                                        </button>
                                                    )}
                                                    
                                                    {!editingId && (
                                                        <button 
                                                            onClick={() => { setCurrentCuts([]); setInputCutWidth(''); setInputCutQty(''); }}
                                                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg font-bold text-xs"
                                                        >
                                                            Limpiar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* DERECHA: Visualizador */}
                                            <div className="w-full lg:w-2/3 flex flex-col justify-center bg-gray-100 dark:bg-gray-900 rounded-xl p-4 border border-gray-300 dark:border-gray-800 shadow-inner">
                                                <JumboVisualizer 
                                                    jumboWidth={currentJumbo.width} 
                                                    cuts={currentCuts} 
                                                    onDeleteCut={deleteCut} 
                                                />
                                                <div className="mt-6 px-4">
                                                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Esquema Actual:</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {currentCuts.length === 0 ? (
                                                            <span className="text-sm text-gray-400 italic">Sin cortes definidos. Agregue cortes a la izquierda.</span>
                                                        ) : (
                                                            currentCuts.map(c => (
                                                                <span key={c.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1 rounded text-xs text-gray-700 dark:text-gray-300 font-mono shadow-sm flex items-center gap-2">
                                                                    <span className="font-bold">{c.width}mm</span>
                                                                    <span className="text-gray-400">({c.quantity}bj)</span>
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. LISTADO "CARRITO" DE JUMBOS */}
                                    <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 overflow-y-auto">
                                        
                                        {/* --- NUEVO: CAMPO DE PROVEEDOR (Solicitado) --- */}
                                        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                                            <label className="block text-sm font-bold text-blue-800 dark:text-blue-300 mb-1 flex items-center gap-2">
                                                <UserIcon className="h-4 w-4" /> Proveedor / Destinatario
                                            </label>
                                            <input 
                                                list="suppliers-list"
                                                type="text" 
                                                value={supplierName}
                                                onChange={(e) => setSupplierName(e.target.value)}
                                                placeholder="Ej: Sres. Colacril (Se guardará automáticamente)"
                                                className="w-full p-2 border border-blue-200 dark:border-blue-700 rounded-md dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                                            />
                                            <datalist id="suppliers-list">
                                                {supplierList.map((s, i) => <option key={i} value={s} />)}
                                            </datalist>
                                        </div>

                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                                <ShoppingCartIcon className="h-5 w-5 text-gray-500" />
                                                Detalle de Orden de Compra
                                            </h3>
                                            {pendingJumbos.length > 0 && (
                                                <button onClick={generateOrderPDF} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 animate-bounce">
                                                    <CheckIcon className="h-5 w-5" /> Generar Orden PDF ({pendingJumbos.length})
                                                </button>
                                            )}
                                        </div>

                                        {pendingJumbos.length === 0 ? (
                                            <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                                                <p className="text-gray-400 font-medium">La orden está vacía.</p>
                                                <p className="text-xs text-gray-400 mt-1">Configure un Jumbo arriba y haga clic en "Agregar a la OC".</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {pendingJumbos.map((jumbo, idx) => (
                                                    <div key={jumbo.id} className={`flex flex-col md:flex-row gap-4 p-4 border rounded-lg transition-all ${editingId === jumbo.id ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:shadow-md'}`}>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded">#{idx + 1}</span>
                                                                <span className="font-mono bg-orange-100 text-orange-800 px-2 rounded text-xs font-bold">{jumbo.materialCode}</span>
                                                                <h4 className="font-bold text-gray-900 dark:text-white">{jumbo.materialName}</h4>
                                                            </div>
                                                            <p className="text-xs text-gray-500">Jumbo: {jumbo.jumboWidth}mm | Total Bajadas: {jumbo.totalQuantity}</p>
                                                        </div>
                                                        <div className="flex-1 flex flex-wrap gap-1 items-center">
                                                            {/* Renderizado CONSOLIDADO en la lista */}
                                                            {getConsolidatedCuts(jumbo.cuts).map((c, i) => (
                                                                <span key={i} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 px-2 py-1 rounded text-xs font-mono dark:text-gray-300">
                                                                    {c.width}mm <span className="text-orange-600 font-bold">x{c.quantity}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => editPendingJumbo(jumbo.id)} 
                                                                className={`p-2 rounded transition-colors ${editingId === jumbo.id ? 'bg-blue-600 text-white shadow' : 'text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                                                                title="Editar este ítem"
                                                            >
                                                                <EditIcon className="h-5 w-5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => removePendingJumbo(jumbo.id)} 
                                                                className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                                                title="Eliminar"
                                                            >
                                                                <TrashIcon className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* --- TAB: HISTORIAL --- */}
                            {reportType === 'history' && (
                                <div className="space-y-4">
                                    {ocHistory.length === 0 ? (
                                        <div className="text-center py-20 text-gray-400">No hay historial de órdenes generado.</div>
                                    ) : (
                                        ocHistory.map(order => (
                                            <div key={order.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-blue-600 dark:text-blue-400 text-lg">{order.id}</h4>
                                                    <p className="text-xs text-gray-500">{new Date(order.date).toLocaleString()} - {order.items.length} Jumbos</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => loadOrderFromHistory(order)} 
                                                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded font-bold flex items-center gap-1"
                                                        title="Ver detalles / Cargar para editar"
                                                    >
                                                        <EyeIcon className="h-5 w-5" />
                                                        <span className="hidden sm:inline text-sm">Ver / Editar</span>
                                                    </button>
                                                    <button onClick={() => deleteHistoryOrder(order.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><TrashIcon className="h-5 w-5" /></button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockDashboard;
