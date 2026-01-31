
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Quote, QuoteItem, FieldKey, DieCut, UserRole, Attachment } from '../types';
import useSystemData from '../hooks/useSystemData';
import { 
    ESTADO_CLIENTE_OPTIONS,
    MONEDA_OPTIONS,
    SI_NO_OPTIONS,
    TROQUEL_ESTADO_OPTIONS,
    SENTIDO_REBOBINADO_OPTIONS,
    APLICACION_OPTIONS,
    DISENO_OPTIONS,
    MOCK_PACKS_DB,
    USA_RIBBON_OPTIONS
} from '../constants';
import { PlusIcon, TrashIcon, CalculatorIcon, XIcon, ArrowSolidDownIcon, ArrowSolidUpIcon, ArrowSolidRightIcon, ArrowSolidLeftIcon, ArrowHollowDownIcon, ArrowHollowUpIcon, ArrowHollowRightIcon, ArrowHollowLeftIcon, StarIcon, PaperclipIcon } from './IconComponents';
import type { QuoteOutletContext } from './Dashboard';

// --- COMPONENTS ---

const parseMaterialString = (str: string) => {
    if (!str) return { name: '', code: '' };
    const match = str.match(/(.*)\((.*)\)$/);
    if (match) {
        return { name: match[1].trim(), code: match[2].trim() };
    }
    return { name: str, code: '?' };
};

