import React, { useEffect, useState } from 'react';
import { Users, FileText, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { supabaseAdmin } from '../../services/supabaseAdminClient';

interface OverviewProps {
    onNavigate: (tab: string) => void;
}

interface DashboardStats {
    activeStudents: number;
    pendingProjects: number;
    completedTasks: number;
}

interface Activity {
    id: string;
    studentName: string;
    action: string;
    date: Date;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate }) => {
    const [stats, setStats] = useState<DashboardStats>({ activeStudents: 0, pendingProjects: 0, completedTasks: 0 });
    const [activities, setActivities] = useState<Activity[]>([]);
    const [pendingProjectsList, setPendingProjectsList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            try {
                // 1. Fetch metrics concurrently
                const [
                    { count: studentsCount },
                    { count: projectsCount },
                    { count: completedTasksCount },
                    { data: pendingProjs },
                    { data: recentProjects },
                    { data: recentProgress },
                    { data: recentExams }
                ] = await Promise.all([
                    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'STUDENT'),
                    supabaseAdmin.from('project_versions').select('id', { count: 'exact', head: true }).in('status', ['ENVIADO', 'EM_ANALISE']),
                    supabaseAdmin.from('progress_items').select('id', { count: 'exact', head: true }).eq('completed', true),
                    // Specific list for "Avisos"
                    supabaseAdmin.from('project_versions')
                        .select('id, title, created_at, student_id')
                        .eq('status', 'ENVIADO')
                        .order('created_at', { ascending: false }),
                    // Recent actions for activity list
                    supabaseAdmin.from('project_versions')
                        .select('id, created_at, student_id, version_number')
                        .order('created_at', { ascending: false })
                        .limit(5),
                    supabaseAdmin.from('progress_items')
                        .select('id, created_at, student_id, title')
                        .eq('completed', true)
                        .order('created_at', { ascending: false })
                        .limit(5),
                    supabaseAdmin.from('language_exam_attempts')
                        .select('id, created_at, student_id, score')
                        .order('created_at', { ascending: false })
                        .limit(5)
                ]);

                if (!mounted) return;

                setStats({
                    activeStudents: studentsCount || 0,
                    pendingProjects: projectsCount || 0,
                    completedTasks: completedTasksCount || 0
                });

                if (pendingProjs) setPendingProjectsList(pendingProjs);

                // 2. Retrieve Profile metadata to map names
                const recentStudentIds = new Set([
                    ...(recentProjects?.map(p => p.student_id) || []),
                    ...(recentProgress?.map(p => p.student_id) || []),
                    ...(recentExams?.map(e => e.student_id) || []),
                    ...(pendingProjs?.map(p => p.student_id) || [])
                ]);

                let profileMap: Record<string, string> = {};
                if (recentStudentIds.size > 0) {
                    const { data: profiles } = await supabaseAdmin
                        .from('profiles')
                        .select('id, full_name')
                        .in('id', Array.from(recentStudentIds));
                    
                    profiles?.forEach(p => {
                        profileMap[p.id] = p.full_name || 'Estudante';
                    });
                }

                // 3. Compile activities
                const compiled: Activity[] = [];
                recentProjects?.forEach(p => {
                    compiled.push({
                        id: `proj-${p.id}`,
                        studentName: profileMap[p.student_id] || 'Estudante',
                        action: `enviou a versão ${p.version_number} do projeto.`,
                        date: new Date(p.created_at)
                    });
                });

                recentProgress?.forEach(p => {
                    compiled.push({
                        id: `prog-${p.id}`,
                        studentName: profileMap[p.student_id] || 'Estudante',
                        action: `concluiu: ${p.title}.`,
                        date: new Date(p.created_at)
                    });
                });

                recentExams?.forEach(e => {
                    compiled.push({
                        id: `exam-${e.id}`,
                        studentName: profileMap[e.student_id] || 'Estudante',
                        action: `finalizou um simulado com nota ${e.score}.`,
                        date: new Date(e.created_at)
                    });
                });

                compiled.sort((a, b) => b.date.getTime() - a.date.getTime());
                setActivities(compiled.slice(0, 10));

            } catch (err) {
                console.error("Error fetching admin overview:", err);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetchData();
        return () => { mounted = false; };
    }, []);

    if (isLoading) {
        return <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-stone-800 rounded-2xl"></div>)}
            </div>
            <div className="h-64 bg-gray-100 dark:bg-stone-800 rounded-2xl"></div>
        </div>;
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Alunos Ativos', value: stats.activeStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', target: 'STUDENTS' },
                    { label: 'Projetos Pendentes', value: stats.pendingProjects, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', target: 'STUDENTS' }, 
                    { label: 'Checklists Concluídos', value: stats.completedTasks, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', target: 'STUDENTS' }
                ].map((stat, i) => (
                    <div
                        key={i}
                        onClick={() => onNavigate(stat.target as any)}
                        className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm flex items-center gap-4 cursor-pointer hover:border-secondary transition-colors group"
                    >
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stat.value}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Actions (Avisos) */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock size={18} className="text-amber-500" />
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 italic">Avisos e Pendências</h3>
                    </div>
                    <div className="space-y-3">
                        {pendingProjectsList.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">Nenhum projeto aguardando análise inicial.</p>
                        ) : (
                            pendingProjectsList.map(proj => (
                                <div key={proj.id} className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex justify-between items-center group">
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Novo projeto para analisar!</p>
                                        <p className="text-xs text-amber-800 dark:text-amber-300 opacity-80">{proj.title} • {new Date(proj.created_at).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <button 
                                        onClick={() => onNavigate('STUDENTS' as any)}
                                        className="p-2 bg-white dark:bg-stone-800 text-amber-600 rounded-lg shadow-sm border border-amber-100 dark:border-amber-900/30 hover:scale-105 transition-transform"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6 font-serif">Atividade Recente Global</h3>
                    <div className="space-y-4">
                        {activities.length === 0 ? (
                            <p className="text-gray-400 text-sm py-4 text-center">Nenhuma atividade recente.</p>
                        ) : (
                            activities.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-2 hover:bg-surface dark:hover:bg-dark-surface rounded-lg transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-secondary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-secondary dark:text-primary text-[10px] font-bold">
                                            {item.studentName.charAt(0)}
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-300">
                                            <span className="font-bold text-gray-800 dark:text-gray-100">{item.studentName}</span> {item.action}
                                        </p>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium">
                                        {item.date.toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
