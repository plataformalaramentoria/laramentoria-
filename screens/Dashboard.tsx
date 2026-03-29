import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, CheckCircle, Bell, ArrowRight, MoreHorizontal, PanelLeft, PanelLeftOpen, Trash2, Plus, Edit2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { supabaseAdmin } from '../services/supabaseAdminClient';
import { AdvisorMessage, DashboardTask, DashboardGoal, AgendaEvent } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { TaskModal, GoalModal, EventModal } from '../components/DashboardModals';

interface DashboardProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ onToggleSidebar, isSidebarOpen = true }) => {
  const { user, fullName } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  
  const [message, setMessage] = useState<AdvisorMessage | null>(null);
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [goals, setGoals] = useState<DashboardGoal[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);

  // Current Date in Brasília
  const currentDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat('pt-BR', { 
      month: 'long', 
      year: 'numeric',
      timeZone: 'America/Sao_Paulo' 
    }).format(new Date());
  }, []);

  // Modal States
  const [taskModalState, setTaskModalState] = useState<{ isOpen: boolean, data?: DashboardTask | null }>({ isOpen: false });
  const [goalModalState, setGoalModalState] = useState<{ isOpen: boolean, data?: DashboardGoal | null }>({ isOpen: false });
  const [eventModalState, setEventModalState] = useState<{ isOpen: boolean, data?: AgendaEvent | null }>({ isOpen: false });
  const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, title: string, message: string, action: () => Promise<void> | void }>({ 
    isOpen: false, title: '', message: '', action: () => {} 
  });
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState('');

  useEffect(() => {
    let mounted = true;
    if (!user) return;

    const fetchDashboardData = async () => {
      console.log("[Dashboard] Starting parallel fetch for user:", user.id);
      
      const safetyTimeout = setTimeout(() => {
        if (mounted) {
          console.warn("[Dashboard] 5 second safety timeout hit! Forcing load stop.");
          setIsLoading(false);
        }
      }, 5000);

      try {
        const results = await Promise.all([
          supabaseAdmin.from('advisor_messages').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1),
          supabaseAdmin.from('dashboard_tasks').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
          supabaseAdmin.from('dashboard_goals').select('*').eq('student_id', user.id).order('created_at', { ascending: false }),
          supabaseAdmin.from('agenda_events').select('*').eq('student_id', user.id).order('event_date', { ascending: true })
        ]);

        console.log("[Dashboard] Fetch results:", results);
        
        const [
          { data: messagesData, error: msgErr },
          { data: tasksData, error: taskErr },
          { data: goalsData, error: goalErr },
          { data: eventsData, error: eventErr }
        ] = results;

        if (msgErr || taskErr || goalErr || eventErr) {
            console.error("[Dashboard] Fetch Errors:", { msgErr, taskErr, goalErr, eventErr });
        }

        if (mounted) {
          if (messagesData && messagesData.length > 0) setMessage(messagesData[0] as AdvisorMessage);
          if (tasksData) setTasks(tasksData as DashboardTask[]);
          if (goalsData) setGoals(goalsData as DashboardGoal[]);
          if (eventsData) setEvents(eventsData as AgendaEvent[]);
        }
      } catch (err) {
        console.error("[Dashboard] Error fetching dashboard data:", err);
      } finally {
        if (mounted) {
          setIsLoading(false);
          clearTimeout(safetyTimeout);
        }
      }
    };

    fetchDashboardData();

    return () => {
      mounted = false;
    };
  }, [user]);

  const handleMarkMessageSeen = async () => {
    if (!message || !user) return;
    
    setIsMessageLoading(true);
    setMessageError('');
    try {
      const { error } = await supabase
        .from('advisor_messages')
        .update({ is_seen: true })
        .eq('id', message.id);
      if (error) throw new Error(error.message);
      setMessage(null);
    } catch (err: any) {
      console.error("Error marking message as seen", err);
      setMessageError(err.message || 'Erro de conexão.');
    } finally {
      setIsMessageLoading(false);
    }
  };

  const executeDeleteTask = async (taskId: string) => {
    const { error } = await supabaseAdmin.from('dashboard_tasks').delete().eq('id', taskId);
    if (error) throw new Error(error.message);
    setTasks(tasks.filter(t => t.id !== taskId));
    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteTask = (taskId: string) => {
    setConfirmModalState({
      isOpen: true,
      title: "Excluir Passo",
      message: "Tem certeza que deseja excluir este passo? Esta ação não pode ser desfeita.",
      action: () => executeDeleteTask(taskId)
    });
  };

  const executeDeleteGoal = async (goalId: string) => {
    const { error } = await supabaseAdmin.from('dashboard_goals').delete().eq('id', goalId);
    if (error) throw new Error(error.message);
    setGoals(goals.filter(g => g.id !== goalId));
    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteGoal = (goalId: string) => {
    setConfirmModalState({
      isOpen: true,
      title: "Excluir Meta",
      message: "Tem certeza que deseja excluir esta meta permanentemente?",
      action: () => executeDeleteGoal(goalId)
    });
  };

  const executeDeleteEvent = async (eventId: string) => {
    const { error } = await supabaseAdmin.from('agenda_events').delete().eq('id', eventId);
    if (error) throw new Error(error.message);
    setEvents(events.filter(e => e.id !== eventId));
    setConfirmModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteEvent = (eventId: string) => {
    setConfirmModalState({
      isOpen: true,
      title: "Excluir Evento",
      message: "Tem certeza que deseja remover este evento da sua agenda?",
      action: () => executeDeleteEvent(eventId)
    });
  };

  const handleSaveTask = async (data: { text: string, due_label: string, is_urgent: boolean }) => {
    if (!user) throw new Error("Sessão inválida.");

    try {
      if (taskModalState.data) {
        // Edit Mode
        console.log("[Dashboard] Saving task edit:", data);
        const { data: updated, error } = await supabaseAdmin
          .from('dashboard_tasks')
          .update({ ...data, updated_by: user.id })
          .eq('id', taskModalState.data.id)
          .select();
        
        console.log("[Dashboard] Edit result:", updated, error);
        if (error) throw new Error(error.message);
        if (updated) setTasks(tasks.map(t => t.id === taskModalState.data!.id ? updated[0] : t));
      } else {
        // Create Mode
        console.log("[Dashboard] Creating new task:", data);
        const { data: created, error } = await supabaseAdmin
          .from('dashboard_tasks')
          .insert([{ student_id: user.id, created_by: user.id, updated_by: user.id, ...data }])
          .select();
        
        console.log("[Dashboard] Create result:", created, error);
        if (error) throw new Error(error.message);
        if (created) setTasks([created[0], ...tasks]);
      }
    } catch (err) {
      console.error("[Dashboard] Error in handleSaveTask:", err);
      throw err;
    }
  };

  const handleSaveGoal = async (data: { title: string, percent: number }) => {
    if (!user) throw new Error("Sessão inválida.");

    if (goalModalState.data) {
      const { data: updated, error } = await supabaseAdmin
        .from('dashboard_goals')
        .update({ ...data, updated_by: user.id })
        .eq('id', goalModalState.data.id)
        .select();
      if (error) throw new Error(error.message);
      if (updated) setGoals(goals.map(g => g.id === goalModalState.data!.id ? updated[0] : g));
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('dashboard_goals')
        .insert([{ student_id: user.id, created_by: user.id, updated_by: user.id, ...data }])
        .select();
      if (error) throw new Error(error.message);
      if (created) setGoals([...goals, created[0]]);
    }
  };

  const handleSaveEvent = async (data: { text: string, date_day: string, date_month: string }) => {
    if (!user) throw new Error("Sessão inválida.");

    if (eventModalState.data) {
      const { data: updated, error } = await supabaseAdmin
        .from('agenda_events')
        .update({ ...data, updated_by: user.id })
        .eq('id', eventModalState.data.id)
        .select();
      if (error) throw new Error(error.message);
      if (updated) setEvents(events.map(e => e.id === eventModalState.data!.id ? updated[0] : e));
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('agenda_events')
        .insert([{ student_id: user.id, created_by: user.id, updated_by: user.id, ...data, event_date: new Date().toISOString() }])
        .select();
      if (error) throw new Error(error.message);
      if (created) setEvents([...events, created[0]]);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex justify-between items-end pb-2 border-b border-premium-border dark:border-stone-700 animate-fade-up opacity-0 transition-colors duration-300" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-6">
          {!isSidebarOpen && (
            <button 
              onClick={onToggleSidebar}
              className="p-2 -ml-2 rounded-xl text-secondary dark:text-primary hover:bg-surface dark:hover:bg-dark-surface transition-all duration-300 hover:scale-105 hidden md:block"
              title="Abrir Menu"
            >
              <PanelLeftOpen size={24} />
            </button>
          )}

          <div>
            <h1 className="text-3xl font-serif text-secondary dark:text-primary font-bold tracking-tight mb-1">
              Olá, {fullName || 'aluno'}
            </h1>
            <p className="text-functional dark:text-gray-400 font-normal text-base">Sua jornada na Plataforma Lara Lopes.</p>
          </div>
        </div>

        <div className="text-right hidden md:block">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#cdbaa6] dark:text-secondary">
            {currentDateLabel}
          </p>
        </div>
      </header>

      {/* Warning Card - Primary Level (Elevation 3) */}
      {message && !message.is_seen && (
        <div 
          className="bg-white dark:bg-dark-card rounded-2xl shadow-elevation-3 dark:shadow-dark-soft p-10 border border-premium-border border-l-8 border-l-secondary dark:border-stone-700 dark:border-l-secondary flex items-start relative overflow-hidden group transition-all duration-300 ease-in-out hover:shadow-card-hover dark:hover:shadow-dark-soft hover:-translate-y-1 animate-fade-up opacity-0"
          style={{ animationDelay: '100ms' }}
        >
          <div className="bg-[#cdbaa6]/30 dark:bg-[#cdbaa6]/20 p-4 rounded-full mr-6 shrink-0 text-secondary dark:text-primary transition-colors">
            <Bell size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-serif text-2xl text-secondary dark:text-primary font-bold tracking-tight mb-3">Mensagem da Orientadora</h3>
            <p className="text-functional dark:text-gray-300 leading-relaxed max-w-2xl text-[16px] font-medium">
              {message.content}
            </p>
            {messageError && (
              <p className="text-red-500 text-sm mt-4 font-semibold p-2 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-2xl">
                Erro: {messageError}
              </p>
            )}
          </div>
          <button 
            onClick={handleMarkMessageSeen}
            disabled={isMessageLoading}
            className="absolute top-8 right-8 text-sm font-semibold text-functional hover:text-secondary dark:text-gray-400 dark:hover:text-primary transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isMessageLoading ? (
               <div className="w-4 h-4 border-2 border-secondary/30 border-t-secondary dark:border-primary/30 dark:border-t-primary rounded-full animate-spin"></div>
            ) : <CheckCircle size={16} />} 
            {isMessageLoading ? "Marcando..." : "Marcar como visto"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Next Steps - Secondary Level (Elevation 2) */}
        <div 
          className="lg:col-span-8 bg-white dark:bg-dark-card p-10 rounded-2xl shadow-elevation-2 dark:shadow-none border border-card-border border-t-4 border-t-secondary dark:border-stone-700 dark:border-t-primary transition-all duration-300 ease-in-out animate-fade-up opacity-0 flex flex-col"
          style={{ animationDelay: '200ms' }}
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-xl text-functional dark:text-gray-100 font-bold transition-colors flex items-center gap-3">
              Próximos Passos
              <button onClick={() => setTaskModalState({ isOpen: true, data: null })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-stone-800 text-functional transition-colors" title="Adicionar Tarefa"><Plus size={16} /></button>
            </h2>
            <div className="p-2 bg-surface dark:bg-dark-surface rounded-full text-functional dark:text-primary transition-colors">
              <CheckCircle size={20} />
            </div>
          </div>
          
          {tasks.length > 0 ? (
            <ul className="space-y-4">
              {tasks.map((item) => {
                const dueText = item.due_label.toUpperCase();
                let badgeClass = "bg-gray-100 text-gray-600 dark:bg-stone-700 dark:text-gray-400";
                
                if (dueText === 'HOJE') {
                  badgeClass = "bg-functional text-white dark:bg-functional/40 dark:text-white";
                } else if (dueText === 'AMANHÃ') {
                  badgeClass = "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
                }

                return (
                  <li key={item.id} className="flex items-center group/item p-3 -mx-3 hover:bg-[#f0ebe7] dark:hover:bg-dark-surface rounded-xl transition-colors duration-200">
                    <div className={`mr-4 shrink-0 text-accent ${item.is_urgent ? 'animate-pulse' : ''}`}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
                        <path d="M5 0L10 5L5 10L0 5L5 0Z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex flex-col items-start justify-center">
                      <span className="text-gray-700 dark:text-gray-300 block font-semibold transition-colors mb-1 text-[15px]">{item.text}</span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] border border-transparent ${badgeClass} transition-colors`}>
                        {item.due_label}
                      </span>
                    </div>
                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center gap-2">
                      <button onClick={() => setTaskModalState({ isOpen: true, data: item })} className="p-2 rounded-lg text-functional hover:bg-surface dark:hover:bg-dark-surface transition-colors"><Edit2 size={16}/></button>
                      <button onClick={() => handleDeleteTask(item.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-70">
              <div className="bg-surface dark:bg-dark-surface p-4 rounded-full mb-4 text-[#cdbaa6] dark:text-stone-600">
                <CheckCircle size={32} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-center">Nenhum próximo passo cadastrado.</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 text-center">Adicione novas tarefas para manter seu progresso organizado.</p>
            </div>
          )}
        </div>

        {/* Goals and Agenda container - 4 cols */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          {/* Goals - Secondary Level (Elevation 2) */}
          <div 
            className="flex-1 bg-white dark:bg-dark-card p-8 rounded-2xl shadow-elevation-1 dark:shadow-none border border-gray-100 dark:border-stone-700 transition-all duration-300 ease-in-out animate-fade-up opacity-0 flex flex-col"
            style={{ animationDelay: '300ms' }}
          >
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-serif text-xl text-functional dark:text-gray-100 font-bold transition-colors flex items-center gap-3">
                Metas Atuais
                <button onClick={() => setGoalModalState({ isOpen: true, data: null })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-stone-800 text-functional transition-colors" title="Adicionar Meta"><Plus size={16} /></button>
              </h2>
              <div className="p-2 bg-surface dark:bg-dark-surface rounded-full text-functional dark:text-primary transition-colors">
                <TrendingUpIcon className="text-functional dark:text-primary" size={20} />
              </div>
            </div>
            
            {goals.length > 0 ? (
              <div className="space-y-8">
                {goals.map((g) => (
                  <div key={g.id} className="group relative">
                    <GoalItem title={g.title} percent={g.percent} />
                    <div className="absolute -top-3 -right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setGoalModalState({ isOpen: true, data: g })} className="p-1.5 bg-gray-100 dark:bg-stone-800 text-functional rounded-full hover:scale-105"><Edit2 size={12}/></button>
                      <button onClick={() => handleDeleteGoal(g.id)} className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full hover:scale-105"><Trash2 size={12}/></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-6 opacity-70">
                <div className="bg-surface dark:bg-dark-surface p-3 rounded-full mb-3 text-[#cdbaa6] dark:text-stone-600">
                  <TrendingUpIcon size={24} />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-center text-sm">Nenhuma meta definida.</p>
              </div>
            )}
          </div>

          {/* Agenda - Tertiary Level (Elevation 1) */}
          <div 
            className="flex-1 bg-white dark:bg-dark-card p-8 rounded-2xl shadow-elevation-1 dark:shadow-none border border-gray-100 dark:border-stone-700 relative overflow-hidden transition-all duration-300 ease-in-out animate-fade-up opacity-0 flex flex-col"
            style={{ animationDelay: '400ms' }}
          >
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h2 className="font-serif text-lg text-functional dark:text-primary font-semibold transition-colors flex items-center gap-3">
                Agenda
                <button onClick={() => setEventModalState({ isOpen: true, data: null })} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-stone-800 text-functional transition-colors" title="Adicionar Evento"><Plus size={16} /></button>
              </h2>
              <div className="p-2 bg-[#f0ebe7] dark:bg-dark-surface rounded-full text-functional dark:text-primary transition-colors">
                <Calendar size={18} />
              </div>
            </div>
            
            {events.length > 0 ? (
              <ul className="space-y-6 relative z-10">
                {events.map((e) => (
                  <div key={e.id} className="relative group pr-16 bg-white dark:bg-dark-card rounded-xl p-2 -mx-2 hover:bg-[#f0ebe7] dark:hover:bg-dark-surface transition-colors">
                    <CalendarItem date={e.date_day} month={e.date_month} text={e.text} />
                    <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEventModalState({ isOpen: true, data: e })} className="p-1.5 bg-gray-100 dark:bg-stone-800 text-functional rounded-full hover:scale-105"><Edit2 size={14}/></button>
                      <button onClick={() => handleDeleteEvent(e.id)} className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full hover:scale-105"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </ul>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-6 opacity-70">
                <div className="bg-[#f0ebe7] dark:bg-dark-surface p-3 rounded-full mb-3 text-[#cdbaa6] dark:text-stone-600">
                  <Calendar size={24} />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-center text-sm">Nenhum evento agendado.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={taskModalState.isOpen}
        initialData={taskModalState.data}
        onClose={() => setTaskModalState({ isOpen: false })}
        onSave={handleSaveTask}
      />
      <GoalModal
        isOpen={goalModalState.isOpen}
        initialData={goalModalState.data}
        onClose={() => setGoalModalState({ isOpen: false })}
        onSave={handleSaveGoal}
      />
      <EventModal
        isOpen={eventModalState.isOpen}
        initialData={eventModalState.data}
        onClose={() => setEventModalState({ isOpen: false })}
        onSave={handleSaveEvent}
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

// --- SKELETON COMPONENT ---
const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-end pb-2 border-b border-[#F0F0F0] dark:border-stone-800 transition-colors">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-stone-800 rounded mb-2 animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 bg-[length:200%_100%]"></div>
          <div className="h-5 w-64 bg-gray-100 dark:bg-stone-800/50 rounded animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 bg-[length:200%_100%]"></div>
        </div>
      </div>

      {/* Warning Card Skeleton */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-card p-8 border border-gray-100 dark:border-stone-800 flex items-start transition-colors">
        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-stone-800 mr-5 shrink-0 animate-pulse"></div>
        <div className="flex-1 space-y-3">
           <div className="h-6 w-1/3 bg-gray-200 dark:bg-stone-800 rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 bg-[length:200%_100%]"></div>
           <div className="h-4 w-full bg-gray-100 dark:bg-stone-800/50 rounded animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 bg-[length:200%_100%]"></div>
           <div className="h-4 w-2/3 bg-gray-100 dark:bg-stone-800/50 rounded animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 bg-[length:200%_100%]"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-card border border-gray-100 dark:border-stone-800 transition-colors">
            <div className="flex items-center justify-between mb-8">
              <div className="h-6 w-32 bg-gray-200 dark:bg-stone-800 rounded animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 bg-[length:200%_100%]"></div>
              <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-stone-800 animate-pulse"></div>
            </div>
            <div className="space-y-6">
               {[1, 2, 3].map((j) => (
                 <div key={j} className="flex items-center">
                    <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-stone-800 mr-4"></div>
                    <div className="flex-1 h-4 bg-gray-100 dark:bg-stone-800/50 rounded animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-stone-800 dark:via-stone-700 dark:to-stone-800 bg-[length:200%_100%]"></div>
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SUBCOMPONENTS ---

const GoalItem = ({ title, percent }: { title: string, percent: number }) => {
  const [currentWidth, setCurrentWidth] = useState(0);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => {
      setCurrentWidth(percent);
    }, 100);
    return () => clearTimeout(timer);
  }, [percent]);

  return (
    <div>
      <div className="flex justify-between text-sm mb-3">
        <span className="text-gray-600 dark:text-gray-300 font-medium tracking-wide transition-colors">{title}</span>
        <span className="text-secondary dark:text-primary font-bold transition-colors">{percent}%</span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden transition-colors">
        <div 
          className="bg-functional dark:bg-primary h-1.5 rounded-full transition-all duration-[1500ms] ease-bezier-custom" 
          style={{ width: `${currentWidth}%` }}
        ></div>
      </div>
    </div>
  );
};

const CalendarItem = ({ date, month, text }: { date: string, month: string, text: string }) => (
  <li className="flex items-center group">
    <div className="flex flex-col items-center justify-center w-10 h-10 bg-functional dark:bg-primary rounded-lg mr-4 shadow-sm transition-all duration-300">
      <span className="font-bold text-base leading-none text-white dark:text-stone-900 transition-colors">{date}</span>
      <span className="text-[9px] uppercase font-bold text-white/90 dark:text-stone-800 tracking-[0.08em] transition-colors">{month}</span>
    </div>
    <span className="flex-1 font-medium text-gray-700 dark:text-gray-200 transition-colors duration-200 text-sm">{text}</span>
  </li>
);

const TrendingUpIcon = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </svg>
);

export default Dashboard;