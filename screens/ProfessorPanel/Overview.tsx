import React from 'react';
import { Users, FileText, CheckCircle, Clock } from 'lucide-react';

interface OverviewProps {
    onNavigate: (tab: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Cards - Clickable */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Alunos Ativos', value: '12', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', target: 'STUDENTS' },
                    { label: 'Projetos em Análise', value: '3', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', target: 'CONTENT' }, // Or maybe a Tasks tab if existed
                    { label: 'Tarefas Concluídas', value: '45', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', target: 'STUDENTS' },
                    { label: 'Pendências', value: '5', icon: Clock, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', target: 'ACCESS' },
                ].map((stat, i) => (
                    <div
                        key={i}
                        onClick={() => onNavigate(stat.target)}
                        className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm flex items-center gap-4 cursor-pointer hover:border-secondary dark:hover:border-primary transition-colors group"
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

            {/* Recent Activity */}
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-6">Atividade Recente</h3>
                <div className="space-y-4">
                    {[
                        { user: 'Ana Luiza', action: 'enviou uma nova versão do projeto', time: 'Há 10 min' },
                        { user: 'Carlos Eduardo', action: 'concluiu o Módulo 2', time: 'Há 1 hora' },
                        { user: 'Mariana Silva', action: 'respondeu ao seu feedback', time: 'Há 3 horas' },
                        { user: 'Julia Costa', action: 'iniciou a Prova de Língua', time: 'Ontem' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-surface dark:hover:bg-dark-surface rounded-lg transition-colors border-b border-gray-50 dark:border-stone-800 last:border-0 cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-secondary dark:bg-primary rounded-full flex items-center justify-center text-white dark:text-stone-900 text-xs font-bold">
                                    {item.user.charAt(0)}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-bold text-gray-800 dark:text-gray-100">{item.user}</span> {item.action}
                                </p>
                            </div>
                            <span className="text-xs text-gray-400 font-medium">{item.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
