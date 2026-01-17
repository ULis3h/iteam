import React from 'react';

interface HUDLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

const HUDLayout: React.FC<HUDLayoutProps> = ({ children, title, subtitle }) => {
    return (
        <div className="fixed inset-0 bg-slate-950 text-cyan-500 font-mono overflow-hidden">
            {/* Background Grid & Scanlines */}
            <div className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: 'linear-gradient(rgba(18, 24, 27, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                    backgroundSize: '100% 2px, 3px 100%'
                }}
            />

            {/* Top Bar */}
            <div className="flex justify-between items-center p-4 border-b border-cyan-500/30 bg-slate-900/50 backdrop-blur-sm z-10 relative">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                        {title}
                    </h1>
                    {subtitle && <div className="text-xs text-cyan-700 uppercase tracking-widest mt-1">{subtitle}</div>}
                </div>
                <div className="flex gap-4 text-xs">
                    <div className="flex flex-col items-end">
                        <span className="text-cyan-700">SYSTEM TIME</span>
                        <span className="text-cyan-400">{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-cyan-700">CONNECTION</span>
                        <span className="text-green-500 animate-pulse">SECURE</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-0 p-6 h-[calc(100vh-80px)] overflow-auto scrollbar-hide">
                {children}
            </div>

            {/* Corner Decorations */}
            <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-cyan-500/50 rounded-tl-xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-cyan-500/50 rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-cyan-500/50 rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-cyan-500/50 rounded-br-xl pointer-events-none" />
        </div>
    );
};

export default HUDLayout;
