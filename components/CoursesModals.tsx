import React, { useState, useEffect } from 'react';
import { X, AlertCircle, UploadCloud, Youtube, Link as LinkIcon, FileText, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Course, CourseModule, CourseLesson } from '../types';

// ==========================================
// COURSE MODAL (Folder Level 1)
// ==========================================
interface CourseModalProps {
  isOpen: boolean;
  initialData?: Course | null;
  onClose: () => void;
  onSave: (data: { title: string, description: string | null, status: 'DRAFT' | 'PUBLISHED', studentIds: string[] }) => Promise<void> | void;
}

export const CourseModal: React.FC<CourseModalProps> = ({ isOpen, initialData, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  
  const [students, setStudents] = useState<{id: string, full_name: string, email: string}[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setStatus(initialData?.status || 'DRAFT');
      setErrorMsg('');
      setIsLoading(false);
      fetchStudentData();
    }
  }, [isOpen, initialData]);

  const fetchStudentData = async () => {
    try {
        const { data: allStudents } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'STUDENT').order('full_name');
        setStudents(allStudents || []);

        if (initialData) {
            const { data: access } = await supabase.from('student_course_access').select('student_id').eq('course_id', initialData.id);
            setSelectedStudentIds(access?.map(a => a.student_id) || []);
        } else {
            setSelectedStudentIds([]);
        }
    } catch (err) {
        console.error("Error fetching students", err);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        setErrorMsg('O nome do curso é obrigatório.');
        return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await onSave({ 
        title: title.trim(), 
        description: description.trim() || null, 
        status,
        studentIds: selectedStudentIds
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar curso.');
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
          {initialData ? 'Configurações do Curso' : 'Novo Curso'}
        </h2>

        {errorMsg && (
            <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{errorMsg}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Curso</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors dark:text-gray-100 placeholder:text-gray-400"
              placeholder="Ex: Redação Acadêmica de Alto Nível"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição Breve (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors dark:text-gray-100 placeholder:text-gray-400 resize-none"
              placeholder="Detalhes sobre o que o aluno aprenderá..."
              disabled={isLoading}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status de Publicação</label>
             <div className="grid grid-cols-2 gap-3">
                 <button 
                    type="button" 
                    onClick={() => setStatus('DRAFT')}
                    className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${status === 'DRAFT' ? 'border-secondary bg-secondary/5 text-secondary shadow-sm' : 'border-gray-200 dark:border-stone-700 text-gray-400 opacity-60'}`}
                 >
                    Rascunho
                 </button>
                 <button 
                    type="button" 
                    onClick={() => setStatus('PUBLISHED')}
                    className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${status === 'PUBLISHED' ? 'border-green-500 bg-green-50 dark:bg-green-900/10 text-green-600 shadow-sm' : 'border-gray-200 dark:border-stone-700 text-gray-400 opacity-60'}`}
                 >
                    Publicado
                 </button>
             </div>

             <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                    Gerenciar Acesso
                    <span className="text-[10px] font-bold text-secondary uppercase bg-secondary/10 px-2 py-0.5 rounded-md">
                        {selectedStudentIds.length} Selecionados
                    </span>
                </label>
                
                <div className="relative mb-3">
                    <input 
                        type="text" 
                        placeholder="Buscar aluno..." 
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-stone-800 border border-gray-100 dark:border-stone-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-secondary"
                    />
                </div>

                <div className="max-h-48 overflow-y-auto custom-scrollbar border border-gray-50 dark:border-stone-800 rounded-xl bg-gray-50/50 dark:bg-stone-900/30 p-2 space-y-1">
                    {students
                        .filter(s => s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) || s.email.toLowerCase().includes(studentSearch.toLowerCase()))
                        .map(student => (
                            <div 
                                key={student.id} 
                                onClick={() => toggleStudent(student.id)}
                                className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${selectedStudentIds.includes(student.id) ? 'bg-secondary/10 border border-secondary/20' : 'hover:bg-white dark:hover:bg-stone-800 border border-transparent'}`}
                            >
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{student.full_name}</span>
                                    <span className="text-[10px] text-gray-400">{student.email}</span>
                                </div>
                                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${selectedStudentIds.includes(student.id) ? 'bg-secondary border-secondary text-white' : 'border-gray-300 dark:border-stone-700'}`}>
                                    {selectedStudentIds.includes(student.id) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                </div>
                            </div>
                        ))
                    }
                    {students.length === 0 && <p className="text-[10px] text-center text-gray-400 py-4 italic">Nenhum aluno cadastrado.</p>}
                </div>
             </div>

             <p className="text-[10px] text-gray-400 mt-4 italic">* Apenas os alunos selecionados acima poderão visualizar este curso quando publicado.</p>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || !title.trim()} className="px-8 py-2.5 text-sm font-bold text-white bg-secondary hover:bg-[#6b5d52] rounded-xl transition-colors flex items-center justify-center min-w-[120px] shadow-lg disabled:opacity-50">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (initialData ? 'Atualizar' : 'Criar Curso')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// MODULE MODAL (Logical Grouping Level)
// ==========================================
interface ModuleModalProps {
  isOpen: boolean;
  initialData?: CourseModule | null;
  onClose: () => void;
  onSave: (title: string) => Promise<void> | void;
}

export const ModuleModal: React.FC<ModuleModalProps> = ({ isOpen, initialData, onClose, onSave }) => {
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
        setErrorMsg('O título do módulo é obrigatório.');
        return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await onSave(title.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar módulo.');
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
          {initialData ? 'Editar Módulo' : 'Novo Módulo'}
        </h2>

        {errorMsg && (
            <div className="mb-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span className="font-medium">{errorMsg}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título do Módulo</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-2.5 outline-none focus:border-secondary transition-colors dark:text-gray-100 placeholder:text-gray-400"
              placeholder="Ex: Módulo 1: Fundamentos"
              disabled={isLoading}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-5 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || !title.trim()} className="px-5 py-2.5 text-sm font-bold text-white bg-secondary hover:bg-[#6b5d52] rounded-xl transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// LESSON MODAL (Video + PDF Integration)
// ==========================================
interface LessonModalProps {
  isOpen: boolean;
  initialData?: CourseLesson | null;
  onClose: () => void;
  onSave: (data: { title: string, description: string | null, youtube_url: string, file: File | null }) => Promise<void> | void;
}

export const LessonModal: React.FC<LessonModalProps> = ({ isOpen, initialData, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(youtubeUrl);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title || '');
      setDescription(initialData?.description || '');
      setYoutubeUrl(initialData?.youtube_url || '');
      setFile(null);
      setErrorMsg('');
      setIsLoading(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
        setErrorMsg('O título da aula é obrigatório.');
        return;
    }
    if (!youtubeUrl.trim() || !getYouTubeId(youtubeUrl)) {
        setErrorMsg('Insira um link válido do YouTube.');
        return;
    }
    setErrorMsg('');
    setIsLoading(true);
    try {
      await onSave({ 
        title: title.trim(), 
        description: description.trim() || null,
        youtube_url: youtubeUrl.trim(),
        file
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao salvar aula.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const selected = e.target.files[0];
        if (selected.type !== 'application/pdf') {
            setErrorMsg('Material da aula precisa ser em PDF.');
            setFile(null);
        } else {
            setErrorMsg('');
            setFile(selected);
        }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isLoading && onClose()} />
      <div className="relative bg-white dark:bg-dark-card w-full max-w-xl rounded-[2rem] shadow-2xl p-8 border border-gray-100 dark:border-stone-700 animate-slide-up max-h-[90vh] overflow-y-auto">
        <button onClick={() => !isLoading && onClose()} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-full transition-colors disabled:opacity-50" disabled={isLoading}>
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-8 flex items-center gap-3">
          <Youtube className="text-red-500" size={28} />
          {initialData ? 'Configurar Aula' : 'Nova Aula em Vídeo'}
        </h2>

        {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-2xl text-sm flex items-center gap-3 border border-red-100 dark:border-red-900/50">
                <AlertCircle size={20} className="shrink-0" />
                <span className="font-medium">{errorMsg}</span>
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-widest">Título da Aula</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-3 outline-none focus:border-secondary transition-colors dark:text-gray-100"
                        placeholder="Ex: Introdução à Metodologia"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-widest flex items-center gap-2">
                        <LinkIcon size={14} /> Link do YouTube
                    </label>
                    <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-3 outline-none focus:border-secondary transition-colors dark:text-gray-100"
                        placeholder="https://www.youtube.com/watch?v=..."
                        disabled={isLoading}
                    />
                </div>
                {videoId && (
                    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-stone-700 bg-black aspect-video relative shadow-inner">
                        <iframe 
                            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0`} 
                            className="absolute inset-0 w-full h-full"
                            frameBorder="0"
                            allowFullScreen
                        />
                        <div className="absolute inset-0 z-10"></div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} /> Material da Aula (PDF)
                    </label>
                    <div className="relative border-2 border-dashed border-gray-200 dark:border-stone-700 rounded-2xl p-6 flex flex-col items-center justify-center hover:bg-surface dark:hover:bg-stone-800 transition-all cursor-pointer group">
                        <input 
                            type="file" 
                            accept="application/pdf"
                            onChange={handleFileChange}
                            disabled={isLoading}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <UploadCloud size={40} className={`mb-3 ${file ? 'text-green-500' : 'text-gray-300 group-hover:text-secondary'}`} />
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center px-4 leading-tight">
                            {file ? file.name : (initialData?.pdf_path ? 'Trocar PDF Atual' : 'Arraste ou clique para enviar PDF')}
                        </span>
                        {initialData?.pdf_size && !file && (
                            <span className="text-[10px] text-gray-400 mt-2">Atual: {initialData.pdf_size}</span>
                        )}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-widest">Descrição / Objetivos</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full bg-surface dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl px-4 py-3 outline-none focus:border-secondary transition-colors dark:text-gray-100 resize-none"
                        placeholder="Quais tópicos serão abordados?"
                        disabled={isLoading}
                    />
                </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-stone-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading || !title.trim()} className="px-10 py-3 text-sm font-bold text-white bg-secondary hover:bg-[#6b5d52] rounded-xl transition-all shadow-xl hover:-translate-y-1">
              {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (initialData ? 'Atualizar Aula' : 'Publicar Aula')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
