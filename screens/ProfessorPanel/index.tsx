import React, { useState } from 'react';
import {
    LayoutGrid, Users, Shield,
    ChevronRight, Bell, Lock
} from 'lucide-react';
import { Overview } from './Overview';
import { StudentsList } from './StudentsList';
import { AccessManagement } from './AccessManagement';
import { useAuth } from '../../contexts/AuthContext';

type AdminTab = 'OVERVIEW' | 'STUDENTS' | 'ACCESS';

interface AdminPanelProps {
    onNavigate?: (view: any) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigate }) => {
    const { role } = useAuth();
    const isAdmin = role === 'ADMIN';

    const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');

    // PROFESSOR only sees OVERVIEW and STUDENTS tabs
    const allTabs = [
        { id: 'OVERVIEW', label: 'Visão Geral', icon: LayoutGrid, adminOnly: false },
        { id: 'STUDENTS', label: 'Lista de Alunos', icon: Users, adminOnly: false },
        { id: 'ACCESS', label: 'Cadastro & Acessos', icon: Shield, adminOnly: true },
    ];

    const visibleTabs = allTabs.filter(t => !t.adminOnly || isAdmin);

    // If current tab was ACCESS and user is not ADMIN, reset to OVERVIEW
    const safeTab = (!isAdmin && activeTab === 'ACCESS') ? 'OVERVIEW' : activeTab;

    const renderContent = () => {
        switch (safeTab) {
            case 'OVERVIEW': return <Overview onNavigate={(tab: AdminTab) => setActiveTab(tab)} />;
            case 'STUDENTS': return <StudentsList />;
            case 'ACCESS':
                // Double-guard: even if someone manipulates state, don't render admin UI for non-admins
                if (!isAdmin) {
                    return (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                                <Lock size={28} className="text-red-400" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Acesso Restrito</h3>
                            <p className="text-gray-400 text-sm mt-2 max-w-xs">
                                Apenas administradores podem gerenciar cadastros e permissões.
                            </p>
                        </div>
                    );
                }
                return <AccessManagement />;
            default: return <Overview onNavigate={(tab: AdminTab) => setActiveTab(tab)} />;
        }
    };

    const panelTitle = isAdmin ? 'Painel de Administração' : 'Painel do Professor';
    const panelSubtitle = isAdmin ? 'Gestão Centralizada' : 'Acompanhamento de Alunos';

    return (
        <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-card dark:shadow-none overflow-hidden animate-fade-in">

            {/* Sidebar Navigation */}
            <div className="w-64 border-r border-gray-100 dark:border-stone-700 bg-surface/30 dark:bg-dark-surface/10 flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-stone-700">
                    <h2 className="font-serif font-bold text-gray-800 dark:text-gray-100 text-lg">{panelTitle}</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{panelSubtitle}</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {visibleTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as AdminTab)}
                            className={`
                     w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all
                     ${safeTab === tab.id
                                    ? 'bg-secondary dark:bg-primary text-white dark:text-stone-900 shadow-md'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-stone-800 hover:shadow-sm'}
                  `}
                        >
                            <div className="flex items-center gap-3">
                                <tab.icon size={18} />
                                {tab.label}
                            </div>
                            {safeTab === tab.id && <ChevronRight size={16} />}
                        </button>
                    ))}
                </nav>

                {/* Role badge at bottom */}
                <div className="p-6 border-t border-gray-100 dark:border-stone-700">
                    {isAdmin ? (
                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
                                <Bell size={16} />
                                <span className="font-bold text-xs uppercase">Você é Administrador</span>
                            </div>
                            <p className="text-xs text-amber-800 dark:text-amber-200 leading-snug">
                                Acesso total: gerencie usuários, permissões e conteúdos.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                <Users size={16} />
                                <span className="font-bold text-xs uppercase">Modo Professor</span>
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-snug">
                                Visualize alunos e acompanhe progresso. Alterações de permissão requerem admin.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0c0a09]">
                {/* Header */}
                <div className="h-16 border-b border-gray-100 dark:border-stone-700 bg-white dark:bg-dark-card flex items-center justify-between px-8">
                    <h1 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                        {visibleTabs.find(t => t.id === safeTab)?.label}
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            isAdmin
                                ? 'bg-secondary/10 text-secondary dark:bg-primary/10 dark:text-primary'
                                : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                            {isAdmin ? 'Administrador' : 'Professor'}
                        </span>
                    </div>
                </div>

                {/* Content Scroll */}
                <div className="flex-1 overflow-y-auto p-8">
                    {renderContent()}
                </div>
            </div>

        </div>
    );
};
