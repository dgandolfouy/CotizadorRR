
import React from 'react';
import { ChartData } from '../hooks/useStats';

// --- SIMPLE DONUT CHART ---
export const DonutChart: React.FC<{ data: ChartData[], size?: number }> = ({ data, size = 200 }) => {
    const total = data.reduce((acc, cur) => acc + cur.value, 0);
    let currentAngle = 0;
    const center = size / 2;
    const radius = size / 2 - 20;

    if (total === 0) return <div className="text-center text-gray-400 text-sm py-10">Sin datos para mostrar</div>;

    // Calculate segments
    const segments = data.map((item, index) => {
        const angle = (item.value / total) * 360;
        const largeArcFlag = angle > 180 ? 1 : 0;
        
        // Convert polar to cartesian
        const x1 = center + radius * Math.cos(Math.PI * currentAngle / 180);
        const y1 = center + radius * Math.sin(Math.PI * currentAngle / 180);
        
        const endAngle = currentAngle + angle;
        const x2 = center + radius * Math.cos(Math.PI * endAngle / 180);
        const y2 = center + radius * Math.sin(Math.PI * endAngle / 180);
        
        const pathData = [
            `M ${center} ${center}`, // Move to center
            `L ${x1} ${y1}`, // Line to start
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, // Arc
            `Z` // Close
        ].join(' ');

        const segment = (
            <path 
                key={index}
                d={pathData}
                fill={item.color || '#ccc'}
                stroke="white"
                strokeWidth="2"
                className="hover:opacity-80 transition-opacity cursor-pointer"
            >
                <title>{`${item.label}: ${item.value} (${Math.round(angle/360*100)}%)`}</title>
            </path>
        );

        currentAngle += angle;
        return segment;
    });

    // Simple Hole for Donut
    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                {segments}
                <circle cx={center} cy={center} r={radius * 0.6} fill="var(--bg-card, white)" className="dark:fill-gray-800" />
            </svg>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center text-xs sm:text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: d.color}}></span>
                        <span className="text-gray-600 dark:text-gray-300">{d.label} ({d.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- HORIZONTAL BAR CHART ---
export const BarChart: React.FC<{ data: ChartData[], height?: number }> = ({ data, height = 300 }) => {
    const maxVal = Math.max(...data.map(d => d.value), 1);
    
    if (data.length === 0) return <div className="text-center text-gray-400 text-sm py-10">Sin datos para mostrar</div>;

    return (
        <div className="w-full space-y-3">
            {data.map((item, idx) => {
                const widthPct = (item.value / maxVal) * 100;
                return (
                    <div key={idx} className="w-full">
                        <div className="flex justify-between text-xs sm:text-sm mb-1">
                            <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">{item.label}</span>
                            <span className="font-bold text-gray-900 dark:text-white">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                            <div 
                                className="h-full rounded-full bg-orange-500 hover:bg-orange-400 transition-all duration-500"
                                style={{ width: `${widthPct}%` }}
                                title={`${item.label}: ${item.value}`}
                            ></div>
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

// --- SIMPLE LINE CHART FOR GROWTH ---
export const LineChart: React.FC<{ data: ChartData[], height?: number }> = ({ data, height = 200 }) => {
    if (data.length === 0) return <div className="text-center text-gray-400 text-sm py-10">Sin datos históricos</div>;

    const maxVal = Math.max(...data.map(d => d.value), 100);
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (d.value / maxVal) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full relative" style={{ height: `${height}px` }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ea580c" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <polygon points={`0,100 ${points} 100,100`} fill="url(#gradient)" />
                <polyline points={points} fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{data[0]?.label}</span>
                <span>{data[data.length-1]?.label}</span>
            </div>
        </div>
    );
};