const MaterialAutocomplete: React.FC<{ value: string; onChange: (val: string) => void; options: string[]; required?: boolean; disabled?: boolean; }> = ({ value, onChange, options, required, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => {
        if (!search) return true;
        return opt.toLowerCase().includes(search.toLowerCase());
    });

    const handleSelect = (opt: string) => {
        onChange(opt);
        setIsOpen(false);
        setSearch('');
    };

    const selectedData = parseMaterialString(value);

    return (
        <div className="flex flex-col relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Material {required && <span className="text-red-500">*</span>}
            </label>
            <div 
                className={`w-full border rounded-md bg-white dark:bg-gray-700 flex items-center flex-wrap gap-2 p-2 min-h-[46px] focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 ${disabled ? 'bg-gray-100 dark:bg-gray-800 opacity-70 cursor-not-allowed' : 'cursor-text border-gray-300 dark:border-gray-600'}`}
                onClick={() => !disabled && setIsOpen(true)}
            >
                {value && !isOpen && (
                    <div className="flex items-center gap-2 flex-grow">
                        {selectedData.code !== '?' && (
                            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-1 rounded border border-orange-200 uppercase tracking-wider">
                                {selectedData.code}
                            </span>
                        )}
                        <span className="text-gray-900 dark:text-white text-sm font-medium truncate">
                            {selectedData.name}
                        </span>
                        <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onChange(''); }}
                            className="ml-auto text-gray-400 hover:text-red-500 p-1"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
                {(!value || isOpen) && (
                    <input 
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
                        onFocus={() => setIsOpen(true)}
                        disabled={disabled}
                        placeholder={value ? "Cambiar..." : "Buscar ej: 'bopp', '01'..."}
                        className="flex-grow bg-transparent border-none focus:ring-0 p-0 text-base text-gray-900 dark:text-white placeholder-gray-400 min-w-[100px]"
                    />
                )}
            </div>
            {isOpen && !disabled && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.map((opt, idx) => {
                        const { name, code } = parseMaterialString(opt);
                        return (
                            <div 
                                key={idx}
                                onClick={() => handleSelect(opt)}
                                className="px-4 py-2 hover:bg-orange-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                            >
                                {code !== '?' && <span className="flex-shrink-0 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold px-2 py-1 rounded min-w-[3rem] text-center">{code}</span>}
                                <span className="text-sm text-gray-700 dark:text-gray-200">{name}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const ItemInput: React.FC<{ label: string; value: any; onChange?: (val: any) => void; type: 'text' | 'number' | 'select' | 'multiselect' | 'date' | 'textarea'; options?: string[]; rawOptions?: any[]; required?: boolean; disabled?: boolean; placeholder?: string; min?: number; step?: string; rows?: number }> = ({ label, value, onChange, type, options, rawOptions, required, disabled, placeholder, min, step, rows }) => {
    return (
        <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {type === 'select' ? (
                <select value={value} onChange={e => onChange && onChange(e.target.value)} disabled={disabled} required={required} className="w-full p-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 dark:disabled:bg-gray-800">
                    <option value="" disabled>Seleccionar...</option>
                    {(options || []).map((opt, idx) => (<option key={idx} value={rawOptions ? rawOptions[idx] : opt}>{opt}</option>))}
                </select>
            ) : type === 'multiselect' ? (
                 <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700 max-h-32 overflow-y-auto">
                    {(options || []).map(opt => (
                        <label key={opt} className="flex items-center space-x-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                            <input type="checkbox" checked={(value as string[]).includes(opt)} onChange={(e) => { if (!onChange) return; const newValue = e.target.checked ? [...(value as string[]), opt] : (value as string[]).filter(v => v !== opt); onChange(newValue); }} className="rounded text-orange-600 focus:ring-orange-500 border-gray-300 dark:border-gray-500" />
                            <span className="text-sm text-gray-900 dark:text-gray-200">{opt}</span>
                        </label>
                    ))}
                 </div>
            ) : type === 'textarea' ? (
                <textarea 
                    value={value} 
                    onChange={e => onChange && onChange(e.target.value)} 
                    disabled={disabled} 
                    required={required} 
                    placeholder={placeholder} 
                    rows={rows || 3}
                    className="w-full p-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 placeholder-gray-400" 
                />
            ) : (
                <input type={type} value={value} onChange={e => onChange && onChange(e.target.value)} disabled={disabled} required={required} placeholder={placeholder} min={min} step={step} className="w-full p-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 placeholder-gray-400" />
            )}
        </div>
    );
};

const RebobinadoSelector: React.FC<{ selected: number, onSelect: (n: number) => void }> = ({ selected, onSelect }) => {
    const [showHelp, setShowHelp] = useState(false);
    const iconMap: { [key: number]: React.FC<{ className?: string }> } = {
        1: ArrowSolidDownIcon, 2: ArrowSolidUpIcon, 3: ArrowSolidRightIcon, 4: ArrowSolidLeftIcon,
        5: ArrowHollowDownIcon, 6: ArrowHollowUpIcon, 7: ArrowHollowRightIcon, 8: ArrowHollowLeftIcon
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sentido de Rebobinado</label>
                <button 
                    type="button" 
                    onClick={() => setShowHelp(true)}
                    className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-200 hover:bg-blue-200"
                    title="Ver guía de bobinado"
                >
                    i
                </button>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {SENTIDO_REBOBINADO_OPTIONS.map(opt => {
                    const Icon = iconMap[opt.id] || ArrowSolidDownIcon;
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => onSelect(opt.id)}
                            className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all ${selected === opt.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400'}`}
                        >
                            <Icon className="h-6 w-6 mb-1" />
                            <span className="text-xs font-bold">{opt.label}</span>
                        </button>
                    )
                })}
            </div>

            {showHelp && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={() => setShowHelp(false)}>
                    <div className="relative max-w-3xl w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex flex-col items-center p-4">
                        <button onClick={() => setShowHelp(false)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 bg-white rounded-full p-1 z-10">
                            <XIcon className="h-6 w-6" />
                        </button>
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Guía de Sentidos de Rebobinado</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                             <p>1-4: Bobinado Exterior (Etiqueta hacia afuera)</p>
                             <p>5-8: Bobinado Interior (Etiqueta hacia adentro)</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
};

const DieSearchModal: React.FC<{ isOpen: boolean; onClose: () => void; onSelect: (die: DieCut) => void; dieCuts: DieCut[]; initialW: string; initialH: string; }> = ({ isOpen, onClose, onSelect, dieCuts, initialW, initialH }) => {
    if (!isOpen) return null;
    const [width, setWidth] = useState(initialW);
    const [height, setHeight] = useState(initialH);
    const [shape, setShape] = useState('');

    const filtered = dieCuts.filter(d => {
        const matchW = width ? Math.abs(d.ancho - Number(width)) <= 6 : true; 
        const matchH = height ? Math.abs(d.largo - Number(height)) <= 6 : true;
        const matchS = shape ? d.forma.toLowerCase().includes(shape.toLowerCase()) : true;
        return matchW && matchH && matchS;
    });

    const shapes = Array.from(new Set(dieCuts.map(d => d.forma)));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Biblioteca de Troqueles</h3>
                    <button onClick={onClose} type="button" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><XIcon className="h-6 w-6" /></button>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Ancho (mm)</label>
                        <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white" placeholder="Ej: 100" />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Largo (mm)</label>
                        <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white" placeholder="Ej: 50" />
                    </div>
                    <div>
                         <label className="text-xs font-bold text-gray-500 uppercase">Forma</label>
                        <select value={shape} onChange={e => setShape(e.target.value)} className="w-full p-2 border rounded text-sm dark:bg-gray-700 dark:text-white">
                            <option value="">Todas</option>
                            {shapes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
                    <table className="w-full text-sm text-left dark:text-gray-200">
                        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky top-0 shadow-sm">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">Medidas</th>
                                <th className="p-3">Forma</th>
                                <th className="p-3">Carreras</th>
                                <th className="p-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map(d => (
                                <tr key={d.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                                    <td className="p-3 font-bold text-gray-900 dark:text-white">{d.id}</td>
                                    <td className="p-3 font-mono">{d.ancho} x {d.largo}</td>
                                    <td className="p-3">{d.forma}</td>
                                    <td className="p-3">{d.carreras}</td>
                                    <td className="p-3 text-right">
                                        <button type="button" onClick={() => onSelect(d)} className="bg-orange-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-orange-700 shadow-sm">
                                            Seleccionar
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">No se encontraron troqueles con esas medidas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
        </div>
    );
};

const RollCalculatorModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onApply: (qty: number) => void; 
    labelLength: number; 
    coreStr: string; 
    materialName: string; 
    initialQty: number; 
}> = ({ isOpen, onClose, onApply, labelLength, coreStr, materialName, initialQty }) => {
    if (!isOpen) return null;

    const getCoreMm = (str: string) => {
        if (str.includes('40')) return 40;
        if (str.includes('25') || str.includes('1"')) return 25;
        if (str.includes('76') || str.includes('3"')) return 76;
        return 76; 
    };

    const [mode, setMode] = useState<'qtyToDia' | 'diaToQty'>('qtyToDia');
    const [coreSize, setCoreSize] = useState(getCoreMm(coreStr));
    const [gap, setGap] = useState(3); 
    const [thicknessMicrons, setThicknessMicrons] = useState(150); 
    
    const [targetQty, setTargetQty] = useState(initialQty || 1000);
    const [targetDia, setTargetDia] = useState(200); 

    const [resultDiameter, setResultDiameter] = useState(0);
    const [resultQty, setResultQty] = useState(0);
    const [linearMeters, setLinearMeters] = useState(0);

    const applyPreset = (type: 'desktop' | 'industrial' | 'honeywell') => {
        setMode('diaToQty');
        if (type === 'desktop') {
            setTargetDia(127); 
            setCoreSize(25);   
        } else if (type === 'industrial') {
            setTargetDia(203); 
            setCoreSize(76);   
        } else if (type === 'honeywell') {
            setTargetDia(203);
            setCoreSize(40);   
        }
    };

    useEffect(() => {
        const thicknessMm = thicknessMicrons / 1000;
        const lengthPerLabelMm = (labelLength || 0) + gap;

        if (mode === 'qtyToDia') {
            const totalLengthMm = targetQty * lengthPerLabelMm;
            setLinearMeters(totalLengthMm / 1000);
            
            const areaMm2 = totalLengthMm * thicknessMm;
            const coreRadius = coreSize / 2;
            const coreArea = Math.PI * (coreRadius * coreRadius);
            
            const totalArea = areaMm2 + coreArea;
            const outerRadius = Math.sqrt(totalArea / Math.PI);
            setResultDiameter(Math.round(outerRadius * 2));

        } else {
            const outerRadius = targetDia / 2;
            const coreRadius = coreSize / 2;
            
            if (outerRadius <= coreRadius) {
                setResultQty(0);
                setLinearMeters(0);
                return;
            }

            const totalArea = Math.PI * (outerRadius * outerRadius);
            const coreArea = Math.PI * (coreRadius * coreRadius);
            const labelArea = totalArea - coreArea;
            
            const totalLengthMm = labelArea / thicknessMm;
            setLinearMeters(totalLengthMm / 1000);
            
            const qty = Math.floor(totalLengthMm / lengthPerLabelMm);
            setResultQty(qty);
        }
    }, [mode, targetQty, targetDia, gap, thicknessMicrons, coreSize, labelLength]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-lg w-full flex flex-col gap-5 border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                            <CalculatorIcon className="h-6 w-6 text-orange-600" /> 
                            Calculadora Avanzada
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cálculo de bobinas, diámetros y metros lineales.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XIcon className="h-6 w-6" /></button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => applyPreset('desktop')} className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 p-2 rounded text-center border border-gray-200 dark:border-gray-600">
                        <span className="block font-bold dark:text-white">Desktop (Zebra)</span>
                        <span className="text-gray-500 dark:text-gray-400">Ø127mm / Core 1"</span>
                    </button>
                    <button onClick={() => applyPreset('industrial')} className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 p-2 rounded text-center border border-gray-200 dark:border-gray-600">
                        <span className="block font-bold dark:text-white">Industrial (Zebra)</span>
                        <span className="text-gray-500 dark:text-gray-400">Ø203mm / Core 3"</span>
                    </button>
                    <button onClick={() => applyPreset('honeywell')} className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 p-2 rounded text-center border border-gray-200 dark:border-gray-600">
                        <span className="block font-bold dark:text-white">Honeywell</span>
                        <span className="text-gray-500 dark:text-gray-400">Ø203mm / Core 40mm</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-sm">
                    <div>
                        <label className="block font-bold text-gray-500">Buje (Core mm)</label>
                        <input type="number" value={coreSize} onChange={e => setCoreSize(Number(e.target.value))} className="w-full p-1 border rounded dark:bg-gray-700 dark:text-white font-mono font-bold" />
                    </div>
                    <div>
                         <label className="block font-bold text-gray-500">Largo Etiqueta</label>
                         <div className="text-gray-900 dark:text-white font-mono font-bold text-lg">{labelLength} mm</div>
                    </div>
                    <div>
                        <label className="block font-bold text-gray-500">Gap (Calle)</label>
                        <input type="number" value={gap} onChange={e => setGap(Number(e.target.value))} className="w-full p-1 border rounded dark:bg-gray-700 dark:text-white" />
                    </div>
                    <div>
                        <label className="block font-bold text-gray-500">Espesor (µm)</label>
                        <input type="number" value={thicknessMicrons} onChange={e => setThicknessMicrons(Number(e.target.value))} className="w-full p-1 border rounded dark:bg-gray-700 dark:text-white" />
                    </div>
                </div>

                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button 
                        type="button"
                        className={`flex-1 py-2 font-bold text-sm ${mode === 'qtyToDia' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setMode('qtyToDia')}
                    >
                        Tengo Cantidad {'->'} Busco Diámetro
                    </button>
                    <button 
                        type="button"
                        className={`flex-1 py-2 font-bold text-sm ${mode === 'diaToQty' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setMode('diaToQty')}
                    >
                        Tengo Diámetro {'->'} Busco Cantidad
                    </button>
                </div>

                <div className="py-2">
                    {mode === 'qtyToDia' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Cantidad de Etiquetas Deseada</label>
                                <input type="number" value={targetQty} onChange={e => setTargetQty(Number(e.target.value))} className="w-full p-3 text-xl font-bold border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800 text-center">
                                <span className="block text-sm text-orange-600 dark:text-orange-400 font-bold uppercase">Diámetro Final Estimado</span>
                                <span className="block text-4xl font-extrabold text-gray-900 dark:text-white mt-1">{resultDiameter} mm</span>
                                <span className="block text-xs text-gray-500 mt-2">({linearMeters.toFixed(1)} metros lineales)</span>
                            </div>
                            <button type="button" onClick={() => onApply(targetQty)} className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold">
                                Confirmar {targetQty} u/rollo
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Diámetro Máximo Exterior (mm)</label>
                                <input type="number" value={targetDia} onChange={e => setTargetDia(Number(e.target.value))} className="w-full p-3 text-xl font-bold border rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white" />
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 text-center">
                                <span className="block text-sm text-blue-600 dark:text-blue-400 font-bold uppercase">Cantidad Posible por Rollo</span>
                                <span className="block text-4xl font-extrabold text-gray-900 dark:text-white mt-1">{resultQty.toLocaleString()} u.</span>
                                <span className="block text-xs text-gray-500 mt-2">({linearMeters.toFixed(1)} metros lineales)</span>
                            </div>
                            <button type="button" onClick={() => onApply(resultQty)} className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold">
                                Aplicar {resultQty} u/rollo
                            </button>
                        </div>
                    )}
                </div>
             </div>
        </div>
    );
};

const StarRatingInput: React.FC<{ rating: number, setRating: (r: number) => void }> = ({ rating, setRating }) => (
    <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Potencial Cliente</label>
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                    <StarIcon className={`h-8 w-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                </button>
            ))}
        </div>
    </div>
);

const QuoteForm: React.FC = () => {
  const navigate = useNavigate();
  const { quoteId } = useParams<{quoteId: string}>();
  const { user: currentUser, addQuote, updateQuote, quotes } = useOutletContext<QuoteOutletContext>();
  
  const { materials, ribbons, printTypes, jobTypes, dieTypes, productTypes, coreTypes, dieCuts, fieldConfig, paymentTerms, specialFinishes, varnishFinishes } = useSystemData();

  const [cliente, setCliente] = useState('');
  const [estadoCliente, setEstadoCliente] = useState(ESTADO_CLIENTE_OPTIONS[0]);
  const [potencialCliente, setPotencialCliente] = useState(3);
  const [moneda, setMoneda] = useState<Quote['moneda']>(MONEDA_OPTIONS[0]);
  const [condicionPago, setCondicionPago] = useState(paymentTerms[0] || 'Contado');
  const [clienteAdmiteStock, setClienteAdmiteStock] = useState<Quote['clienteAdmiteStock']>('No');
  const [entregasParciales, setEntregasParciales] = useState<Quote['entregasParciales']>('No');
  const [otrasInformaciones, setOtrasInformaciones] = useState('');
  
  // Notas del final del formulario (Agregadas)
  const [notasCotizador, setNotasCotizador] = useState('');
  const [notasParaPreprensa, setNotasParaPreprensa] = useState('');
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [searchDieModal, setSearchDieModal] = useState<{ isOpen: boolean, itemId: string, initialW: string, initialH: string } | null>(null);
  const [calcModal, setCalcModal] = useState<{ isOpen: boolean, itemId: string, labelLength: number, coreStr: string, materialName: string, initialQty: number } | null>(null);
  const [originalQuote, setOriginalQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (quoteId) {
        const quoteToEdit = quotes.find(q => q.id === quoteId);
        if (quoteToEdit) {
            setOriginalQuote(quoteToEdit);
            setCliente(quoteToEdit.cliente);
            setEstadoCliente(quoteToEdit.estadoCliente);
            setPotencialCliente(quoteToEdit.potencialCliente);
            setMoneda(quoteToEdit.moneda);
            setCondicionPago(quoteToEdit.condicionPago);
            setClienteAdmiteStock(quoteToEdit.clienteAdmiteStock || 'No');
            setEntregasParciales(quoteToEdit.entregasParciales || 'No');
            
            // Cargar notas desde la cotización
            setOtrasInformaciones(quoteToEdit.otrasInformaciones || '');
            setNotasCotizador(quoteToEdit.notasCotizador || '');
            setNotasParaPreprensa(quoteToEdit.notasParaPreprensa || '');
            
            setItems(quoteToEdit.items);
        } else {
            setError("No se encontró la cotización para editar.");
        }
    } else {
        handleAddItem(); 
    }
  }, [quoteId, quotes]);

  const handleAddItem = () => {
    const newItem: QuoteItem = {
      id: `temp-${Date.now()}`,
      tipoTrabajo: jobTypes[0] || '',
      cantidadModelos: 1,
      material: materials[0] || '',
      ancho: '',
      largo: '',
      tipoImpresion: [],
      impresoDorso: false, 
      tintas: 0, 
      tipoTroquel: dieTypes[0] || '',
      troquelEstado: TROQUEL_ESTADO_OPTIONS[0],
      cantidadEtiquetasPorRollo: 1000,
      tipoProducto: productTypes[0] || '',
      buje: coreTypes[0] || '',
      sentidoRebobinado: 1, 
      terminacionesEspeciales: [],
      aplicacion: APLICACION_OPTIONS[0],
      usaRibbon: 'No', 
      diseno: DISENO_OPTIONS[0],
      tieneMuestra: 'No',
      quantities: [{ id: `qty-${Date.now()}`, cantidad: 1000 }],
      adjuntos: [],
      historial: { monedaUltimaCompra: 'USD' }
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleItemChange = (id: string, field: keyof QuoteItem, value: any) => {
    setItems(items.map(item => {
        if (item.id === id) {
            if (field === 'tipoTrabajo') {
                 if (value === 'Venta de Insumos (Ribbon)') return { ...item, [field]: value, usaRibbon: 'Si', referencia: 'Venta de Ribbon' };
                 else if (value === 'Venta de Impresora/Hardware') return { ...item, [field]: value, referencia: 'Impresora/Hardware', quantities: [{ id: `qty-${Date.now()}`, cantidad: 1 }] };
            }
            if (field === 'packCodigo') {
                const packData = MOCK_PACKS_DB[value];
                if (packData) {
                    return { ...item, [field]: value, ...packData, troquelEstado: 'Existente' };
                }
            }
            return { ...item, [field]: value };
        }
        return item;
    }));
  };
  
  const handleOpenDieSearch = (itemId: string, currentW: number | '', currentH: number | '') => {
      setSearchDieModal({ isOpen: true, itemId, initialW: currentW ? String(currentW) : '', initialH: currentH ? String(currentH) : '' });
  };
  const handleSelectDie = (die: DieCut) => {
      if (!searchDieModal) return;
      let forma = die.forma ? die.forma.charAt(0).toUpperCase() + die.forma.slice(1).toLowerCase() : '';
      if (forma === 'Figura') forma = 'Figuras';
      setItems(prevItems => prevItems.map(item => item.id === searchDieModal.itemId ? { ...item, ancho: die.ancho, largo: die.largo, troquelId: die.id, troquelCarreras: die.carreras, troquelEstado: 'Existente', tipoTroquel: forma || die.forma } : item));
      setSearchDieModal(null);
  };
  
  const handleOpenCalculator = (item: QuoteItem) => {
      setCalcModal({ isOpen: true, itemId: item.id, labelLength: Number(item.largo) || 0, coreStr: item.buje || '', materialName: item.material || '', initialQty: Number(item.cantidadEtiquetasPorRollo) || 0 });
  };
  const handleApplyCalculated = (qty: number) => {
      if (!calcModal) return;
      handleItemChange(calcModal.itemId, 'cantidadEtiquetasPorRollo', qty);
      setCalcModal(null);
  }
  
  const handleQuantityChange = (itemId: string, qId: string, value: number | '') => {
      setItems(items.map(i => i.id === itemId ? { ...i, quantities: i.quantities.map(q => q.id === qId ? {...q, cantidad: value} : q) } : i));
  };
  const handleAddQuantity = (itemId: string) => {
      setItems(items.map(item => item.id === itemId ? { ...item, quantities: [...item.quantities, { id: `qty-${Date.now()}`, cantidad: (Number(item.quantities[item.quantities.length-1].cantidad)||0) + 1000 }] } : item));
  };
  const handleRemoveQuantity = (itemId: string, qId: string) => {
      setItems(items.map(i => i.id === itemId ? { ...i, quantities: i.quantities.filter(q => q.id !== qId) } : i));
  };

  const handleFileChange = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const newAttachment: Attachment = {
              id: `att-${Date.now()}`,
              fileName: file.name,
              fileUrl: URL.createObjectURL(file), 
              descripcion: 'Archivo adjunto',
              file: file
          };
          
          setItems(prev => prev.map(item => {
              if (item.id === itemId) {
                  return { ...item, adjuntos: [...item.adjuntos, newAttachment] };
              }
              return item;
          }));
      }
  };

  const removeAttachment = (itemId: string, attachmentId: string) => {
      setItems(prev => prev.map(item => {
          if (item.id === itemId) {
              return { ...item, adjuntos: item.adjuntos.filter(a => a.id !== attachmentId) };
          }
          return item;
      }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    
    setError(null);
    if (!cliente && fieldConfig.cliente) return setError("Por favor ingrese el nombre del Cliente.");
    if (items.length === 0) return setError("Debe añadir al menos un ítem.");

    const payload = {
      cliente, estadoCliente, potencialCliente, moneda, condicionPago, clienteAdmiteStock, entregasParciales,
      otrasInformaciones, // Ahora se envía lo que se escriba abajo
      notasCotizador,
      notasParaPreprensa,
      items, 
      vendedorId: currentUser.id, 
    };

    try {
        if (originalQuote) await updateQuote({ ...originalQuote, ...payload });
        else await addQuote(payload);
        navigate('/');
    } catch (err) {
        console.error("Error submitting quote:", err);
        setError("Ocurrió un error al guardar. Intente nuevamente.");
    }
  };

  if (currentUser.role !== UserRole.AsistenteComercial && !originalQuote) {
    return <div className="p-6 text-center text-gray-900 dark:text-white">No tiene permisos para crear cotizaciones.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="p-2 sm:p-6 bg-white dark:bg-gray-800 space-y-6 sm:space-y-8 text-gray-900 dark:text-gray-100 max-w-full overflow-x-hidden">
      <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white px-2">
          {originalQuote ? `Editando Cotización ${originalQuote.id}` : 'Nueva Cotización'}
      </h2>
      {error && <div className="mx-2 p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md text-base">{error}</div>}
      
      <fieldset className="mx-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-5 bg-gray-50 dark:bg-gray-800">
        <legend className="px-2 font-semibold text-lg sm:text-xl text-gray-800 dark:text-gray-100">Sobre el Cliente</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ItemInput label="Asistente Comercial" value={currentUser.nombre} type="text" disabled />
            <ItemInput label="Cliente" value={cliente} onChange={setCliente} type="text" required={fieldConfig.cliente} placeholder="Nombre de la empresa" />
            <ItemInput label="Estado" value={estadoCliente} onChange={setEstadoCliente} type="select" options={ESTADO_CLIENTE_OPTIONS} />
            <ItemInput label="Moneda" value={moneda} onChange={setMoneda} type="select" options={MONEDA_OPTIONS.map(m => m === 'USD' ? 'U$S' : '$')} rawOptions={MONEDA_OPTIONS} />
            <ItemInput label="Condición de Pago" value={condicionPago} onChange={setCondicionPago} type="select" options={paymentTerms} required />
            <ItemInput label="¿Admite Stock?" value={clienteAdmiteStock} onChange={setClienteAdmiteStock} type="select" options={SI_NO_OPTIONS} />
            <ItemInput label="Entregas Parciales" value={entregasParciales} onChange={setEntregasParciales} type="select" options={SI_NO_OPTIONS} />
            
            <div className="sm:col-span-2 lg:col-span-3 pt-4 border-t border-gray-300 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                    <StarRatingInput rating={potencialCliente} setRating={setPotencialCliente} />
                </div>
            </div>
        </div>
      </fieldset>

      <div>
        <h3 className="px-2 text-xl font-semibold border-b border-gray-300 dark:border-gray-700 pb-3 mb-5 text-gray-800 dark:text-gray-100">Ítems</h3>
        <div className="space-y-6">
        {items.map((item, index) => {
            const isRibbonSale = item.tipoTrabajo === 'Venta de Insumos (Ribbon)';
            const isPrinterSale = item.tipoTrabajo === 'Venta de Impresora/Hardware';
            const isPack = item.tipoTrabajo === 'Pack';
            const isServiceOrUnit = item.tipoProducto === 'Servicio' || item.tipoProducto === 'Unidad';

            const currencySymbol = moneda === 'USD' ? 'U$S' : '$';
            const unitLabel = item.tipoProducto === 'Unidad (Rollo)' ? '(Rollos)' : item.tipoProducto === 'Juegos' ? '(Juegos)' : isServiceOrUnit ? '(Unidades)' : '(Etiquetas)';

            // Detectar si la aplicación es impresora para mostrar opciones de Ribbon
            const showRibbonOptions = item.aplicacion && (
                item.aplicacion.toLowerCase().includes('impresora') || 
                item.aplicacion.toLowerCase().includes('térmica')
            );

            return (
              <div key={item.id} className="mx-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg relative bg-gray-50 dark:bg-gray-900/50 space-y-5 shadow-sm">
                <div className="flex justify-between items-center">
                    <p className="font-bold text-lg text-orange-600 dark:text-orange-400">Ítem #{index + 1}</p>
                    <button type="button" onClick={() => setItems(items.filter(i => i.id !== item.id))} className="p-2 text-gray-400 hover:text-red-500"><TrashIcon className="h-5 w-5" /></button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ItemInput label="Tipo de Trabajo" value={item.tipoTrabajo} onChange={v => handleItemChange(item.id, 'tipoTrabajo', v)} type="select" options={jobTypes} />
                    
                    {!isRibbonSale && !isPrinterSale && (
                        <>
                        <ItemInput label="Referencia / Nombre Etiqueta" value={item.referencia} onChange={v => handleItemChange(item.id, 'referencia', v)} type="text" required={fieldConfig.referencia} placeholder="Ej: Etiqueta Vino Malbec 2024" />
                        <ItemInput label="Tipo Producto (Unidad)" value={item.tipoProducto || ''} onChange={v => handleItemChange(item.id, 'tipoProducto', v)} type="select" options={productTypes} required={fieldConfig.tipoProducto} />
                        </>
                    )}
                </div>

                {!isRibbonSale && !isPrinterSale && !isPack && (
                    <>
                    <fieldset className="p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-4">
                        <legend className="px-2 font-semibold text-gray-800 dark:text-gray-200">Especificaciones</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <MaterialAutocomplete value={item.material || ''} onChange={v => handleItemChange(item.id, 'material', v)} options={materials} required={fieldConfig.material} disabled={isPack} />
                            
                            <div className="grid grid-cols-2 gap-2 sm:contents">
                                <ItemInput label="Ancho (mm)" value={item.ancho || ''} onChange={v => handleItemChange(item.id, 'ancho', v === '' ? '' : parseInt(v))} type="number" required={fieldConfig.ancho} disabled={isPack} />
                                <ItemInput label="Largo (mm)" value={item.largo || ''} onChange={v => handleItemChange(item.id, 'largo', v === '' ? '' : parseInt(v))} type="number" required={fieldConfig.largo} disabled={isPack} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:contents">
                                <ItemInput label="Tintas" value={item.tintas} onChange={v => handleItemChange(item.id, 'tintas', v === '' ? '' : parseInt(v))} type="number" min={0} required={fieldConfig.tintas} disabled={isPack} />
                                <ItemInput label="Cant. Diseños" value={item.cantidadModelos || ''} onChange={v => handleItemChange(item.id, 'cantidadModelos', v === '' ? '' : parseInt(v))} type="number" disabled={isPack} />
                            </div>
                            
                            <div className="col-span-full">
                                <ItemInput label="Tipo Impresión" value={item.tipoImpresion || []} onChange={v => handleItemChange(item.id, 'tipoImpresion', v)} type="multiselect" options={printTypes} disabled={isPack} />
                                <div className="mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                                        <input type="checkbox" checked={item.impresoDorso || false} onChange={e => handleItemChange(item.id, 'impresoDorso', e.target.checked)} className="h-5 w-5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded" />
                                        <span className="font-bold text-yellow-800 dark:text-yellow-200">Impresión al Dorso</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset className="p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-4">
                        <legend className="px-2 font-semibold text-gray-800 dark:text-gray-200">Troquel y Presentación</legend>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ItemInput label="Forma" value={item.tipoTroquel || ''} onChange={v => handleItemChange(item.id, 'tipoTroquel', v)} type="select" options={dieTypes} required={fieldConfig.tipoTroquel} disabled={isPack} />
                            
                            {!isServiceOrUnit && (
                                <div className="col-span-full bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md border border-blue-100 dark:border-blue-800">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <ItemInput label="Estado" value={item.troquelEstado || ''} onChange={v => handleItemChange(item.id, 'troquelEstado', v)} type="select" options={TROQUEL_ESTADO_OPTIONS} disabled={isPack} />
                                            {item.troquelId && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded ml-2 font-bold">ID: {item.troquelId}</span>}
                                        </div>
                                        <button type="button" disabled={isPack} onClick={() => handleOpenDieSearch(item.id, item.ancho, item.largo)} className="w-full bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600 py-3 px-4 rounded-md flex items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors font-bold shadow-sm disabled:opacity-50">
                                            {item.troquelId ? 'Cambiar Troquel (Seleccionado)' : 'Buscar Troquel en Biblioteca'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isServiceOrUnit && (
                                <div className="flex flex-col justify-end">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidades por Rollo {fieldConfig.cantidadEtiquetasPorRollo && <span className="text-red-500">*</span>}</label>
                                    <div className="flex gap-2">
                                        <input type="number" value={item.cantidadEtiquetasPorRollo || ''} onChange={e => handleItemChange(item.id, 'cantidadEtiquetasPorRollo', e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full p-2.5 text-base border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" required={fieldConfig.cantidadEtiquetasPorRollo} />
                                        <button type="button" onClick={() => handleOpenCalculator(item)} className="bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 rounded-md px-3 flex items-center justify-center transition-colors shadow-sm" title="Abrir Calculadora de Bobina">
                                            <CalculatorIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {!isServiceOrUnit && <ItemInput label="Buje (Core)" value={item.buje || ''} onChange={v => handleItemChange(item.id, 'buje', v)} type="select" options={coreTypes} required={fieldConfig.buje} disabled={isPack} />}
                            
                            {!isServiceOrUnit && <div className="col-span-full"><RebobinadoSelector selected={item.sentidoRebobinado || 1} onSelect={v => handleItemChange(item.id, 'sentidoRebobinado', v)} /></div>}
                        </div>
                    </fieldset>

                    {/* SECCIÓN TERMINACIONES RESTAURADA */}
                    {!isServiceOrUnit && !isPack && (
                        <fieldset className="p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-4">
                            <legend className="px-2 font-semibold text-gray-800 dark:text-gray-200">Terminaciones</legend>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Laminado Toggle/Select */}
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded border border-gray-200 dark:border-gray-600">
                                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                                        <input
                                            type="checkbox"
                                            checked={!!item.laminado}
                                            onChange={(e) => handleItemChange(item.id, 'laminado', e.target.checked ? 'Brillo' : null)}
                                            className="h-5 w-5 text-orange-600 rounded"
                                        />
                                        <span className="font-bold text-gray-700 dark:text-gray-200">Laminado</span>
                                    </label>
                                    {item.laminado && (
                                        <select
                                            value={item.laminado}
                                            onChange={(e) => handleItemChange(item.id, 'laminado', e.target.value)}
                                            className="w-full p-2 text-sm border rounded dark:bg-gray-600 dark:text-white"
                                        >
                                            <option value="Brillo">Brillo</option>
                                            <option value="Mate">Mate</option>
                                        </select>
                                    )}
                                </div>

                                {/* Barniz Toggle/Select */}
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded border border-gray-200 dark:border-gray-600">
                                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                                        <input
                                            type="checkbox"
                                            checked={!!item.barniz}
                                            onChange={(e) => handleItemChange(item.id, 'barniz', e.target.checked ? { tipo: 'Total', acabado: 'UV BRILLO' } : null)}
                                            className="h-5 w-5 text-orange-600 rounded"
                                        />
                                        <span className="font-bold text-gray-700 dark:text-gray-200">Barniz</span>
                                    </label>
                                    {item.barniz && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <select
                                                value={item.barniz.tipo}
                                                onChange={(e) => handleItemChange(item.id, 'barniz', { ...item.barniz, tipo: e.target.value })}
                                                className="w-full p-2 text-sm border rounded dark:bg-gray-600 dark:text-white"
                                            >
                                                <option value="Total">Total</option>
                                                <option value="Sectorizado">Sectorizado</option>
                                            </select>
                                            <select
                                                value={item.barniz.acabado}
                                                onChange={(e) => handleItemChange(item.id, 'barniz', { ...item.barniz, acabado: e.target.value })}
                                                className="w-full p-2 text-sm border rounded dark:bg-gray-600 dark:text-white"
                                            >
                                                {varnishFinishes.map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Especiales */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Especiales</label>
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded border border-gray-200 dark:border-gray-600">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {specialFinishes.map(finish => (
                                            <label key={finish} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded">
                                                <input
                                                    type="checkbox"
                                                    checked={(item.terminacionesEspeciales || []).includes(finish)}
                                                    onChange={(e) => {
                                                        const current = item.terminacionesEspeciales || [];
                                                        const newVal = e.target.checked
                                                            ? [...current, finish]
                                                            : current.filter(f => f !== finish);
                                                        handleItemChange(item.id, 'terminacionesEspeciales', newVal);
                                                    }}
                                                    className="h-4 w-4 text-orange-600 rounded"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{finish}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    )}
                    </>
                )}

                {/* SECCIÓN USO Y ADJUNTOS RESTAURADA Y MEJORADA */}
                <fieldset className="p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-4">
                    <legend className="px-2 font-semibold text-gray-800 dark:text-gray-200">Uso y Adjuntos</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <ItemInput label="Aplicación" value={item.aplicacion || ''} onChange={v => handleItemChange(item.id, 'aplicacion', v)} type="select" options={APLICACION_OPTIONS} required={fieldConfig.aplicacion} disabled={isPack} />
                         <ItemInput label="Diseño" value={item.diseno || ''} onChange={v => handleItemChange(item.id, 'diseno', v)} type="select" options={DISENO_OPTIONS} required={fieldConfig.diseno} disabled={isPack} />
                    </div>
                    
                    {/* LOGICA DE RIBBON DINÁMICA (Aparece si la aplicación es impresora) */}
                    {showRibbonOptions && (
                        <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 p-3 bg-orange-50 dark:bg-orange-900/10 rounded border border-orange-100 dark:border-orange-900/30 animate-fade-in-down">
                            <ItemInput 
                                label="¿Usa Ribbon?" 
                                value={item.usaRibbon || 'No'} 
                                onChange={v => handleItemChange(item.id, 'usaRibbon', v)} 
                                type="select" 
                                options={USA_RIBBON_OPTIONS} 
                            />
                            {item.usaRibbon === 'Si' && (
                                <ItemInput 
                                    label="Tipo de Ribbon" 
                                    value={item.ribbon || ''} 
                                    onChange={v => handleItemChange(item.id, 'ribbon', v)} 
                                    type="select" 
                                    options={ribbons} 
                                />
                            )}
                        </div>
                    )}

                    <div className="mt-2">
                         <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Archivos / Muestras</label>
                         <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 flex flex-col items-center justify-center text-center relative hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <input
                                type="file"
                                onChange={(e) => handleFileChange(item.id, e)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                accept="image/*,.pdf"
                            />
                            <PaperclipIcon className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Clic para adjuntar archivos o arrastre aquí</span>
                         </div>
                         {/* Lista de adjuntos */}
                         {item.adjuntos && item.adjuntos.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                {item.adjuntos.map(att => (
                                    <div key={att.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                                        <div className="flex items-center overflow-hidden">
                                            <PaperclipIcon className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                                            <span className="text-sm truncate dark:text-gray-300">{att.fileName}</span>
                                        </div>
                                        <button type="button" onClick={() => removeAttachment(item.id, att.id)} className="text-red-500 hover:text-red-700 p-1">
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                         )}
                    </div>
                </fieldset>

                <div className="pt-2">
                    <ItemInput 
                        label="Observaciones Específicas del Ítem" 
                        value={item.observaciones || ''} 
                        onChange={v => handleItemChange(item.id, 'observaciones', v)} 
                        type="textarea" 
                        rows={2}
                        placeholder="Detalles importantes sobre este producto..." 
                    />
                </div>

                <div className="pt-4 border-t border-gray-300 dark:border-gray-700">
                    <label className="block text-base font-medium text-gray-800 dark:text-gray-200 mb-2">Cantidades Solicitadas</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.quantities.map(q => (
                            <div key={q.id} className="flex flex-col gap-1">
                                <div className="flex gap-2">
                                    <div className="relative w-full">
                                        <input type="number" value={q.cantidad || ''} onChange={e => handleQuantityChange(item.id, q.id, e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Cant." />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                                            {unitLabel}
                                        </span>
                                    </div>
                                    {item.quantities.length > 1 && <button type="button" onClick={() => handleRemoveQuantity(item.id, q.id)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded"><TrashIcon className="h-5 w-5" /></button>}
                                </div>
                            </div>
                        ))}
                        {!isPrinterSale && (
                            <button type="button" onClick={() => handleAddQuantity(item.id)} className="flex items-center justify-center p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md text-gray-500 hover:border-orange-500 hover:text-orange-500 transition-colors"><PlusIcon className="h-5 w-5" /></button>
                        )}
                    </div>
                </div>
              </div>
            );
        })}
        </div>
        <button type="button" onClick={handleAddItem} className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-orange-500 hover:text-orange-500 font-medium transition-all flex flex-col items-center gap-2">
            <PlusIcon className="h-8 w-8" />
            <span>+ AÑADIR OTRO ÍTEM</span>
        </button>
      </div>
      
      {/* SECCIÓN NOTAS ADICIONALES (MOVIDA AL FINAL PARA COINCIDIR CON EL VIDEO) */}
      <fieldset className="mx-2 p-4 border border-gray-300 dark:border-gray-600 rounded-lg space-y-5 bg-gray-50 dark:bg-gray-800 mt-6">
        <legend className="px-2 font-semibold text-lg sm:text-xl text-gray-800 dark:text-gray-100">Notas Adicionales</legend>
        <div className="space-y-4">
            <ItemInput 
                label="Otras Informaciones (General)" 
                value={otrasInformaciones} 
                onChange={setOtrasInformaciones} 
                type="textarea" 
                rows={2}
                placeholder="Información crítica para producción o logística..." 
            />
            <ItemInput 
                label="Notas para el Cotizador (Precios/Técnica)" 
                value={notasCotizador} 
                onChange={setNotasCotizador} 
                type="textarea" 
                rows={2}
                placeholder="Mensaje específico para quien cotiza..." 
            />
            <ItemInput 
                label="Notas para Preprensa (Arte/Diseño)" 
                value={notasParaPreprensa} 
                onChange={setNotasParaPreprensa} 
                type="textarea" 
                rows={2}
                placeholder="Instrucciones que se verán al aprobar..." 
            />
        </div>
      </fieldset>

      <div className="sticky bottom-0 bg-white dark:bg-gray-800 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 shadow-lg z-20">
          <button type="button" onClick={() => navigate('/')} className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700">Cancelar / Volver</button>
          <button type="submit" className="px-8 py-3 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 shadow-md">Crear Cotización</button>
      </div>

      {searchDieModal && <DieSearchModal isOpen={searchDieModal.isOpen} onClose={() => setSearchDieModal(null)} onSelect={handleSelectDie} dieCuts={dieCuts} initialW={searchDieModal.initialW} initialH={searchDieModal.initialH} />}
      {calcModal && <RollCalculatorModal isOpen={calcModal.isOpen} onClose={() => setCalcModal(null)} onApply={handleApplyCalculated} labelLength={calcModal.labelLength} coreStr={calcModal.coreStr} materialName={calcModal.materialName} initialQty={calcModal.initialQty} />}
    </form>
  );
};

export default QuoteForm;
