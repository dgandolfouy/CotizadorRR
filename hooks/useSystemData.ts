
import { useState, useCallback, useMemo, useEffect } from 'react';
import { User, DieCut, InventoryItem, FieldKey, JumboPreset } from '../types';
import { safeStorage } from '../storage';
import { 
    USERS as INITIAL_USERS,
    INITIAL_INVENTORY,
    MATERIAL_OPTIONS, 
    RIBBON_OPTIONS, 
    IMPRESION_OPTIONS, 
    TIPO_TRABAJO_OPTIONS, 
    TIPO_TROQUEL_OPTIONS, 
    TIPO_PRODUCTO_OPTIONS,
    BUJE_OPTIONS,
    TERMINACIONES_ESPECIALES_OPCIONES,
    DATO_VARIABLE_TIPO_OPTIONS,
    BARNIZ_ACABADO_OPCIONES,
    DEFAULT_FIELD_CONFIG,
    CONDICION_PAGO_OPTIONS,
    GOOGLE_SHEET_TROQUELES_URL,
    GOOGLE_SHEET_BOBINAS_URL,
    GOOGLE_SHEET_RIBBONS_URL,
    GOOGLE_SHEET_LAMINADOS_URL,
    GOOGLE_SHEET_HOT_FOIL_URL,
    GOOGLE_SHEET_COLD_FOIL_URL
} from '../constants';

// Cache Global para Configuración y Listas (Persistencia LocalStorage)
const STORAGE_KEYS = {
    CONFIG: 'rr_field_config',
    USERS: 'rr_users_data',
    INVENTORY: 'rr_inventory_data',
    DIES: 'rr_dies_data',
    LISTS: 'rr_custom_lists_data', // Para listas desplegables editables
    JUMBOS: 'rr_jumbo_presets' // Nuevo
};

