import React, { useMemo, useState } from 'react';
import { Device, DeviceRole } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface TopologyGraphProps {
    devices: Device[];
}

// Role group definitions with positions
const ROLE_GROUPS = {
    planning: { x: 400, y: 100, label: 'PLANNING', roles: ['pm', 'architect'], icon: '📋' },
    creative: { x: 150, y: 300, label: 'CREATIVE', roles: ['designer'], icon: '🎨' },
    dev: { x: 650, y: 300, label: 'DEVELOPMENT', roles: ['frontend', 'backend', 'fullstack'], icon: '💻' },
    ops: { x: 400, y: 500, label: 'OPERATIONS', roles: ['devops', 'qa'], icon: '⚙️' },
};

// Define connections between groups
const CONNECTIONS = [
    { from: 'planning', to: 'creative', color: '#ec4899' },
    { from: 'planning', to: 'dev', color: '#8b5cf6' },
    { from: 'creative', to: 'dev', color: '#06b6d4' },
    { from: 'dev', to: 'ops', color: '#22c55e' },
    { from: 'ops', to: 'planning', color: '#f97316' },
];

const TopologyGraph: React.FC<TopologyGraphProps> = ({ devices }) => {
    const { theme } = useTheme();
    const isDark = theme === 'kanban';
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Generate role-based nodes grouped by category
    const nodesByGroup = useMemo(() => {
        const grouped: Record<string, { id: string; x: number; y: number; role: DeviceRole; device: Device }[]> = {};
        const groupCounts: Record<string, number> = {};

        devices.forEach(device => {
            if (!device.role) return;

            let groupKey = 'dev';
            for (const [key, config] of Object.entries(ROLE_GROUPS)) {
                if (config.roles.includes(device.role)) {
                    groupKey = key;
                    break;
                }
            }

            if (!grouped[groupKey]) grouped[groupKey] = [];
            groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
            const index = groupCounts[groupKey] - 1;
            const group = ROLE_GROUPS[groupKey as keyof typeof ROLE_GROUPS];

            // Calculate position in a circular pattern around the hub
            const angle = (index * (2 * Math.PI / 4)) - Math.PI / 2;
            const radius = 120;
            const offsetX = Math.cos(angle) * radius;
            const offsetY = Math.sin(angle) * radius;

            grouped[groupKey].push({
                id: device.id,
                x: group.x + offsetX,
                y: group.y + offsetY,
                role: device.role,
                device
            });
        });

        return grouped;
    }, [devices]);

    const handleHubClick = (groupKey: string) => {
        setExpandedGroup(expandedGroup === groupKey ? null : groupKey);
    };

    // Get device count per group
    const getGroupDeviceCount = (groupKey: string) => {
        return nodesByGroup[groupKey]?.length || 0;
    };

    return (
        <div className={`w-full h-[600px] rounded-2xl overflow-hidden relative ${isDark
            ? 'bg-gray-800/50 backdrop-blur-xl border border-gray-700/50'
            : 'gradient-card'
            }`}>
            <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid meet">
                <defs>
                    {/* Glow filter */}
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    {/* Gradients for each connection color */}
                    {CONNECTIONS.map((conn, idx) => (
                        <linearGradient
                            key={`gradient-${idx}`}
                            id={`lineGradient-${conn.from}-${conn.to}`}
                            gradientUnits="userSpaceOnUse"
                            x1={ROLE_GROUPS[conn.from as keyof typeof ROLE_GROUPS].x}
                            y1={ROLE_GROUPS[conn.from as keyof typeof ROLE_GROUPS].y}
                            x2={ROLE_GROUPS[conn.to as keyof typeof ROLE_GROUPS].x}
                            y2={ROLE_GROUPS[conn.to as keyof typeof ROLE_GROUPS].y}
                        >
                            <stop offset="0%" stopColor={conn.color} stopOpacity="0.8" />
                            <stop offset="100%" stopColor={conn.color} stopOpacity="0.3" />
                        </linearGradient>
                    ))}
                </defs>

                {/* Connections with gradient lines */}
                <g className={`transition-opacity duration-300 ${expandedGroup ? 'opacity-20' : 'opacity-100'}`}>
                    {CONNECTIONS.map((conn) => {
                        const start = ROLE_GROUPS[conn.from as keyof typeof ROLE_GROUPS];
                        const end = ROLE_GROUPS[conn.to as keyof typeof ROLE_GROUPS];
                        const pathD = `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${(start.y + end.y) / 2 - 30} ${end.x} ${end.y}`;

                        return (
                            <g key={`${conn.from}-${conn.to}`}>
                                {/* Base glow line */}
                                <path
                                    d={pathD}
                                    stroke={conn.color}
                                    strokeWidth="4"
                                    fill="none"
                                    strokeOpacity="0.15"
                                    filter="url(#glow)"
                                />
                                {/* Main line */}
                                <path
                                    d={pathD}
                                    stroke={`url(#lineGradient-${conn.from}-${conn.to})`}
                                    strokeWidth="2"
                                    fill="none"
                                />
                                {/* Animated particle */}
                                <circle r="4" fill={conn.color} filter="url(#glow)">
                                    <animateMotion
                                        dur="3s"
                                        repeatCount="indefinite"
                                        path={pathD}
                                    />
                                </circle>
                            </g>
                        );
                    })}
                </g>

                {/* Department Hubs - Clickable */}
                {Object.entries(ROLE_GROUPS).map(([groupKey, group]) => {
                    const isExpanded = expandedGroup === groupKey;
                    const deviceCount = getGroupDeviceCount(groupKey);

                    return (
                        <g
                            key={`hub-${group.label}`}
                            onClick={() => handleHubClick(groupKey)}
                            className="cursor-pointer"
                        >
                            {/* Outer glow ring */}
                            <circle
                                cx={group.x}
                                cy={group.y}
                                r={isExpanded ? 50 : 35}
                                fill="none"
                                stroke={isExpanded ? '#8b5cf6' : isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'}
                                strokeWidth={isExpanded ? 2 : 1}
                                className="transition-all duration-300"
                            >
                                <animate attributeName="r" values={isExpanded ? "50;55;50" : "35;40;35"} dur="4s" repeatCount="indefinite" />
                            </circle>

                            {/* Core hub - larger and more prominent */}
                            <circle
                                cx={group.x}
                                cy={group.y}
                                r={isExpanded ? 35 : 28}
                                fill={isDark ? '#1f2937' : '#ffffff'}
                                stroke={isExpanded ? '#8b5cf6' : '#6b7280'}
                                strokeWidth={isExpanded ? 3 : 2}
                                className="transition-all duration-300 hover:stroke-purple-500"
                            />

                            {/* Inner gradient */}
                            <circle
                                cx={group.x}
                                cy={group.y}
                                r={isExpanded ? 30 : 22}
                                fill={isExpanded ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'}
                                className="transition-all duration-300"
                            />

                            {/* Icon */}
                            <text
                                x={group.x}
                                y={group.y + 6}
                                textAnchor="middle"
                                fontSize={isExpanded ? 24 : 20}
                                className="transition-all duration-300 pointer-events-none"
                            >
                                {group.icon}
                            </text>

                            {/* Label */}
                            <text
                                x={group.x}
                                y={group.y - (isExpanded ? 55 : 45)}
                                textAnchor="middle"
                                className={`text-[10px] font-bold tracking-[0.15em] pointer-events-none ${isDark ? 'fill-gray-400' : 'fill-gray-500'
                                    }`}
                            >
                                {group.label}
                            </text>

                            {/* Device count badge */}
                            {deviceCount > 0 && (
                                <g>
                                    <circle
                                        cx={group.x + 25}
                                        cy={group.y - 20}
                                        r="12"
                                        fill="#8b5cf6"
                                    />
                                    <text
                                        x={group.x + 25}
                                        y={group.y - 16}
                                        textAnchor="middle"
                                        fontSize="10"
                                        className="fill-white font-bold pointer-events-none"
                                    >
                                        {deviceCount}
                                    </text>
                                </g>
                            )}

                            {/* Expand indicator */}
                            <text
                                x={group.x}
                                y={group.y + (isExpanded ? 55 : 45)}
                                textAnchor="middle"
                                fontSize="10"
                                className={`pointer-events-none ${isDark ? 'fill-gray-500' : 'fill-gray-400'}`}
                            >
                                {isExpanded ? '▲ 收起' : '▼ 展开'}
                            </text>
                        </g>
                    );
                })}

                {/* Device Nodes - Only show when group is expanded */}
                {expandedGroup && nodesByGroup[expandedGroup]?.map((node) => (
                    <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        className="cursor-pointer animate-fade-in"
                    >
                        {/* Pulse effect for online devices */}
                        {node.device.status === 'online' && (
                            <circle r="28" fill={getRoleColor(node.role)} opacity="0.15">
                                <animate attributeName="r" values="28;38;28" dur="2s" repeatCount="indefinite" />
                                <animate attributeName="opacity" values="0.15;0;0.15" dur="2s" repeatCount="indefinite" />
                            </circle>
                        )}

                        {/* Main Node */}
                        <circle
                            r="24"
                            fill={isDark ? '#1f2937' : '#ffffff'}
                            stroke={getRoleColor(node.role)}
                            strokeWidth="3"
                        />

                        {/* Inner colored circle */}
                        <circle
                            r="18"
                            fill={getRoleColor(node.role)}
                            opacity="0.15"
                        />

                        {/* Icon */}
                        <text x="0" y="6" textAnchor="middle" fontSize="18">
                            {getRoleIcon(node.role)}
                        </text>

                        {/* Label */}
                        <text
                            x="0"
                            y="42"
                            textAnchor="middle"
                            fontSize="11"
                            className={`font-medium ${isDark ? 'fill-gray-300' : 'fill-gray-600'}`}
                        >
                            {node.device.name}
                        </text>

                        {/* Status indicator */}
                        <circle
                            cx="16"
                            cy="-16"
                            r="5"
                            fill={node.device.status === 'online' ? '#22c55e' : '#6b7280'}
                            stroke={isDark ? '#1f2937' : '#ffffff'}
                            strokeWidth="2"
                        />
                    </g>
                ))}
            </svg>

            {/* Click hint */}
            {!expandedGroup && (
                <div className={`absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-full text-sm ${isDark ? 'bg-gray-700/80 text-gray-300' : 'bg-white/80 text-gray-600'
                    } backdrop-blur-sm`}>
                    点击节点查看设备
                </div>
            )}
        </div>
    );
};

function getRoleColor(role: DeviceRole): string {
    const colors: Record<DeviceRole, string> = {
        frontend: '#3b82f6',
        backend: '#22c55e',
        fullstack: '#a855f7',
        devops: '#f97316',
        qa: '#eab308',
        architect: '#ef4444',
        pm: '#ec4899',
        designer: '#06b6d4',
    };
    return colors[role] || '#8b5cf6';
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
