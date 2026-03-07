import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ProgressStage, ProgressItem } from '../types';

interface StageModalProps {
  isOpen: boolean;
  initialData?: ProgressStage | null;
  onClose: () => void;
  onSave: (data: { title: string, description: string | null }) => Promise<void> | void;
}

export const StageModal: React.FC<StageModalProps> = ({ isOpen, initialData, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setErrorMsg('');
      setIsLoading(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        setErrorMsg('O título é obrigatório.');
        return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() || null });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar etapa.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />
      <div className="relative bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-stone-700 animate-slide-up">
        <button onClick={() => !isLoading && onClose()} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-full transition-colors disabled:opacity-50" disabled={isLoading}>
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-6">
          {initialData ? 'Editar Etapa' : 'Nova Etapa'}
        </h2>

        {errorMsg && (
            <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{errorMsg}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título da Etapa</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors dark:text-gray-100 placeholder:text-gray-400"
              placeholder="Ex: Qualificação"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors resize-none dark:text-gray-100 placeholder:text-gray-400"
              placeholder="Ex: Preparação de slides e agendamento da banca..."
              disabled={isLoading}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || !title.trim()} className="px-5 py-2.5 text-sm font-bold text-white bg-secondary hover:bg-[#6b5d52] rounded-xl transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (initialData ? 'Salvar' : 'Criar Etapa')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


interface ChecklistModalProps {
    isOpen: boolean;
    initialData?: ProgressItem | null;
    stageId: string;
    onClose: () => void;
    onSave: (data: { title: string, stage_id: string }) => Promise<void> | void;
}
  
export const ChecklistModal: React.FC<ChecklistModalProps> = ({ isOpen, initialData, stageId, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
  
    useEffect(() => {
      if (isOpen) {
        setTitle(initialData?.title || '');
        setErrorMsg('');
        setIsLoading(false);
      }
    }, [isOpen, initialData]);
  
    if (!isOpen) return null;
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
          setErrorMsg('O título é obrigatório.');
          return;
      }
      setErrorMsg('');
      setIsLoading(true);
      try {
        await onSave({ title: title.trim(), stage_id: stageId });
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao salvar item.');
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />
        <div className="relative bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-stone-700 animate-slide-up">
          <button onClick={() => !isLoading && onClose()} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-full transition-colors disabled:opacity-50" disabled={isLoading}>
            <X size={20} />
          </button>
          
          <h2 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-6">
            {initialData ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
  
          {errorMsg && (
              <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium">{errorMsg}</span>
              </div>
          )}
  
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título da Tarefa</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors dark:text-gray-100 placeholder:text-gray-400"
                placeholder="Ex: Escrever Introdução"
                disabled={isLoading}
              />
            </div>
  
            <div className="pt-4 flex justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={isLoading || !title.trim()} className="px-5 py-2.5 text-sm font-bold text-white bg-secondary hover:bg-[#6b5d52] rounded-xl transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (initialData ? 'Salvar' : 'Adicionar')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
};
