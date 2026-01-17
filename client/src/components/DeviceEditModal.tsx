import React, { useState, useEffect } from 'react';
import { X, Save, Check } from 'lucide-react';
import { Device, DeviceRole, Document } from '../types';
import { getAuthHeaders } from '../contexts/AuthContext';

interface DeviceEditModalProps {
    device: Device;
    onClose: () => void;
    onSave: (updatedDevice: Partial<Device>) => Promise<void>;
}

const ROLES: { id: DeviceRole; name: string; icon: string; color: string }[] = [
    { id: 'frontend', name: '前端工程师', icon: '🎨', color: 'bg-blue-100 text-blue-700' },
    { id: 'backend', name: '后端工程师', icon: '⚙️', color: 'bg-green-100 text-green-700' },
    { id: 'fullstack', name: '全栈工程师', icon: '🚀', color: 'bg-purple-100 text-purple-700' },
    { id: 'devops', name: 'DevOps工程师', icon: '🔧', color: 'bg-orange-100 text-orange-700' },
    { id: 'qa', name: '测试工程师', icon: '🧪', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'architect', name: '架构师', icon: '🏛️', color: 'bg-red-100 text-red-700' },
    { id: 'pm', name: '项目经理', icon: '📊', color: 'bg-pink-100 text-pink-700' },
    { id: 'designer', name: 'UI/UX设计师', icon: '✨', color: 'bg-cyan-100 text-cyan-700' },
];

const DeviceEditModal: React.FC<DeviceEditModalProps> = ({ device, onClose, onSave }) => {
    const [role, setRole] = useState<DeviceRole | undefined>(device.role);
    const [selectedSkills, setSelectedSkills] = useState<string[]>(device.skills || []);
    const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(device.documentIds || []);
    const [availableSkills, setAvailableSkills] = useState<string[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [docsLoading, setDocsLoading] = useState(true);

    // Fetch role details to get skills
    useEffect(() => {
        if (role) {
            fetch(`/api/roles/${role}`, {
                headers: getAuthHeaders()
            })
                .then(res => res.json())
                .then(data => {
                    if (data && data.techStack) {
                        const skills = [
                            ...data.techStack.primary,
                            ...data.techStack.secondary,
                            ...data.techStack.tools
                        ];
                        setAvailableSkills(skills);
                    }
                })
                .catch(err => console.error('Failed to fetch role skills:', err));
        } else {
            setAvailableSkills([]);
        }
    }, [role]);

    // Fetch documents
    useEffect(() => {
        fetch('/api/documents', {
            headers: getAuthHeaders()
        })
            .then(res => res.json())
            .then(data => {
                setDocuments(data);
                setDocsLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch documents:', err);
                setDocsLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave({
                role,
                skills: selectedSkills,
                documentIds: selectedDocumentIds
            });
            onClose();
        } catch (error) {
            console.error('Failed to save device:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSkill = (skill: string) => {
        setSelectedSkills(prev =>
            prev.includes(skill)
                ? prev.filter(s => s !== skill)
                : [...prev, skill]
        );
    };

    const toggleDocument = (docId: string) => {
        setSelectedDocumentIds(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                            编辑设备配置
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{device.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">团队角色</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {ROLES.map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setRole(r.id)}
                                    className={`
                    flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200
                    ${role === r.id
                                            ? `${r.color} border-current ring-1 ring-offset-1 ring-current bg-opacity-10`
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                        }
                  `}
                                >
                                    <span className="text-2xl mb-2">{r.icon}</span>
                                    <span className="text-xs font-medium">{r.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Skills Selection */}
                    {role && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                技能配置
                                <span className="ml-2 text-xs font-normal text-gray-500">
                                    (已选 {selectedSkills.length} 项)
                                </span>
                            </label>
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                <div className="flex flex-wrap gap-2">
                                    {availableSkills.map(skill => (
                                        <button
                                            key={skill}
                                            onClick={() => toggleSkill(skill)}
                                            className={`
                        px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5
                        ${selectedSkills.includes(skill)
                                                    ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }
                      `}
                                        >
                                            {selectedSkills.includes(skill) && <Check size={14} />}
                                            {skill}
                                        </button>
                                    ))}
                                    {availableSkills.length === 0 && (
                                        <span className="text-sm text-gray-400">加载中...</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Document Association */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            关联文档
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                (已选 {selectedDocumentIds.length} 项)
                            </span>
                        </label>
                        <div className="bg-gray-50 rounded-lg border border-gray-100 max-h-60 overflow-y-auto divide-y divide-gray-100">
                            {docsLoading ? (
                                <div className="p-4 text-center text-gray-400 text-sm">加载文档中...</div>
                            ) : documents.length > 0 ? (
                                documents.map(doc => (
                                    <label
                                        key={doc.id}
                                        className={`
                      flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-100 transition-colors
                      ${selectedDocumentIds.includes(doc.id) ? 'bg-indigo-50/50' : ''}
                    `}
                                    >
                                        <div className="relative flex items-center mt-0.5">
                                            <input
                                                type="checkbox"
                                                className="peer h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                checked={selectedDocumentIds.includes(doc.id)}
                                                onChange={() => toggleDocument(doc.id)}
                                            />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                {doc.title}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`
                          text-[10px] px-1.5 py-0.5 rounded
                          ${doc.category === 'standard' ? 'bg-blue-100 text-blue-700' :
                                                        doc.category === 'tech' ? 'bg-purple-100 text-purple-700' :
                                                            doc.category === 'bug' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-100 text-gray-700'}
                        `}>
                                                    {doc.category}
                                                </span>
                                                <span className="text-xs text-gray-400 truncate max-w-[200px]">
                                                    {doc.id}
                                                </span>
                                            </div>
                                        </div>
                                    </label>
                                ))
                            ) : (
                                <div className="p-4 text-center text-gray-400 text-sm">暂无文档</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end items-center gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                        disabled={loading}
                    >
                        取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={16} />
                        )}
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceEditModal;
