
import React, { useState, useMemo, useEffect } from 'react';
import useSystemData, { ListType, LIST_LABELS } from '../hooks/useSystemData';
import { User, UserRole, DieCut, FieldKey } from '../types';
import { TrashIcon, EyeIcon, EyeOffIcon } from './IconComponents';
import { API_KEY_STORAGE_KEY } from '../services/geminiService';
import { safeStorage } from '../storage';

// Helper ROBUSTO para convertir URL de Google Sheets a CSV
const sanitizeSheetUrl = (url: string) => {
    if (!url) return '';
    let newUrl = url.trim();
    if (newUrl.includes('output=csv') || newUrl.includes('format=csv')) return newUrl;
    const idRegex = /\/d\/([a-zA-Z0-9-_]{15,})/;
    const gidRegex = /[#&?]gid=([0-9]+)/;
    const idMatch = newUrl.match(idRegex);
    if (idMatch) {
        const spreadsheetId = idMatch[1];
        const gidMatch = newUrl.match(gidRegex);
        const gid = gidMatch ? gidMatch[1] : '0'; 
        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
    }
    return newUrl;
};

const AdminPanel: React.FC = () => {
    const { 
        users, addUser, updateUser,
        dieCuts, addDieCut, deleteDieCut, importDieCuts,
        inventory, importInventory,
        fieldConfig, toggleFieldRequired,
        addListItem, removeListItem,
        materials, ribbons, printTypes, jobTypes, dieTypes, 
        productTypes, coreTypes, specialFinishes, variableDataTypes, varnishFinishes, paymentTerms
    } = useSystemData();

    const [activeTab, setActiveTab] = useState<'users' | 'notifications' | 'lists' | 'dies' | 'inventory' | 'config'>('users');
    const [inventoryTab, setInventoryTab] = useState<'all' | 'sustrato' | 'ribbon' | 'laminado' | 'hot' | 'cold'>('all');

    const [isEditingUser, setIsEditingUser] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({ id: '', nombre: '', email: '', role: UserRole.AsistenteComercial, password: 'class123' });

    const [csvData, setCsvData] = useState('');
    const [sheetUrl, setSheetUrl] = useState('');
    const [importResult, setImportResult] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const [showDieForm, setShowDieForm] = useState(false);
    const [newDie, setNewDie] = useState<Partial<DieCut>>({ forma: 'Rectangular' });

    const [selectedList, setSelectedList] = useState<ListType>('materials');
    const [newItemValue, setNewItemValue] = useState('');

    const [geminiKey, setGeminiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    
    // --- GLOBAL MESSAGE CONFIG ---
    const [adminMsg, setAdminMsg] = useState('');

    useEffect(() => {
        const storedKey = safeStorage.getItem(API_KEY_STORAGE_KEY);
        if (storedKey) setGeminiKey(storedKey);
        
        // Cargar mensaje existente
        const storedConfig = safeStorage.getItem('rr_custom_lists_data');
        if (storedConfig) {
            try {
                const parsed = JSON.parse(storedConfig);
                if (parsed.adminMessage) setAdminMsg(parsed.adminMessage);
            } catch (e) {}
        }
    }, []);

    const saveApiKey = () => {
        if (geminiKey.trim()) {
            safeStorage.setItem(API_KEY_STORAGE_KEY, geminiKey.trim());
            alert('API Key guardada correctamente.');
        } else {
            safeStorage.removeItem(API_KEY_STORAGE_KEY);
            alert('API Key eliminada.');
        }
    };
    
    const saveAdminMessage = () => {
        // 1. Leer configuración actual
        const storedConfig = safeStorage.getItem('rr_custom_lists_data');
        let parsed = storedConfig ? JSON.parse(storedConfig) : {};
        
        // 2. Si el mensaje está vacío, limpiar
        if (!adminMsg.trim()) {
            parsed.adminMessage = "";
            parsed.adminMessageId = "";
        } else {
            // 3. Si hay mensaje, guardar texto y NUEVO ID (Timestamp) para forzar notificación
            parsed.adminMessage = adminMsg;
            // Generamos un ID único basado en el tiempo actual
            parsed.adminMessageId = Date.now().toString(); 
        }
        
        // 4. Guardar en Storage
        safeStorage.setItem('rr_custom_lists_data', JSON.stringify(parsed));
        
        // 5. ¡CRUCIAL! Disparar evento para que el Dashboard se entere INSTANTÁNEAMENTE
        window.dispatchEvent(new Event('rr-global-message-update'));
        
        alert('Mensaje publicado. Verifique la campana en la esquina superior derecha.');
    };

    const handleUserSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!editingUser.id || !editingUser.nombre) return; const exists = users.find(u => u.id === editingUser.id); if (exists) updateUser(editingUser as User); else addUser(editingUser as User); setIsEditingUser(false); setEditingUser({ id: '', nombre: '', email: '', role: UserRole.AsistenteComercial, password: 'class123' }); };
    const startEditUser = (user: User) => { setEditingUser(user); setIsEditingUser(true); };
    const startNewUser = () => { setEditingUser({ id: `user-${Date.now()}`, nombre: '', email: '', role: UserRole.AsistenteComercial, password: 'class123' }); setIsEditingUser(true); };
    
    const handleImport = async (type: 'dies' | 'inventory') => { 
        if (!csvData.trim()) return; 
        const count = type === 'dies' ? await importDieCuts(csvData) : await importInventory(csvData); 
        setImportResult(count > 0 ? `✅ Importados ${count}` : `❌ Error`); 
        setCsvData(''); 
        setTimeout(() => setImportResult(null), 3000); 
    };

    const handleSync = async (type: 'dies' | 'inventory') => { 
        if (!sheetUrl) return; 
        setIsSyncing(true); 
        setImportResult(null); 
        const cleanUrl = sanitizeSheetUrl(sheetUrl); 
        try { 
            const response = await fetch(cleanUrl); 
            if (!response.ok) throw new Error(`${response.status}`); 
            const text = await response.text(); 
            if (text.trim().startsWith('<')) throw new Error('HTML'); 
            const count = type === 'dies' ? await importDieCuts(text) : await importInventory(text); 
            setImportResult(`✅ Sync ${count}`); 
            setSheetUrl(''); 
        } catch (err) { 
            setImportResult(`❌ Error`); 
        } finally { 
            setIsSyncing(false); 
        } 
    };

    const handleAddDie = (e: React.FormEvent) => { e.preventDefault(); if(newDie.id) { addDieCut(newDie as DieCut); setShowDieForm(false); setNewDie({ forma: 'Rectangular' }); } };
    const getListItems = (type: ListType) => { 
        switch(type) { 
            case 'materials': return materials; case 'ribbons': return ribbons; case 'printTypes': return printTypes; case 'jobTypes': return jobTypes; case 'dieTypes': return dieTypes; case 'productTypes': return productTypes; case 'coreTypes': return coreTypes; case 'specialFinishes': return specialFinishes; case 'variableDataTypes': return variableDataTypes; case 'varnishFinishes': return varnishFinishes; case 'paymentTerms': return paymentTerms; default: return []; 
        } 
    };
    const handleAddItem = (e: React.FormEvent) => { e.preventDefault(); if (newItemValue.trim()) { addListItem(selectedList, newItemValue.trim()); setNewItemValue(''); } };
    const filteredInventory = useMemo(() => { if (inventoryTab === 'all') return inventory; if (inventoryTab === 'sustrato') return inventory.filter(i => i.tipo === 'Sustrato'); if (inventoryTab === 'ribbon') return inventory.filter(i => i.tipo === 'Ribbon'); if (inventoryTab === 'laminado') return inventory.filter(i => i.tipo === 'Laminado'); if (inventoryTab === 'hot') return inventory.filter(i => i.tipo === 'Hot Stamping'); if (inventoryTab === 'cold') return inventory.filter(i => i.tipo === 'Cold Stamping'); return inventory; }, [inventory, inventoryTab]);

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-wrap gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto">
                <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'users' ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Usuarios</button>
                <button onClick={() => setActiveTab('notifications')} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'notifications' ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Notificaciones</button>
                <button onClick={() => setActiveTab('dies')} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'dies' ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Troqueles</button>
                <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'inventory' ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Inventario</button>
                <button onClick={() => setActiveTab('lists')} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'lists' ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Listas</button>
                <button onClick={() => setActiveTab('config')} className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'config' ? 'bg-orange-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>Configuración</button>
            </div>

            {activeTab === 'users' && ( <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"> <div className="flex justify-between mb-4"><h2 className="text-2xl font-bold dark:text-white">Usuarios</h2><button onClick={startNewUser} className="bg-green-600 text-white px-3 py-1 rounded">+ Nuevo</button></div> {isEditingUser && ( <form onSubmit={handleUserSubmit} className="bg-gray-50 dark:bg-gray-900 p-4 rounded border mb-4 grid grid-cols-2 gap-3"> <input value={editingUser.id} onChange={e => setEditingUser({...editingUser, id: e.target.value})} disabled={!!users.find(u => u.id === editingUser.id)} className="p-2 border rounded dark:bg-gray-700 dark:text-white" placeholder="ID" /> <input value={editingUser.nombre} onChange={e => setEditingUser({...editingUser, nombre: e.target.value})} className="p-2 border rounded dark:bg-gray-700 dark:text-white" placeholder="Nombre" /> <input value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="p-2 border rounded dark:bg-gray-700 dark:text-white" placeholder="Email" /> <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="p-2 border rounded dark:bg-gray-700 dark:text-white">{Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}</select> <input value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="p-2 border rounded dark:bg-gray-700 dark:text-white" placeholder="Pass" /> <div className="col-span-2 text-right"><button type="button" onClick={() => setIsEditingUser(false)} className="mr-2 px-3 py-1 bg-gray-200 dark:bg-gray-600 dark:text-white rounded">Cancelar</button><button type="submit" className="px-3 py-1 bg-orange-600 text-white rounded">Guardar</button></div> </form> )} <table className="w-full text-left text-sm dark:text-white"> <thead className="bg-gray-100 dark:bg-gray-700"><tr><th className="p-2">Nombre</th><th className="p-2">Rol</th><th className="p-2">Email</th><th className="p-2">Acciones</th></tr></thead> <tbody> {users.map(u => ( <tr key={u.id} className="border-b dark:border-gray-700"> <td className="p-2">{u.nombre}</td><td className="p-2">{u.role}</td><td className="p-2">{u.email}</td> <td className="p-2"><button onClick={() => startEditUser(u)} className="text-blue-600 hover:underline mr-2">Editar</button></td> </tr> ))} </tbody> </table> </div> )}
            {activeTab === 'notifications' && ( <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"> <h2 className="text-2xl font-bold dark:text-white mb-4">Preferencias de Notificación</h2> <p className="text-gray-500">Configuración simulada.</p> </div> )}
            {activeTab === 'dies' && ( <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"> <div className="flex justify-between mb-4"><h2 className="text-2xl font-bold dark:text-white">Troqueles</h2><button onClick={() => setShowDieForm(!showDieForm)} className="bg-green-600 text-white px-3 py-1 rounded">+ Nuevo</button></div> <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded border border-blue-100 dark:border-blue-800"> <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Sincronizar desde Google Sheets</h3> <div className="flex gap-2 mb-4"> <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="URL..." className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" /> <button onClick={() => handleSync('dies')} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow whitespace-nowrap"> {isSyncing ? 'Cargando...' : 'Sincronizar URL'} </button> </div> <div className="border-t border-blue-200 dark:border-blue-700 pt-4 mt-4"> <textarea value={csvData} onChange={(e) => setCsvData(e.target.value)} className="w-full p-2 text-sm border rounded mb-2 h-24 font-mono dark:bg-gray-800 dark:text-white" placeholder="Pegar CSV..." /> <button onClick={() => handleImport('dies')} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 rounded text-sm">Cargar Texto Manual</button> </div> {importResult && <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-bold text-center">{importResult}</div>} </div> {showDieForm && <form onSubmit={handleAddDie} className="grid grid-cols-5 gap-2 mb-4"><input placeholder="ID" className="p-2 border rounded dark:bg-gray-700 dark:text-white" value={newDie.id} onChange={e=>setNewDie({...newDie, id:e.target.value})}/><input type="number" placeholder="Ancho" className="p-2 border rounded dark:bg-gray-700 dark:text-white" value={newDie.ancho} onChange={e=>setNewDie({...newDie, ancho:parseFloat(e.target.value)})}/><input type="number" placeholder="Largo" className="p-2 border rounded dark:bg-gray-700 dark:text-white" value={newDie.largo} onChange={e=>setNewDie({...newDie, largo:parseFloat(e.target.value)})}/><input type="number" placeholder="Carreras" className="p-2 border rounded dark:bg-gray-700 dark:text-white" value={newDie.carreras} onChange={e=>setNewDie({...newDie, carreras:parseInt(e.target.value)})}/><button className="bg-green-600 text-white rounded">Guardar</button></form>} <div className="max-h-96 overflow-y-auto"><table className="w-full text-sm dark:text-white"><thead><tr className="bg-gray-100 dark:bg-gray-700"><th>ID</th><th>Medidas</th><th>Carreras</th><th>Forma</th><th></th></tr></thead><tbody>{dieCuts.map(d => <tr key={d.id} className="border-b dark:border-gray-700"><td className="p-2 font-bold">{d.id}</td><td className="p-2">{d.ancho}x{d.largo}</td><td className="p-2">{d.carreras}</td><td className="p-2">{d.forma}</td><td className="p-2"><button onClick={() => deleteDieCut(d.id)} className="text-red-500">x</button></td></tr>)}</tbody></table></div> </div> )}
            {activeTab === 'inventory' && ( <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"> <h2 className="text-2xl font-bold dark:text-white mb-4">Inventario</h2> <div className="mb-4 flex gap-2 overflow-x-auto"><button onClick={() => setInventoryTab('all')} className={`px-3 py-1 rounded ${inventoryTab === 'all' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Todos</button><button onClick={() => setInventoryTab('sustrato')} className={`px-3 py-1 rounded ${inventoryTab === 'sustrato' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Sustratos</button><button onClick={() => setInventoryTab('ribbon')} className={`px-3 py-1 rounded ${inventoryTab === 'ribbon' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Ribbons</button><button onClick={() => setInventoryTab('laminado')} className={`px-3 py-1 rounded ${inventoryTab === 'laminado' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Laminados</button><button onClick={() => setInventoryTab('hot')} className={`px-3 py-1 rounded ${inventoryTab === 'hot' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Hot Stamping</button><button onClick={() => setInventoryTab('cold')} className={`px-3 py-1 rounded ${inventoryTab === 'cold' ? 'bg-orange-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>Cold Stamping</button></div> <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded border border-blue-100 dark:border-blue-800"> <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-2">Sincronizar Inventario</h3> <div className="flex gap-2 mb-4"> <input type="text" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="URL..." className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" /> <button onClick={() => handleSync('inventory')} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow whitespace-nowrap"> {isSyncing ? 'Cargando...' : 'Sincronizar URL'} </button> </div> <div className="border-t border-blue-200 dark:border-blue-700 pt-4 mt-4"> <textarea value={csvData} onChange={(e) => setCsvData(e.target.value)} className="w-full p-2 text-sm border rounded mb-2 h-24 font-mono dark:bg-gray-800 dark:text-white" placeholder="Pegar CSV..." /> <button onClick={() => handleImport('inventory')} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 rounded text-sm">Cargar Texto Manual</button> </div> {importResult && <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-bold text-center">{importResult}</div>} </div> <div className="max-h-96 overflow-y-auto"><table className="w-full text-sm dark:text-white"><thead><tr className="bg-gray-100 dark:bg-gray-700"><th>Código</th><th>Nombre</th><th>Tipo</th><th>Ancho</th><th>Stock (m)</th></tr></thead><tbody>{filteredInventory.map(i => <tr key={i.id} className="border-b dark:border-gray-700"><td className="p-2 font-bold">{i.codigo}</td><td className="p-2">{i.nombre}</td><td className="p-2">{i.tipo}</td><td className="p-2">{i.ancho}</td><td className="p-2 font-bold text-right">{i.stockMetros.toLocaleString()}</td></tr>)}</tbody></table></div> </div> )}
            {activeTab === 'lists' && ( <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 grid grid-cols-1 lg:grid-cols-3 gap-6"> <div className="col-span-1 border-r border-gray-200 dark:border-gray-700 pr-4"> <h3 className="font-bold mb-3 dark:text-white">Listas Editables</h3> <div className="flex flex-col gap-1"> {Object.entries(LIST_LABELS).map(([k, l]) => ( <button key={k} onClick={() => setSelectedList(k as ListType)} className={`text-left p-2 rounded transition-colors ${selectedList === k ? 'bg-orange-100 text-orange-800 font-medium' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300'}`} > {l} </button> ))} </div> </div> <div className="col-span-1 lg:col-span-2"> <h3 className="font-bold mb-3 dark:text-white">Elementos: {LIST_LABELS[selectedList]}</h3> <form onSubmit={handleAddItem} className="flex gap-2 mb-4"> <input value={newItemValue} onChange={e => setNewItemValue(e.target.value)} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600" placeholder="Añadir nuevo valor..." /> <button className="bg-green-600 hover:bg-green-700 text-white px-4 rounded shadow font-bold">+</button> </form> <ul className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-80 overflow-y-auto bg-gray-50 dark:bg-gray-900"> {getListItems(selectedList).map((item, idx) => ( <li key={idx} className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center dark:text-white hover:bg-white dark:hover:bg-gray-800"> <span>{item}</span> <button onClick={() => removeListItem(selectedList, item)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded"> <TrashIcon className="h-4 w-4" /> </button> </li> ))} </ul> </div> </div> )}

            {activeTab === 'config' && (
                <div className="space-y-6">
                    {/* GLOBAL ADMIN MESSAGE (Punto 6) */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold dark:text-white mb-4">Mensaje Global del Sistema</h2>
                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                Este mensaje aparecerá como un banner azul en la parte superior para todos los usuarios.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2 items-stretch">
                                <input 
                                    type="text"
                                    value={adminMsg}
                                    onChange={(e) => setAdminMsg(e.target.value)}
                                    placeholder="Ej: Promoción en materiales térmicos..."
                                    className="flex-1 p-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                />
                                <button onClick={saveAdminMessage} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-sm whitespace-nowrap">
                                    Publicar
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* API KEY SECTION */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold dark:text-white mb-4">Configuración de Inteligencia Artificial (Google Gemini)</h2>
                        <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                                Para activar la generación automática de textos en los emails, debes ingresar tu <strong>API Key</strong> de Google Gemini.
                                <br/>Esta clave se guardará únicamente en este navegador.
                            </p>
                            <div className="flex gap-2 items-center">
                                <div className="relative flex-1">
                                    <input 
                                        type={showKey ? "text" : "password"}
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        placeholder="Pegar API KEY aquí (AIzaSy...)"
                                        className="w-full p-2 pr-10 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                    >
                                        {showKey ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
                                    </button>
                                </div>
                                <button 
                                    onClick={saveApiKey}
                                    className="px-4 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700"
                                >
                                    Guardar Clave
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h2 className="text-2xl font-bold dark:text-white mb-4">Campos Obligatorios</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {(Object.keys(fieldConfig) as FieldKey[]).map(k => (
                                <div key={k} className="flex justify-between items-center p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                                    <span className="capitalize font-medium dark:text-gray-200">{k}</span>
                                    <button 
                                        onClick={() => toggleFieldRequired(k)} 
                                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out focus:outline-none ${fieldConfig[k] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${fieldConfig[k] ? 'translate-x-6' : ''}`}></div>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
