import React, { useState } from 'react';
import { Upload, FileText, MessageCircle, CheckSquare, Clock, Send, Edit2, Download, X, Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// --- Types ---
interface ProjectVersion {
  id: string;
  version: string;
  title: string;
  fileName: string;
  date: string;
  status: 'ANALYSIS' | 'REVIEWED';
  feedback?: string;
  fileUrl: string;
}

interface ChecklistItem {
  id: string;
  item: string;
  done: boolean;
}

// --- Mock Data ---
const INITIAL_VERSIONS: ProjectVersion[] = [
  {
    id: '1',
    version: 'v1.0',
    title: 'Esboço Inicial do Projeto',
    fileName: 'projeto_v1.pdf',
    date: '01/10/2023',
    status: 'REVIEWED',
    feedback: 'Ótimo início. Precisamos delimitar melhor o problema de pesquisa. Faltou a pergunta norteadora.',
    fileUrl: '#'
  },
  {
    id: '2',
    version: 'v2.0',
    title: 'Projeto Estruturado com Metodologia',
    fileName: 'projeto_v2_final.pdf',
    date: '22/01/2026',
    status: 'ANALYSIS',
    fileUrl: '#'
  }
];

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { id: '1', item: 'Tema bem delimitado', done: true },
  { id: '2', item: 'Problema de pesquisa claro (em forma de pergunta)', done: true },
  { id: '3', item: 'Objetivo Geral', done: true },
  { id: '4', item: 'Objetivos Específicos (3-4)', done: false },
  { id: '5', item: 'Justificativa (Por que? Para quem?)', done: false },
  { id: '6', item: 'Metodologia detalhada', done: false },
  { id: '7', item: 'Fundamentação Teórica preliminar', done: false },
  { id: '8', item: 'Referências (ABNT)', done: false },
];

