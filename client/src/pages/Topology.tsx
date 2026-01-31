import React, { useEffect, useState } from 'react';
import { Device } from '../types';
import { getAuthHeaders } from '../contexts/AuthContext';
import TopologyGraph from '../components/Topology/TopologyGraph';
import { useTheme } from '../contexts/ThemeContext';

const Topology: React.FC = () => {
    const { theme } = useTheme();
    const isDark = theme === 'kanban';
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/devices', {
            headers: getAuthHeaders()
        })
            .then(res => res.json())
            .then(data => {
                setDevices(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch devices:', err);
                setLoading(false);
            });
    }, []);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="animate-slide-up">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    团队协作拓扑图
                </h1>
                <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    可视化团队成员设备分布与实时协作流
                </p>
            </div>

            {/* Topology Graph */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                {loading ? (
                    <div className={`flex items-center justify-center h-[600px] rounded-2xl ${isDark
                            ? 'bg-gray-800/50 backdrop-blur-xl border border-gray-700/50'
                            : 'gradient-card'
                        }`}>
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                            <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                加载设备数据中...
                            </span>
                        </div>
                    </div>
                ) : (
                    <TopologyGraph devices={devices} />
                )}
            </div>

            {/* Legend */}
            <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className={`flex flex-wrap gap-6 justify-center py-4 px-6 rounded-xl ${isDark
                        ? 'bg-gray-800/30 border border-gray-700/50'
                        : 'bg-white/50 border border-gray-200'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#ec4899]" />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Product</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#06b6d4]" />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Design</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Dev</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#f97316]" />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ops</span>
                    </div>
                    <div className="flex items-center gap-2 border-l pl-6 border-gray-600">
                        <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>在线</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#6b7280]" />
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>离线</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Topology;
