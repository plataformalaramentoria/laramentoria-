import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, MessageSquare, BookOpen, TrendingUp, Save, CheckCircle, Target, ListTodo, Calendar as CalendarIcon, Edit2, Trash2, Plus, Lock, GraduationCap } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { supabaseAdmin } from '../../services/supabaseAdminClient';
import { useAuth } from '../../contexts/AuthContext';
import { TaskModal, GoalModal, EventModal } from '../../components/DashboardModals';
import { StageModal, ChecklistModal } from '../../components/ProgressModals';
import Projects from '../Projects';
import { CurriculumScreen } from '../CurriculumScreen';
import { ConfirmModal } from '../../components/ConfirmModal';
import { DashboardTask, DashboardGoal, AgendaEvent, ProgressStage, ProgressItem } from '../../types';

interface StudentProfileViewProps {
    studentId: string;
    onBack: () => void;
}

interface ProfileData {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    current_goal?: string;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({ studentId, onBack }) => {
    const { user: currentUser } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Sub-modules data
    const [homeMessage, setHomeMessage] = useState('');
    const [isSavingMessage, setIsSavingMessage] = useState(false);
    
    // Password Reset
    const [tempPassword, setTempPassword] = useState('');
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    
    // Progress Data
    const [stages, setStages] = useState<ProgressStage[]>([]);

    // Dashboard Data
    const [tasks, setTasks] = useState<DashboardTask[]>([]);
    const [goals, setGoals] = useState<DashboardGoal[]>([]);
    const [events, setEvents] = useState<AgendaEvent[]>([]);

    // Profile Extensions
    const [background, setBackground] = useState<{ course: string; institution: string; year: string } | null>(null);
    const [interests, setInterests] = useState<string[]>([]);
    const [selectionProcesses, setSelectionProcesses] = useState<string[]>([]);

    // Modal States
    const [taskModalState, setTaskModalState] = useState<{ isOpen: boolean, data?: DashboardTask | null }>({ isOpen: false });
    const [goalModalState, setGoalModalState] = useState<{ isOpen: boolean, data?: DashboardGoal | null }>({ isOpen: false });
    const [eventModalState, setEventModalState] = useState<{ isOpen: boolean, data?: AgendaEvent | null }>({ isOpen: false });
    const [stageModalState, setStageModalState] = useState<{ isOpen: boolean, data?: ProgressStage | null }>({ isOpen: false });
    const [checklistModalState, setChecklistModalState] = useState<{ isOpen: boolean, stageId: string, data?: ProgressItem | null }>({ isOpen: false, stageId: '' });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, title: string, message: string, action: () => Promise<void> | void }>({ 
        isOpen: false, title: '', message: '', action: () => {} 
    });

