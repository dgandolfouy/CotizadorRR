
import { useMemo } from 'react';
import { Quote, QuoteStatus, User, UserRole } from '../types';
import { USERS } from '../constants';

interface StatsFilters {
    startDate: string;
    endDate: string;
    userId: string | 'all';
}

export interface KPI {
    totalQuotes: number;
    totalApproved: number;
    totalRejected: number;
    approvalRate: number;
    estimatedPaperMeters: number; 
    totalSalesAmount: number;
    avgResponseTimeMinutes: number;
}

export interface SalesRepStats {
    id: string;
    name: string;
    totalQuotes: number;
    totalAmount: number; // Of approved + quoted (potential)
    approvedCount: number;
    rejectedCount: number;
    approvalRate: number;
}

export interface ClientStatsAggregate {
    name: string;
    totalQuotes: number;
    approvedCount: number;
    rejectedCount: number;
    totalSpent: number;
    paperConsumed: number;
    toolingCount: number; // Unique cliches/dies used
    rejectionReasons: Record<string, number>;
    growthData: Record<string, number>; // YYYY-MM -> Total Amount
}

export interface ChartData {
    label: string;
    value: number;
    color?: string;
}

const useStats = (quotes: Quote[], filters: StatsFilters) => {

    const { kpis, statusDistribution, materialUsage, topDimensions, topRibbons, salesRepStats, clientStatsMap } = useMemo(() => {
        const start = filters.startDate ? new Date(filters.startDate) : new Date('2000-01-01');
        const end = filters.endDate ? new Date(filters.endDate) : new Date();
        end.setHours(23, 59, 59);

        // 1. FILTER QUOTES (By Date & User if applicable for general KPIs)
        const validQuotes = quotes.filter(q => q.estado !== QuoteStatus.Eliminado);
        
        const filteredForKPIs = validQuotes.filter(q => {
            const qDate = new Date(q.fechaSolicitud);
            const dateMatch = qDate >= start && qDate <= end;
            const userMatch = filters.userId === 'all' || q.vendedorId === filters.userId;
            return dateMatch && userMatch;
        });

        // --- CALCULATE GLOBAL KPIS ---
        const totalQuotes = filteredForKPIs.length;
        const totalApproved = filteredForKPIs.filter(q => q.estado === QuoteStatus.Aprobado).length;
        const totalRejected = filteredForKPIs.filter(q => q.estado === QuoteStatus.Rechazado || q.estado === QuoteStatus.RechazadoCotizador).length;
        const approvalRate = totalQuotes > 0 ? (totalApproved / totalQuotes) * 100 : 0;
        
        let totalSalesAmount = 0;
        let estimatedPaperMeters = 0;
        let totalResponseTime = 0;
        let respondedQuotesCount = 0;

        const matCounts: Record<string, number> = {};
        const dimCounts: Record<string, number> = {};
        const ribCounts: Record<string, number> = {};
        const statusCounts: Record<string, number> = {
            [QuoteStatus.Pendiente]: 0, [QuoteStatus.Cotizado]: 0, [QuoteStatus.Aprobado]: 0, [QuoteStatus.Rechazado]: 0
        };

        filteredForKPIs.forEach(q => {
            const statusKey = q.estado === QuoteStatus.RechazadoCotizador ? QuoteStatus.Rechazado : q.estado;
            statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;

            if (q.estado === QuoteStatus.Aprobado) {
                if (q.importeTotal) totalSalesAmount += q.importeTotal;
            }

            if (q.fechaCotizacion && q.fechaSolicitud) {
                const diffMins = (new Date(q.fechaCotizacion).getTime() - new Date(q.fechaSolicitud).getTime()) / 1000 / 60;
                if (diffMins > 0) { totalResponseTime += diffMins; respondedQuotesCount++; }
            }

            q.items.forEach(item => {
                if (item.consumoLinealEstimado) estimatedPaperMeters += item.consumoLinealEstimado;
                if (item.material) matCounts[item.material] = (matCounts[item.material] || 0) + 1;
                if (item.ancho && item.largo) dimCounts[`${item.ancho}x${item.largo}mm`] = (dimCounts[`${item.ancho}x${item.largo}mm`] || 0) + 1;
                if (item.ribbon) ribCounts[item.ribbon] = (ribCounts[item.ribbon] || 0) + 1;
            });
        });

        const avgResponseTimeMinutes = respondedQuotesCount > 0 ? totalResponseTime / respondedQuotesCount : 0;

        // --- SALES REP STATS (Use ALL valid quotes within date range, ignore user filter) ---
        const salesQuotesInRange = validQuotes.filter(q => {
            const qDate = new Date(q.fechaSolicitud);
            return qDate >= start && qDate <= end;
        });

        const salesRepMap: Record<string, SalesRepStats> = {};
        
        // Initialize for all active sales reps
        USERS.filter(u => u.role === UserRole.AsistenteComercial).forEach(u => {
            salesRepMap[u.id] = { id: u.id, name: u.nombre, totalQuotes: 0, totalAmount: 0, approvedCount: 0, rejectedCount: 0, approvalRate: 0 };
        });

        salesQuotesInRange.forEach(q => {
            if (salesRepMap[q.vendedorId]) {
                const stats = salesRepMap[q.vendedorId];
                stats.totalQuotes++;
                if (q.importeTotal) stats.totalAmount += q.importeTotal;
                if (q.estado === QuoteStatus.Aprobado) stats.approvedCount++;
                if (q.estado === QuoteStatus.Rechazado || q.estado === QuoteStatus.RechazadoCotizador) stats.rejectedCount++;
            }
        });

        const salesRepStats = Object.values(salesRepMap).map(s => ({
            ...s,
            approvalRate: s.totalQuotes > 0 ? (s.approvedCount / s.totalQuotes) * 100 : 0
        })).sort((a,b) => b.totalAmount - a.totalAmount);

        // --- CLIENT STATS AGGREGATION ---
        const clientStatsMap: Record<string, ClientStatsAggregate> = {};
        
        // Aggregate ALL valid quotes (all time for client history usually, or filtered?) 
        // Let's use filtered date range for consistency with the dashboard picker, 
        // BUT for "Growth" we might want all time. For now, let's respect the filter to allow "This Year's Growth".
        
        salesQuotesInRange.forEach(q => {
            const cName = q.cliente.trim();
            if (!clientStatsMap[cName]) {
                clientStatsMap[cName] = { 
                    name: cName, totalQuotes: 0, approvedCount: 0, rejectedCount: 0, totalSpent: 0, paperConsumed: 0, toolingCount: 0, rejectionReasons: {}, growthData: {}
                };
            }
            const stats = clientStatsMap[cName];
            stats.totalQuotes++;
            
            if (q.estado === QuoteStatus.Aprobado) {
                stats.approvedCount++;
                if (q.importeTotal) stats.totalSpent += q.importeTotal;
                
                // Growth Data (Monthly)
                const date = new Date(q.fechaSolicitud);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
                stats.growthData[monthKey] = (stats.growthData[monthKey] || 0) + (q.importeTotal || 0);
            }
            
            if (q.estado === QuoteStatus.Rechazado || q.estado === QuoteStatus.RechazadoCotizador) {
                stats.rejectedCount++;
                const reason = q.motivoRechazo || 'Sin especificar';
                stats.rejectionReasons[reason] = (stats.rejectionReasons[reason] || 0) + 1;
            }

            // Material & Tooling
            const uniqueTools = new Set();
            q.items.forEach(item => {
                if (item.consumoLinealEstimado) stats.paperConsumed += item.consumoLinealEstimado;
                if (item.troquelId) uniqueTools.add(item.troquelId);
            });
            stats.toolingCount += uniqueTools.size;
        });


        // --- CHART DATA FORMATTING ---
        const statusDistribution: ChartData[] = [
            { label: 'Aprobado', value: statusCounts[QuoteStatus.Aprobado], color: '#16a34a' },
            { label: 'Cotizado', value: statusCounts[QuoteStatus.Cotizado], color: '#2563eb' },
            { label: 'Pendiente', value: statusCounts[QuoteStatus.Pendiente], color: '#ca8a04' },
            { label: 'Rechazado', value: statusCounts[QuoteStatus.Rechazado], color: '#dc2626' },
        ].filter(d => d.value > 0);

        const materialUsage: ChartData[] = Object.entries(matCounts)
            .map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);

        const topDimensions: ChartData[] = Object.entries(dimCounts)
            .map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);

        const topRibbons: ChartData[] = Object.entries(ribCounts)
            .map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);

        return {
            kpis: { totalQuotes, totalApproved, totalRejected, approvalRate, estimatedPaperMeters, totalSalesAmount, avgResponseTimeMinutes },
            statusDistribution,
            materialUsage,
            topDimensions,
            topRibbons,
            salesRepStats,
            clientStatsMap
        };

    }, [quotes, filters]);

    return { kpis, statusDistribution, materialUsage, topDimensions, topRibbons, salesRepStats, clientStatsMap };
};

export default useStats;