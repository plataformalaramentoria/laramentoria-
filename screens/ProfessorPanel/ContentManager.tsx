import React from 'react';
import { BookOpen, FileText, Languages, MessageSquare, ArrowRight, BookCheck, ScrollText } from 'lucide-react';
import { ViewState } from '../../types';

interface ContentManagerProps {
    onNavigate: (view: ViewState) => void;
}

export const ContentManager: React.FC<ContentManagerProps> = ({ onNavigate }) => {
    const modules = [
        {
            title: 'Apostilas da Mentoria',
            desc: 'Gerencie pastas e arquivos PDF disponíveis para os alunos.',
            icon: BookOpen,
            action: 'Gerenciar Apostilas',
            target: 'WORKBOOK',
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            title: 'Banco de Questões',
            desc: 'Cadastre novas questões para os simulados de língua estrangeira.',
            icon: Languages,
            action: 'Editar Questões',
            target: 'LANGUAGE',
            color: 'text-purple-600',
            bg: 'bg-purple-50 dark:bg-purple-900/20'
        },
        {
            title: 'Editais & Prazos',
            desc: 'Cadastre editais de mestrado e monitore os prazos.',
            icon: FileText,
            action: 'Gerenciar Editais',
            target: 'EDITAIS',
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20'
        },
        {
            title: 'Projetos de Pesquisa',
            desc: 'Acesse e revise os projetos submetidos pelos alunos.',
            icon: ScrollText,
            action: 'Ver Projetos',
            target: 'PROJECTS',
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20'
        },
        {
            title: 'Construção Curricular',
            desc: 'Supervisione a evolução do currículo Lattes dos orientandos.',
            icon: BookCheck,
            action: 'Revisar Currículos',
            target: 'CURRICULUM',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50 dark:bg-indigo-900/20'
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in h-full">
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-100 dark:border-stone-700 shadow-sm mb-6">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Central de Conteúdos</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Selecione um módulo abaixo para gerenciar os materiais disponibilizados aos alunos.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((mod, i) => (
                    <div key={i} className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm flex flex-col justify-between hover:border-secondary dark:hover:border-primary transition-colors cursor-pointer group"
                        onClick={() => onNavigate(mod.target as ViewState)}
                    >
                        <div>
                            <div className={`w-12 h-12 rounded-xl ${mod.bg} ${mod.color} flex items-center justify-center mb-6 text-xl`}>
                                <mod.icon size={24} />
                            </div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg mb-2 group-hover:text-secondary dark:group-hover:text-primary transition-colors">
                                {mod.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                                {mod.desc}
                            </p>
                        </div>
                        <button className="flex items-center gap-2 text-sm font-bold text-gray-400 group-hover:text-secondary dark:group-hover:text-primary transition-all">
                            {mod.action} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