    const loadStudentData = async (mounted: { current: boolean }) => {
        setIsLoading(true);
        try {
            const [
                profRes,
                msgRes,
                stagesRes,
                itemsRes,
                tasksRes,
                goalsRes,
                eventsRes,
                bgRes,
                procRes,
                intRes
            ] = await Promise.all([
                supabaseAdmin.from('profiles').select('*').eq('id', studentId).single(),
                supabaseAdmin.from('advisor_messages').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1),
                supabase.from('progress_stages').select('*').eq('student_id', studentId).order('order', { ascending: true }),
                supabase.from('progress_items').select('*').eq('student_id', studentId).order('order', { ascending: true }),
                supabaseAdmin.from('dashboard_tasks').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
                supabaseAdmin.from('dashboard_goals').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
                supabaseAdmin.from('agenda_events').select('*').eq('student_id', studentId).order('event_date', { ascending: true }),
                supabaseAdmin.from('academic_background').select('*').eq('student_id', studentId).limit(1).maybeSingle(),
                supabaseAdmin.from('selection_processes').select('*').eq('student_id', studentId).order('created_at', { ascending: true }),
                supabaseAdmin.from('research_interests').select('*').eq('student_id', studentId).order('created_at', { ascending: true })
            ]);

            if (!mounted.current) return;

            if (profRes.data) {
                setProfile({ 
                    id: profRes.data.id, 
                    full_name: profRes.data.full_name || 'Usuário Sem Nome', 
                    role: profRes.data.role,
                    current_goal: profRes.data.current_goal 
                });
            }
            if (msgRes.data && msgRes.data.length > 0) setHomeMessage(msgRes.data[0].content);
            if (stagesRes.data) {
                const combined = stagesRes.data.map(stage => ({
                    ...stage,
                    items: (itemsRes.data || []).filter(item => item.stage_id === stage.id)
                }));
                setStages(combined);
            }
            if (tasksRes.data) setTasks(tasksRes.data as DashboardTask[]);
            if (goalsRes.data) setGoals(goalsRes.data as DashboardGoal[]);
            if (eventsRes.data) setEvents(eventsRes.data as AgendaEvent[]);
            
            if (bgRes.data) setBackground(bgRes.data);
            if (procRes.data) setSelectionProcesses(procRes.data.map((p: any) => p.institution));
            if (intRes.data) setInterests(intRes.data.map((i: any) => i.interest));

        } catch (err) {
            console.error("Error fetching student details:", err);
        } finally {
            if (mounted.current) setIsLoading(false);
        }
    };

    const mountedRef = React.useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        loadStudentData(mountedRef);
        return () => { mountedRef.current = false; };
    }, [studentId]);

    const fetchProgressData = async (_uid: string) => {
        await loadStudentData(mountedRef);
    };

    const handleSaveMessage = async () => {
        if (!currentUser) return;
        setIsSavingMessage(true);
        try {
            const { data: existing } = await supabase.from('advisor_messages').select('id').eq('student_id', studentId).limit(1);
            if (existing && existing.length > 0) {
                await supabase.from('advisor_messages').update({ 
                    content: homeMessage, 
                    is_seen: false,
                    updated_by: currentUser.id 
                }).eq('id', existing[0].id);
            } else {
                await supabase.from('advisor_messages').insert([{ 
                    student_id: studentId,
                    content: homeMessage,
                    is_seen: false,
                    updated_by: currentUser.id
                }]);
            }
            alert("Mensagem atualizada!");
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar mensagem.");
        } finally {
            setIsSavingMessage(false);
        }
    };

    const handleDeleteMessage = async () => {
        setConfirmModalState({
            isOpen: true,
            title: "Excluir Mensagem",
            message: "Deseja remover o recado deste usuário?",
            action: async () => {
                await supabase.from('advisor_messages').delete().eq('student_id', studentId);
                setHomeMessage('');
                setConfirmModalState(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleResetPassword = async () => {
        if (tempPassword.length < 6) return alert("Mínimo 6 caracteres.");
        setIsResettingPassword(true);
        try {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(studentId, { password: tempPassword });
            if (error) throw error;
            alert("Senha atualizada com sucesso pelo administrador.");
            setTempPassword('');
        } catch (err: any) {
            console.error(err);
            alert("Erro ao resetar senha: " + err.message);
        } finally {
            setIsResettingPassword(false);
        }
    };

    // Dashboard Handlers
    const handleSaveTask = async (data: any) => {
        if (taskModalState.data) {
            await supabaseAdmin.from('dashboard_tasks').update(data).eq('id', taskModalState.data.id);
        } else {
            await supabaseAdmin.from('dashboard_tasks').insert([{ ...data, student_id: studentId }]);
        }
        await loadStudentData(mountedRef);
    };

    const handleDeleteTask = async (id: string) => {
        if (confirm("Excluir tarefa?")) {
            await supabaseAdmin.from('dashboard_tasks').delete().eq('id', id);
            await loadStudentData(mountedRef);
        }
    };

    const handleSaveGoal = async (data: any) => {
        if (goalModalState.data) {
            await supabaseAdmin.from('dashboard_goals').update(data).eq('id', goalModalState.data.id);
        } else {
            await supabaseAdmin.from('dashboard_goals').insert([{ ...data, student_id: studentId }]);
        }
        await loadStudentData(mountedRef);
    };

    const handleDeleteGoal = async (id: string) => {
        if (confirm("Excluir meta?")) {
            await supabaseAdmin.from('dashboard_goals').delete().eq('id', id);
            await loadStudentData(mountedRef);
        }
    };

    const handleSaveEvent = async (data: any) => {
        if (eventModalState.data) {
            await supabaseAdmin.from('agenda_events').update(data).eq('id', eventModalState.data.id);
        } else {
            await supabaseAdmin.from('agenda_events').insert([{ ...data, student_id: studentId }]);
        }
        await loadStudentData(mountedRef);
    };

    const handleDeleteEvent = async (id: string) => {
        if (confirm("Excluir evento?")) {
            await supabaseAdmin.from('agenda_events').delete().eq('id', id);
            await loadStudentData(mountedRef);
        }
    };

    // Journey Handlers
    const handleSaveStage = async (data: { title: string }) => {
        if (stageModalState.data) {
            await supabase.from('progress_stages').update({ title: data.title }).eq('id', stageModalState.data.id);
        } else {
            const order = stages.length;
            await supabase.from('progress_stages').insert([{ student_id: studentId, title: data.title, order }]);
        }
        await fetchProgressData(studentId);
    };

    const handleDeleteStage = async (stageId: string) => {
        setConfirmModalState({
            isOpen: true,
            title: "Excluir Etapa",
            message: "Isso removerá permanentemente a etapa e todos os seus itens associados. Prosseguir?",
            action: async () => {
                try {
                    const { error, data: deleted } = await supabase.from('progress_stages').delete().eq('id', stageId).select();
                    if (error) throw new Error(error.message);
                    if (!deleted || deleted.length === 0) throw new Error("Exclusão negada ou item já removido.");
                    await fetchProgressData(studentId);
                } catch(err: any) {
                    console.error("Erro ao deletar etapa e seus itens:", err);
                    alert("Erro ao excluir etapa: " + err.message);
                } finally {
                    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleSaveChecklistItem = async (data: { title: string, stage_id: string }) => {
        const stage = stages.find(s => s.id === data.stage_id);
        const order = stage?.items?.length || 0;

        if (checklistModalState.data) {
            await supabase.from('progress_items').update({ title: data.title }).eq('id', checklistModalState.data.id);
        } else {
            await supabase.from('progress_items').insert([{ student_id: studentId, stage_id: data.stage_id, title: data.title, order }]);
        }
        await fetchProgressData(studentId);
    };

    const handleToggleChecklistItem = async (itemId: string, currentStatus: boolean) => {
        try {
            const { error, data: updated } = await supabase.from('progress_items').update({ completed: !currentStatus }).eq('id', itemId).select();
            if (error) throw error;
            if (!updated || updated.length === 0) throw new Error("A alteração não foi salva no banco.");
            setStages(prev => prev.map(s => ({
                ...s,
                items: s.items?.map(i => i.id === itemId ? { ...i, completed: !currentStatus } : i)
            })));
        } catch(err: any) {
            console.error(err);
            alert("Erro ao alterar o status do checklist: " + err.message);
        }
    };

    const handleDeleteChecklistItem = (itemId: string) => {
        setConfirmModalState({
            isOpen: true,
            title: "Excluir Item",
            message: "Tem certeza que deseja remover este item do checklist?",
            action: async () => {
                const { error, data: deleted } = await supabase.from('progress_items').delete().eq('id', itemId).select();
                if (error) throw new Error(error.message);
                if (!deleted || deleted.length === 0) throw new Error("Não foi possível excluir o item do banco.");
                await fetchProgressData(studentId);
                setConfirmModalState(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // useMemo for Journey stats
    const progressStats = useMemo(() => {
        let total = 0;
        let completed = 0;
        stages.forEach(stage => {
            (stage.items || []).forEach(item => {
                total++;
                if (item.completed) completed++;
            });
        });
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percent };
    }, [stages]);

    if (isLoading) {
        return <div className="animate-pulse space-y-6">
            <div className="h-20 bg-gray-100 dark:bg-stone-800 rounded-2xl"></div>
            <div className="h-64 bg-gray-100 dark:bg-stone-800 rounded-2xl"></div>
        </div>;
    }

    if (!profile) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p>Aluna não encontrada.</p>
                <button onClick={onBack} className="mt-4 text-secondary dark:text-primary underline">Voltar</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm">
                <button 
                    onClick={onBack}
                    className="p-2 hover:bg-surface dark:hover:bg-stone-800 rounded-full transition-colors text-gray-500 dark:text-gray-400"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="w-12 h-12 bg-secondary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-secondary dark:text-primary font-bold text-lg uppercase shrink-0">
                    {profile.full_name.substring(0, 2)}
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{profile.full_name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {profile.current_goal ? (
                            <span className="italic mr-2">"{profile.current_goal}"</span>
                        ) : (
                            <span>Painel de Gestão Individual • </span>
                        )}
                        <span className="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Ativa</span>
                    </p>
                </div>
            </div>

            {/* Profile Overview (Academic Background, Selection, Interests) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-blue-50 dark:border-blue-900/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                        <GraduationCap size={18} />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Formação Acadêmica</h4>
                    </div>
                    {background ? (
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{background.course}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{background.institution}</p>
                            <p className="text-[10px] text-gray-400">Conclusão: {background.year}</p>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 italic">Não informada pelo usuário</p>
                    )}
                </div>

                <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-purple-50 dark:border-purple-900/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-purple-600 dark:text-purple-400">
                        <Target size={18} />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Processos Seletivos</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {selectionProcesses.length > 0 ? (
                            selectionProcesses.map((p, i) => (
                                <span key={i} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-md text-[10px] font-medium border border-purple-100 dark:border-purple-800">
                                    {p}
                                </span>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 italic">Nenhum cadastrado</p>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-dark-card p-5 rounded-2xl border border-emerald-50 dark:border-emerald-900/20 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-emerald-600 dark:text-emerald-400">
                        <BookOpen size={18} />
                        <h4 className="text-xs font-bold uppercase tracking-wider">Interesses de Pesquisa</h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {interests.length > 0 ? (
                            interests.map((it, i) => (
                                <span key={i} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md text-[10px] font-medium border border-emerald-100 dark:border-emerald-800">
                                    {it}
                                </span>
                            ))
                        ) : (
                            <p className="text-xs text-gray-400 italic">Nenhum cadastrado</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* LEFT COLUMN */}
                <div className="flex flex-col gap-6">
                    {/* Home Message Panel */}
                    <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <MessageSquare className="text-amber-500" size={20} />
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">Mensagem da Home (Mural)</h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Escreva um recado direto que aparecerá na tela inicial deste usuário. Use para cobranças, incentivos ou lembretes importantes.
                        </p>
                        <textarea 
                            value={homeMessage}
                            onChange={e => setHomeMessage(e.target.value)}
                            placeholder="Ex: Olá! Aguardo o envio do seu projeto revisado..."
                            className="w-full flex-1 min-h-[120px] p-4 bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-700 rounded-xl outline-none focus:ring-2 focus:ring-secondary/20 transition-all resize-none text-sm dark:text-gray-200"
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <button 
                                onClick={handleDeleteMessage}
                                disabled={isSavingMessage || !homeMessage}
                                className="text-red-500 hover:text-red-700 text-xs font-bold transition-colors disabled:opacity-30"
                            >
                                Excluir Mensagem
                            </button>
                            <button 
                                onClick={handleSaveMessage}
                                disabled={isSavingMessage || !homeMessage}
                                className="flex items-center gap-2 bg-secondary hover:bg-[#6b5d52] text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                <Save size={16} /> 
                                {isSavingMessage ? 'Salvando...' : 'Atualizar Mensagem'}
                            </button>
                        </div>
                    </div>

                    {/* Password Reset Panel */}
                    <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg">
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-gray-100">Reset de Senha</h3>
                                <p className="text-[10px] text-gray-400 uppercase">Ação Administrativa</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            Defina uma senha provisória se o usuário esqueceu o acesso. Ele será <strong>obrigado</strong> a trocá-la no próximo login.
                        </p>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={tempPassword}
                                onChange={e => setTempPassword(e.target.value)}
                                placeholder="Nova Senha Prov. (Mín 6)"
                                className="flex-1 h-11 px-4 bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-700 rounded-xl outline-none focus:border-red-400 transition-all text-sm dark:text-gray-200"
                            />
                            <button 
                                onClick={handleResetPassword}
                                disabled={isResettingPassword || !tempPassword}
                                className="h-11 px-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                            >
                                {isResettingPassword ? 'Atualizando...' : 'Definir Senha'}
                            </button>
                        </div>
                    </div>

                    {/* Tasks Overview */}
                    <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <ListTodo className="text-secondary dark:text-primary" size={20} />
                                <h3 className="font-bold text-gray-800 dark:text-gray-100">Próximos Passos</h3>
                            </div>
                            <button onClick={() => setTaskModalState({ isOpen: true, data: null })} className="text-secondary dark:text-primary hover:bg-surface dark:hover:bg-stone-800 p-1.5 rounded-lg transition-colors">
                                <Plus size={18} />
                            </button>
                        </div>
                        {tasks.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Nenhum próximo passo definido.</p>
                        ) : (
                            <div className="space-y-3">
                                {tasks.map(task => (
                                    <div key={task.id} className="group flex justify-between items-start p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-50 dark:border-stone-800 transition-colors hover:border-secondary/30 dark:hover:border-primary/30">
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                <div className={`w-2 h-2 mt-1.5 rounded-full ${task.is_urgent ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{task.text}</p>
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${task.is_urgent ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    PRAZO: {task.due_label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setTaskModalState({ isOpen: true, data: task })} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteTask(task.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col gap-6">
                    {/* Events Overview */}
                    <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="text-secondary dark:text-primary" size={20} />
                                <h3 className="font-bold text-gray-800 dark:text-gray-100">Agenda</h3>
                            </div>
                            <button onClick={() => setEventModalState({ isOpen: true, data: null })} className="text-secondary dark:text-primary hover:bg-surface dark:hover:bg-stone-800 p-1.5 rounded-lg transition-colors">
                                <Plus size={18} />
                            </button>
                        </div>
                        {events.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Nenhum evento agendado.</p>
                        ) : (
                            <div className="space-y-3">
                                {events.map(event => (
                                    <div key={event.id} className="group flex justify-between items-center p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-50 dark:border-stone-800 transition-colors hover:border-secondary/30 dark:hover:border-primary/30">
                                        <div className="flex items-center gap-4">
                                            <div className="text-center bg-white dark:bg-stone-800 rounded-lg px-3 py-1.5 shadow-sm border border-gray-100 dark:border-stone-700 min-w-[50px]">
                                                <span className="block text-[10px] uppercase font-bold text-gray-500 leading-none mb-1">{event.date_month}</span>
                                                <span className="block text-lg font-bold text-secondary dark:text-primary leading-none">{event.date_day}</span>
                                            </div>
                                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{event.text}</p>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEventModalState({ isOpen: true, data: event })} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                                                <Edit2 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                
                    {/* Progress Overview */}
                    <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="text-green-500" size={20} />
                                <h3 className="font-bold text-gray-800 dark:text-gray-100">Jornada do Aluno</h3>
                            </div>
                            <button onClick={() => setStageModalState({ isOpen: true, data: null })} className="text-secondary dark:text-primary hover:bg-surface dark:hover:bg-stone-800 p-1.5 rounded-lg transition-colors" title="Adicionar Nova Etapa">
                                <Plus size={18} />
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Resumo de Checklists</span>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{progressStats.completed} / {progressStats.total}</span>
                        </div>
                        
                        <div className="w-full bg-gray-100 dark:bg-stone-800 rounded-full h-2.5 mb-6 overflow-hidden">
                            <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressStats.percent}%` }}></div>
                        </div>

                        {stages.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Nenhuma etapa de jornada criada.</p>
                        ) : (
                            <div className="space-y-4">
                                {stages.map(stage => {
                                    const stageItems = stage.items || [];
                                    const stageTotal = stageItems.length;
                                    const stageCompleted = stageItems.filter(i => i.completed).length;

                                    return (
                                        <div key={stage.id} className="border border-gray-100 dark:border-stone-800 rounded-xl overflow-hidden">
                                            <div className="bg-surface dark:bg-stone-800/50 p-3 flex justify-between items-center group">
                                                <div>
                                                    <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200">{stage.title}</h4>
                                                    <span className="text-xs text-gray-500">{stageCompleted}/{stageTotal} concluídos</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => setChecklistModalState({ isOpen: true, stageId: stage.id, data: null })} className="p-1.5 bg-white dark:bg-stone-700 rounded text-gray-500 hover:text-green-600 shadow-sm" title="Adicionar Item">
                                                        <Plus size={14} />
                                                    </button>
                                                    <button onClick={() => setStageModalState({ isOpen: true, data: stage })} className="p-1.5 bg-white dark:bg-stone-700 rounded text-gray-500 hover:text-blue-500 shadow-sm">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteStage(stage.id)} className="p-1.5 bg-white dark:bg-stone-700 rounded text-gray-500 hover:text-red-500 shadow-sm">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-2 space-y-1">
                                                {stageItems.length === 0 ? (
                                                    <p className="text-xs text-gray-400 p-2 text-center">Nenhum item adicionado.</p>
                                                ) : (
                                                    stageItems.map(item => (
                                                        <div key={item.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 dark:hover:bg-stone-800/50 rounded-lg group text-sm">
                                                            <button onClick={() => handleToggleChecklistItem(item.id, item.completed)} className="focus:outline-none">
                                                                <CheckCircle size={16} className={item.completed ? "text-green-500" : "text-gray-300 dark:text-gray-600"} />
                                                            </button>
                                                            <span className={`flex-1 truncate ${item.completed ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>
                                                                {item.title}
                                                            </span>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                                                <button onClick={() => setChecklistModalState({ isOpen: true, stageId: stage.id, data: item })} className="p-1 text-gray-400 hover:text-blue-500">
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button onClick={() => handleDeleteChecklistItem(item.id)} className="p-1 text-gray-400 hover:text-red-500">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {/* Goals Overview */}
                    <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Target className="text-secondary dark:text-primary" size={20} />
                                <h3 className="font-bold text-gray-800 dark:text-gray-100">Metas Atuais</h3>
                            </div>
                            <button onClick={() => setGoalModalState({ isOpen: true, data: null })} className="text-secondary dark:text-primary hover:bg-surface dark:hover:bg-stone-800 p-1.5 rounded-lg transition-colors">
                                <Plus size={18} />
                            </button>
                        </div>
                        {goals.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">Nenhuma meta definida.</p>
                        ) : (
                            <div className="space-y-4">
                                {goals.map(goal => (
                                    <div key={goal.id} className="group flex flex-col gap-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-gray-700 dark:text-gray-200">{goal.title}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-secondary dark:text-primary">{goal.percent}%</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setGoalModalState({ isOpen: true, data: goal })} className="p-1 text-gray-400 hover:text-blue-500 transition-colors">
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button onClick={() => handleDeleteGoal(goal.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-stone-800 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-secondary dark:bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${goal.percent}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* --- FULL RESEARCH PROJECTS MODULE (SHARED) --- */}
            <div className="bg-white dark:bg-dark-card p-4 md:p-8 rounded-3xl border border-gray-100 dark:border-stone-700 shadow-level-1">
                <Projects studentId={studentId} />
            </div>

            {/* Curriculum Integration */}
            <div className="bg-white dark:bg-dark-card p-8 rounded-3xl border border-gray-100 dark:border-stone-700 shadow-level-1">
                <div className="mb-6">
                    <h3 className="text-xl font-serif font-bold text-secondary dark:text-primary">Mapeamento de Currículo</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Visualize e edite as seções do currículo Lattes desta aluna.</p>
                </div>
                <CurriculumScreen studentId={studentId} />
            </div>
            
            {/* Modals for Dashboard elements */}
            <TaskModal
                isOpen={taskModalState.isOpen}
                onClose={() => setTaskModalState({ isOpen: false })}
                onSave={handleSaveTask}
                initialData={taskModalState.data}
            />
            <GoalModal
                isOpen={goalModalState.isOpen}
                onClose={() => setGoalModalState({ isOpen: false })}
                onSave={handleSaveGoal}
                initialData={goalModalState.data}
            />
            <EventModal
                isOpen={eventModalState.isOpen}
                onClose={() => setEventModalState({ isOpen: false })}
                onSave={handleSaveEvent}
                initialData={eventModalState.data}
            />
            <StageModal
                isOpen={stageModalState.isOpen}
                onClose={() => setStageModalState({ isOpen: false })}
                onSave={handleSaveStage}
                initialData={stageModalState.data}
            />
            <ChecklistModal
                isOpen={checklistModalState.isOpen}
                onClose={() => setChecklistModalState({ isOpen: false, stageId: '' })}
                onSave={(data) => handleSaveChecklistItem({ ...data, stage_id: checklistModalState.stageId })}
                initialData={checklistModalState.data}
            />
            <ConfirmModal
                isOpen={confirmModalState.isOpen}
                title={confirmModalState.title}
                message={confirmModalState.message}
                onConfirm={confirmModalState.action}
                onCancel={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};
