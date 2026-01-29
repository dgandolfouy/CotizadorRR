
import { useState, useCallback, useEffect } from 'react';
import { Quote, QuoteStatus } from '../types';
import { USERS } from '../constants';
import { generateNotification } from '../services/geminiService';
import { safeStorage } from '../storage';

// Clave para localStorage
const STORAGE_KEY = 'rr_quotes_data';

// Función segura para leer de localStorage
const loadFromStorage = (): Quote[] => {
    try {
        const saved = safeStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn("No se pudo cargar de localStorage", e);
    }
    return [];
};

// Función segura para guardar en localStorage
const saveToStorage = (quotes: Quote[]) => {
    try {
        safeStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    } catch (e) {
        console.warn("No se pudo guardar en localStorage", e);
    }
};

// Helper para chequear vencimientos (Punto 5)
const checkExpirations = (quotes: Quote[]): { updated: Quote[], changed: boolean } => {
    let changed = false;
    const now = new Date();
    const DAYS_TO_EXPIRE = 10;
    
    const updated = quotes.map(q => {
        // Solo aplica si está Cotizada y NO ha sido aprobada/rechazada aún
        if (q.estado === QuoteStatus.Cotizado && q.fechaCotizacion) {
            const dateCotizado = new Date(q.fechaCotizacion);
            // Calcular diferencia en días
            const diffTime = Math.abs(now.getTime() - dateCotizado.getTime());
            const diffDays = diffTime / (1000 * 60 * 60 * 24); 
            
            if (diffDays > DAYS_TO_EXPIRE) {
                changed = true;
                // Pasa a Abandonada, liberando stock automáticamente en useInventory (ya que useInventory solo cuenta Cotizado)
                return { 
                    ...q, 
                    estado: QuoteStatus.Abandonada, 
                    motivoRechazo: 'Sistema: Caducada por inactividad (+10 días)' 
                };
            }
        }
        return q;
    });

    return { updated, changed };
};

// VARIABLE GLOBAL PARA PERSISTENCIA EN MEMORIA (Inicializada desde Storage)
let globalQuotes: Quote[] = loadFromStorage();

const useQuotes = () => {
  // Inicializamos el estado local
  const [quotes, setQuotesLocal] = useState<Quote[]>(globalQuotes);
  const [loading] = useState(false);

  // EFECTO DE VENCIMIENTO AL CARGAR
  useEffect(() => {
      // Chequear si hay cotizaciones vencidas al iniciar el hook
      const { updated, changed } = checkExpirations(globalQuotes);
      if (changed) {
          globalQuotes = updated;
          saveToStorage(updated);
          setQuotesLocal(updated);
      }
  }, []);

  // Función auxiliar para actualizar tanto el estado local (React) como la variable global (Memoria) y LocalStorage
  const setQuotes = useCallback((newQuotesOrUpdater: Quote[] | ((prev: Quote[]) => Quote[])) => {
      setQuotesLocal(prev => {
          const updatedQuotes = typeof newQuotesOrUpdater === 'function' 
            ? newQuotesOrUpdater(prev) 
            : newQuotesOrUpdater;
          
          // Actualizamos la referencia global
          globalQuotes = updatedQuotes;
          
          // Persistir en LocalStorage
          saveToStorage(updatedQuotes);
          
          return updatedQuotes;
      });
  }, []);

  const addQuote = useCallback(async (quoteData: Omit<Quote, 'id' | 'fechaSolicitud' | 'estado' | 'notification' >) => {
    // Calcular siguiente ID basado en el máximo existente numérico
    let maxId = 1000;
    globalQuotes.forEach(q => {
        // Asumiendo formato C-001001
        const parts = q.id.split('-');
        if(parts.length > 1) {
             const num = parseInt(parts[1]);
             if(!isNaN(num) && num > maxId) maxId = num;
        }
    });
    
    const nextIdNum = maxId + 1;
    const newId = `C-${String(nextIdNum).padStart(6, '0')}`;

    const newQuote: Quote = {
      id: newId,
      fechaSolicitud: new Date().toISOString(),
      estado: QuoteStatus.Pendiente,
      ...quoteData,
    };

    // Actualizamos estado
    setQuotes(prev => [newQuote, ...prev]);

    // Disparamos notificación mock
    await generateNotification(newQuote, undefined, USERS);

  }, [setQuotes]);

  const updateQuote = useCallback(async (updatedQuote: Quote) => {
    // Buscamos la versión anterior en la variable global para comparar estados
    const originalQuote = globalQuotes.find(q => q.id === updatedQuote.id);

    setQuotes(prevQuotes => 
        prevQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q)
    );

    if (originalQuote && originalQuote.estado !== updatedQuote.estado) {
        await generateNotification(updatedQuote, originalQuote, USERS);
    }
  }, [setQuotes]);

  return { quotes, addQuote, updateQuote, loading };
};

export default useQuotes;
