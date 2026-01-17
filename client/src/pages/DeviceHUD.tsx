import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Device, DeviceRole } from '../types';
import { getAuthHeaders } from '../contexts/AuthContext';
import HUDLayout from '../components/HUD/HUDLayout';
import StatusRing from '../components/HUD/StatusRing';
import ResourceGraph from '../components/HUD/ResourceGraph';
import LogTerminal from '../components/HUD/LogTerminal';

const DeviceHUD: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [device, setDevice] = useState<Device | null>(null);
    const [cpuHistory, setCpuHistory] = useState<number[]>(new Array(20).fill(0));
    const [memHistory, setMemHistory] = useState<number[]>(new Array(20).fill(0));
    const [logs, setLogs] = useState<string[]>(['> Connection established.', '> System monitor initialized.']);

    // Log simulation ref to access current role inside interval
    const deviceRef = useRef<Device | null>(null);

    // Fetch Device Data
    useEffect(() => {
        const fetchDevice = async () => {
            if (!id) return;
            try {
                const res = await fetch(`/api/devices/${id}`, {
                    headers: getAuthHeaders()
                });
                const data = await res.json();
                setDevice(data);
                deviceRef.current = data;

                // Update resource history with real current data
                if (data.metadata) {
                    const cpu = parseInt(data.metadata.cpuUsage || '0');
                    const mem = parseInt(data.metadata.memoryUsage || '0');

                    setCpuHistory(prev => [...prev.slice(1), cpu]);
                    setMemHistory(prev => [...prev.slice(1), mem]);
                }
            } catch (err) {
                console.error("Failed to fetch device data", err);
            }
        };

        fetchDevice();
        const interval = setInterval(fetchDevice, 2000); // 2s polling
        return () => clearInterval(interval);
    }, [id]);

    // Simulate Logs
    useEffect(() => {
        const logInterval = setInterval(() => {
            if (!deviceRef.current) return;

            const role = deviceRef.current.role;
            const newLog = generateMockLog(role);

            setLogs(prev => {
                const newLogs = [...prev, newLog];
                if (newLogs.length > 50) return newLogs.slice(-50); // Keep last 50
                return newLogs;
            });

        }, 3000); // New log every 3s

        return () => clearInterval(logInterval);
    }, []);

    if (!device) {
        return <div className="bg-black text-green-500 h-screen w-screen flex items-center justify-center font-mono">CONNECTING TO DEVICE TRANSMISSION...</div>;
    }

    const metadata = device.metadata || {};

    return (
        <HUDLayout title={device.name} subtitle={`${device.ip} // ${device.role?.toUpperCase() || 'UNASSIGNED'}`}>
            <div className="grid grid-cols-12 gap-6 h-full">

                {/* Left Panel: Status & Info */}
                <div className="col-span-3 flex flex-col gap-6">
                    <div className="bg-slate-900/50 border border-cyan-500/30 p-4 rounded-lg flex justify-center py-8">
                        <StatusRing status={device.status} health={calculateHealth(metadata)} />
                    </div>

                    {/* Device Info Card */}
                    <div className="bg-slate-900/50 border border-cyan-500/30 p-4 rounded-lg font-mono text-xs">
                        <h3 className="text-cyan-700 font-bold uppercase mb-2">Hardware Specs</h3>
                        <div className="grid grid-cols-2 gap-2 text-cyan-500/80">
                            <div>CPU:</div><div className="text-right text-cyan-300">{metadata.cpu || 'Unknown'}</div>
                            <div>Cores:</div><div className="text-right text-cyan-300">{metadata.cpuCores || '-'}</div>
                            <div>RAM:</div><div className="text-right text-cyan-300">{metadata.memory || '-'}</div>
                            <div>OS:</div><div className="text-right text-cyan-300">{metadata.version || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Center Panel: Graphs */}
                <div className="col-span-5 flex flex-col gap-6">
                    <ResourceGraph label="CPU Load" data={cpuHistory} color="#22d3ee" />
                    <ResourceGraph label="Memory Usage" data={memHistory} color="#a855f7" />

                    {/* Task Card */}
                    <div className="flex-1 bg-slate-900/50 border border-cyan-500/30 p-4 rounded-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 text-xs text-cyan-700 font-bold uppercase">Active Directive</div>
                        <div className="mt-6 text-sm text-green-400 font-mono typing-effect">
                            {getRoleDirective(device.role)}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Logs */}
                <div className="col-span-4 h-full">
                    <LogTerminal logs={logs} />
                </div>
            </div>
        </HUDLayout>
    );
};

// --- Helpers ---

function calculateHealth(metadata: any): number {
    // Mock calculation
    const cpu = parseInt(metadata.cpuUsage || 0);
    const mem = parseInt(metadata.memoryUsage || 0);
    if (cpu > 90 || mem > 90) return 60;
    if (cpu > 70 || mem > 70) return 80;
    return 98;
}

function getRoleDirective(role?: DeviceRole): string {
    const directives: Record<string, string> = {
        frontend: "Listening for UI changes. Optimizing component render cycles...",
        backend: "Handling API requests. Monitoring database connections...",
        devops: "Checking CI/CD pipelines. Verifying cluster integrity...",
        pm: "Updating project Gantt charts. Analyzing risk metrics...",
        designer: "Rendering high-fidelity prototypes. Syncing assets...",
        architect: "Evaluating system microservices structure...",
    };
    return directives[role || 'default'] || "Standby. Waiting for assignment...";
}

function generateMockLog(role?: DeviceRole): string {
    const commonLogs = [
        "> sys_check: nominal",
        "> ping: 12ms",
        "> garbage_collection: started",
        "> garbage_collection: completed (12ms)",
        "> updating cache..."
    ];

    const roleLogs: Record<string, string[]> = {
        frontend: [
            "> compiling: App.tsx",
            "> webpack: hot update",
            "> css: processing tailwind directives",
            "> react: rendering tree"
        ],
        backend: [
            "> db: query executed (4ms)",
            "> api: GET /users/1 200 OK",
            "> redis: key expired",
            "> auth: verifying token"
        ],
        devops: [
            "> k8s: pod autoscaling",
            "> docker: pulling image",
            "> nginx: reloading config",
            "> prometheus: scraping metrics"
        ],
        pm: [
            "> jira: ticket updated",
            "> slack: notification sent",
            "> calendar: syncing events",
            "> analysis: processing report"
        ],
        designer: [
            "> figma: assets synced",
            "> export: generating png",
            "> font: loading glyphs",
            "> layer: rasterizing"
        ]
    };

    const specificLogs = roleLogs[role || 'default'] || [];
    const pool = [...commonLogs, ...specificLogs];
    return pool[Math.floor(Math.random() * pool.length)];
}

export default DeviceHUD;
