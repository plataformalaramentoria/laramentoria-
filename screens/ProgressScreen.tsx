import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Lock, ChevronRight, X, FileText, AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ProgressStage, ProgressItem } from '../types';
import { StageModal, ChecklistModal } from '../components/ProgressModals';
import { ConfirmModal } from '../components/ConfirmModal';

export const ProgressScreen: React.FC = () => {
    const { user } = useAuth();
    const [stages, setStages] = useState<ProgressStage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStage, setSelectedStage] = useState<ProgressStage | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Modals State
    const [stageModal, setStageModal] = useState<{ isOpen: boolean, data?: ProgressStage | null }>({ isOpen: false });
    const [checklistModal, setChecklistModal] = useState<{ isOpen: boolean, stageId: string, data?: ProgressItem | null }>({ isOpen: false, stageId: '' });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, action: () => Promise<void> | void }>({
        isOpen: false, title: '', message: '', action: () => {}
    });

    // --- Data Fetching ---
    const fetchProgressData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            if (user.id.startsWith('mock')) {
                const sStr = localStorage.getItem('lara_progress_stages');
                const iStr = localStorage.getItem('lara_progress_items');
                const mockStages: ProgressStage[] = sStr ? JSON.parse(sStr) : [];
                const mockItems: ProgressItem[] = iStr ? JSON.parse(iStr) : [];
                
                const combined = mockStages.map(stage => ({
                    ...stage,
                    items: mockItems.filter(item => item.stage_id === stage.id).sort((a,b) => a.order - b.order)
                })).sort((a,b) => a.order - b.order);
                setStages(combined);
            } else {
                const { data: dbStages, error: err1 } = await supabase.from('progress_stages').select('*').eq('student_id', user.id).order('order', { ascending: true });
                if (err1) throw err1;
                
                const { data: dbItems, error: err2 } = await supabase.from('progress_items').select('*').eq('student_id', user.id).order('order', { ascending: true });
                if (err2) throw err2;

                const combined = (dbStages || []).map(stage => ({
                    ...stage,
                    items: (dbItems || []).filter(item => item.stage_id === stage.id)
                }));
                setStages(combined);
            }
        } catch (err) {
            console.error("Error fetching progress:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProgressData();
    }, [user]);

    // Update selectedStage reference when stages array changes
    useEffect(() => {
        if (selectedStage) {
            const up = stages.find(s => s.id === selectedStage.id);
            setSelectedStage(up || null);
        }
    }, [stages]);

    // --- Progress Calculation ---
    const progressPercentage = useMemo(() => {
        let totalItems = 0;
        let completedItems = 0;
        stages.forEach(stage => {
            (stage.items || []).forEach(item => {
                totalItems++;
                if (item.completed) completedItems++;
            });
        });
        return totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);
    }, [stages]);

    // --- Sequential Locking Logic ---
    const enrichedStages = useMemo(() => {
        let previousStageDone = true; 
        return stages.map((stage) => {
            const items = stage.items || [];
            const allItemsDone = items.length > 0 && items.every(i => i.completed);
            
            let status: 'LOCKED' | 'WAITING' | 'IN_PROGRESS' | 'DONE' = 'LOCKED';
            if (!previousStageDone) {
                status = 'LOCKED';
            } else if (allItemsDone) {
                status = 'DONE';
            } else {
                status = 'IN_PROGRESS';
            }
            
            previousStageDone = status === 'DONE';
            return { ...stage, computedStatus: status };
        });
    }, [stages]);


    // --- Stage CRUD ---
    const handleSaveStage = async (data: { title: string, description: string | null }) => {
        if (!user) throw new Error("Sessão inválida.");
        
        if (user.id.startsWith('mock')) {
            const mockStages = JSON.parse(localStorage.getItem('lara_progress_stages') || '[]');
            if (stageModal.data) {
                const updated = mockStages.map((s: any) => s.id === stageModal.data!.id ? { ...s, ...data } : s);
                localStorage.setItem('lara_progress_stages', JSON.stringify(updated));
            } else {
                const newStage = { id: `mock-stage-${Date.now()}`, student_id: user.id, ...data, order: mockStages.length, created_at: new Date().toISOString() };
                localStorage.setItem('lara_progress_stages', JSON.stringify([...mockStages, newStage]));
            }
            await fetchProgressData();
            return;
        }

        if (stageModal.data) {
            const { error } = await supabase.from('progress_stages').update(data).eq('id', stageModal.data.id);
            if (error) throw new Error(error.message);
        } else {
            const order = stages.length;
            const { error } = await supabase.from('progress_stages').insert([{ student_id: user.id, ...data, order }]);
            if (error) throw new Error(error.message);
        }
        await fetchProgressData();
    };

    const executeDeleteStage = async (stageId: string) => {
        if (user?.id.startsWith('mock')) {
            const mockStages = JSON.parse(localStorage.getItem('lara_progress_stages') || '[]');
            const mockItems = JSON.parse(localStorage.getItem('lara_progress_items') || '[]');
            localStorage.setItem('lara_progress_stages', JSON.stringify(mockStages.filter((s:any) => s.id !== stageId)));
            localStorage.setItem('lara_progress_items', JSON.stringify(mockItems.filter((i:any) => i.stage_id !== stageId)));
        } else {
            const { error } = await supabase.from('progress_stages').delete().eq('id', stageId);
            if (error) throw new Error(error.message);
        }
        await fetchProgressData();
        if (selectedStage?.id === stageId) setSelectedStage(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };


    // --- Items CRUD ---
    const handleSaveItem = async (data: { title: string, stage_id: string }) => {
        if (!user) throw new Error("Sessão inválida.");
        const stage = stages.find(s => s.id === data.stage_id);
        const order = stage?.items?.length || 0;

        if (user.id.startsWith('mock')) {
            const mockItems = JSON.parse(localStorage.getItem('lara_progress_items') || '[]');
            if (checklistModal.data) {
                const updated = mockItems.map((i: any) => i.id === checklistModal.data!.id ? { ...i, title: data.title } : i);
                localStorage.setItem('lara_progress_items', JSON.stringify(updated));
            } else {
                const newItem = { id: `mock-item-${Date.now()}`, student_id: user.id, stage_id: data.stage_id, title: data.title, completed: false, order, created_at: new Date().toISOString() };
                localStorage.setItem('lara_progress_items', JSON.stringify([...mockItems, newItem]));
            }
            await fetchProgressData();
            return;
        }

        if (checklistModal.data) {
            const { error } = await supabase.from('progress_items').update({ title: data.title }).eq('id', checklistModal.data.id);
            if (error) throw new Error(error.message);
        } else {
            const { error } = await supabase.from('progress_items').insert([{ student_id: user.id, stage_id: data.stage_id, title: data.title, order }]);
            if (error) throw new Error(error.message);
        }
        await fetchProgressData();
    };

    const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
        if (isEditMode || !user) return;
        try {
            if (user.id.startsWith('mock')) {
                const mockItems = JSON.parse(localStorage.getItem('lara_progress_items') || '[]');
                const updated = mockItems.map((i: any) => i.id === itemId ? { ...i, completed: !currentStatus } : i);
                localStorage.setItem('lara_progress_items', JSON.stringify(updated));
            } else {
                const { error } = await supabase.from('progress_items').update({ completed: !currentStatus }).eq('id', itemId);
                if (error) throw error;
            }
            // Rapid optimistic update locally so the UI feels instantaneous
            setStages(prev => prev.map(s => ({
                ...s,
                items: s.items?.map(i => i.id === itemId ? { ...i, completed: !currentStatus } : i)
            })));
        } catch(err) {
            console.error(err);
        }
    };

    const executeDeleteItem = async (itemId: string) => {
        if (user?.id.startsWith('mock')) {
            const mockItems = JSON.parse(localStorage.getItem('lara_progress_items') || '[]');
            localStorage.setItem('lara_progress_items', JSON.stringify(mockItems.filter((i:any) => i.id !== itemId)));
        } else {
            const { error } = await supabase.from('progress_items').delete().eq('id', itemId);
            if (error) throw new Error(error.message);
        }
        await fetchProgressData();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };


    // --- Empty State ---
    if (!isLoading && stages.length === 0) {
        return (
            <div className={`space-y-8 animate-fade-in relative`}>
                <header className="pb-6 border-b border-premium-border dark:border-stone-700">
                    <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium flex items-center gap-3">
                        Meu Progresso
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Sua jornada personalizada de pesquisa e organização.</p>
                </header>
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-stone-800 rounded-full flex items-center justify-center mb-6">
                        <FileText size={40} className="text-gray-400 dark:text-gray-500" />
                    </div>
                    <h2 className="text-2xl font-serif text-gray-800 dark:text-gray-100 mb-2">Sua jornada ainda não começou</h2>
                    <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                        Você ou sua mentora podem criar etapas personalizadas, montar checklists de entregas e acompanhar o seu progresso diário aqui.
                    </p>
                    <button 
                        onClick={() => setStageModal({ isOpen: true })}
                        className="bg-secondary hover:bg-[#6b5d52] text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-sm transition-colors shadow-lg flex items-center gap-2"
                    >
                        <Plus size={18} /> Cadastrar Primeira Etapa
                    </button>
                </div>
                {/* Mount the Modal here to allow first creation */}
                <StageModal isOpen={stageModal.isOpen} onClose={() => setStageModal({ isOpen: false })} onSave={handleSaveStage} />
            </div>
        );
    }


    return (
        <div className={`space-y-8 animate-fade-in relative ${isEditMode ? 'ring-4 ring-secondary/10 rounded-3xl p-4 -m-4 transition-all' : ''}`}>
            {/* Header */}
            <header className="pb-6 border-b border-premium-border dark:border-stone-700">
                <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium flex items-center gap-3">
                            Meu Progresso
                            {isEditMode && <span className="text-xs bg-secondary text-white px-2 py-1 rounded-full font-sans tracking-wide">MODO EDIÇÃO</span>}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Acompanhe e personalize cada etapa do seu mestrado.</p>
                    </div>
                    <div className="flex items-end gap-3">
                        {isEditMode && (
                            <button
                                onClick={() => setStageModal({ isOpen: true, data: null })}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-gray-700 dark:text-gray-200 border border-transparent transition-all"
                            >
                                <Plus size={18} /> <span className="text-sm font-bold uppercase">Nova Etapa</span>
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsEditMode(!isEditMode);
                                if (isEditMode) setSelectedStage(null); // Close drawer when leaving edit
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${isEditMode ? 'bg-secondary text-white border-secondary shadow-lg' : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-stone-700 hover:border-secondary'}`}
                        >
                            {isEditMode ? <CheckCircle size={18} /> : <Pencil size={18} />}
                            <span className="text-sm font-bold uppercase tracking-wider">{isEditMode ? 'Concluir' : 'Editar'}</span>
                        </button>
                        {!isEditMode && (
                            <div className="text-right ml-4">
                                <span className="text-4xl font-bold text-secondary dark:text-primary">{progressPercentage}%</span>
                                <span className="text-xs uppercase tracking-widest text-[#cdbaa6] block font-bold">Concluído</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-full bg-surface dark:bg-dark-surface rounded-full h-4 overflow-hidden shadow-inner">
                    <div className={`h-4 rounded-full transition-all duration-1000 ease-out ${isEditMode ? 'bg-gray-300 dark:bg-stone-600' : 'bg-secondary dark:bg-primary'}`} style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </header>

            {/* Timeline */}
            <div className="relative pl-8 md:pl-0 max-w-4xl mx-auto">
                <div className="absolute left-8 top-4 bottom-10 w-0.5 bg-gray-200 dark:bg-stone-800 md:left-1/2 md:-ml-[1px]"></div>
                
                <div className="space-y-12">
                    {enrichedStages.map((stage, index) => {
                        const isLeft = index % 2 === 0;
                        const isLocked = stage.computedStatus === 'LOCKED';
                        const isDone = stage.computedStatus === 'DONE';
                        const isActive = stage.computedStatus === 'IN_PROGRESS';
                        
                        const items = stage.items || [];
                        const completedCount = items.filter(t => t.completed).length;

                        return (
                            <div key={stage.id} className={`relative flex items-center md:justify-between ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                <div className="absolute left-0 w-16 flex justify-center md:static md:w-1/2 md:flex md:justify-center md:items-center order-1 focus:outline-none z-10">
                                    <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-md ${isDone ? 'bg-secondary border-secondary dark:bg-primary dark:border-primary' : ''} ${isActive ? 'bg-white dark:bg-stone-900 border-secondary dark:border-primary scale-110' : ''} ${isLocked ? 'bg-gray-100 dark:bg-stone-800 border-gray-300 dark:border-stone-700' : ''} ${isEditMode ? 'animate-pulse border-dashed' : ''}`}>
                                        {isEditMode ? <Pencil size={14} className="text-gray-500" /> : (
                                            <>
                                                {isDone && <CheckCircle size={18} className="text-white dark:text-stone-900" />}
                                                {isActive && <div className="w-3 h-3 bg-secondary dark:bg-primary rounded-full animate-pulse" />}
                                                {isLocked && <Lock size={14} className="text-gray-400 dark:text-gray-600" />}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div onClick={() => (!isLocked || isEditMode) && setSelectedStage(stage)} className={`ml-16 md:ml-0 w-full md:w-[45%] p-6 rounded-2xl border transition-all duration-300 cursor-pointer group relative ${isActive ? 'bg-white dark:bg-dark-card border-secondary/50 shadow-card-hover transform md:scale-105' : ''} ${isDone ? 'bg-surface/50 dark:bg-dark-surface/30 border-transparent hover:bg-white dark:hover:bg-dark-card' : ''} ${isLocked && !isEditMode ? 'bg-gray-50 dark:bg-stone-900/50 border-transparent opacity-60 cursor-not-allowed grayscale' : ''} ${isEditMode ? 'border-2 border-dashed border-secondary/30 bg-white dark:bg-dark-card hover:border-secondary' : ''}`}>
                                    {isEditMode && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, title: 'Excluir Etapa', message: `Tem certeza que deseja excluir "${stage.title}" e todos os seus itens?`, action: () => executeDeleteStage(stage.id) }); }}
                                            className="absolute -top-3 -right-3 bg-red-100 hover:bg-red-500 text-red-600 hover:text-white dark:bg-red-900/50 dark:hover:bg-red-600 p-2 rounded-full shadow-md transition-colors z-20"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    
                                    <div className="flex justify-between items-start">
                                        <div className="w-full">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${isActive ? 'text-secondary dark:text-primary' : 'text-gray-400'}`}>
                                                    Etapa 0{index + 1}
                                                </span>
                                            </div>
                                            <h3 className={`text-lg font-bold mb-2 ${isLocked ? 'text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                                                {stage.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                                                {stage.description}
                                            </p>
                                        </div>
                                        {!isLocked && !isEditMode && <div className="bg-surface dark:bg-stone-800 p-2 rounded-full text-secondary group-hover:bg-secondary group-hover:text-white transition-colors"><ChevronRight size={16} /></div>}
                                        {isEditMode && <div className="bg-surface dark:bg-stone-800 p-2 rounded-full text-secondary"><Pencil size={16} /></div>}
                                    </div>

                                    {!isLocked && !isEditMode && items.length > 0 && (
                                        <div className="mt-4 flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                                <div className="h-full bg-secondary dark:bg-primary transition-all duration-500" style={{ width: `${(completedCount / items.length) * 100}%` }} />
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-bold">{completedCount}/{items.length}</span>
                                        </div>
                                    )}
                                    {!isLocked && !isEditMode && items.length === 0 && (
                                        <div className="mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-wider">0 Itens</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Checklist Drawer */}
            {selectedStage && (
                <div className="fixed inset-0 z-40 flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedStage(null)} />
                    <div className="relative w-full md:w-[500px] h-full bg-white dark:bg-dark-card shadow-2xl p-8 flex flex-col animate-slide-in-right overflow-y-auto border-l border-premium-border dark:border-stone-700">
                        <button onClick={() => setSelectedStage(null)} className="absolute top-6 right-6 p-2 hover:bg-surface dark:hover:bg-dark-surface rounded-full transition-colors">
                            <X size={24} className="text-gray-500" />
                        </button>

                        <div className="mt-8 mb-8">
                            <span className="text-xs font-bold uppercase tracking-wider text-secondary flex justify-between items-center mb-2">
                                {isEditMode ? 'Editando Etapa' : 'Detalhes da Etapa'}
                                {isEditMode && (
                                    <button onClick={() => setStageModal({ isOpen: true, data: selectedStage })} className="flex items-center gap-1 text-[10px] bg-secondary/10 px-2 py-1 rounded">
                                        <Pencil size={12}/> Editar Info
                                    </button>
                                )}
                            </span>
                            <h2 className="text-3xl font-serif text-gray-800 dark:text-gray-100 font-medium mb-4">{selectedStage.title}</h2>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{selectedStage.description}</p>
                        </div>

                        {!isEditMode && selectedStage.computedStatus === 'DONE' && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 rounded-xl flex items-start gap-3 mb-8">
                                <CheckCircle size={20} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-green-800 dark:text-green-300 text-sm">Etapa Concluída!</h4>
                                    <p className="text-green-700 dark:text-green-400 text-xs mt-1">Você pode revisar os itens abaixo, mas não é necessário mais nenhuma ação.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 flex-1">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <FileText size={18} /> Checklist
                                </h3>
                                {isEditMode && (
                                    <button onClick={() => setChecklistModal({ isOpen: true, stageId: selectedStage.id, data: null })} className="text-xs bg-surface hover:bg-gray-200 px-3 py-1.5 rounded-lg font-bold text-secondary flex items-center gap-1">
                                        <Plus size={14} /> Adicionar Item
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {(selectedStage.items || []).map(item => (
                                    <div key={item.id} onClick={() => handleToggleItem(item.id, item.completed)} className={`flex items-center p-4 rounded-xl border transition-all duration-200 select-none group ${!isEditMode && item.completed ? 'bg-surface/50 border-transparent' : 'bg-white dark:bg-dark-card border-gray-200 hover:border-secondary shadow-sm'} ${!isEditMode ? 'cursor-pointer' : ''}`}>
                                        {!isEditMode && (
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors ${item.completed ? 'bg-secondary border-secondary' : 'border-gray-300'}`}>
                                                {item.completed && <CheckCircle size={14} className="text-white" />}
                                            </div>
                                        )}
                                        <span className={`flex-1 text-sm font-medium ${!isEditMode && item.completed ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {item.title}
                                        </span>
                                        {isEditMode && (
                                            <div className="flex gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); setChecklistModal({ isOpen: true, stageId: selectedStage.id, data: item }); }} className="p-2 text-gray-400 hover:text-secondary rounded-full bg-surface">
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, title: 'Excluir Item', message: `Tem certeza que deseja excluir "${item.title}"?`, action: () => executeDeleteItem(item.id) }); }} className="p-2 text-gray-400 hover:text-red-500 rounded-full bg-surface">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(selectedStage.items || []).length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-xl">Nenhum item cadastrado nesta etapa.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Overlays */}
            <StageModal isOpen={stageModal.isOpen} initialData={stageModal.data} onClose={() => setStageModal({ isOpen: false })} onSave={handleSaveStage} />
            <ChecklistModal isOpen={checklistModal.isOpen} initialData={checklistModal.data} stageId={checklistModal.stageId} onClose={() => setChecklistModal({ isOpen: false, stageId: '' })} onSave={handleSaveItem} />
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />
        </div>
    );
};
