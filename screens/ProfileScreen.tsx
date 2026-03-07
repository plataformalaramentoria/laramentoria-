import React, { useState, useEffect } from 'react';
import {
    User, Mail, Edit2, Save, X, Plus, GraduationCap,
    MapPin, BookOpen, Target, Award, Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// --- Types ---
interface ProfileData {
    name: string;
    email: string;
    avatar: string; // Initials or URL
    currentGoal: string; // Objetivo Acadêmico
    interests: string[];
    background: {
        course: string;
        institution: string;
        year: string;
    };
    selectionProcesses: string[]; // List of targets
    plan: {
        name: string;
        startDate: string;
    };
}

const DEFAULT_PROFILE: ProfileData = {
    name: 'Nome da Aluna',
    email: 'email@exemplo.com',
    avatar: 'NA',
    currentGoal: 'Defina seu objetivo acadêmico...',
    interests: [],
    background: {
        course: '',
        institution: '',
        year: ''
    },
    selectionProcesses: [],
    plan: {
        name: 'Plano Básico',
        startDate: ''
    }
};

const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'XX';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ProfileScreen: React.FC = () => {
    const { session } = useAuth(); // Could use session info here

    // --- State ---
    const [profile, setProfile] = useState<ProfileData>(() => {
        const saved = localStorage.getItem('user_profile');
        return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
    });

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<ProfileData>(profile);

    // New Item States (for lists)
    const [newInterest, setNewInterest] = useState('');
    const [newProcess, setNewProcess] = useState('');

    // --- Persistence ---
    useEffect(() => {
        localStorage.setItem('user_profile', JSON.stringify(profile));
    }, [profile]);

    // --- Actions ---

    const handleSave = () => {
        // Recalculate avatar initials based on the new name
        const updatedProfile = {
            ...editForm,
            avatar: getInitials(editForm.name)
        };
        setProfile(updatedProfile);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditForm(profile);
        setIsEditing(false);
    };

    // List Management
    const addInterest = () => {
        if (newInterest.trim()) {
            setEditForm(prev => ({
                ...prev,
                interests: [...prev.interests, newInterest.trim()]
            }));
            setNewInterest('');
        }
    };

    const removeInterest = (index: number) => {
        setEditForm(prev => ({
            ...prev,
            interests: prev.interests.filter((_, i) => i !== index)
        }));
    };

    const addProcess = () => {
        if (newProcess.trim()) {
            setEditForm(prev => ({
                ...prev,
                selectionProcesses: [...prev.selectionProcesses, newProcess.trim()]
            }));
            setNewProcess('');
        }
    };

    const removeProcess = (index: number) => {
        setEditForm(prev => ({
            ...prev,
            selectionProcesses: prev.selectionProcesses.filter((_, i) => i !== index)
        }));
    };

    // --- Render ---

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">

            {/* Header Card */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-8 border border-premium-border dark:border-stone-700 shadow-card dark:shadow-none flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#cdbaa6]/20 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                <div className="relative group">
                    <div className="w-32 h-32 bg-surface dark:bg-dark-surface rounded-full flex items-center justify-center text-secondary dark:text-primary text-4xl font-serif font-bold shadow-inner dark:shadow-none border-4 border-white dark:border-dark-card">
                        {profile.avatar}
                    </div>
                    {/* Avatar Edit Hint (Visual Only) */}
                    {isEditing && (
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Edit2 size={24} />
                        </div>
                    )}
                </div>

                <div className="flex-1 text-center md:text-left z-10 w-full">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nome Completo</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full md:w-2/3 text-2xl font-serif font-bold bg-surface dark:bg-dark-surface border-b-2 border-secondary/50 outline-none text-gray-800 dark:text-gray-100 px-2 py-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Objetivo Acadêmico</label>
                                <input
                                    type="text"
                                    value={editForm.currentGoal}
                                    onChange={e => setEditForm({ ...editForm, currentGoal: e.target.value })}
                                    className="w-full md:w-full text-lg bg-surface dark:bg-dark-surface border-b border-gray-200 dark:border-stone-600 outline-none text-gray-600 dark:text-gray-300 px-2 py-1"
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-4xl font-serif text-gray-800 dark:text-gray-100 font-medium mb-2">{profile.name}</h1>
                            <p className="text-xl text-gray-500 dark:text-gray-400 font-light mb-4">{profile.currentGoal}</p>
                            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-sm text-[#cdbaa6] dark:text-primary font-medium justify-center md:justify-start">
                                <span className="flex items-center"><Mail size={16} className="mr-2" /> {profile.email}</span>
                                <span className="flex items-center px-3 py-1 bg-surface dark:bg-dark-surface rounded-full text-gray-600 dark:text-gray-400">
                                    <Award size={14} className="mr-2" /> {profile.plan.name}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-6 right-6 flex gap-2 z-50">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-600 rounded-lg shadow-sm hover:border-secondary dark:hover:border-primary transition-all text-sm font-bold text-gray-600 dark:text-gray-300"
                        >
                            <Edit2 size={16} /> Editar Perfil
                        </button>
                    ) : (
                        <div className="flex gap-2 animate-fade-in">
                            <button
                                onClick={handleCancel}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-transparent hover:border-red-200"
                                title="Cancelar"
                            >
                                <X size={20} />
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-4 py-2 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-lg shadow-md hover:brightness-110 transition-all text-sm font-bold"
                            >
                                <Save size={16} /> Salvar Alterações
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* --- Formação Acadêmica --- */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm relative group">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-stone-800 pb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <GraduationCap size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider text-sm">Formação Acadêmica</h3>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Curso / Graduação</label>
                                <input
                                    type="text"
                                    value={editForm.background.course}
                                    onChange={e => setEditForm({ ...editForm, background: { ...editForm.background, course: e.target.value } })}
                                    className="w-full p-2 bg-surface dark:bg-dark-surface rounded-lg border-b border-gray-200 text-sm outline-none"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Instituição</label>
                                    <input
                                        type="text"
                                        value={editForm.background.institution}
                                        onChange={e => setEditForm({ ...editForm, background: { ...editForm.background, institution: e.target.value } })}
                                        className="w-full p-2 bg-surface dark:bg-dark-surface rounded-lg border-b border-gray-200 text-sm outline-none"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Ano</label>
                                    <input
                                        type="text"
                                        value={editForm.background.year}
                                        onChange={e => setEditForm({ ...editForm, background: { ...editForm.background, year: e.target.value } })}
                                        className="w-full p-2 bg-surface dark:bg-dark-surface rounded-lg border-b border-gray-200 text-sm outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="pl-4 border-l-2 border-secondary dark:border-primary">
                            <h4 className="font-serif font-bold text-lg text-gray-800 dark:text-gray-200">{profile.background.course}</h4>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.background.institution}</p>
                            <p className="text-xs text-gray-400 mt-1">Conclusão: {profile.background.year}</p>
                        </div>
                    )}
                </div>

                {/* --- Processos Seletivos --- */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-stone-800 pb-4">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg">
                            <Target size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider text-sm">Processos Seletivos</h3>
                    </div>

                    <div className="space-y-3">
                        {(isEditing ? editForm.selectionProcesses : profile.selectionProcesses).map((proc, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-surface dark:bg-dark-surface rounded-xl">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{proc}</span>
                                {isEditing && (
                                    <button onClick={() => removeProcess(index)} className="text-red-400 hover:text-red-600 p-1">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {isEditing && (
                            <div className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    value={newProcess}
                                    onChange={e => setNewProcess(e.target.value)}
                                    placeholder="Adicionar processo (ex: Mestrado USP)"
                                    className="flex-1 bg-transparent border-b border-gray-200 px-2 py-1 text-sm outline-none"
                                    onKeyDown={e => e.key === 'Enter' && addProcess()}
                                />
                                <button
                                    onClick={addProcess}
                                    disabled={!newProcess.trim()}
                                    className="p-2 bg-secondary text-white rounded-lg disabled:opacity-50"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Interesses de Pesquisa (Full Width) --- */}
                <div className="md:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-stone-800 pb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <BookOpen size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider text-sm">Interesses de Pesquisa</h3>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {(isEditing ? editForm.interests : profile.interests).map((tag, index) => (
                            <span
                                key={index}
                                className={`
                       px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2
                       ${isEditing
                                        ? 'bg-white border-dashed border-gray-300 text-gray-600' // Edit style
                                        : 'bg-surface dark:bg-dark-surface text-gray-700 dark:text-gray-300 border-transparent hover:border-[#cdbaa6]/30' // View style
                                    }
                    `}
                            >
                                {tag}
                                {isEditing && (
                                    <button onClick={() => removeInterest(index)} className="hover:text-red-500 rounded-full">
                                        <X size={12} />
                                    </button>
                                )}
                            </span>
                        ))}

                        {isEditing && (
                            <div className="flex items-center gap-2 max-w-xs">
                                <input
                                    type="text"
                                    value={newInterest}
                                    onChange={e => setNewInterest(e.target.value)}
                                    placeholder="Novo interesse..."
                                    className="bg-transparent border-b border-gray-300 px-2 py-1 text-sm outline-none w-32"
                                    onKeyDown={e => e.key === 'Enter' && addInterest()}
                                />
                                <button onClick={addInterest} disabled={!newInterest.trim()} className="text-secondary hover:scale-110 transition-transform disabled:opacity-50">
                                    <Plus size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