// Carga segura de LS
const load = (key: string, defaultValue: any) => {
    try {
        const item = safeStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
};

const GLOBAL_DEFAULTS = {
    fieldConfig: { ...DEFAULT_FIELD_CONFIG },
    materials: [...MATERIAL_OPTIONS],
    ribbons: [...RIBBON_OPTIONS],
    printTypes: [...IMPRESION_OPTIONS],
    jobTypes: [...TIPO_TRABAJO_OPTIONS],
    dieTypes: [...TIPO_TROQUEL_OPTIONS],
    productTypes: [...TIPO_PRODUCTO_OPTIONS],
    coreTypes: [...BUJE_OPTIONS],
    specialFinishes: [...TERMINACIONES_ESPECIALES_OPCIONES],
    variableDataTypes: [...DATO_VARIABLE_TIPO_OPTIONS],
    varnishFinishes: [...BARNIZ_ACABADO_OPCIONES],
    paymentTerms: [...CONDICION_PAGO_OPTIONS], 
};

export type ListType = 
    'materials' | 'ribbons' | 'printTypes' | 'jobTypes' | 
    'dieTypes' | 'productTypes' | 'coreTypes' | 'specialFinishes' |
    'variableDataTypes' | 'varnishFinishes' | 'paymentTerms';

export const LIST_LABELS: Record<ListType, string> = {
    materials: 'Materiales',
    ribbons: 'Tipos de Ribbon',
    printTypes: 'Tipos de Impresión',
    jobTypes: 'Tipos de Trabajo',
    dieTypes: 'Tipos de Troquel',
    productTypes: 'Tipos de Producto',
    coreTypes: 'Tipos de Buje',
    specialFinishes: 'Terminaciones Especiales',
    variableDataTypes: 'Tipos de Dato Variable',
    varnishFinishes: 'Acabados de Barniz',
    paymentTerms: 'Condiciones de Pago'
};

// Helper para limpiar números. Maneja comas como decimales y puntos como miles.
const parseNumber = (value: string): number => {
    if (!value) return 0;
    
    let cleanVal = value.trim();
    // Si contiene coma y punto (ej: 1.200,50), eliminamos puntos y cambiamos coma por punto
    if (cleanVal.includes('.') && cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
    } 
    // Si solo tiene coma (ej: 50,5), cambiamos por punto
    else if (cleanVal.includes(',')) {
        cleanVal = cleanVal.replace(',', '.');
    }
    
    const num = parseFloat(cleanVal);
    return isNaN(num) ? 0 : num;
};

const useSystemData = () => {
    // ESTADOS con inicialización diferida (lazy initialization) desde localStorage
    const [users, setUsers] = useState<User[]>(() => load(STORAGE_KEYS.USERS, INITIAL_USERS));
    const [dieCuts, setDieCuts] = useState<DieCut[]>(() => load(STORAGE_KEYS.DIES, []));
    const [inventory, setInventory] = useState<InventoryItem[]>(() => load(STORAGE_KEYS.INVENTORY, INITIAL_INVENTORY));
    const [jumboPresets, setJumboPresets] = useState<JumboPreset[]>(() => load(STORAGE_KEYS.JUMBOS, []));
    
    const [config, setConfig] = useState(() => {
        // Cargar config y listas personalizadas combinadas
        const savedLists = load(STORAGE_KEYS.LISTS, {});
        // Fusionamos las listas guardadas con los defaults globales para asegurar estructura
        return { ...GLOBAL_DEFAULTS, ...savedLists, fieldConfig: load(STORAGE_KEYS.CONFIG, DEFAULT_FIELD_CONFIG) };
    });
    
    const [isAutoLoading, setIsAutoLoading] = useState(false);

    // PERSISTENCIA (Effects)
    useEffect(() => { safeStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); }, [users]);
    useEffect(() => { safeStorage.setItem(STORAGE_KEYS.DIES, JSON.stringify(dieCuts)); }, [dieCuts]);
    useEffect(() => { safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory)); }, [inventory]);
    useEffect(() => { safeStorage.setItem(STORAGE_KEYS.JUMBOS, JSON.stringify(jumboPresets)); }, [jumboPresets]);
    
    // Persistir Config (FieldConfig separado por compatibilidad) y Listas
    useEffect(() => {
        safeStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config.fieldConfig));
        
        // Guardamos las listas editables aparte
        const listsToSave: any = {};
        (Object.keys(LIST_LABELS) as ListType[]).forEach(k => {
            listsToSave[k] = config[k];
        });
        safeStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(listsToSave));
    }, [config]);

    const importDieCuts = useCallback(async (csvData: string) => {
        if (!csvData) return 0;
        const lines = csvData.split(/\r?\n/);
        const newDies: any[] = [];

        lines.forEach((line, index) => {
            if (index === 0 || !line.trim()) return; 
            const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            
            if (cols.length >= 5) {
                const id = cols[0];
                if (!id) return;
                newDies.push({
                    id,
                    forma: cols[1] || 'Rectangular',
                    ancho: parseNumber(cols[2]),
                    largo: parseNumber(cols[3]),
                    carreras: parseNumber(cols[4]) || 1,
                });
            }
        });

        if (newDies.length > 0) {
            setDieCuts(prev => {
                const combined = [...prev];
                newDies.forEach(nd => {
                    const idx = combined.findIndex(d => d.id === nd.id);
                    if (idx >= 0) combined[idx] = nd;
                    else combined.push(nd);
                });
                return combined;
            });
            return newDies.length;
        }
        return 0;
    }, []);

    const importInventory = useCallback(async (csvData: string, forcedType?: string) => {
        if (!csvData) return 0;
        const lines = csvData.split(/\r?\n/);
        const newInventory: InventoryItem[] = [];

        // Leer inventario actual para preservar minStock y color si ya existen
        const currentInventoryMap = new Map<string, InventoryItem>(inventory.map(i => [i.id, i]));

        lines.forEach((line, index) => {
            if (index === 0 || !line.trim()) return;
            const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            
            if (cols.length >= 2) {
                const codigo = cols[0];
                if (!codigo) return;
                const nombre = cols[1];
                const ancho = parseNumber(cols[2]);
                const stockMetros = parseNumber(cols[3]);

                let tipo = 'Sustrato';
                if (forcedType) {
                    tipo = forcedType;
                } else {
                    const lowerName = (nombre + ' ' + (cols[4] || '')).toLowerCase();
                    if (lowerName.includes('ribbon')) tipo = 'Ribbon';
                    else if (lowerName.includes('laminado') || lowerName.includes('polipropileno') || (lowerName.includes('opp') && lowerName.includes('lam'))) tipo = 'Laminado';
                    else if (lowerName.includes('hot') && (lowerName.includes('stamp') || lowerName.includes('foil'))) tipo = 'Hot Stamping';
                    else if (lowerName.includes('cold') && (lowerName.includes('stamp') || lowerName.includes('foil'))) tipo = 'Cold Stamping';
                    else if (lowerName.includes('tinta') || lowerName.includes('ink')) tipo = 'Tinta';
                    else if (lowerName.includes('barniz')) tipo = 'Otro'; // O Tinta, depende de la lógica del cliente
                }

                // Preservar datos visuales si existen
                const existing = currentInventoryMap.get(codigo);

                newInventory.push({
                    id: codigo,
                    codigo,
                    nombre,
                    tipo: tipo as any,
                    ancho,
                    stockMetros,
                    minStock: existing?.minStock || 0,
                    colorHex: existing?.colorHex
                });
            }
        });

        if (newInventory.length > 0) {
            setInventory(prev => {
                const combined = [...prev];
                newInventory.forEach(ni => {
                    const idx = combined.findIndex(i => i.id === ni.id);
                    if (idx >= 0) combined[idx] = ni;
                    else combined.push(ni);
                });
                return combined;
            });
            return newInventory.length;
        }
        return 0;
    }, [inventory]);

    // --- CARGA AUTOMÁTICA DE CSVs AL INICIO (Solo si está vacío) ---
    useEffect(() => {
        // Solo cargamos automáticamente si el inventario o troqueles están vacíos en LS
        // para evitar sobrescribir datos editados manualmente o duplicar llamadas.
        const shouldLoadDies = dieCuts.length === 0;
        const shouldLoadInventory = inventory.length === 0;

        if (!shouldLoadDies && !shouldLoadInventory) return;

        const preloadData = async () => {
            setIsAutoLoading(true);
            try {
                const fetchCSV = async (url: string) => {
                    if(!url) return null;
                    try {
                        const res = await fetch(url);
                        if(res.ok) return await res.text();
                    } catch (e) {
                        console.warn(`Failed to fetch ${url}`, e);
                    }
                    return null;
                };

                const promises = [];
                if (shouldLoadDies) promises.push(fetchCSV(GOOGLE_SHEET_TROQUELES_URL)); else promises.push(Promise.resolve(null));
                
                // Inventory parts
                if (shouldLoadInventory) {
                    promises.push(fetchCSV(GOOGLE_SHEET_BOBINAS_URL));
                    promises.push(fetchCSV(GOOGLE_SHEET_RIBBONS_URL));
                    promises.push(fetchCSV(GOOGLE_SHEET_LAMINADOS_URL));
                    promises.push(fetchCSV(GOOGLE_SHEET_HOT_FOIL_URL));
                    promises.push(fetchCSV(GOOGLE_SHEET_COLD_FOIL_URL));
                } else {
                     promises.push(Promise.resolve(null), Promise.resolve(null), Promise.resolve(null), Promise.resolve(null), Promise.resolve(null));
                }

                const [troqueles, bobinas, ribbons, laminados, hot, cold] = await Promise.all(promises);

                if (troqueles && shouldLoadDies) importDieCuts(troqueles);
                if (shouldLoadInventory) {
                    if (bobinas) importInventory(bobinas, 'Sustrato');
                    if (ribbons) importInventory(ribbons, 'Ribbon');
                    if (laminados) importInventory(laminados, 'Laminado');
                    if (hot) importInventory(hot, 'Hot Stamping');
                    if (cold) importInventory(cold, 'Cold Stamping');
                }
                
                console.log("Initial CSV Data Loaded.");
            } catch (err) {
                console.error("Error preloading CSV data:", err);
            } finally {
                setIsAutoLoading(false);
            }
        };

        preloadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount, checks inside handle conditions

    // --- ACTIONS ---

    const addUser = useCallback(async (user: User) => {
        setUsers(prev => [...prev, user]);
    }, []);

    const updateUser = useCallback(async (user: User) => {
        setUsers(prev => prev.map(u => u.id === user.id ? user : u));
    }, []);

    const deleteUser = useCallback(async (userId: string) => {
        setUsers(prev => prev.filter(u => u.id !== userId));
    }, []);

    const addDieCut = useCallback(async (die: DieCut) => {
         setDieCuts(prev => [...prev, die]);
    }, []);
    
    const deleteDieCut = useCallback(async (id: string) => {
         setDieCuts(prev => prev.filter(d => d.id !== id));
    }, []);

    const updateInventoryItem = useCallback(async (item: InventoryItem) => {
        setInventory(prev => prev.map(i => i.id === item.id ? item : i));
    }, []);

    const toggleFieldRequired = useCallback((field: FieldKey) => {
        setConfig(prev => ({
            ...prev,
            fieldConfig: { ...prev.fieldConfig, [field]: !prev.fieldConfig[field] }
        }));
    }, []);

    const addListItem = useCallback((listType: ListType, item: string) => {
        setConfig(prev => ({
             ...prev,
             [listType]: [...prev[listType], item]
        }));
    }, []);

    const removeListItem = useCallback((listType: ListType, item: string) => {
        setConfig(prev => ({
             ...prev,
             [listType]: prev[listType].filter((i: string) => i !== item)
        }));
    }, []);
    
    // --- JUMBO PRESETS ACTIONS ---
    const addJumboPreset = useCallback((preset: JumboPreset) => {
        setJumboPresets(prev => {
            const exists = prev.findIndex(p => p.materialCode === preset.materialCode);
            if (exists >= 0) {
                // Update
                const updated = [...prev];
                updated[exists] = preset;
                return updated;
            }
            return [...prev, preset];
        });
    }, []);

    const removeJumboPreset = useCallback((materialCode: string) => {
        setJumboPresets(prev => prev.filter(p => p.materialCode !== materialCode));
    }, []);

    const calculatedMaterials = useMemo(() => {
        if (inventory.length > 0) {
            const sustratos = inventory.filter(i => i.tipo === 'Sustrato');
            if (sustratos.length > 0) {
                const uniqueSet = new Set<string>();
                sustratos.forEach(item => {
                    const codePrefix = item.codigo.substring(0, 3);
                    const label = `${item.nombre} (${codePrefix})`;
                    uniqueSet.add(label);
                });
                return Array.from(uniqueSet).sort();
            }
        }
        return config.materials; 
    }, [inventory, config.materials]);

    return {
        users,
        dieCuts,
        inventory,
        jumboPresets,
        fieldConfig: config.fieldConfig,
        materials: calculatedMaterials,
        ribbons: config.ribbons,
        printTypes: config.printTypes,
        jobTypes: config.jobTypes,
        dieTypes: config.dieTypes,
        productTypes: config.productTypes,
        coreTypes: config.coreTypes,
        specialFinishes: config.specialFinishes,
        variableDataTypes: config.variableDataTypes,
        varnishFinishes: config.varnishFinishes,
        paymentTerms: config.paymentTerms,
        addUser,
        updateUser,
        deleteUser,
        addDieCut,
        importDieCuts,
        deleteDieCut,
        importInventory,
        updateInventoryItem, 
        toggleFieldRequired,
        addListItem,
        removeListItem,
        addJumboPreset,
        removeJumboPreset,
        isAutoLoading
    };
};

export default useSystemData;
