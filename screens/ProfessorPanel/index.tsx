import React, { useState } from 'react';
import {
    LayoutGrid, Users, Shield, FileText, Settings,
    ChevronRight, Bell
} from 'lucide-react';
import { Overview } from './Overview';
import { StudentsList } from './StudentsList';
import { AccessManagement } from './AccessManagement';
import { ContentManager } from './ContentManager';

type AdminTab = 'OVERVIEW' | 'STUDENTS' | 'ACCESS' | 'CONTENT' | 'SETTINGS';

export const ProfessorPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');

    const tabs = [
        { id: 'OVERVIEW', label: 'Visão Geral', icon: LayoutGrid },
        { id: 'STUDENTS', label: 'Alunas', icon: Users },
        { id: 'ACCESS', label: 'Cadastro & Acessos', icon: Shield },
        { id: 'CONTENT', label: 'Gestão de Conteúdos', icon: FileText },
        { id: 'SETTINGS', label: 'Configurações', icon: Settings },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'OVERVIEW': return <Overview />;
            case 'STUDENTS': return <StudentsList />;
            case 'ACCESS': return <AccessManagement />;
            case 'CONTENT': return <ContentManager />;
            case 'SETTINGS': return <div className="p-10 text-center text-gray-400">Configurações Gerais (Em breve)</div>;
            default: return <Overview />;
        }
    };

    return (
        <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-card dark:shadow-none overflow-hidden animate-fade-in">

            {/* Sidebar Navigation */}
            <div className="w-64 border-r border-gray-100 dark:border-stone-700 bg-surface/30 dark:bg-dark-surface/10 flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-stone-700">
                    <h2 className="font-serif font-bold text-gray-800 dark:text-gray-100 text-lg">Área da Mentora</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Painel Administrativo</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as AdminTab)}
                            className={`
                     w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all
                     ${activeTab === tab.id
                                    ? 'bg-secondary dark:bg-primary text-white dark:text-stone-900 shadow-md'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-stone-800 hover:shadow-sm'}
                  `}
                        >
                            <div className="flex items-center gap-3">
                                <tab.icon size={18} />
                                {tab.label}
                            </div>
                            {activeTab === tab.id && <ChevronRight size={16} />}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-gray-100 dark:border-stone-700">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 mb-2">
                            <Bell size={16} />
                            <span className="font-bold text-xs uppercase">Avisos</span>
                        </div>
                        <p className="text-xs text-amber-800 dark:text-amber-200 leading-snug">
                            3 novas alunas aguardando liberação de acesso na plataforma.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#0c0a09]">
                {/* Header */}
                <div className="h-16 border-b border-gray-100 dark:border-stone-700 bg-white dark:bg-dark-card flex items-center justify-between px-8">
                    <h1 className="font-bold text-gray-800 dark:text-gray-100 text-lg">
                        {tabs.find(t => t.id === activeTab)?.label}
                    </h1>
                    <div className="text-xs text-gray-400">
                        Última atualização: Hoje, 14:30
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
