
import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { QuoteOutletContext } from './Dashboard';
import useStats, { ClientStatsAggregate, ChartData } from '../hooks/useStats';
import { DonutChart, BarChart, LineChart } from './Charts';
import { UserRole } from '../types';
import useSystemData from '../hooks/useSystemData';
import { UserIcon, BriefcaseIcon, ChartBarIcon } from './IconComponents';

// --- COMPONENTS ---

const KPICard: React.FC<{ title: string, value: string | number, subtitle?: string, icon?: React.ReactNode, colorClass?: string }> = ({ title, value, subtitle, icon, colorClass = "bg-white dark:bg-gray-800" }) => (
    <div className={`${colorClass} rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 flex items-start justify-between transition-transform hover:scale-105`}>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {icon && <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{icon}</div>}
    </div>
);

const SalesTable: React.FC<{ data: any[] }> = ({ data }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th className="px-6 py-3">Vendedor</th>
                    <th className="px-6 py-3 text-right">Cotizaciones</th>
                    <th className="px-6 py-3 text-right">Monto (Aprox)</th>
                    <th className="px-6 py-3 text-center">Aprobadas</th>
                    <th className="px-6 py-3 text-center">Rechazadas</th>
                    <th className="px-6 py-3 text-right">% Éxito</th>
                </tr>
            </thead>
            <tbody>
                {data.map((row) => (
                    <tr key={row.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">{row.name}</td>
                        <td className="px-6 py-4 text-right">{row.totalQuotes}</td>
                        <td className="px-6 py-4 text-right">U$S {row.totalAmount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-center text-green-600 font-bold">{row.approvedCount}</td>
                        <td className="px-6 py-4 text-center text-red-600">{row.rejectedCount}</td>
                        <td className="px-6 py-4 text-right font-bold">{Math.round(row.approvalRate)}%</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ClientDetailView: React.FC<{ client: ClientStatsAggregate }> = ({ client }) => {
    // Transform growth data for chart
    const growthChartData: ChartData[] = Object.entries(client.growthData)
        .sort((a,b) => a[0].localeCompare(b[0]))
        .map(([key, val]) => ({ label: key, value: val as number }));

    const rejectionChartData: ChartData[] = Object.entries(client.rejectionReasons)
        .map(([key, val]) => ({ label: key, value: val as number, color: '#ef4444' }));

    const approvalRate = client.totalQuotes > 0 ? (client.approvedCount / client.totalQuotes) * 100 : 0;
    const avgTicket = client.approvedCount > 0 ? client.totalSpent / client.approvedCount : 0;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{client.name}</h2>
                <div className="flex gap-4 text-sm text-gray-500">
                    <span>Cliente desde: N/A</span>
                    <span>|</span>
                    <span>Tasa Aceptación: <span className={approvalRate > 50 ? 'text-green-500 font-bold' : 'text-orange-500 font-bold'}>{Math.round(approvalRate)}%</span></span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Total Gastado" value={`U$S ${client.totalSpent.toLocaleString()}`} icon={<BriefcaseIcon />} />
                <KPICard title="Ticket Promedio" value={`U$S ${Math.round(avgTicket).toLocaleString()}`} />
                <KPICard title="Papel Consumido" value={`${Math.round(client.paperConsumed).toLocaleString()} m`} />
                <KPICard title="Herramental Único" value={client.toolingCount} subtitle="Clisés/Troqueles usados" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Crecimiento (Compras Aprobadas)</h3>
                    <LineChart data={growthChartData} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Motivos de Rechazo</h3>
                    <div className="flex justify-center">
                        <DonutChart data={rejectionChartData} size={200} />
                    </div>
                </div>
            </div>
        </div>
    );
};


const StatsDashboard: React.FC = () => {
    const { quotes, user } = useOutletContext<QuoteOutletContext>();
    const { users } = useSystemData();
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'general' | 'sales' | 'clients'>('general');
    
    // Filters
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]; // Jan 1st
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(today);
    const [selectedUser, setSelectedUser] = useState<string>('all');

    // Client Search State
    const [clientSearch, setClientSearch] = useState('');
    const [selectedClientName, setSelectedClientName] = useState<string | null>(null);

    // Use Hook
    const { kpis, statusDistribution, materialUsage, topDimensions, topRibbons, salesRepStats, clientStatsMap } = useStats(quotes, {
        startDate,
        endDate,
        userId: selectedUser
    });

    const formatMoney = (amount: number) => new Intl.NumberFormat('es-UY', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
    const formatTime = (mins: number) => mins < 60 ? `${Math.round(mins)} min` : `${Math.floor(mins / 60)}h ${Math.round(mins % 60)}m`;

    const handleClientSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setClientSearch(val);
        // Check if full match
        if (clientStatsMap[val]) {
            setSelectedClientName(val);
        } else {
            setSelectedClientName(null);
        }
    };

    const clientList = useMemo(() => Object.keys(clientStatsMap).sort(), [clientStatsMap]);

    return (
        <div className="p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 min-h-full space-y-6">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Panel de Control</h1>
                    <p className="text-gray-500 dark:text-gray-400">Inteligencia de negocio y métricas operativas.</p>
                </div>
                
                <div className="flex gap-2 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                    <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'general' ? 'bg-white dark:bg-gray-800 shadow text-orange-600' : 'text-gray-600 dark:text-gray-300'}`}>General</button>
                    <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'sales' ? 'bg-white dark:bg-gray-800 shadow text-orange-600' : 'text-gray-600 dark:text-gray-300'}`}>Vendedores</button>
                    <button onClick={() => setActiveTab('clients')} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeTab === 'clients' ? 'bg-white dark:bg-gray-800 shadow text-orange-600' : 'text-gray-600 dark:text-gray-300'}`}>Clientes</button>
                </div>
            </div>

            {/* --- GLOBAL FILTERS --- */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-500">Rango:</span>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1 border rounded dark:bg-gray-700 dark:text-white text-sm" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1 border rounded dark:bg-gray-700 dark:text-white text-sm" />
                </div>
                {activeTab === 'general' && (
                     <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="p-1 border rounded dark:bg-gray-700 dark:text-white text-sm">
                        <option value="all">Todos los usuarios</option>
                        {users.filter(u => u.role === UserRole.AsistenteComercial).map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                )}
            </div>

            {/* --- CONTENT --- */}
            
            {activeTab === 'general' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard title="Cotizaciones" value={kpis.totalQuotes} subtitle={`${kpis.totalApproved} Aprobadas (${Math.round(kpis.approvalRate)}%)`} icon={<ChartBarIcon />} />
                        <KPICard title="Ventas (Aprox)" value={formatMoney(kpis.totalSalesAmount)} subtitle="Suma total de aprobadas" colorClass="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" />
                        <KPICard title="Papel Cotizado" value={`${Math.round(kpis.estimatedPaperMeters).toLocaleString()} m`} subtitle="Estimado" />
                        <KPICard title="Tiempo Respuesta" value={formatTime(kpis.avgResponseTimeMinutes)} subtitle="Promedio" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Estado de Cotizaciones</h3>
                            <div className="flex justify-center"><DonutChart data={statusDistribution} /></div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Materiales</h3>
                            <BarChart data={materialUsage} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'sales' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Rendimiento por Vendedor</h3>
                    <SalesTable data={salesRepStats} />
                </div>
            )}

            {activeTab === 'clients' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="relative max-w-lg mx-auto">
                        <input 
                            list="clients-list" 
                            type="text" 
                            placeholder="Buscar cliente (Escriba para filtrar)..." 
                            className="w-full p-4 pl-12 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm focus:ring-2 focus:ring-orange-500 text-lg dark:bg-gray-700 dark:text-white"
                            value={clientSearch}
                            onChange={handleClientSelect}
                        />
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6" />
                        <datalist id="clients-list">
                            {clientList.map(c => <option key={c} value={c} />)}
                        </datalist>
                    </div>

                    {selectedClientName && clientStatsMap[selectedClientName] ? (
                        <ClientDetailView client={clientStatsMap[selectedClientName]} />
                    ) : (
                        <div className="text-center py-20 text-gray-400">
                            <p>Seleccione un cliente del buscador para ver su reporte detallado.</p>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default StatsDashboard;
