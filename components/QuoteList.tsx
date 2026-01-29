
import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Quote, UserRole, QuoteStatus } from '../types';
import StatusBadge from './StatusBadge';
import { ChevronRightIcon } from './IconComponents';
import type { QuoteOutletContext } from './Dashboard';

const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const getStatusStyles = (status: QuoteStatus) => {
    switch (status) {
        case QuoteStatus.Pendiente:
            return "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900/10 dark:hover:bg-yellow-900/20 border-l-4 border-yellow-500";
        case QuoteStatus.Cotizado:
            return "bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 border-l-4 border-blue-500";
        case QuoteStatus.Aprobado:
            return "bg-green-50 hover:bg-green-100 dark:bg-green-900/10 dark:hover:bg-green-900/20 border-l-4 border-green-500";
        case QuoteStatus.Rechazado:
            return "bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 border-l-4 border-red-500";
        case QuoteStatus.RechazadoCotizador:
            return "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-l-4 border-gray-500";
        default:
            return "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/50";
    }
};

const QuoteListItem: React.FC<{ quote: Quote }> = ({ quote }) => (
  <li
    className={`rounded-lg shadow-sm mb-3 transition-all duration-200 ${getStatusStyles(quote.estado)} border border-gray-200 dark:border-gray-700`}
  >
    <Link to={`/quote/${quote.id}`} className="block p-4">
      <div className="flex items-center justify-between">
        <div className="flex-grow min-w-0 pr-4">
          {/* Header Row: ID and Date aligned */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
             <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{quote.id}</span>
             <span className="text-xs text-gray-400 dark:text-gray-500">• {formatDate(quote.fechaSolicitud)}</span>
          </div>
          
          {/* Client Name - Big and Bold */}
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate leading-tight mb-1">
            {quote.cliente}
          </h3>
          
          {/* Reference/Work Type */}
          <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
            {quote.items[0]?.referencia || quote.items[0]?.tipoTrabajo || 'Sin descripción'}
          </p>

          {/* Badge visible on mobile inside content */}
          <div className="mt-2 sm:hidden">
            <StatusBadge status={quote.estado} />
          </div>
        </div>

        {/* Right Side: Badge (Desktop) and Chevron */}
        <div className="flex items-center gap-4 flex-shrink-0">
            <div className="hidden sm:block">
                <StatusBadge status={quote.estado} />
            </div>
            <ChevronRightIcon className="h-6 w-6 text-gray-400" />
        </div>
      </div>
    </Link>
  </li>
);

const QuoteList: React.FC = () => {
  const { filteredQuotes, user } = useOutletContext<QuoteOutletContext>();
  const quotes = filteredQuotes;
  const currentUserRole = user.role;

  return (
    <div className="pb-10 relative min-h-[50vh]">
      
      {quotes.length > 0 ? (
        <ul className="space-y-3">
          {quotes.map(quote => (
            <QuoteListItem key={quote.id} quote={quote} />
          ))}
        </ul>
      ) : (
        currentUserRole === UserRole.AsistenteComercial ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            {/* ICONO ELIMINADO SEGÚN SOLICITUD */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Sin Cotizaciones</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              No has creado ninguna cotización aún. Usa el botón "Nueva Cotización" para comenzar.
            </p>
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300">No hay resultados</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Intenta ajustar los filtros o la búsqueda.
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default QuoteList;
