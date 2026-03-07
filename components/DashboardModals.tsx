import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DashboardTask, DashboardGoal, AgendaEvent } from '../types';

interface BaseModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

const BaseModal: React.FC<BaseModalProps> = ({ isOpen, title, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in" onClick={onClose} />
            <div className="relative bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-premium-border dark:border-stone-700 animate-slide-up">
                <div className="p-6 border-b border-gray-100 dark:border-stone-700 flex justify-between items-center bg-gray-50/50 dark:bg-stone-800/20">
                    <h3 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-stone-700">
                        <X size={20} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export const TaskModal = ({ isOpen, onClose, onSave, initialData }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (data: { text: string, due_label: string, is_urgent: boolean }) => Promise<void> | void, 
    initialData?: DashboardTask | null 
}) => {
    const [text, setText] = useState('');
    const [dueLabel, setDueLabel] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setText(initialData?.text || '');
            setDueLabel(initialData?.due_label || 'HOJE');
            setIsLoading(false);
            setErrorMsg('');
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim()) return;
        setIsLoading(true);
        setErrorMsg('');
        try {
            const isListHover = dueLabel.toUpperCase() === 'HOJE';
            await onSave({ text, due_label: dueLabel.toUpperCase() || 'HOJE', is_urgent: isListHover });
            onClose();
        } catch (error: any) {
            setErrorMsg(error.message || 'Erro ao salvar. Verifique sua conexão e permissões.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseModal isOpen={isOpen} title={initialData ? "Editar Próximo Passo" : "Novo Próximo Passo"} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descrição da Tarefa</label>
                    <input autoFocus type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex: Ler Artigo Metodologia" className="w-full p-4 rounded-xl bg-surface dark:bg-dark-surface border border-transparent focus:border-secondary dark:focus:border-primary outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-all font-medium" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Prazo (Urgência)</label>
                    <div className="flex gap-2">
                        {['HOJE', 'AMANHÃ', 'SEM PRAZO'].map(opt => (
                            <button key={opt} type="button" onClick={() => setDueLabel(opt)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${dueLabel === opt ? 'bg-secondary text-white border-secondary dark:bg-primary dark:text-stone-900 border-primary shadow-md' : 'bg-transparent text-gray-500 border-gray-200 dark:border-stone-700 hover:bg-gray-50 dark:hover:bg-stone-800'}`}>
                                {opt}
                            </button>
                        ))}
                    </div>
                    <input type="text" value={dueLabel} onChange={(e) => setDueLabel(e.target.value)} placeholder="Ou digite uma data (ex: 15/10)" className="w-full mt-3 p-3 rounded-lg bg-surface dark:bg-dark-surface border border-transparent focus:border-secondary dark:focus:border-primary outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-all font-medium text-sm" />
                </div>
                <div className="flex justify-end pt-2">
                     <button type="submit" disabled={!text.trim() || isLoading} className="flex justify-center items-center px-6 py-3 rounded-xl font-bold bg-secondary dark:bg-primary text-white dark:text-stone-900 shadow-lg shadow-secondary/20 hover:bg-[#6b5d52] dark:hover:bg-[#bda895] transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 dark:border-stone-900/30 border-t-white dark:border-t-stone-900 rounded-full animate-spin"></div>
                        ) : (initialData ? "Salvar Alterações" : "Adicionar Tarefa")}
                    </button>
                </div>
                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center animate-fade-in border border-red-100 dark:border-red-900/30">
                        {errorMsg}
                    </div>
                )}
            </form>
        </BaseModal>
    );
};

export const GoalModal = ({ isOpen, onClose, onSave, initialData }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (data: { title: string, percent: number }) => Promise<void> | void, 
    initialData?: DashboardGoal | null 
}) => {
    const [title, setTitle] = useState('');
    const [percent, setPercent] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTitle(initialData?.title || '');
            setPercent(initialData?.percent || 0);
            setIsLoading(false);
            setErrorMsg('');
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setIsLoading(true);
        setErrorMsg('');
        try {
            await onSave({ title, percent });
            onClose();
        } catch (error: any) {
            setErrorMsg(error.message || 'Erro ao salvar a meta.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseModal isOpen={isOpen} title={initialData ? "Editar Meta" : "Nova Meta"} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Título da Meta</label>
                    <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Finalizar Projeto v2" className="w-full p-4 rounded-xl bg-surface dark:bg-dark-surface border border-transparent focus:border-secondary dark:focus:border-primary outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-all font-medium" />
                </div>
                <div>
                     <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Progresso (%)</label>
                        <span className="text-secondary dark:text-primary font-bold text-lg leading-none">{percent}%</span>
                     </div>
                    <input type="range" min="0" max="100" value={percent} onChange={(e) => setPercent(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-secondary dark:accent-primary" />
                </div>
                <div className="flex justify-end pt-2">
                     <button type="submit" disabled={!title.trim() || isLoading} className="flex justify-center items-center px-6 py-3 rounded-xl font-bold bg-secondary dark:bg-primary text-white dark:text-stone-900 shadow-lg shadow-secondary/20 hover:bg-[#6b5d52] dark:hover:bg-[#bda895] transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 dark:border-stone-900/30 border-t-white dark:border-t-stone-900 rounded-full animate-spin"></div>
                        ) : (initialData ? "Salvar Progresso" : "Criar Meta")}
                    </button>
                </div>
                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center animate-fade-in border border-red-100 dark:border-red-900/30">
                        {errorMsg}
                    </div>
                )}
            </form>
        </BaseModal>
    );
};

export const EventModal = ({ isOpen, onClose, onSave, initialData }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: (data: { text: string, date_day: string, date_month: string }) => Promise<void> | void, 
    initialData?: AgendaEvent | null 
}) => {
    const [text, setText] = useState('');
    const [dateDay, setDateDay] = useState('');
    const [dateMonth, setDateMonth] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setText(initialData?.text || '');
            setDateDay(initialData?.date_day || new Date().getDate().toString());
            const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
            setDateMonth(initialData?.date_month || months[new Date().getMonth()]);
            setIsLoading(false);
            setErrorMsg('');
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !dateDay.trim() || !dateMonth.trim()) return;
        setIsLoading(true);
        setErrorMsg('');
        try {
            await onSave({ text, date_day: dateDay, date_month: dateMonth.toUpperCase().substring(0, 3) });
            onClose();
        } catch (error: any) {
             setErrorMsg(error.message || 'Erro ao salvar o evento.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BaseModal isOpen={isOpen} title={initialData ? "Editar Evento" : "Novo Evento"} onClose={onClose}>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nome do Evento</label>
                    <input autoFocus type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex: Prova de Proficiência" className="w-full p-4 rounded-xl bg-surface dark:bg-dark-surface border border-transparent focus:border-secondary dark:focus:border-primary outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-all font-medium" />
                </div>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Dia</label>
                        <input type="text" maxLength={2} value={dateDay} onChange={(e) => setDateDay(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Ex: 15" className="w-full p-4 rounded-xl bg-surface dark:bg-dark-surface border border-transparent focus:border-secondary dark:focus:border-primary outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-all font-medium text-center text-xl" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mês</label>
                        <input type="text" maxLength={3} value={dateMonth} onChange={(e) => setDateMonth(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} placeholder="Ex: OUT" className="w-full p-4 rounded-xl bg-surface dark:bg-dark-surface border border-transparent focus:border-secondary dark:focus:border-primary outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 transition-all font-medium text-center uppercase text-xl tracking-wider" />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                     <button type="submit" disabled={!text.trim() || !dateDay.trim() || !dateMonth.trim() || isLoading} className="flex justify-center items-center px-6 py-3 rounded-xl font-bold bg-secondary dark:bg-primary text-white dark:text-stone-900 shadow-lg shadow-secondary/20 hover:bg-[#6b5d52] dark:hover:bg-[#bda895] transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full">
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 dark:border-stone-900/30 border-t-white dark:border-t-stone-900 rounded-full animate-spin"></div>
                        ) : (initialData ? "Salvar Evento" : "Adicionar à Agenda")}
                    </button>
                </div>
                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center animate-fade-in border border-red-100 dark:border-red-900/30">
                        {errorMsg}
                    </div>
                )}
            </form>
        </BaseModal>
    );
};
