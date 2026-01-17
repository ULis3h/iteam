import React, { useEffect, useState } from 'react';
import { Device } from '../types';
import { getAuthHeaders } from '../contexts/AuthContext';
import TopologyGraph from '../components/Topology/TopologyGraph';

const Topology: React.FC = () => {
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
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-2">
                    团队协作拓扑图
                </h1>
                <p className="text-gray-500">
                    可视化团队成员设备分布与实时协作流。
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-[600px] bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-gray-400">加载设备数据中...</div>
                </div>
            ) : (
                <TopologyGraph devices={devices} />
            )}

            <div className="mt-6 flex gap-6 text-sm text-gray-500 justify-center">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ec4899]"></span> Product
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span> Design
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#22c55e]"></span> Dev
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#f97316]"></span> Ops
                </div>
            </div>
        </div>
    );
};

export default Topology;
