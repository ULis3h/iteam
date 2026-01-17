import React, { useEffect, useRef } from 'react';

interface LogTerminalProps {
    logs: string[];
}

const LogTerminal: React.FC<LogTerminalProps> = ({ logs }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    return (
        <div className="bg-black border border-cyan-800/50 rounded-lg p-2 font-mono text-xs h-full flex flex-col relative overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-2 px-2 py-1 bg-cyan-950/30 border-b border-cyan-900">
                <span className="text-cyan-600 font-bold uppercase">System.log</span>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                </div>
            </div>

            {/* Log Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
                <div className="flex flex-col gap-1 p-2">
                    {logs.map((log, index) => (
                        <div key={index} className="break-all opacity-80 hover:opacity-100 hover:bg-cyan-900/20 transition-colors">
                            <span className="text-cyan-700 mr-2">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                            <span className="text-green-500">{log}</span>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Blinking Cursor at bottom */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 pointer-events-none">
                <span className="text-green-500 animate-pulse">_</span>
            </div>
        </div>
    );
};

export default LogTerminal;
