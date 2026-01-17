import React, { useMemo } from 'react';
import { Device, DeviceRole } from '../../types';

interface TopologyGraphProps {
    devices: Device[];
}

// Role group definitions with positions
const ROLE_GROUPS = {
    planning: { x: 400, y: 100, label: 'Planning', roles: ['pm', 'architect'] },
    creative: { x: 150, y: 300, label: 'Creative', roles: ['designer'] },
    dev: { x: 650, y: 300, label: 'Development', roles: ['frontend', 'backend', 'fullstack'] },
    ops: { x: 400, y: 500, label: 'Operations', roles: ['devops', 'qa'] },
};

// Define connections between groups for animation
const CONNECTIONS = [
    { from: 'planning', to: 'creative', color: '#ec4899' }, // Pink
    { from: 'planning', to: 'dev', color: '#6366f1' },     // Indigo
    { from: 'creative', to: 'dev', color: '#8b5cf6' },    // Violet
    { from: 'dev', to: 'ops', color: '#22c55e' },        // Green
    { from: 'ops', to: 'planning', color: '#eab308' },    // Yellow (Feedback loop)
];

const TopologyGraph: React.FC<TopologyGraphProps> = ({ devices }) => {
    // Generate role-based nodes
    const nodes = useMemo(() => {
        const roleNodes: { id: string; x: number; y: number; role: DeviceRole; device: Device }[] = [];

        // Group devices by role category to distribute them around the group center
        const groupCounts: Record<string, number> = {};

        devices.forEach(device => {
            if (!device.role) return;

            // Find which group this role belongs to
            let groupKey = 'dev'; // default
            for (const [key, config] of Object.entries(ROLE_GROUPS)) {
                if (config.roles.includes(device.role)) {
                    groupKey = key;
                    break;
                }
            }

            groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
            const index = groupCounts[groupKey] - 1;
            const group = ROLE_GROUPS[groupKey as keyof typeof ROLE_GROUPS];

            // Calculate simple offset based on index
            const offsetStep = 60;
            const offsetX = (index % 3 - 1) * offsetStep;
            const offsetY = (Math.floor(index / 3)) * offsetStep + 40;

            roleNodes.push({
                id: device.id,
                x: group.x + offsetX,
                y: group.y + offsetY,
                role: device.role,
                device
            });
        });

        return roleNodes;
    }, [devices]);

    return (
        <div className="w-full h-[600px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative shadow-inner">
            <svg className="w-full h-full">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                    </marker>
                    <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                    </radialGradient>
                </defs>

                {/* Connections */}
                {CONNECTIONS.map((conn, idx) => {
                    const start = ROLE_GROUPS[conn.from as keyof typeof ROLE_GROUPS];
                    const end = ROLE_GROUPS[conn.to as keyof typeof ROLE_GROUPS];

                    // Bezier curve
                    const pathD = `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${(start.y + end.y) / 2 - 50} ${end.x} ${end.y}`;

                    return (
                        <g key={`${conn.from}-${conn.to}`}>
                            {/* Base line */}
                            <path
                                d={pathD}
                                stroke={conn.color}
                                strokeWidth="2"
                                fill="none"
                                strokeOpacity="0.2"
                            />

                            {/* Animated Dash Flow */}
                            <path
                                d={pathD}
                                stroke={conn.color}
                                strokeWidth="2"
                                fill="none"
                                strokeDasharray="5,10"
                                className="animate-dash-flow"
                            >
                                <animate
                                    attributeName="stroke-dashoffset"
                                    from="30"
                                    to="0"
                                    dur={`${Math.random() * 2 + 2}s`}
                                    repeatCount="indefinite"
                                />
                            </path>

                            {/* Moving Packet */}
                            <circle r="3" fill={conn.color} filter="url(#glow)">
                                <animateMotion
                                    dur="4s"
                                    repeatCount="indefinite"
                                    path={pathD}
                                    keyPoints="0;1"
                                    keyTimes="0;1"
                                    calcMode="linear"
                                />
                            </circle>
                        </g>
                    );
                })}

                {/* Department Hubs (Connection Anchors) */}
                {Object.values(ROLE_GROUPS).map((group) => (
                    <g key={`hub-${group.label}`}>
                        {/* Outer Glow */}
                        <circle
                            cx={group.x}
                            cy={group.y}
                            r="40"
                            fill="url(#hubGradient)"
                            opacity="0.1"
                            className="animate-pulse"
                        />
                        {/* Core Hub */}
                        <circle
                            cx={group.x}
                            cy={group.y}
                            r="10"
                            fill="white"
                            stroke="#e2e8f0"
                            strokeWidth="2"
                        />
                        <text
                            x={group.x}
                            y={group.y - 40}
                            textAnchor="middle"
                            className="text-xs font-bold fill-slate-400 uppercase tracking-widest"
                        >
                            {group.label}
                        </text>
                    </g>
                ))}

                {/* Device Nodes */}
                {nodes.map((node) => (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                        {/* Pulse effect for online devices */}
                        {node.device.status === 'online' && (
                            <circle r="25" fill={getRoleColor(node.role)} opacity="0.2">
                                <animate attributeName="r" values="25;35;25" dur="3s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.2;0;0.2" dur="3s" repeatCount="indefinite" />
                            </circle>
                        )}

                        {/* Main Node Circle */}
                        <circle
                            r="24"
                            fill="white"
                            stroke={getRoleColor(node.role)}
                            strokeWidth="3"
                            className="drop-shadow-sm cursor-pointer hover:drop-shadow-lg transition-all"
                        />

                        {/* Icon */}
                        <text x="0" y="5" textAnchor="middle" fontSize="16">
                            {getRoleIcon(node.role)}
                        </text>

                        {/* Label name */}
                        <text x="0" y="40" textAnchor="middle" fontSize="10" className="fill-slate-600 font-medium">
                            {node.device.name}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

// Helper to get color by role
function getRoleColor(role: DeviceRole): string {
    const colors: Record<DeviceRole, string> = {
        frontend: '#3b82f6', // blue-500
        backend: '#22c55e',  // green-500
        fullstack: '#a855f7', // purple-500
        devops: '#f97316',   // orange-500
        qa: '#eab308',       // yellow-500
        architect: '#ef4444', // red-500
        pm: '#ec4899',       // pink-500
        designer: '#06b6d4',  // cyan-500
    };
    return colors[role] || '#94a3b8';
}

function getRoleIcon(role: DeviceRole): string {
    const icons: Record<DeviceRole, string> = {
        frontend: '🎨',
        backend: '⚙️',
        fullstack: '🚀',
        devops: '🔧',
        qa: '🧪',
        architect: '🏛️',
        pm: '📊',
        designer: '✨',
    };
    return icons[role] || '💻';
}

export default TopologyGraph;