const Projects: React.FC = () => {
  const { role } = useAuth();
  const isProfessor = role === 'PROFESSOR' || role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'history' | 'checklist'>('history');
  const [versions, setVersions] = useState<ProjectVersion[]>(INITIAL_VERSIONS);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);

  // Status for Professor Feedback
  const [feedbackInputs, setFeedbackInputs] = useState<{ [key: string]: string }>({});

  // --- UI States (Modals & Edit Modes) ---
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [titleInputValue, setTitleInputValue] = useState('');

  const [isChecklistEditMode, setIsChecklistEditMode] = useState(false);

  // --- Actions: Project Versions ---

  const handleUploadVersion = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const nextVersionNum = versions.length + 1;
        const newVersion: ProjectVersion = {
          id: Date.now().toString(),
          version: `v${nextVersionNum}.0`,
          title: `Versão ${nextVersionNum}.0`, // Default title
          fileName: file.name,
          date: new Date().toLocaleDateString('pt-BR'),
          status: 'ANALYSIS',
          fileUrl: '#'
        };
        setVersions([newVersion, ...versions]);
      }
    };
    input.click();
  };

  const openTitleModal = (id: string, currentTitle: string) => {
    setEditingVersionId(id);
    setTitleInputValue(currentTitle);
    setIsTitleModalOpen(true);
  };

  const saveTitle = () => {
    if (editingVersionId && titleInputValue.trim()) {
      setVersions(versions.map(v => v.id === editingVersionId ? { ...v, title: titleInputValue } : v));
      setIsTitleModalOpen(false);
      setEditingVersionId(null);
    }
  };

  const submitFeedback = (versionId: string) => {
    const text = feedbackInputs[versionId];
    if (!text) return;

    setVersions(versions.map(v => {
      if (v.id === versionId) {
        return { ...v, status: 'REVIEWED', feedback: text };
      }
      return v;
    }));

    const newInputs = { ...feedbackInputs };
    delete newInputs[versionId];
    setFeedbackInputs(newInputs);
  };

  // --- Actions: Checklist ---

  const handleToggleCheckitem = (id: string) => {
    if (isChecklistEditMode) return;
    setChecklist(checklist.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const handleAddChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      item: 'Novo item do checklist',
      done: false
    };
    setChecklist([...checklist, newItem]);
  };

  const handleUpdateChecklistItem = (id: string, text: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, item: text } : item));
  };

  const handleDeleteChecklistItem = (id: string) => {
    if (confirm("Remover este item do checklist?")) {
      setChecklist(checklist.filter(item => item.id !== id));
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-premium-border dark:border-stone-700 pb-4">
        <div>
          <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium">Projeto de Pesquisa</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Histórico de versões e feedbacks.</p>
        </div>

        {!isProfessor && (
          <button
            onClick={handleUploadVersion}
            className="bg-secondary dark:bg-secondary/90 text-white px-6 py-3 rounded-xl flex items-center shadow-lg shadow-secondary/20 dark:shadow-none hover:bg-[#7a6a5e] dark:hover:bg-[#5c5148] hover:-translate-y-0.5 transition-all duration-300 font-medium"
          >
            <Upload size={18} className="mr-2" />
            Nova Versão
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

      {activeTab === 'history' ? (
        <div className="space-y-6">
          {versions.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-300 dark:border-stone-700">
              <p className="text-gray-400">Nenhuma versão enviada ainda.</p>
            </div>
          )}

          {versions.map((v) => (
            <div key={v.id} className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-level-2 dark:shadow-none border border-premium-border dark:border-stone-700 hover:shadow-card-hover transition-all duration-300 relative group">

              <div className="flex flex-col md:flex-row justify-between items-start mb-6">
                <div className="flex items-center mb-4 md:mb-0 w-full md:w-auto">
                  <div className="bg-[#f0ebe7] dark:bg-stone-700 p-4 rounded-2xl mr-5 text-secondary dark:text-primary transition-colors relative">
                    <FileText size={28} strokeWidth={1.5} />
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-stone-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-gray-200 dark:border-stone-600">
                      {v.version}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-xl text-gray-800 dark:text-gray-100">{v.title}</h3>
                      {!isProfessor && (
                        <button
                          onClick={() => openTitleModal(v.id, v.title)}
                          className="p-1 text-gray-400 hover:text-secondary dark:hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                          title="Editar título da versão"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1 gap-4">
                      <span className="flex items-center"><Clock size={14} className="mr-1.5" /> {v.date}</span>
                      <span className="flex items-center gap-1"><FileText size={14} /> {v.fileName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider 
                    ${v.status === 'REVIEWED' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'}`}>
                    {v.status === 'REVIEWED' ? 'Revisado' : 'Em Análise'}
                  </span>
                  <button className="text-xs flex items-center gap-1 text-gray-400 hover:text-secondary dark:hover:text-primary transition-colors">
                    <Download size={14} /> Baixar Arquivo
                  </button>
                </div>
              </div>

              {/* Feedback Section */}
              {v.feedback ? (
                <div className="bg-[#f9f7f5] dark:bg-dark-bg p-6 rounded-xl border-l-4 border-secondary/50 dark:border-primary/50 transition-colors mt-6">
                  <div className="flex items-center mb-3">
                    <MessageCircle size={18} className="text-secondary dark:text-primary mr-2" />
                    <span className="font-bold text-secondary dark:text-primary text-xs uppercase tracking-wider">Comentário da Professora</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-serif italic text-lg">"{v.feedback}"</p>
                </div>
              ) : (
                isProfessor && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-stone-700 animate-fade-in">
                    <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Adicionar Feedback</label>
                    <div className="flex gap-3">
                      <textarea
                        className="flex-1 bg-surface dark:bg-dark-surface border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#cdbaa6]/50 outline-none resize-none"
                        rows={2}
                        placeholder="Escreva suas considerações sobre esta versão..."
                        value={feedbackInputs[v.id] || ''}
                        onChange={(e) => setFeedbackInputs({ ...feedbackInputs, [v.id]: e.target.value })}
                      ></textarea>
                      <button
                        onClick={() => submitFeedback(v.id)}
                        className="bg-secondary dark:bg-primary text-white dark:text-stone-900 p-3 rounded-xl hover:bg-[#6b5d52] transition-colors self-end"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-level-2 shadow-inner-depth dark:shadow-none border border-premium-border dark:border-stone-700 transition-colors">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-stone-700 pb-4">
            <h3 className="font-serif text-xl text-gray-800 dark:text-gray-100 font-medium">
              Estrutura Essencial do Projeto
            </h3>
            {!isProfessor && (
              <button
                onClick={() => setIsChecklistEditMode(!isChecklistEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${isChecklistEditMode ? 'bg-secondary text-white' : 'bg-surface dark:bg-stone-800 text-secondary dark:text-primary'}`}
              >
                {isChecklistEditMode ? <><Save size={16} /> Salvar Checklist</> : <><Edit2 size={16} /> Editar Checklist</>}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className={`flex items-center p-4 rounded-xl transition-colors group ${isChecklistEditMode ? 'bg-surface/50 dark:bg-stone-800/50' : 'hover:bg-surface dark:hover:bg-dark-surface cursor-pointer'}`}>

                {isChecklistEditMode ? (
                  // Edit Mode Item
                  <>
                    <div className="mr-3 text-gray-400 cursor-move"><MoreVerticalDots size={16} /></div>
                    <input
                      type="text"
                      value={item.item}
                      onChange={(e) => handleUpdateChecklistItem(item.id, e.target.value)}
                      className="flex-1 bg-transparent border-b border-gray-300 dark:border-stone-600 focus:border-secondary outline-none py-1 mr-4"
                    />
                    <button
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="text-red-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                ) : (
                  // View Mode Item
                  <label className="flex items-center flex-1 cursor-pointer">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mr-4 transition-colors
                        ${item.done ? 'bg-secondary dark:bg-primary border-secondary dark:border-primary' : 'border-gray-200 dark:border-stone-600 group-hover:border-[#cdbaa6]'}`}>
                      {item.done && <CheckSquare size={16} className="text-white dark:text-stone-900" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={item.done}
                      onChange={() => handleToggleCheckitem(item.id)}
                    />
                    <span className={`text-base flex-1 ${item.done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                      {item.item}
                    </span>
                  </label>
                )}
              </div>
            ))}

            {isChecklistEditMode && (
              <button
                onClick={handleAddChecklistItem}
                className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-stone-700 rounded-xl text-gray-400 flex items-center justify-center gap-2 hover:border-secondary hover:text-secondary transition-colors mt-4"
              >
                <Plus size={20} /> Adicionar Item
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- Custom Title Edit Modal --- */}
      {isTitleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-dark-card w-full max-w-md p-6 rounded-2xl shadow-2xl border border-gray-100 dark:border-stone-700 transform transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl font-bold text-secondary dark:text-primary">Editar Título da Versão</h3>
              <button onClick={() => setIsTitleModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">Título da Versão</label>
                <input
                  type="text"
                  value={titleInputValue}
                  onChange={(e) => setTitleInputValue(e.target.value)}
                  className="w-full bg-surface dark:bg-stone-800 border-none rounded-xl p-3 text-base text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-secondary/50 outline-none"
                  placeholder="Ex: Versão Final Corrigida"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-2">
                  Este título é apenas para organização visual e não altera o arquivo enviado.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsTitleModalOpen(false)}
                  className="flex-1 py-3 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-stone-800 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveTitle}
                  disabled={!titleInputValue.trim()}
                  className="flex-1 py-3 text-white bg-secondary dark:bg-primary dark:text-stone-900 rounded-xl font-bold hover:bg-[#6b5d52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

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

export default Projects;