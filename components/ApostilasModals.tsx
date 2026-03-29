import React, { useState, useEffect } from 'react';
import { X, AlertCircle, UploadCloud } from 'lucide-react';
import { ApostilaFolder, Apostila } from '../types';

interface FolderModalProps {
  isOpen: boolean;
  initialData?: ApostilaFolder | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void> | void;
}

export const FolderModal: React.FC<FolderModalProps> = ({ isOpen, initialData, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setErrorMsg('');
      setIsLoading(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
        setErrorMsg('O nome é obrigatório.');
        return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar pasta.');
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
          {initialData ? 'Renomear Pasta' : 'Nova Pasta'}
        </h2>

        {errorMsg && (
            <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{errorMsg}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Pasta</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors dark:text-gray-100 placeholder:text-gray-400"
              placeholder="Ex: Módulo 1 - Redação"
              disabled={isLoading}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || !name.trim()} className="px-5 py-2.5 text-sm font-bold text-white bg-secondary hover:bg-[#6b5d52] rounded-xl transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


interface UploadApostilaModalProps {
    isOpen: boolean;
    folderId: string;
    initialData?: Apostila | null;
    students: { id: string, name: string }[]; 
    onClose: () => void;
    onSave: (data: { title: string, description: string | null, file: File | null, visibility_type: 'ALL'|'SPECIFIC', visible_students: string[] }) => Promise<void> | void;
}
  
export const UploadApostilaModal: React.FC<UploadApostilaModalProps> = ({ isOpen, folderId, initialData, students, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [visibilityType, setVisibilityType] = useState<'ALL' | 'SPECIFIC'>('ALL');
    const [visibleStudents, setVisibleStudents] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
  
    useEffect(() => {
      if (isOpen) {
        setTitle(initialData?.title || '');
        setDescription(initialData?.description || '');
        setFile(null); 
        setVisibilityType(initialData?.visibility_type || 'ALL');
        setVisibleStudents(initialData?.visible_students || []);
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
      if (!initialData && !file) {
          setErrorMsg('Você precisa anexar um arquivo PDF.');
          return;
      }
      if (visibilityType === 'SPECIFIC' && visibleStudents.length === 0) {
          setErrorMsg('Selecione ao menos um aluno para visualização.');
          return;
      }

      setErrorMsg('');
      setIsLoading(true);
      try {
        await onSave({ 
            title: title.trim(), 
            description: description.trim() || null, 
            file,
            visibility_type: visibilityType,
            visible_students: visibilityType === 'ALL' ? [] : visibleStudents
        });
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Erro ao processar apostila.');
      } finally {
        setIsLoading(false);
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selected = e.target.files[0];
            if (selected.type !== 'application/pdf') {
                setErrorMsg('Apenas arquivos PDF são permitidos.');
                setFile(null);
            } else {
                setErrorMsg('');
                setFile(selected);
                if (!title) {
                    setTitle(selected.name.replace('.pdf', ''));
                }
            }
        }
    };

    const toggleStudent = (studentId: string) => {
        setVisibleStudents(prev => 
            prev.includes(studentId) 
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };
  
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />
        <div className="relative bg-white dark:bg-dark-card w-full max-w-lg rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-stone-700 animate-slide-up max-h-[90vh] overflow-y-auto">
          <button onClick={() => !isLoading && onClose()} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-full transition-colors disabled:opacity-50" disabled={isLoading}>
            <X size={20} />
          </button>
          
          <h2 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-6">
            {initialData ? 'Editar Documento' : 'Nova Apostila / PDF'}
          </h2>
  
          {errorMsg && (
              <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="font-medium inline-block">{errorMsg}</span>
              </div>
          )}
  
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* File Upload Area */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Arquivo PDF {initialData && '(Opcional: Envie para substituir)'}</label>
                <div className="relative border-2 border-dashed border-gray-300 dark:border-stone-600 rounded-xl p-6 flex flex-col items-center justify-center hover:bg-surface dark:hover:bg-stone-800 transition-colors">
                    <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={handleFileChange}
                        disabled={isLoading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <UploadCloud size={32} className={`mb-2 ${file ? 'text-green-500' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                        {file ? file.name : (initialData ? 'Clique para trocar o PDF atual' : 'Clique ou arraste o PDF aqui')}
                    </span>
                    {!file && <span className="text-xs text-gray-400 mt-1">Tam. Máx: 10MB</span>}
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título da Apostila</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors dark:text-gray-100 placeholder:text-gray-400"
                placeholder="Ex: Guia de Redação"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors dark:text-gray-100 placeholder:text-gray-400 resize-none"
                placeholder="Detalhes adicionais..."
                disabled={isLoading}
              />
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-stone-700 mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Visibilidade</label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className={`border rounded-xl p-3 flex flex-col cursor-pointer transition-colors ${visibilityType === 'ALL' ? 'border-secondary bg-secondary/5 dark:bg-secondary/20' : 'border-gray-200 dark:border-stone-600 hover:bg-surface dark:hover:bg-stone-800'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <input type="radio" name="vis" checked={visibilityType === 'ALL'} onChange={() => setVisibilityType('ALL')} className="text-secondary focus:ring-secondary" disabled={isLoading} />
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">Todos os Alunos</span>
                        </div>
                        <span className="text-xs text-gray-500 pl-5">Público para qualquer aluno matriculado.</span>
                    </label>
                    <label className={`border rounded-xl p-3 flex flex-col cursor-pointer transition-colors ${visibilityType === 'SPECIFIC' ? 'border-secondary bg-secondary/5 dark:bg-secondary/20' : 'border-gray-200 dark:border-stone-600 hover:bg-surface dark:hover:bg-stone-800'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <input type="radio" name="vis" checked={visibilityType === 'SPECIFIC'} onChange={() => setVisibilityType('SPECIFIC')} className="text-secondary focus:ring-secondary" disabled={isLoading}/>
                            <span className="font-bold text-sm text-gray-800 dark:text-gray-200">Específico</span>
                        </div>
                        <span className="text-xs text-gray-500 pl-5">Apenas alunos selecionados poderão ver.</span>
                    </label>
                </div>

                {visibilityType === 'SPECIFIC' && (
                    <div className="bg-surface dark:bg-stone-800 p-3 rounded-xl max-h-40 overflow-y-auto border border-gray-200 dark:border-stone-700">
                        {students.length === 0 ? (
                            <div className="text-xs text-center text-gray-500 py-2">Nenhum aluno cadastrado.</div>
                        ) : (
                            students.map(s => (
                                <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 dark:hover:bg-stone-700 rounded-lg cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={visibleStudents.includes(s.id)}
                                        onChange={() => toggleStudent(s.id)}
                                        disabled={isLoading}
                                        className="rounded text-secondary focus:ring-secondary" 
                                    />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                )}
            </div>
  
            <div className="pt-4 flex justify-end gap-3 mt-4">
              <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={isLoading} className="px-5 py-2.5 text-sm font-bold text-white bg-secondary hover:bg-[#6b5d52] rounded-xl transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50">
                {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar Apostila'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
};
