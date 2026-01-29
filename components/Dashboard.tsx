
/** @copyright 2026 Daniel Gandolfo - Todos los derechos reservados */

import React, { useState, useMemo, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { User, UserRole, Quote, QuoteStatus } from '../types';
import useQuotes from '../hooks/useQuotes';
import { SunIcon, MoonIcon, LogoutIcon, ChartBarIcon, BellIcon, CogIcon, CubeIcon, PlusIcon } from './IconComponents';
import RRLogoFullIcon from './RRLogoFullIcon';
import { safeStorage } from '../storage';

interface DashboardProps {
    user: User;
    onLogout: () => void;
}

export interface QuoteOutletContext {
    quotes: Quote[];
    filteredQuotes: Quote[];
    addQuote: (quote: any) => Promise<void>;
    updateQuote: (quote: Quote) => Promise<void>;
    user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const { quotes, addQuote, updateQuote } = useQuotes();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'Todos'>(QuoteStatus.Pendiente);
  
  // -- NOTIFICACIONES STATE --
  // Guardamos un objeto con el texto y el ID (timestamp) para saber si es "nuevo"
  const [globalMessageData, setGlobalMessageData] = useState<{ text: string, id: string }>({ text: '', id: '' });
  // Guardamos el último ID que el usuario leyó (cargado de localStorage al inicio)
  const [lastReadMsgId, setLastReadMsgId] = useState<string>(() => safeStorage.getItem('rr_last_read_msg_id') || '');
  
  const [showNotifications, setShowNotifications] = useState(false);
  
  const location = useLocation();
  const isListPage = location.pathname === '/';

  // Permiso para ver Stock: Admin, Cotizador y Director (Gonzalo Viñas)
  const canViewStock = user.role === UserRole.Admin || user.role === UserRole.Cotizador || user.role === UserRole.Director;

  // -- EFECTO DE CARGA DE MENSAJE GLOBAL (TIEMPO REAL) --
  useEffect(() => {
      const loadGlobalMsg = () => {
          try {
              const stored = safeStorage.getItem('rr_custom_lists_data');
              if(stored) {
                  const parsed = JSON.parse(stored);
                  // Actualizamos solo si cambió para evitar re-renders infinitos
                  setGlobalMessageData(prev => {
                      if (parsed.adminMessage !== prev.text || parsed.adminMessageId !== prev.id) {
                          return {
                              text: parsed.adminMessage || '',
                              id: parsed.adminMessageId || ''
                          };
                      }
                      return prev;
                  });
              }
          } catch {}
      };
      
      // Carga inicial
      loadGlobalMsg();

      // Escuchar eventos
      window.addEventListener('storage', loadGlobalMsg); // Cross-tab
      window.addEventListener('rr-global-message-update', loadGlobalMsg); // Same-tab (Custom Event disparado desde AdminPanel)

      return () => {
          window.removeEventListener('storage', loadGlobalMsg);
          window.removeEventListener('rr-global-message-update', loadGlobalMsg);
      };
  }, []);

  // Check quotes notifications
  const hasQuoteNotifications = useMemo(() => {
      if (user.role === UserRole.Cotizador) {
          return quotes.some(q => q.estado === QuoteStatus.Pendiente);
      }
      if (user.role === UserRole.AsistenteComercial) {
          return quotes.some(q => q.vendedorId === user.id && (q.estado === QuoteStatus.Cotizado || q.estado === QuoteStatus.Rechazado));
      }
      return false;
  }, [quotes, user]);

  // Lógica de "No Leído": Si hay un mensaje con ID y ese ID es distinto al último leído.
  const hasUnreadGlobalMsg = Boolean(globalMessageData.text && globalMessageData.id && globalMessageData.id !== lastReadMsgId);

  // Red dot logic (Si hay algo pendiente o un mensaje global nuevo)
  const showRedDot = hasQuoteNotifications || hasUnreadGlobalMsg;

  // Función para marcar como leído ("Entendido")
  const dismissGlobalMessage = () => {
      if (globalMessageData.id) {
          safeStorage.setItem('rr_last_read_msg_id', globalMessageData.id);
          setLastReadMsgId(globalMessageData.id);
      }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
        const newIsDark = !prev;
        if(newIsDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
        return newIsDark;
    });
  };

  const filteredQuotes = useMemo(() => {
    let baseQuotes = [...quotes]; 
    baseQuotes.sort((a, b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime());

    if (user.role === UserRole.AsistenteComercial) {
        baseQuotes = baseQuotes.filter(q => q.vendedorId === user.id);
    } 

    if (statusFilter !== 'Todos') {
        if (statusFilter === QuoteStatus.Rechazado) {
             baseQuotes = baseQuotes.filter(q => q.estado === QuoteStatus.Rechazado || q.estado === QuoteStatus.RechazadoCotizador);
        } else {
             baseQuotes = baseQuotes.filter(q => q.estado === statusFilter);
        }
    }

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        baseQuotes = baseQuotes.filter(quote => {
            const date = new Date(quote.fechaSolicitud).toLocaleDateString('es-ES');
            return (quote.cliente.toLowerCase().includes(lowercasedFilter) || quote.id.toLowerCase().includes(lowercasedFilter) || date.includes(lowercasedFilter));
        });
    }
    return baseQuotes;
  }, [quotes, user, searchTerm, statusFilter]);

  const getGreeting = () => {
    if (user.role === UserRole.Cotizador) return "Panel del Cotizador";
    if (user.role === UserRole.AsistenteComercial) return `Mis Cotizaciones`;
    return `Vista de ${user.nombre}`;
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700">
        <Link to="/" className="flex items-center hover:opacity-80 transition-opacity" title="Inicio">
          <RRLogoFullIcon className="h-16 sm:h-20 w-auto" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-4 relative">
            {/* Notification Bell with Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 rounded-full transition-colors relative ${
                        // SI hay notificación: Naranja + Punto Rojo + Anillo
                        showRedDot 
                            ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300 ring-2 ring-orange-200 dark:ring-orange-800' 
                            : 'text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                    <BellIcon className={`h-6 w-6 ${showRedDot ? 'animate-pulse' : ''}`} />
                    {showRedDot && (
                        <span className="absolute top-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white bg-red-600"></span>
                    )}
                </button>
                
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm">Notificaciones</h3>
                            <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600"><span className="text-lg">×</span></button>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {/* Global Message Section */}
                            {globalMessageData.text && (
                                <div className={`p-4 border-b border-gray-100 dark:border-gray-700 ${hasUnreadGlobalMsg ? 'bg-blue-50 dark:bg-blue-900/10' : 'opacity-60 bg-gray-50 dark:bg-gray-900/50'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Administración</p>
                                        {!hasUnreadGlobalMsg && <span className="text-xs text-green-600 font-bold">✓ Leído</span>}
                                    </div>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">{globalMessageData.text}</p>
                                    
                                    {/* Botón para cerrar SOLO si no se ha leído */}
                                    {hasUnreadGlobalMsg && (
                                        <button 
                                            onClick={dismissGlobalMessage}
                                            className="w-full text-center text-xs bg-white border border-blue-200 text-blue-600 px-3 py-2 rounded shadow-sm hover:bg-blue-50 transition-colors font-bold"
                                        >
                                            Entendido (Marcar como leído)
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Quote Notifications */}
                            {hasQuoteNotifications ? (
                                <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => setShowNotifications(false)}>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                                        ⚠️ Tienes cotizaciones pendientes de revisión.
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">Revisa tu listado.</p>
                                </div>
                            ) : (
                                !globalMessageData.text && <div className="p-8 text-center text-gray-400 text-sm">No hay notificaciones nuevas.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {canViewStock && (
                <Link to="/stock" className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Stock Materia Prima">
                    <CubeIcon className="h-6 w-6" />
                </Link>
            )}

            <Link to="/stats" className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Estadísticas">
                <ChartBarIcon className="h-6 w-6" />
            </Link>
            
            <button onClick={toggleDarkMode} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {isDarkMode ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
            </button>
            <div className="text-right hidden sm:block">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{user.nombre}</p>
                <p className="text-base text-gray-500 dark:text-gray-400">{user.role}</p>
            </div>
            
            {/* BOTÓN ADMIN CON ENGRANAJE (Punto 7) */}
            {user.role === UserRole.Admin && (
                <Link to="/admin" className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Configuración">
                    <CogIcon className="h-6 w-6" />
                </Link>
            )}
            
            <button onClick={onLogout} className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700" title="Cerrar Sesión">
                <LogoutIcon className="h-6 w-6" />
            </button>
        </div>
      </header>
      
      {/* Banner de Mensaje Global en Dashboard (Visible SOLO si es nuevo/no leído) */}
      {hasUnreadGlobalMsg && (
          <div className="bg-blue-600 text-white text-center py-2 px-4 font-medium shadow-md flex justify-between items-center sm:justify-center relative animate-fade-in-down">
              <span className="mr-8">📢 {globalMessageData.text}</span>
              <button onClick={dismissGlobalMessage} className="text-white hover:text-blue-200 absolute right-4" title="Cerrar">
                  <span className="text-xl font-bold">×</span>
              </button>
          </div>
      )}
      
      <main className="flex-grow p-4 sm:p-6 lg:p-10">
        <div className="max-w-5xl mx-auto">
            {isListPage && (
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">{getGreeting()}</h1>
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch">
                         {/* BOTÓN NUEVA COTIZACIÓN (MOVIDO AQUÍ) */}
                         {user.role === UserRole.AsistenteComercial && (
                            <Link
                                to="/new"
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-bold shadow-sm transition-colors w-full sm:w-auto"
                            >
                                <PlusIcon className="h-5 w-5" />
                                <span className="whitespace-nowrap">Nueva Cotización</span>
                            </Link>
                         )}
                         
                         <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | 'Todos')}
                            className="p-3 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none w-full sm:w-auto"
                         >
                            <option value={QuoteStatus.Pendiente}>Pendientes</option>
                            <option value={QuoteStatus.Cotizado}>Cotizados</option>
                            <option value={QuoteStatus.Aprobado}>Aprobados</option>
                            <option value={QuoteStatus.Rechazado}>Rechazados</option>
                            <option value={QuoteStatus.Abandonada}>Abandonadas</option>
                            <option value={QuoteStatus.Eliminado}>Eliminados</option>
                            <option value="Todos">Todos</option>
                         </select>
                        <input 
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 p-3 text-base bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                        />
                    </div>
                </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 min-h-[500px]">
                <Outlet context={{ quotes, filteredQuotes, addQuote, updateQuote, user } satisfies QuoteOutletContext} />
            </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
