import React, { useState, useEffect } from 'react';
import {
    ChevronDown,
    CheckCircle,
    Circle,
    Edit2,
    Trash2,
    Plus,
    Save,
    User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { supabase } from '../services/supabaseClient';
import { CurriculumSection, CurriculumItem } from '../types';

interface CurriculumScreenProps {
    studentId?: string;
}

export const CurriculumScreen: React.FC<CurriculumScreenProps> = ({ studentId }) => {
    const { session, role, user } = useAuth();
    
    // --- State ---
    const [sections, setSections] = useState<CurriculumSection[]>([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- Modal State ---
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

    // Determine the target student ID
    // If student, they only edit themselves. If Professor, they edit the studentId passed via props.
    const targetStudentId = studentId || user?.id; 

    // --- Fetch Logic ---
    const fetchCurriculum = async () => {
        if (!targetStudentId) return;
        setIsLoading(true);

        try {
            // SUPABASE REAL
            const { data: sectionsData, error: sectionsError } = await supabase
                .from('curriculum_sections')
                .select('*')
                .eq('student_id', targetStudentId)
                .order('order', { ascending: true });

            if (sectionsError) throw sectionsError;

            if (!sectionsData || sectionsData.length === 0) {
                setSections([]);
                return;
            }

            const sectionIds = sectionsData.map(s => s.id);

            const { data: itemsData, error: itemsError } = await supabase
                .from('curriculum_items')
                .select('*')
                .in('section_id', sectionIds)
                .order('order', { ascending: true });

            if (itemsError) throw itemsError;

            // Mount the tree
            const mountedSections: CurriculumSection[] = sectionsData.map(s => ({
                ...s,
                expanded: false, // Default UI state closed unless empty
                items: itemsData.filter(i => i.section_id === s.id)
            }));

            // Auto-expand the first one if it exists
            if (mountedSections.length > 0) {
                 mountedSections[0].expanded = true;
            }

            setSections(mountedSections);

        } catch (error) {
            console.error("Error fetching curriculum:", error);
            // Non-intrusive fallback 
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (targetStudentId) {
            fetchCurriculum();
        }
    }, [targetStudentId, session]);

    // --- Save Logic (Optimistic UI Approach) ---
    // Instead of hitting the DB on every character typed, we hit it on "Save" or "Checkbox Toggle"
    const saveToBackend = async (currentSections: CurriculumSection[]) => {
        if (!targetStudentId) return;
        setIsSaving(true);
        try {
            // SUPABASE REAL 
            // 1. Delete all existing items and sections for this student to re-insert cleanly and avoid complex diffing
            // In a larger app with huge grids this is bad practice, but for a 20-item checklist it's bulletproof.
            // Actually, because of RLS, we only delete rows owned by this student.
            await supabase.from('curriculum_sections').delete().eq('student_id', targetStudentId);

            for (let i = 0; i < currentSections.length; i++) {
                const sec = currentSections[i];
                // Insert Section
                const newSectionId = crypto.randomUUID(); // generate UUID front-end to keep linkage
                const { error: secErr } = await supabase.from('curriculum_sections').insert({
                    id: newSectionId,
                    student_id: targetStudentId,
                    title: sec.title,
                    order: i
                });
                if (secErr) throw secErr;

                // Insert Items for this section
                if (sec.items && sec.items.length > 0) {
                    const mappedItems = sec.items.map((item, index) => ({
                         id: crypto.randomUUID(),
                         section_id: newSectionId,
                         text: item.text,
                         completed: item.completed,
                         order: index
                    }));
                    const { error: itemsErr } = await supabase.from('curriculum_items').insert(mappedItems);
                    if (itemsErr) throw itemsErr;
                }
            }
             
            // Re-fetch to ensure IDs are synced perfectly (optional, but safer)
            await fetchCurriculum();

        } catch (error: any) {
            console.error("Failed to save curriculum:", error);
            alert(`Erro ao salvar o currículo: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- UI Actions ---

    const toggleSection = (id: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s));
    };

    const toggleItemCompletion = async (sectionId: string, itemId: string) => {
        if (isEditMode) return; 
        const updated = sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    items: (s.items || []).map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
                };
            }
            return s;
        });
        setSections(updated);
        // Persist immediately on checkbox toggle
        await saveToBackend(updated);
    };

    // Edit Section Title
    const updateSectionTitle = (id: string, newTitle: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, title: newTitle } : s));
    };

    // Request Delete
    const requestDeleteSection = (id: string) => {
        setSectionToDelete(id);
        setDeleteModalOpen(true);
    };

    // Confirm Delete
    const confirmDeleteSection = () => {
        if (sectionToDelete) {
            setSections(sections.filter(s => s.id !== sectionToDelete));
            setDeleteModalOpen(false);
            setSectionToDelete(null);
        }
    };

    // Add New Section
    const addSection = () => {
        if (!targetStudentId) return;
        const newSection: CurriculumSection = {
            id: Date.now().toString(),
            student_id: targetStudentId,
            title: 'Nova Seção Curricular',
            order: sections.length,
            created_at: new Date().toISOString(),
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
                    items: (s.items || []).map(item => item.id === itemId ? { ...item, text: newText } : item)
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
                    items: (s.items || []).filter(item => item.id !== itemId)
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
                    expanded: true,
                    items: [...(s.items || []), { 
                        id: Date.now().toString(), 
                        section_id: sectionId,
                        text: 'Novo Item', 
                        completed: false,
                        order: (s.items || []).length,
                        created_at: new Date().toISOString()
                    }]
                };
            }
            return s;
        }));
    };

    const handleToggleEditMode = async () => {
        if (isEditMode) {
            // Exiting edit mode -> trigger SAVE
            await saveToBackend(sections);
        }
        setIsEditMode(!isEditMode);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="flex justify-between items-center border-b border-premium-border dark:border-stone-700 pb-4">
                <div>
                    <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium">Meu Currículo</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Mapeamento estruturado do Currículo Lattes.
                    </p>
                </div>
                
                <button
                    onClick={handleToggleEditMode}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm disabled:opacity-50 ${isEditMode
                        ? 'bg-secondary text-white hover:bg-[#6b5d52]'
                        : 'bg-white dark:bg-dark-card text-secondary dark:text-primary border border-premium-border dark:border-stone-700 hover:bg-[#faf9f8] dark:hover:bg-stone-800'
                        }`}
                >
                    {isSaving ? (
                        <><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Salvando...</>
                    ) : isEditMode ? (
                        <><Save size={18} /> Salvar Estrutura</>
                    ) : (
                        <><Edit2 size={18} /> Editar Currículo</>
                    )}
                </button>
            </header>

            {/* EMPTY STATE - Virgin for new accounts */}
            {!isLoading && sections.length === 0 && !isEditMode && (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-dark-card border border-premium-border dark:border-stone-700 rounded-2xl text-center shadow-sm">
                    <div className="w-16 h-16 bg-surface dark:bg-stone-800 rounded-full flex items-center justify-center mb-4 text-secondary dark:text-primary">
                        <User size={32} />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-200 mb-2">Currículo não mapeado</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                        O seu mapeamento de currículo ainda não foi iniciado. {role === 'PROFESSOR' ? 'Inicie a modelagem do currículo deste aluno.' : 'Clique em Editar Currículo para criar as seções e tarefas.'}
                    </p>
                    <button
                        onClick={() => setIsEditMode(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-[#6b5d52] transition-colors"
                    >
                        <Edit2 size={18} />
                        Iniciar Mapeamento 
                    </button>
                </div>
            )}

            <div className="space-y-6">
                {sections.map(section => {
                    const completedCount = (section.items || []).filter(i => i.completed).length;
                    const totalCount = (section.items || []).length;
                    const isAllDone = totalCount > 0 && completedCount === totalCount;

                    return (
                        <div
                            key={section.id}
                            className={`group bg-white dark:bg-dark-card rounded-2xl border transition-all duration-300 overflow-hidden 
                            ${section.expanded ? 'shadow-level-2 border-premium-border dark:border-stone-600' : 'shadow-level-1 border-transparent hover:border-premium-border/50'}`}
                        >
                            <div
                                onClick={() => !isEditMode && toggleSection(section.id)}
                                className={`flex items-center p-6 cursor-pointer bg-gradient-to-r from-transparent via-transparent to-transparent hover:to-[#f9f7f5] dark:hover:to-stone-800/30 transition-all active:scale-[0.99]`}
                            >
                                <div className="mr-4 text-secondary dark:text-primary/70">
                                    {isEditMode ? (
                                        <div className="cursor-move"><MoreVerticalDots size={20} /></div>
                                    ) : (
                                        <div className={`p-2 rounded-lg transition-colors ${isAllDone ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-surface dark:bg-dark-surface'}`}>
                                            {isAllDone ? <CheckCircle size={20} /> : <Circle size={20} />}
                                        </div>
                                    )}
                                </div>

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

                            <div
                                className={`transition-all duration-500 ease-in-out overflow-hidden ${section.expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="p-6 pt-0 space-y-2">
                                    <div className="ml-8 pl-8 border-l-2 border-dashed border-gray-100 dark:border-stone-700 space-y-3">
                                        {(section.items || []).map(item => (
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
