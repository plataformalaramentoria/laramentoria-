import React, { useState, useEffect, useRef } from 'react';
import {
    User, Mail, Edit2, Save, X, Plus, GraduationCap,
    BookOpen, Target, Award, Trash2, Lock, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { supabaseAdmin } from '../services/supabaseAdminClient';

// --- Types ---
interface ProfileData {
    name: string;
    email: string;
    avatar: string;
    currentGoal: string;
    interests: string[];
    background: {
        course: string;
        institution: string;
        year: string;
    };
    selectionProcesses: string[];
    plan: {
        name: string;
        startDate: string;
    };
}

const DEFAULT_PROFILE: ProfileData = {
    name: '', email: '', avatar: '', currentGoal: '',
    interests: [],
    background: { course: '', institution: '', year: '' },
    selectionProcesses: [],
    plan: { name: '', startDate: '' }
};

const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0) return 'XX';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ProfileScreen: React.FC = () => {
    const { session } = useAuth();
    const userId = session?.user?.id;

    const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<ProfileData>(DEFAULT_PROFILE);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [saveMessage, setSaveMessage] = useState('');
    const [loadError, setLoadError] = useState<string | null>(null);

    // New Item States (for lists)
    const [newInterest, setNewInterest] = useState('');
    const [newProcess, setNewProcess] = useState('');

    // Password Change States
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    // Track if we're currently editing to avoid overwriting state on re-fetch
    const isEditingRef = useRef(false);
    isEditingRef.current = isEditing;

    // --- Data Fetching ---
    const fetchProfileData = async (preserveEditState = false) => {
        if (!userId) return;
        if (!preserveEditState) setIsLoading(true);
        try {
            // 1. Fetch main profile via admin client (guarantees read success)
            const { data: profileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) throw profileError;

            // 2. Fetch lists via admin client
            const [bgRes, procRes, intRes] = await Promise.all([
                supabaseAdmin.from('academic_background').select('*').eq('student_id', userId).order('created_at', { ascending: true }),
                supabaseAdmin.from('selection_processes').select('*').eq('student_id', userId).order('created_at', { ascending: true }),
                supabaseAdmin.from('research_interests').select('*').eq('student_id', userId).order('created_at', { ascending: true })
            ]);

            const mainBg = bgRes.data?.[0] || { course: '', institution: '', year: '' };

            const fullProfile: ProfileData = {
                name: profileData.full_name || '',
                email: session?.user?.email || '',
                avatar: getInitials(profileData.full_name || 'Alunx'),
                currentGoal: profileData.current_goal || '',
                interests: intRes.data?.map(i => i.interest) || [],
                background: {
                    course: mainBg.course || '',
                    institution: mainBg.institution || '',
                    year: mainBg.year || ''
                },
                selectionProcesses: procRes.data?.map(p => p.institution) || [],
                plan: {
                    name: profileData.plan || 'Plano Básico',
                    startDate: new Date(profileData.created_at).toLocaleDateString('pt-BR')
                }
            };

            setProfile(fullProfile);
            // Only update editForm if NOT currently editing (avoid overwriting user's uncommitted changes)
            if (!isEditingRef.current) {
                setEditForm(fullProfile);
            }
            setLoadError(null);
        } catch (err: any) {
            console.error("Error fetching profile:", err);
            setLoadError(err.message || String(err));
        } finally {
            setIsLoading(false);
        }
    };

    // Safety timeout: If loading takes more than 5 seconds, stop it
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                console.warn("Profile fetch timed out");
                setIsLoading(false);
                if (!profile.name) setLoadError("O carregamento demorou demais. Verifique sua conexão ou se o perfil existe.");
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [isLoading, profile.name]);

    // Only fetch on mount and when userId changes — NOT on every session change
    useEffect(() => {
        if (userId) {
            fetchProfileData();
        } else {
            // No user yet (auth still loading) — stop loading spinner
            setIsLoading(false);
        }
    }, [userId]);

    // --- Save ---
    const handleSave = async () => {
        if (!userId) return;
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            // 1. Update main profile via admin client
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({
                    full_name: editForm.name,
                    current_goal: editForm.currentGoal
                })
                .eq('id', userId);

            if (profileError) throw new Error('Erro ao salvar perfil: ' + profileError.message);

            // 2. Upsert academic background via admin client
            const { data: existingBg } = await supabaseAdmin
                .from('academic_background')
                .select('id')
                .eq('student_id', userId)
                .limit(1);

            if (existingBg && existingBg.length > 0) {
                const { error: bgErr } = await supabaseAdmin
                    .from('academic_background')
                    .update({
                        course: editForm.background.course,
                        institution: editForm.background.institution,
                        year: editForm.background.year
                    })
                    .eq('id', existingBg[0].id);
                if (bgErr) throw new Error('Erro ao salvar formação: ' + bgErr.message);
            } else {
                const { error: bgErr } = await supabaseAdmin
                    .from('academic_background')
                    .insert({
                        student_id: userId,
                        course: editForm.background.course,
                        institution: editForm.background.institution,
                        year: editForm.background.year
                    });
                if (bgErr) throw new Error('Erro ao salvar formação: ' + bgErr.message);
            }

            // 3. Sync Research Interests via admin client
            const { error: delIntErr } = await supabaseAdmin
                .from('research_interests')
                .delete()
                .eq('student_id', userId);
            
            if (editForm.interests.length > 0) {
                const { error: intErr } = await supabaseAdmin
                    .from('research_interests')
                    .insert(editForm.interests.map(i => ({ student_id: userId, interest: i })));
                if (intErr) throw new Error('Erro ao salvar interesses: ' + intErr.message);
            }

            // 4. Sync Selection Processes via admin client
            const { error: delProcErr } = await supabaseAdmin
                .from('selection_processes')
                .delete()
                .eq('student_id', userId);

            if (editForm.selectionProcesses.length > 0) {
                const { error: procErr } = await supabaseAdmin
                    .from('selection_processes')
                    .insert(editForm.selectionProcesses.map(p => ({ student_id: userId, institution: p })));
                if (procErr) throw new Error('Erro ao salvar processos seletivos: ' + procErr.message);
            }

            // 5. Update local display state with saved data (no re-fetch needed)
            setProfile({ ...editForm, avatar: getInitials(editForm.name || 'Alunx') });
            setIsEditing(false);
            setSaveStatus('success');
            setSaveMessage('Perfil salvo com sucesso!');
            setTimeout(() => setSaveStatus('idle'), 4000);

        } catch (err: any) {
            console.error('Save error:', err);
            setSaveStatus('error');
            setSaveMessage(err.message || 'Erro desconhecido ao salvar.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditForm(profile);
        setIsEditing(false);
        setNewInterest('');
        setNewProcess('');
    };

    // List Management
    const addInterest = () => {
        const trimmed = newInterest.trim();
        if (!trimmed) return;
        setEditForm(prev => ({ ...prev, interests: [...prev.interests, trimmed] }));
        setNewInterest('');
    };

    const removeInterest = (index: number) => {
        setEditForm(prev => ({ ...prev, interests: prev.interests.filter((_, i) => i !== index) }));
    };

    const addProcess = () => {
        const trimmed = newProcess.trim();
        if (!trimmed) return;
        setEditForm(prev => ({ ...prev, selectionProcesses: [...prev.selectionProcesses, trimmed] }));
        setNewProcess('');
    };

    const removeProcess = (index: number) => {
        setEditForm(prev => ({ ...prev, selectionProcesses: prev.selectionProcesses.filter((_, i) => i !== index) }));
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword.length < 6) { setPasswordError("A nova senha deve ter no mínimo 6 caracteres."); return; }
        if (newPassword !== confirmPassword) { setPasswordError("A nova senha e a confirmação não coincidem."); return; }
        if (!session?.user?.email) { setPasswordError("Sessão inválida. Faça login novamente."); return; }

        setIsChangingPassword(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) throw updateError;

            await supabase.from('profiles').update({ force_password_change: false }).eq('id', userId);

            setPasswordSuccess("Senha alterada com sucesso!");
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err: any) {
            setPasswordError(err.message);
        } finally {
            setIsChangingPassword(false);
            setTimeout(() => setPasswordSuccess(''), 5000);
        }
    };

    // --- Render ---

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-white dark:bg-dark-card rounded-2xl p-8 border border-premium-border dark:border-stone-700 shadow-card flex flex-col items-center justify-center min-h-[300px] animate-pulse">
                    <Loader size={32} className="animate-spin text-secondary dark:text-primary mb-4" />
                    <p className="text-gray-400 font-medium">Carregando seu perfil...</p>
                </div>
            </div>
        );
    }

    if (loadError && !profile.name) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Erro ao carregar perfil</h2>
                    <p className="text-red-600 dark:text-red-300 mb-6">{loadError}</p>
                    <button 
                        onClick={() => { setLoadError(null); setIsLoading(true); fetchProfileData(); }}
                        className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    const displayData = isEditing ? editForm : profile;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">

            {/* Save Status Banner */}
            {saveStatus !== 'idle' && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl text-sm font-medium animate-fade-in ${
                    saveStatus === 'success'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                    {saveStatus === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {saveMessage}
                </div>
            )}

            {/* Header Card */}
            <div className="bg-white dark:bg-dark-card rounded-2xl p-8 border border-premium-border dark:border-stone-700 shadow-card dark:shadow-none flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#cdbaa6]/20 to-transparent rounded-bl-full -mr-16 -mt-16 pointer-events-none" />

                <div className="relative group">
                    <div className="w-32 h-32 bg-surface dark:bg-dark-surface rounded-full flex items-center justify-center text-secondary dark:text-primary text-4xl font-serif font-bold shadow-inner dark:shadow-none border-4 border-white dark:border-dark-card">
                        {getInitials(displayData.name || 'Alunx')}
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left z-10 w-full">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nome Completo</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full md:w-2/3 text-2xl font-serif font-bold bg-surface dark:bg-dark-surface border-b-2 border-secondary/50 outline-none text-gray-800 dark:text-gray-100 px-2 py-1"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Objetivo Acadêmico</label>
                                <input
                                    type="text"
                                    value={editForm.currentGoal}
                                    onChange={e => setEditForm(prev => ({ ...prev, currentGoal: e.target.value }))}
                                    className="w-full text-lg bg-surface dark:bg-dark-surface border-b border-gray-200 dark:border-stone-600 outline-none text-gray-600 dark:text-gray-300 px-2 py-1"
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
                                disabled={isSaving}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-white dark:bg-stone-800 rounded-lg shadow-sm border border-transparent hover:border-red-200 disabled:opacity-50"
                                title="Cancelar"
                            >
                                <X size={20} />
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-lg shadow-md hover:brightness-110 transition-all text-sm font-bold disabled:opacity-50"
                            >
                                {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
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
                                    onChange={e => setEditForm(prev => ({ ...prev, background: { ...prev.background, course: e.target.value } }))}
                                    className="w-full p-2 bg-surface dark:bg-dark-surface rounded-lg border-b border-gray-200 dark:border-stone-600 text-sm outline-none dark:text-gray-200"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Instituição</label>
                                    <input
                                        type="text"
                                        value={editForm.background.institution}
                                        onChange={e => setEditForm(prev => ({ ...prev, background: { ...prev.background, institution: e.target.value } }))}
                                        className="w-full p-2 bg-surface dark:bg-dark-surface rounded-lg border-b border-gray-200 dark:border-stone-600 text-sm outline-none dark:text-gray-200"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Ano</label>
                                    <input
                                        type="text"
                                        value={editForm.background.year}
                                        onChange={e => setEditForm(prev => ({ ...prev, background: { ...prev.background, year: e.target.value } }))}
                                        className="w-full p-2 bg-surface dark:bg-dark-surface rounded-lg border-b border-gray-200 dark:border-stone-600 text-sm outline-none dark:text-gray-200"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="pl-4 border-l-2 border-secondary dark:border-primary">
                            <h4 className="font-serif font-bold text-lg text-gray-800 dark:text-gray-200">{profile.background.course || <span className="text-gray-300 italic font-normal text-base">Não informado</span>}</h4>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">{profile.background.institution}</p>
                            {profile.background.year && <p className="text-xs text-gray-400 mt-1">Conclusão: {profile.background.year}</p>}
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
                        {displayData.selectionProcesses.map((proc, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-surface dark:bg-dark-surface rounded-xl">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{proc}</span>
                                {isEditing && (
                                    <button onClick={() => removeProcess(index)} className="text-red-400 hover:text-red-600 p-1 ml-2 shrink-0">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {displayData.selectionProcesses.length === 0 && !isEditing && (
                            <p className="text-sm text-gray-400 italic">Nenhum processo seletivo cadastrado.</p>
                        )}

                        {isEditing && (
                            <div className="flex gap-2 pt-2">
                                <input
                                    type="text"
                                    value={newProcess}
                                    onChange={e => setNewProcess(e.target.value)}
                                    placeholder="Adicionar processo (ex: Mestrado USP)"
                                    className="flex-1 bg-transparent border-b border-gray-200 dark:border-stone-600 px-2 py-1 text-sm outline-none dark:text-gray-200"
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProcess())}
                                />
                                <button onClick={addProcess} disabled={!newProcess.trim()} className="p-2 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-lg disabled:opacity-50">
                                    <Plus size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Interesses de Pesquisa --- */}
                <div className="md:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-stone-800 pb-4">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <BookOpen size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider text-sm">Interesses de Pesquisa</h3>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {displayData.interests.map((tag, index) => (
                            <span key={index} className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${
                                isEditing
                                    ? 'bg-white dark:bg-stone-800 border-dashed border-gray-300 dark:border-stone-600 text-gray-600 dark:text-gray-300'
                                    : 'bg-surface dark:bg-dark-surface text-gray-700 dark:text-gray-300 border-transparent hover:border-[#cdbaa6]/30'
                            }`}>
                                {tag}
                                {isEditing && (
                                    <button onClick={() => removeInterest(index)} className="hover:text-red-500 rounded-full ml-1">
                                        <X size={12} />
                                    </button>
                                )}
                            </span>
                        ))}
                        {displayData.interests.length === 0 && !isEditing && (
                            <p className="text-sm text-gray-400 italic">Nenhum interesse cadastrado.</p>
                        )}

                        {isEditing && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newInterest}
                                    onChange={e => setNewInterest(e.target.value)}
                                    placeholder="Novo interesse..."
                                    className="bg-transparent border-b border-gray-300 dark:border-stone-600 px-2 py-1 text-sm outline-none w-40 dark:text-gray-200"
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                                />
                                <button onClick={addInterest} disabled={!newInterest.trim()} className="text-secondary dark:text-primary hover:scale-110 transition-transform disabled:opacity-50">
                                    <Plus size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Segurança da Conta --- */}
                <div className="md:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm mt-2">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-100 dark:border-stone-800 pb-4">
                        <div className="p-2 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg">
                            <Lock size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider text-sm">Segurança da Conta</h3>
                            <p className="text-xs text-gray-500">Altere sua senha de acesso à plataforma</p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="max-w-xl space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Senha Atual</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 focus:border-secondary transition-colors text-sm outline-none dark:text-white"
                                required
                            />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Nova Senha</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 focus:border-secondary transition-colors text-sm outline-none dark:text-white"
                                    required minLength={6}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 focus:border-secondary transition-colors text-sm outline-none dark:text-white"
                                    required minLength={6}
                                />
                            </div>
                        </div>

                        {passwordError && <p className="text-red-500 text-xs font-bold">{passwordError}</p>}
                        {passwordSuccess && <p className="text-green-500 text-xs font-bold">{passwordSuccess}</p>}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                                className="px-6 py-2.5 bg-stone-800 dark:bg-stone-700 hover:bg-black dark:hover:bg-stone-600 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isChangingPassword ? <Loader size={14} className="animate-spin" /> : null}
                                {isChangingPassword ? 'Atualizando...' : 'Atualizar Senha'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
