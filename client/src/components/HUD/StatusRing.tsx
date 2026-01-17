import React from 'react';

interface StatusRingProps {
    status: string;
    health: number;
}

const StatusRing: React.FC<StatusRingProps> = ({ status, health }) => {
    const isOnline = status === 'online' || status === 'working';
    const color = isOnline ? '#22d3ee' : '#ef4444'; // cyan vs red

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Outer Spinning Ring */}
            <svg className="absolute inset-0 w-full h-full animate-spin-slow-reverse opacity-60 pointer-events-none">
                <circle cx="128" cy="128" r="120" stroke={color} strokeWidth="1" fill="none" strokeDasharray="10, 10" opacity="0.5" />
                <circle cx="128" cy="128" r="115" stroke={color} strokeWidth="2" fill="none" strokeDasharray="40, 40" />
            </svg>

            {/* Inner Spinning Ring */}
            <svg className="absolute inset-0 w-full h-full animate-spin-slow pointer-events-none">
                <circle cx="128" cy="128" r="90" stroke={color} strokeWidth="4" fill="none" strokeDasharray="60, 120" strokeLinecap="round" />
            </svg>

            {/* Center Content */}
            <div className="text-center z-10 flex flex-col items-center">
                <div className="text-sm font-bold uppercase tracking-widest text-cyan-700 mb-1">System Health</div>
                <div className="text-6xl font-black tabular-nums tracking-tighter" style={{ color: color, textShadow: `0 0 20px ${color}` }}>
                    {health}%
                </div>
                <div className="mt-2 px-3 py-1 rounded bg-cyan-950/50 border border-cyan-800 text-xs font-bold uppercase">
                    {status}
                </div>
            </div>

            {/* Glow Effect */}
            <div className="absolute inset-0 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: color }}></div>
        </div>
    );
};

export default StatusRing;
