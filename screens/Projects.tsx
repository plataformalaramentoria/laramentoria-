import React, { useState, useEffect } from 'react';
import { Upload, FileText, MessageCircle, CheckSquare, Clock, Edit2, Download, Plus, Trash2, Save, User, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { ProjectVersion, ProjectChecklistItem, ProjectFeedback } from '../types';
import { UploadProjectModal, FeedbackModal } from '../components/ProjectModals';

// Helper for 'drag handle' visual
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

interface ProjectsProps {
    studentId?: string;
}

const Projects: React.FC<ProjectsProps> = ({ studentId: propStudentId }) => {
  const { user, role } = useAuth();
  const isProfessor = role === 'PROFESSOR' || role === 'ADMIN';

  // The effective student ID we are viewing/managing
  const effectiveStudentId = propStudentId || user?.id;

  const [activeTab, setActiveTab] = useState<'history' | 'checklist'>('history');
  
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [checklist, setChecklist] = useState<ProjectChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Modals States ---
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ isOpen: boolean, version: ProjectVersion | null }>({ isOpen: false, version: null });
  
  // Checklist Edit Mode
  const [isChecklistEditMode, setIsChecklistEditMode] = useState(false);

  // --- Data Fetching ---
  const fetchData = async () => {
    if (!effectiveStudentId) return;
    setIsLoading(true);

    try {
      // 1. Fetch Project Versions with Feedbacks
      // Optimization: Student doesn't need to join own profile name.
      // Join 'profiles' ONLY for Professor/Admin view.
      let query = supabase
          .from('project_versions')
          .select(`
            *,
            feedbacks:project_feedbacks(*)
            ${isProfessor ? ', student:profiles(full_name)' : ''}
          `);
      
      if (propStudentId) {
          query = query.eq('student_id', propStudentId);
      } else if (!isProfessor) {
          query = query.eq('student_id', user!.id);
      }

      const { data: vData, error: vErr } = await query.order('version_number', { ascending: false });
      
      if (vErr) {
          console.error("Erro ao buscar versões:", vErr);
          // Fallback: If join fails due to relationship cache, try without join
          if (isProfessor && vErr.message.includes('relationship')) {
              const { data: fallbackData, error: fErr } = await supabase
                  .from('project_versions')
                  .select('*, feedbacks:project_feedbacks(*)')
                  .eq('student_id', propStudentId || user!.id)
                  .order('version_number', { ascending: false });
              
              if (fErr) throw new Error(`Erro no banco (Versões): ${fErr.message}`);
              setVersions(fallbackData as unknown as ProjectVersion[] || []);
          } else {
              throw new Error(`Erro no banco (Versões): ${vErr.message}`);
          }
      } else {
          setVersions(vData as unknown as ProjectVersion[] || []);
      }

      // 2. Fetch Projects Checklist
      const { data: checklistData, error: cErr } = await supabase
          .from('project_checklist_items')
          .select('*')
          .eq('student_id', effectiveStudentId)
          .order('order', { ascending: true });
      if (cErr) {
          console.error("Erro ao buscar checklist:", cErr);
          throw new Error(`Erro no banco (Checklist): ${cErr.message}`);
      }

      setChecklist(checklistData || []);
    } catch (err: any) {
      console.error("Erro ao carregar projetos:", err);
      alert(err.message || "Erro desconhecido ao carregar projetos.");
    } finally {
      // Small delay for smooth transition
      setTimeout(() => setIsLoading(false), 300);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, role, propStudentId]);

  // --- Actions: Projects ---
  const handleUploadProject = async (data: { title: string, file: File }) => {
    if (!effectiveStudentId) throw new Error("Sem identificação de aluno.");

    const myVersions = versions.filter(v => v.student_id === effectiveStudentId);
    const nextVersion = myVersions.length > 0 ? Math.max(...myVersions.map(v => v.version_number)) + 1 : 1;

    const ext = data.file.name.split('.').pop();
    const newFileName = `${effectiveStudentId}/${Date.now()}_v${nextVersion}.${ext}`;
    
    const { error: uploadErr } = await supabase.storage.from('projects').upload(newFileName, data.file);
    if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);

    const { data: publicUrlData } = supabase.storage.from('projects').getPublicUrl(newFileName);
    
    const { error: dbErr } = await supabase.from('project_versions').insert([{
        student_id: effectiveStudentId,
        title: data.title,
        version_number: nextVersion,
        file_path: newFileName,
        file_url: publicUrlData.publicUrl,
        file_size: `${(data.file.size / 1024 / 1024).toFixed(2)} MB`
    }]);

    if (dbErr) throw new Error(dbErr.message);
    fetchData();
  };

  const handleSaveFeedback = async (data: { status: 'ENVIADO'|'EM_ANALISE'|'REVISADO'|'APROVADO', feedback: string, feedbackFile: File | null }) => {
      if (!feedbackModal.version || !user) return;
      const v = feedbackModal.version;

      try {
          // 1. Update version status
          await supabase.from('project_versions').update({ status: data.status }).eq('id', v.id);

          // 2. Upload feedback file if exists
          let fUrl = null;
          let fPath = null;

          if (data.feedbackFile) {
              const ext = data.feedbackFile.name.split('.').pop();
              const newFileName = `feedbacks/${v.student_id}/${v.id}_${Date.now()}.${ext}`;
              const { error: uploadErr } = await supabase.storage.from('projects').upload(newFileName, data.feedbackFile);
              if (uploadErr) throw new Error(`Upload anexo falhou: ${uploadErr.message}`);
              
              const { data: publicUrlData } = supabase.storage.from('projects').getPublicUrl(newFileName);
              fUrl = publicUrlData.publicUrl;
              fPath = newFileName;
          }

          // 3. Create structured feedback entry
          const { error: fErr } = await supabase.from('project_feedbacks').insert([{
              version_id: v.id,
              professor_id: user.id,
              feedback_text: data.feedback,
              file_url: fUrl,
              file_path: fPath
          }]);

          if (fErr) throw fErr;
          
          await fetchData();
          setFeedbackModal({ isOpen: false, version: null });
      } catch (err: any) {
          alert("Erro ao salvar feedback: " + err.message);
      }
  };

  // --- Actions: Checklist (Persistent & Shared) ---
  const handleToggleCheckitem = async (id: string, currentStatus: boolean) => {
    // Optimistic UI
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !currentStatus } : item));
    
    const { error } = await supabase
        .from('project_checklist_items')
        .update({ done: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) {
        console.error("Error toggling item:", error);
        fetchData(); // Rollback
    }
  };

  const handleUpdateChecklistItem = (id: string, text: string) => {
    // Only local state while typing (for performance)
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, item: text } : item));
  };

  const handleSaveChecklistItemText = async (id: string, text: string) => {
    const { error } = await supabase
        .from('project_checklist_items')
        .update({ item: text, updated_at: new Date().toISOString() })
        .eq('id', id);
    
    if (error) {
        console.error("Error saving item text:", error);
        alert("Erro ao salvar alteração: " + error.message);
        fetchData(); // Rollback to actual state
    }
  };

  const handleDeleteChecklistItem = async (id: string) => {
    if (!confirm("Remover este item permanentemente?")) return;
    
    // Optimistic UI
    setChecklist(prev => prev.filter(item => item.id !== id));
    
    const { error } = await supabase
        .from('project_checklist_items')
        .delete()
        .eq('id', id);
    
    if (error) {
        alert("Erro ao excluir: " + error.message);
        fetchData();
    }
  };
  const handleAddChecklistItem = async () => {
    if (!effectiveStudentId) return;
    const newItemText = 'Novo item...';
    
    const { data, error } = await supabase
        .from('project_checklist_items')
        .insert([{
            student_id: effectiveStudentId,
            item: newItemText,
            done: false,
            order: checklist.length
        }])
        .select();

    if (error) {
        alert("Erro ao criar item: " + error.message);
    } else if (data) {
        setChecklist([...checklist, data[0]]);
        setIsChecklistEditMode(true);
    }
  };

  // --- UI Helpers ---
  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'ENVIADO': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">Enviado</span>;
          case 'EM_ANALISE': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-50 text-yellow-700 border border-yellow-200">Em Análise</span>;
          case 'REVISADO': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">Revisado</span>;
          case 'APROVADO': return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">Aprovado</span>;
          default: return <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-50 text-gray-700 border border-gray-200">{status}</span>;
      }
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-premium-border dark:border-stone-700 pb-4">
        <div>
          <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium">Projetos de Pesquisa</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestão de versões e acompanhamento estrutural.</p>
        </div>

        {!isProfessor && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="bg-secondary dark:bg-secondary/90 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-secondary/20 dark:shadow-none hover:bg-[#7a6a5e] transition-all duration-300 font-medium"
          >
            <Upload size={18} className="mr-2" /> Nova Versão
          </button>
        )}
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface dark:bg-dark-surface rounded-xl w-fit border border-premium-border dark:border-stone-700">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${activeTab === 'history' ? 'bg-white dark:bg-dark-card text-secondary dark:text-primary shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Histórico & Feedback
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${activeTab === 'checklist' ? 'bg-white dark:bg-dark-card text-secondary dark:text-primary shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
        >
          Checklist Estrutural
        </button>
      </div>

      {isLoading ? (
          <div className="animate-pulse flex flex-col gap-6 pt-6">
              {[1, 2].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-stone-800 rounded-2xl w-full"></div>)}
          </div>
      ) : activeTab === 'history' ? (
        <div className="space-y-6">
          {versions.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-stone-700 rounded-2xl bg-surface/30">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium text-lg">Nenhum projeto encontrado.</p>
              {!isProfessor && <p className="text-sm text-gray-400 mt-1">Envie a primeira versão clicando em "Nova Versão" acima.</p>}
            </div>
          )}

          {versions.map((v) => (
            <div key={v.id} className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-2xl shadow-level-1 hover:shadow-level-2 border border-premium-border dark:border-stone-700 transition-all relative">
              {isProfessor && (
                  <div className="absolute top-0 right-8 bg-gray-100 dark:bg-stone-800 px-4 py-1.5 rounded-b-lg flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 shadow-sm">
                      <User size={12} /> {v.student?.full_name || 'Aluno Desconhecido'}
                  </div>
              )}

              <div className={`flex flex-col md:flex-row justify-between items-start mb-6 ${isProfessor ? 'pt-4' : ''}`}>
                <div className="flex items-center mb-4 md:mb-0 w-full md:w-auto">
                  <div className="bg-[#f0ebe7] dark:bg-stone-700 p-4 rounded-xl mr-5 text-secondary dark:text-primary relative shrink-0">
                    <FileText size={28} strokeWidth={1.5} />
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-stone-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 dark:border-stone-600">
                      v{v.version_number}.0
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-serif font-bold text-xl text-gray-800 dark:text-gray-100 truncate">{v.title}</h3>
                    <div className="flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 mt-1 gap-4">
                      <span className="flex items-center"><Clock size={14} className="mr-1.5" /> {new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
                      <span className="flex items-center gap-1 max-w-[200px] truncate"><FileText size={14} className="shrink-0" /> {v.file_path.split('/').pop()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                  {getStatusBadge(v.status)}
                  <div className="flex gap-2 w-full md:w-auto">
                         <a href={v.file_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 px-3 py-2 bg-gray-50 dark:bg-stone-800 hover:bg-gray-100 dark:hover:bg-stone-700 rounded-lg text-gray-600 font-bold transition-colors w-full justify-center">
                            <Download size={14} /> Baixar PDF
                         </a>
                     
                     {isProfessor && (
                         <button onClick={() => setFeedbackModal({ isOpen: true, version: v })} className="text-xs flex items-center gap-1 px-3 py-2 bg-secondary text-white hover:bg-[#6b5d52] rounded-lg font-bold transition-colors shrink-0">
                             <Edit2 size={14} /> Responder
                         </button>
                     )}
                  </div>
                </div>
              </div>

              {/* Multi-Feedback History Section */}
              {v.feedbacks && v.feedbacks.length > 0 ? (
                <div className="mt-8 space-y-4">
                    {v.feedbacks.map((f, idx) => (
                        <div key={f.id} className="bg-[#f9f7f5] dark:bg-dark-bg p-5 md:p-6 rounded-xl border-l-4 border-secondary/50 dark:border-primary/50">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center">
                                    <MessageCircle size={18} className="text-secondary dark:text-primary mr-2" />
                                    <span className="font-bold text-secondary dark:text-primary text-[10px] uppercase tracking-wider">
                                        Resposta da Mentora #{v.feedbacks!.length - idx}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">{new Date(f.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                            
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-serif italic text-sm">{f.feedback_text}</p>
                            
                            {f.file_url && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-stone-700/50 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-secondary/10 flex flex-col items-center justify-center text-secondary shrink-0">
                                        <FileText size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400">Arquivo de Devolutiva</p>
                                        <p className="text-[10px] text-gray-500 truncate">{f.file_path?.split('/').pop()}</p>
                                    </div>
                                    <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-secondary bg-white rounded-lg hover:bg-secondary hover:text-white transition-colors border border-secondary shadow-sm">
                                        <Download size={14} />
                                    </a>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
              ) : (
                 !isProfessor && <div className="mt-6 text-xs text-gray-400 font-medium bg-surface p-3 rounded-lg w-fit">Aguardando parecer da professora...</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card p-6 md:p-8 rounded-2xl shadow-level-1 border border-premium-border dark:border-stone-700">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-stone-700 pb-4">
            <h3 className="font-serif text-xl text-gray-800 dark:text-gray-100 font-medium">
              Checklist Compartilhado Mentora & Aluno
            </h3>
            <button
                onClick={() => setIsChecklistEditMode(!isChecklistEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isChecklistEditMode ? 'bg-secondary text-white' : 'bg-surface dark:bg-stone-800 text-secondary dark:text-primary'}`}
            >
                {isChecklistEditMode ? <><Check size={16} /> Finalizar Edição</> : <><Edit2 size={16} /> Organizar Lista</>}
            </button>
          </div>

          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className={`flex items-center p-3 md:p-4 rounded-xl transition-colors group ${isChecklistEditMode ? 'bg-surface/50 dark:bg-stone-800/50' : 'hover:bg-surface dark:hover:bg-dark-surface cursor-pointer'}`}>
                {isChecklistEditMode ? (
                  <>
                    <div className="mr-3 text-gray-400"><MoreVerticalDots size={16} /></div>
                    <input
                      type="text"
                      className="flex-1 bg-surface dark:bg-stone-800 border-none rounded-lg p-2 text-base text-gray-800 dark:text-gray-100 focus:ring-1 focus:ring-secondary/50 outline-none"
                      value={item.item}
                      onChange={(e) => handleUpdateChecklistItem(item.id, e.target.value)}
                      onBlur={(e) => handleSaveChecklistItemText(item.id, e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="text-red-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  <label className="flex items-center flex-1 cursor-pointer">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mr-4 transition-colors shrink-0
                        ${item.done ? 'bg-secondary dark:bg-primary border-secondary dark:border-primary' : 'border-gray-200 dark:border-stone-600 group-hover:border-[#cdbaa6]'}`}>
                      {item.done && <CheckSquare size={16} className="text-white dark:text-stone-900" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={item.done}
                      onChange={() => handleToggleCheckitem(item.id, item.done)}
                    />
                    <span className={`text-base flex-1 ${item.done ? 'text-gray-400 dark:text-gray-500 line-through font-medium' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                      {item.item}
                    </span>
                  </label>
                )}
              </div>
            ))}

            <button
                onClick={handleAddChecklistItem}
                className="w-full py-4 border-2 border-dashed border-gray-200 dark:border-stone-700 rounded-xl text-gray-400 flex items-center justify-center gap-2 hover:border-secondary hover:text-secondary hover:bg-surface/50 transition-colors mt-4 font-medium text-sm"
            >
                <Plus size={18} /> Adicionar Novo Item à Estrutura
            </button>
            
            {!isChecklistEditMode && checklist.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">Nenhum item definido. Clique em "Organizar Lista" para estruturar seu projeto.</div>
            )}
          </div>
        </div>
      )}

      {/* --- Overlays --- */}
      <UploadProjectModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)} 
          onSave={handleUploadProject} 
      />

      {feedbackModal.version && (
          <FeedbackModal
              isOpen={feedbackModal.isOpen}
              initialStatus={feedbackModal.version.status}
              initialFeedback={''}
              onClose={() => setFeedbackModal({ isOpen: false, version: null })}
              onSave={handleSaveFeedback}
          />
      )}
    </div>
  );
};

export default Projects;