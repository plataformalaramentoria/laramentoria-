import React, { useState } from 'react';
import {
    ChevronDown,
    ChevronRight,
    CheckCircle,
    Circle,
    Edit2,
    Trash2,
    Plus,
    Save,
    X,
    MoreVertical
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';

// --- Types ---
interface CurriculumItem {
    id: string;
    text: string;
    completed: boolean;
}

interface CurriculumSection {
    id: string;
    title: string;
    expanded: boolean;
    items: CurriculumItem[];
}

// --- Mock Data ---
const INITIAL_SECTIONS: CurriculumSection[] = [
    {
        id: '1',
        title: 'Dados Pessoais Atualizados',
        expanded: true,
        items: [
            { id: '1-1', text: 'Atualizar endereço no Lattes', completed: true },
            { id: '1-2', text: 'Inserir nome em citações bibliográficas', completed: true },
            { id: '1-3', text: 'Vincular ORCID', completed: false }
        ]
    },
    {
        id: '2',
        title: 'Formação Acadêmica',
        expanded: false,
        items: [
            { id: '2-1', text: 'Inserir Graduação', completed: true },
            { id: '2-2', text: 'Inserir Especialização (se houver)', completed: false }
        ]
    },
    {
        id: '3',
        title: 'Atuação Profissional',
        expanded: false,
        items: [
            { id: '3-1', text: 'Cadastrar vínculo atual', completed: false },
            { id: '3-2', text: 'Descrever atividades realizadas', completed: false }
        ]
    },
    {
        id: '4',
        title: 'Produção Bibliográfica',
        expanded: false,
        items: [
            { id: '4-1', text: 'Cadastrar artigos publicados', completed: false },
            { id: '4-2', text: 'Inserir trabalhos em anais de eventos', completed: false }
        ]
    }
];

export const CurriculumScreen: React.FC = () => {
    // --- State ---
    const [sections, setSections] = useState<CurriculumSection[]>(INITIAL_SECTIONS);
    const [isEditMode, setIsEditMode] = useState(false);

    // --- Modal State ---
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

    // --- Actions ---

    // Expand/Collapse Section
    const toggleSection = (id: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
    };

    // Toggle Item Completion
    const toggleItemCompletion = (sectionId: string, itemId: string) => {
        if (isEditMode) return; // Prevent toggling while editing
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    items: s.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
                };
            }
            return s;
        }));
    };

    // --- CRUD Actions (Edit Mode) ---

    // Edit Section Title
    const updateSectionTitle = (id: string, newTitle: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, title: newTitle } : s));
    };

    // Request Delete Section
    const requestDeleteSection = (id: string) => {
        setSectionToDelete(id);
        setDeleteModalOpen(true);
    };

    // Confirm Delete Section
    const confirmDeleteSection = () => {
        if (sectionToDelete) {
            setSections(sections.filter(s => s.id !== sectionToDelete));
            setDeleteModalOpen(false);
            setSectionToDelete(null);
        }
    };

    // Add New Section
    const addSection = () => {
        const newSection: CurriculumSection = {
            id: Date.now().toString(),
            title: 'Nova Seção Curricular',
            expanded: true,
            items: []
        };
        setSections([...sections, newSection]);
    };

    // Update Item Text
    const updateItemText = (sectionId: string, itemId: string, newText: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    items: s.items.map(item => item.id === itemId ? { ...item, text: newText } : item)
                };
            }
            return s;
        }));
    };

    // Delete Item
    const deleteItem = (sectionId: string, itemId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    items: s.items.filter(item => item.id !== itemId)
                };
            }
            return s;
        }));
    };

    // Add New Item
    const addItem = (sectionId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    expanded: true, // Ensure expanded to see new item
                    items: [...s.items, { id: Date.now().toString(), text: 'Novo Item', completed: false }]
                };
            }
            return s;
        }));
    };


    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="flex justify-between items-center border-b border-premium-border dark:border-stone-700 pb-4">
                <div>
                    <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium">Construção Curricular</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Checklist estruturado para o Currículo Lattes.</p>
                </div>
                <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm ${isEditMode
                        ? 'bg-secondary text-white hover:bg-[#6b5d52]'
                        : 'bg-white dark:bg-dark-card text-secondary dark:text-primary border border-premium-border dark:border-stone-700 hover:bg-[#faf9f8] dark:hover:bg-stone-800'
                        }`}
                >
                    {isEditMode ? (
                        <><Save size={18} /> Salvar Estrutura</>
                    ) : (
                        <><Edit2 size={18} /> Editar Currículo</>
                    )}
                </button>
            </header>

            <div className="space-y-6">
                {sections.map(section => {
                    // Logic for section completeness visual
                    const completedCount = section.items.filter(i => i.completed).length;
                    const totalCount = section.items.length;
                    const isAllDone = totalCount > 0 && completedCount === totalCount;

                    return (
                        <div
                            key={section.id}
                            className={`group bg-white dark:bg-dark-card rounded-2xl border transition-all duration-300 overflow-hidden 
                            ${section.expanded ? 'shadow-level-2 border-premium-border dark:border-stone-600' : 'shadow-level-1 border-transparent hover:border-premium-border/50'}`}
                        >
                            {/* Section Header */}
                            <div
                                onClick={() => !isEditMode && toggleSection(section.id)}
                                className={`flex items-center p-6 cursor-pointer bg-gradient-to-r from-transparent via-transparent to-transparent hover:to-[#f9f7f5] dark:hover:to-stone-800/30 transition-all active:scale-[0.99]`}
                            >
                                {/* Icon / Drag Handle */}
                                <div className="mr-4 text-secondary dark:text-primary/70">
                                    {isEditMode ? (
                                        <button onClick={() => updateSectionTitle(section.id, 'Nova Seção')} className="cursor-move"><MoreVerticalDots size={20} /></button>
                                    ) : (
                                        <div className={`p-2 rounded-lg transition-colors ${isAllDone ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-surface dark:bg-dark-surface'}`}>
                                            {isAllDone ? <CheckCircle size={20} /> : <Circle size={20} />}
                                        </div>
                                    )}
                                </div>

                                {/* Title Area */}
                                <div className="flex-1">
                                    {isEditMode ? (
                                        <input
                                            type="text"
                                            value={section.title}
                                            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                                            className="w-full text-lg font-serif font-bold p-2 bg-surface dark:bg-stone-800 rounded-lg border-b-2 border-secondary/30 outline-none focus:border-secondary transition-all text-gray-800 dark:text-gray-100"
                                        />
                                    ) : (
                                        <div className="flex flex-col">
                                            <h3 className={`text-lg font-serif font-bold ${isAllDone ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}>
                                                {section.title}
                                            </h3>
                                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mt-1">
                                                {completedCount} de {totalCount} Concluídos
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions / Expand Icon */}
                                <div className="flex items-center gap-3 ml-4">
                                    {isEditMode && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); requestDeleteSection(section.id); }}
                                            className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                                        className={`p-2 rounded-full hover:bg-surface dark:hover:bg-dark-surface transition-transform duration-300 ${section.expanded ? 'rotate-180 bg-surface dark:bg-stone-800' : ''}`}
                                    >
                                        <ChevronDown size={20} className="text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Section Items (Accordion Content) */}
                            <div
                                className={`transition-all duration-500 ease-in-out overflow-hidden ${section.expanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-6 pt-0 space-y-2">
                                    {/* Inner line connector visual */}
                                    <div className="ml-8 pl-8 border-l-2 border-dashed border-gray-100 dark:border-stone-700 space-y-3">
                                        {section.items.map(item => (
                                            <div
                                                key={item.id}
                                                className={`flex items-center p-3 rounded-xl transition-all group/item
                                                ${isEditMode ? 'bg-surface/50 dark:bg-stone-800/50' : 'hover:bg-surface dark:hover:bg-dark-surface cursor-pointer'} `}
                                                onClick={() => !isEditMode && toggleItemCompletion(section.id, item.id)}
                                            >
                                                {isEditMode ? (
                                                    <>
                                                        <div className="mr-3 text-gray-300 cursor-move"><MoreVerticalDots size={14} /></div>
                                                        <input
                                                            type="text"
                                                            value={item.text}
                                                            onChange={(e) => updateItemText(section.id, item.id, e.target.value)}
                                                            className="flex-1 bg-transparent text-sm border-b border-gray-300 dark:border-stone-600 focus:border-secondary outline-none py-1 mr-2 text-gray-700 dark:text-gray-300"
                                                        />
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteItem(section.id, item.id); }}
                                                            className="text-gray-300 hover:text-red-400 p-1 rounded transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-4 transition-colors
                                                           ${item.completed ? 'bg-secondary dark:bg-primary border-secondary dark:border-primary' : 'border-gray-300 dark:border-stone-600 group-hover/item:border-secondary'}`}>
                                                            {item.completed && <CheckCircle size={12} className="text-white dark:text-stone-900" />}
                                                        </div>
                                                        <span className={`text-sm flex-1 font-medium transition-colors ${item.completed ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-300'}`}>
                                                            {item.text}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}

                                        {isEditMode && (
                                            <button
                                                onClick={() => addItem(section.id)}
                                                className="w-full py-2 border border-dashed border-gray-300 dark:border-stone-600 rounded-xl text-xs font-bold text-gray-400 flex items-center justify-center gap-2 hover:border-secondary hover:text-secondary transition-colors mt-2"
                                            >
                                                <Plus size={14} /> Adicionar Subitem
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isEditMode && (
                    <button
                        onClick={addSection}
                        className="w-full py-6 border-2 border-dashed border-gray-300 dark:border-stone-700 rounded-2xl text-gray-400 flex flex-col items-center justify-center gap-2 hover:border-secondary hover:text-secondary hover:bg-surface/50 dark:hover:bg-stone-800/30 transition-all group"
                    >
                        <Plus size={32} className="group-hover:scale-110 transition-transform" />
                        <span className="font-bold">Adicionar Nova Seção Macro</span>
                    </button>
                )}
            </div>

            {/* Custom Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                title="Tem certeza que deseja excluir esta seção inteira?"
                message="Ao excluir esta seção, todos os subitens e o progresso associado serão removidos permanentemente. Esta ação não poderá ser desfeita."
                confirmText="Excluir seção"
                cancelText="Cancelar"
                onConfirm={confirmDeleteSection}
                onCancel={() => setDeleteModalOpen(false)}
            />
        </div>
    );
};

// Helper Icon
const MoreVerticalDots = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="12" r="1" />
        <circle cx="9" cy="5" r="1" />
        <circle cx="9" cy="19" r="1" />
        <circle cx="15" cy="12" r="1" />
        <circle cx="15" cy="5" r="1" />
        <circle cx="15" cy="19" r="1" />
    </svg>
);
