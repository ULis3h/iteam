import React from 'react';

interface ResourceGraphProps {
    label: string;
    data: number[]; // Array of 0-100 values
    color?: string;
}

const ResourceGraph: React.FC<ResourceGraphProps> = ({ label, data, color = '#22d3ee' }) => {
    // Standardize data to fixed length (e.g., 20 points)
    const points = data.slice(-20);
    const width = 300;
    const height = 100;
    const step = width / (20 - 1);

    // Generate path
    const pathD = points.map((val, idx) => {
        const x = idx * step;
        const y = height - (val / 100) * height;
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Fill area path (close the loop)
    const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

    const currentValue = points[points.length - 1] || 0;

    return (
        <div className="bg-slate-900/50 border border-cyan-500/30 p-4 rounded-lg backdrop-blur-sm relative overflow-hidden">
            <div className="flex justify-between items-end mb-2 relative z-10">
                <h3 className="text-sm font-bold text-cyan-700 uppercase tracking-widest">{label}</h3>
                <span className="text-xl font-mono font-bold" style={{ color }}>{currentValue}%</span>
            </div>

            <div className="relative h-[100px] w-full">
                {/* Grid Lines */}
                <div className="absolute inset-0 grid grid-rows-4 w-full h-full border-t border-b border-cyan-900/30">
                    <div className="border-b border-cyan-900/20 border-dashed"></div>
                    <div className="border-b border-cyan-900/20 border-dashed"></div>
                    <div className="border-b border-cyan-900/20 border-dashed"></div>
                </div>

                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    {/* Area Fill */}
                    <path d={areaD} fill={color} fillOpacity="0.1" />
                    {/* Line Stroke */}
                    <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
        </div>
    );
};

export default ResourceGraph;
