import React, { useState } from 'react';
import { Clock, CheckCircle, XCircle, Play, ArrowLeft, BarChart2, BookOpen, AlertCircle, Edit2, Plus, Trash2, Save, MoreVertical, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';

// --- Types ---
interface Question {
  id: number;
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  language: 'ENGLISH' | 'SPANISH';
  questions: Question[];
  durationMinutes: number;
  status: 'DRAFT' | 'PUBLISHED' | 'INACTIVE';
}

interface ExamResult {
  examId: string;
  examTitle: string;
  date: string;
  score: number;
  totalQuestions: number;
  answers: number[];
}

// --- Mock Data ---
const INITIAL_EXAMS: Exam[] = [
  {
    id: 'eng-01',
    title: 'Simulado Rápido: Leitura Acadêmica',
    description: '10 questões focadas em interpretação de textos científicos e vocabulário acadêmico.',
    language: 'ENGLISH',
    durationMinutes: 30,
    status: 'PUBLISHED',
    questions: [
      {
        id: 1,
        text: "Select the option that best completes the sentence: 'The results of the study were ________ with previous findings.'",
        options: ["inconsistent", "consistent", "consisting", "inconsist"],
        correct: 1,
        explanation: "'Consistent with' is the correct collocation meaning in agreement with."
      },
      {
        id: 2,
        text: "Identify the synonym for 'ubiquitous' in an academic context.",
        options: ["Rare", "Omnipresent", "Hidden", "Specific"],
        correct: 1,
        explanation: "Ubiquitous means found everywhere."
      },
      {
        id: 3,
        text: "Which transitional phrase best indicates a contrast?",
        options: ["Furthermore", "In addition", "However", "Consequently"],
        correct: 2,
        explanation: "'However' is the standard transition to introduce a contrasting idea."
      }
    ]
  },
  {
    id: 'eng-02',
    title: 'Simulado Completo: Gramática Avançada',
    description: 'Teste seus conhecimentos em estruturas complexas, voz passiva e conectivos.',
    language: 'ENGLISH',
    durationMinutes: 60,
    status: 'DRAFT',
    questions: [
      {
        id: 1,
        text: "Choose the correct passive voice form: 'The committee ________ the proposal yesterday.'",
        options: ["reviews", "was reviewed", "reviewed", "has reviewed"],
        correct: 2,
        explanation: "Active voice 'reviewed' fits best here as the committee performed the action."
      }
    ]
  }
];

const MOCK_HISTORY: ExamResult[] = [
  {
    examId: 'eng-01',
    examTitle: 'Simulado Rápido: Leitura Acadêmica',
    date: '20/01/2025',
    score: 2,
    totalQuestions: 3,
    answers: [1, 0, 2]
  }
];

const LanguageExam: React.FC = () => {
  const { role } = useAuth();
  const isProfessor = role === 'PROFESSOR'; // Assuming 'PROFESSOR' role exists

  // --- State ---
  const [exams, setExams] = useState<Exam[]>(INITIAL_EXAMS);
  const [activeTab, setActiveTab] = useState<'exams' | 'performance'>('exams');
  const [mode, setMode] = useState<'menu' | 'list' | 'taking' | 'result' | 'edit_exam'>('menu');
  const [selectedLanguage, setSelectedLanguage] = useState<'ENGLISH' | 'SPANISH' | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  // Exam Execution State
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [examHistory, setExamHistory] = useState<ExamResult[]>(MOCK_HISTORY);

  // Editor State
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);

  // Option Deletion State
  const [deleteOptionState, setDeleteOptionState] = useState<{ qIndex: number, optIndex: number } | null>(null);
  const [optionDeleteModalOpen, setOptionDeleteModalOpen] = useState(false);

  // --- Student Actions ---

  const selectLanguage = (lang: 'ENGLISH' | 'SPANISH') => {
    setSelectedLanguage(lang);
    setMode('list');
  };

  const startExam = (exam: Exam) => {
    setSelectedExam(exam);
    setAnswers(new Array(exam.questions.length).fill(-1));
    setCurrentQ(0);
    setMode('taking');
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = optionIndex;
    setAnswers(newAnswers);
  };

  const finishExam = () => {
    if (!selectedExam) return;
    const correctCount = selectedExam.questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
    const result: ExamResult = {
      examId: selectedExam.id,
      examTitle: selectedExam.title,
      date: new Date().toLocaleDateString('pt-BR'),
      score: correctCount,
      totalQuestions: selectedExam.questions.length,
      answers: [...answers]
    };
    setExamHistory([result, ...examHistory]);
    setMode('result');
  };

  const backToMenu = () => {
    setMode('menu');
    setSelectedLanguage(null);
    setSelectedExam(null);
    setAnswers([]);
  };

  // --- Professor Actions ---

  const createExam = () => {
    const newExam: Exam = {
      id: Date.now().toString(),
      title: 'Novo Simulado',
      description: 'Descrição do simulado...',
      language: selectedLanguage || 'ENGLISH',
      durationMinutes: 30,
      status: 'DRAFT',
      questions: []
    };
    setEditingExam(newExam);
    setMode('edit_exam');
  };

  const editExam = (exam: Exam) => {
    setEditingExam({ ...exam }); // Deep copy if needed
    setMode('edit_exam');
  };

  const saveExam = () => {
    if (!editingExam) return;

    const exists = exams.find(e => e.id === editingExam.id);
    if (exists) {
      setExams(exams.map(e => e.id === editingExam.id ? editingExam : e));
    } else {
      setExams([...exams, editingExam]);
    }
    setMode('list');
    setEditingExam(null);
  };

  const requestDeleteExam = (id: string) => {
    setExamToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteExam = () => {
    if (examToDelete) {
      setExams(exams.filter(e => e.id !== examToDelete));
      setDeleteModalOpen(false);
      setExamToDelete(null);
    }
  };

  // Question Management inside Editor
  const addQuestion = () => {
    if (!editingExam) return;
    const newQuestion: Question = {
      id: Date.now(),
      text: 'Nova Questão',
      options: ['Opção A', 'Opção B'],
      correct: 0,
      explanation: 'Explicação da resposta correta.'
    };
    setEditingExam({
      ...editingExam,
      questions: [...editingExam.questions, newQuestion]
    });
  };

  const updateQuestion = (qIndex: number, field: keyof Question, value: any) => {
    if (!editingExam) return;
    const updatedQuestions = [...editingExam.questions];
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], [field]: value };
    setEditingExam({ ...editingExam, questions: updatedQuestions });
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    if (!editingExam) return;
    const updatedQuestions = [...editingExam.questions];
    const newOptions = [...updatedQuestions[qIndex].options];
    newOptions[optIndex] = value;
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], options: newOptions };
    setEditingExam({ ...editingExam, questions: updatedQuestions });
  };

  const deleteQuestion = (qIndex: number) => {
    if (!editingExam) return;
    const updatedQuestions = editingExam.questions.filter((_, i) => i !== qIndex);
    setEditingExam({ ...editingExam, questions: updatedQuestions });
  };

  // --- Dynamic Option Management ---

  const addOption = (qIndex: number) => {
    if (!editingExam) return;
    const updatedQuestions = [...editingExam.questions];
    updatedQuestions[qIndex] = {
      ...updatedQuestions[qIndex],
      options: [...updatedQuestions[qIndex].options, `Opção ${String.fromCharCode(65 + updatedQuestions[qIndex].options.length)}`]
    };
    setEditingExam({ ...editingExam, questions: updatedQuestions });
  };

  const requestDeleteOption = (qIndex: number, optIndex: number) => {
    if (!editingExam) return;
    // Validation: Min 2 options
    if (editingExam.questions[qIndex].options.length <= 2) {
      alert("A questão deve ter pelo menos 2 alternativas.");
      return;
    }
    setDeleteOptionState({ qIndex, optIndex });
    setOptionDeleteModalOpen(true);
  };

  const confirmDeleteOption = () => {
    if (!editingExam || !deleteOptionState) return;

    const { qIndex, optIndex } = deleteOptionState;
    const updatedQuestions = [...editingExam.questions];
    const question = updatedQuestions[qIndex];

    // Remove option
    const newOptions = question.options.filter((_, i) => i !== optIndex);

    // Adjust Correct Index
    let newCorrect = question.correct;
    if (optIndex === question.correct) {
      newCorrect = 0; // Reset to 0 if correct option deleted
    } else if (optIndex < question.correct) {
      newCorrect = question.correct - 1; // Shift down if earlier option deleted
    }

    updatedQuestions[qIndex] = {
      ...question,
      options: newOptions,
      correct: newCorrect
    };

    setEditingExam({ ...editingExam, questions: updatedQuestions });
    setOptionDeleteModalOpen(false);
    setDeleteOptionState(null);
  };

  const updateOptionText = (qIndex: number, optIndex: number, text: string) => {
    if (!editingExam) return;
    const updatedQuestions = [...editingExam.questions];
    const newOptions = [...updatedQuestions[qIndex].options];
    newOptions[optIndex] = text;
    updatedQuestions[qIndex] = { ...updatedQuestions[qIndex], options: newOptions };
    setEditingExam({ ...editingExam, questions: updatedQuestions });
  };

  // --- Views ---

  const renderPerformance = () => {
    // ... (Same as before)
    const average = examHistory.length > 0
      ? Math.round((examHistory.reduce((acc, r) => acc + (r.score / r.totalQuestions), 0) / examHistory.length) * 100)
      : 0;

    return (
      <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-level-1 border border-premium-border dark:border-stone-700">
            <h4 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Simulados Realizados</h4>
            <p className="text-4xl font-serif text-secondary dark:text-primary font-bold">{examHistory.length}</p>
          </div>
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-level-1 border border-premium-border dark:border-stone-700">
            <h4 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Média de Acertos</h4>
            <p className="text-4xl font-serif text-secondary dark:text-primary font-bold">{average}%</p>
          </div>
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-level-1 border border-premium-border dark:border-stone-700">
            <h4 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 mb-2">Última Nota</h4>
            <p className="text-4xl font-serif text-secondary dark:text-primary font-bold">
              {examHistory.length > 0 ? `${Math.round((examHistory[0].score / examHistory[0].totalQuestions) * 100)}%` : '-'}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-level-2 border border-premium-border dark:border-stone-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-stone-700">
            <h3 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100">Histórico de Tentativas</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-stone-700">
            {examHistory.length === 0 ? (
              <div className="p-12 text-center text-gray-400">Nenhum simulado realizado ainda.</div>
            ) : (
              examHistory.map((result, idx) => (
                <div key={idx} className="p-6 hover:bg-surface dark:hover:bg-dark-surface transition-colors flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">{result.examTitle}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <Clock size={14} /> {result.date}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl font-bold ${(result.score / result.totalQuestions) >= 0.7
                    ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                    : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                    }`}>
                    {result.score}/{result.totalQuestions}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderExamEditor = () => {
    if (!editingExam) return null;

    return (
      <div className="bg-white dark:bg-dark-card rounded-3xl shadow-level-3 animate-fade-in border border-premium-border dark:border-stone-700 overflow-hidden">
        {/* Header Config */}
        <div className="p-8 border-b border-gray-100 dark:border-stone-700 bg-surface/30 dark:bg-stone-800/30">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-serif font-bold text-secondary dark:text-primary">Editor de Simulado</h2>
            <div className="flex gap-3">
              <button onClick={() => setMode('list')} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-stone-800 rounded-lg">Cancelar</button>
              <button onClick={saveExam} className="px-6 py-2 bg-secondary dark:bg-primary text-white dark:text-stone-900 font-bold rounded-lg shadow-lg flex items-center gap-2">
                <Save size={18} /> Salvar Simulado
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Título do Simulado</label>
              <input
                type="text"
                value={editingExam.title}
                onChange={e => setEditingExam({ ...editingExam, title: e.target.value })}
                className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl p-3 font-bold text-gray-800 dark:text-gray-100 outline-none focus:border-secondary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Status</label>
              <select
                value={editingExam.status}
                onChange={e => setEditingExam({ ...editingExam, status: e.target.value as any })}
                className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl p-3 font-bold text-gray-800 dark:text-gray-100 outline-none focus:border-secondary"
              >
                <option value="DRAFT">Rascunho (Oculto)</option>
                <option value="PUBLISHED">Publicado (Visível)</option>
                <option value="INACTIVE">Inativo (Arquivado)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-400 mb-2">Descrição</label>
              <textarea
                value={editingExam.description}
                onChange={e => setEditingExam({ ...editingExam, description: e.target.value })}
                className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-stone-600 rounded-xl p-3 text-gray-600 dark:text-gray-300 outline-none focus:border-secondary h-20 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Question Manager */}
        <div className="p-8 bg-surface dark:bg-dark-surface/50 min-h-[500px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm flex items-center gap-2">
              <BookOpen size={16} /> Questões ({editingExam.questions.length})
            </h3>
            <button onClick={addQuestion} className="text-secondary dark:text-primary font-bold text-sm bg-white dark:bg-stone-800 px-4 py-2 rounded-lg border border-premium-border hover:shadow-md transition-all flex items-center gap-2">
              <Plus size={16} /> Adicionar Questão
            </button>
          </div>

          <div className="space-y-6">
            {editingExam.questions.map((q, qIndex) => (
              <div key={q.id} className="bg-white dark:bg-dark-card p-6 rounded-xl border border-gray-100 dark:border-stone-700 shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold bg-gray-100 dark:bg-stone-800 text-gray-500 px-2 py-1 rounded">Q{qIndex + 1}</span>
                  <button onClick={() => deleteQuestion(qIndex)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>

                <textarea
                  value={q.text}
                  onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                  placeholder="Enunciado da questão..."
                  className="w-full font-serif font-medium text-lg bg-transparent border-none outline-none resize-none mb-4 placeholder-gray-300"
                  rows={2}
                />

                <div className="space-y-3 pl-4 border-l-2 border-gray-100 dark:border-stone-700 mb-4">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={q.correct === optIndex}
                        onChange={() => updateQuestion(qIndex, 'correct', optIndex)}
                        className="accent-secondary w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-400 w-4">{String.fromCharCode(65 + optIndex)}</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => updateOptionText(qIndex, optIndex, e.target.value)}
                        className="flex-1 bg-transparent border-b border-gray-200 dark:border-stone-700 text-sm py-1 outline-none focus:border-secondary"
                      />
                      <button
                        onClick={() => requestDeleteOption(qIndex, optIndex)}
                        className="text-gray-300 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Excluir alternativa"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addOption(qIndex)}
                    className="text-xs font-bold text-secondary dark:text-primary flex items-center gap-1 hover:underline"
                  >
                    <Plus size={12} /> Adicionar Alternativa
                  </button>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50 dark:border-stone-800">
                  <label className="text-xs font-bold uppercase text-secondary dark:text-primary mb-1 block flex items-center gap-1">
                    <AlertCircle size={12} /> Explicação Pedagógica
                  </label>
                  <textarea
                    value={q.explanation}
                    onChange={e => updateQuestion(qIndex, 'explanation', e.target.value)}
                    placeholder="Explique porque a resposta correta é a correta..."
                    className="w-full text-sm bg-surface dark:bg-stone-800 p-3 rounded-lg text-gray-600 dark:text-gray-300 outline-none resize-none italic"
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {mode !== 'taking' && mode !== 'edit_exam' && (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-premium-border dark:border-stone-700 pb-4">
          <div>
            <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium">Prova de Língua</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Treine para a prova de proficiência acadêmica.</p>
          </div>
          {isProfessor ? (
            <div className="flex gap-2 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
              <span className="text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase flex items-center gap-2 px-2">
                <Eye size={14} /> Modo Professora
              </span>
            </div>
          ) : (
            <div className="flex gap-2 bg-surface dark:bg-dark-surface p-1 rounded-xl border border-premium-border dark:border-stone-700">
              <button
                onClick={() => setActiveTab('exams')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'exams' ? 'bg-white dark:bg-dark-card shadow-sm text-secondary dark:text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                Simulados
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'performance' ? 'bg-white dark:bg-dark-card shadow-sm text-secondary dark:text-primary' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
              >
                Meu Desempenho
              </button>
            </div>
          )}
        </header>
      )}

      {mode === 'edit_exam' ? (
        renderExamEditor()
      ) : activeTab === 'performance' && !isProfessor ? (
        renderPerformance()
      ) : (
        <>
          {/* MENU MODE */}
          {mode === 'menu' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div
                onClick={() => selectLanguage('ENGLISH')}
                className="bg-white dark:bg-dark-card p-8 rounded-3xl shadow-level-2 border border-transparent hover:border-premium-border dark:hover:border-stone-600 transition-all duration-300 cursor-pointer group hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-surface dark:bg-dark-surface rounded-2xl flex items-center justify-center text-secondary dark:text-primary mb-6 group-hover:scale-110 transition-transform shadow-inner">
                  <span className="font-serif font-bold text-2xl">En</span>
                </div>
                <h3 className="font-serif text-2xl text-gray-800 dark:text-gray-100 mb-2 font-bold">Inglês Acadêmico</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">Simulados focados em leitura, interpretação de abstracts e gramática instrumental.</p>
                <span className="text-secondary dark:text-primary font-bold text-sm uppercase tracking-wider flex items-center group-hover:gap-2 transition-all">
                  Acessar Simulados <ArrowLeft className="rotate-180 ml-2" size={16} />
                </span>
              </div>

              <div
                onClick={() => isProfessor ? selectLanguage('SPANISH') : null}
                className={`bg-white dark:bg-dark-card p-8 rounded-3xl shadow-level-1 border border-transparent relative overflow-hidden ${isProfessor ? 'cursor-pointer hover:shadow-level-2' : 'opacity-60 cursor-not-allowed'}`}
              >
                {!isProfessor && <div className="absolute top-4 right-4 bg-gray-100 dark:bg-stone-800 px-3 py-1 rounded-full text-xs font-bold text-gray-400 uppercase tracking-widest">Em Breve</div>}
                <div className="w-14 h-14 bg-gray-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500 mb-6 font-serif font-bold text-2xl">
                  Es
                </div>
                <h3 className="font-serif text-2xl text-gray-400 dark:text-gray-500 mb-2 font-bold">Espanhol</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 leading-relaxed">Conteúdo em preparação pela equipe pedagógica.</p>
              </div>
            </div>
          )}

          {/* LIST MODE */}
          {mode === 'list' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <button onClick={backToMenu} className="text-gray-400 hover:text-secondary dark:hover:text-primary flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors">
                  <ArrowLeft size={16} /> Voltar para Idiomas
                </button>
                {isProfessor && (
                  <button onClick={createExam} className="bg-secondary dark:bg-primary text-white dark:text-stone-900 px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2">
                    <Plus size={18} /> Novo Simulado
                  </button>
                )}
              </div>

              <div className="grid gap-6">
                {exams
                  .filter(e => e.language === selectedLanguage)
                  .filter(e => isProfessor || e.status === 'PUBLISHED')
                  .map(exam => (
                    <div key={exam.id} className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-level-1 hover:shadow-level-2 border border-premium-border dark:border-stone-700 transition-all group relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100">{exam.title}</h3>
                            {isProfessor && (
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${exam.status === 'PUBLISHED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' :
                                exam.status === 'DRAFT' ? 'bg-gray-100 text-gray-500 dark:bg-stone-800' :
                                  'bg-red-100 text-red-500'
                                }`}>
                                {exam.status === 'PUBLISHED' ? 'Publicado' : exam.status === 'DRAFT' ? 'Rascunho' : 'Inativo'}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 mb-4 max-w-2xl">{exam.description}</p>
                          <div className="flex gap-4 text-sm text-gray-400 dark:text-gray-500 font-medium">
                            <span className="flex items-center gap-1"><BookOpen size={16} /> {exam.questions.length} Questões</span>
                            <span className="flex items-center gap-1"><Clock size={16} /> ~{exam.durationMinutes} min</span>
                          </div>
                        </div>

                        {isProfessor ? (
                          <div className="flex gap-2">
                            <button onClick={() => editExam(exam)} className="p-3 text-secondary dark:text-primary hover:bg-surface dark:hover:bg-stone-800 rounded-xl transition-colors tooltip" title="Editar">
                              <Edit2 size={20} />
                            </button>
                            <button onClick={() => requestDeleteExam(exam.id)} className="p-3 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" title="Excluir">
                              <Trash2 size={20} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startExam(exam)}
                            className="bg-secondary dark:bg-primary text-white dark:text-stone-900 px-6 py-3 rounded-xl font-bold shadow-lg shadow-secondary/20 hover:bg-[#6b5d52] dark:hover:bg-[#bda895] transition-all hover:-translate-y-1"
                          >
                            Iniciar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                {exams.filter(e => e.language === selectedLanguage && (isProfessor || e.status === 'PUBLISHED')).length === 0 && (
                  <div className="text-center py-10 text-gray-400">Nenhum simulado disponível neste momento.</div>
                )}
              </div>
            </div>
          )}

          {/* TAKING EXAM & RESULTS (Same as previous implementation, simplified here for length but logic retained) */}
          {mode === 'taking' && selectedExam && (
            // ... (Taking Exam View - same code as Step 385 verified, just re-rendered or skipped for brevity if allowed, but i must provide full file content)
            <div className="max-w-3xl mx-auto animate-fade-in">
              {/* ... Full Taking Exam Code ... */}
              <div className="bg-white dark:bg-dark-card p-10 rounded-3xl shadow-level-2 border border-premium-border dark:border-stone-700">
                <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-stone-700 pb-6">
                  <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Questão {currentQ + 1} / {selectedExam.questions.length}</span>
                  <div className="flex items-center text-secondary dark:text-primary bg-surface dark:bg-dark-surface px-3 py-1 rounded-full">
                    <Clock size={14} className="mr-2" />
                    <span className="font-mono text-sm font-bold">Em andamento</span>
                  </div>
                </div>

                <h2 className="text-2xl font-serif text-gray-800 dark:text-gray-100 mb-8 leading-relaxed">
                  {selectedExam.questions[currentQ].text}
                </h2>

                <div className="space-y-4 mb-10">
                  {selectedExam.questions[currentQ].options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-200 group flex items-center ${answers[currentQ] === idx
                        ? 'bg-[#cdbaa6]/10 dark:bg-[#cdbaa6]/10 border-secondary dark:border-primary text-secondary dark:text-primary shadow-sm'
                        : 'border-transparent bg-surface dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-stone-700 text-gray-600 dark:text-gray-300'
                        }`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 text-sm font-bold border ${answers[currentQ] === idx ? 'bg-secondary dark:bg-primary text-white dark:text-stone-900 border-secondary dark:border-primary' : 'bg-white dark:bg-dark-card border-gray-300 dark:border-stone-600 text-gray-400'}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="font-medium text-lg">{opt}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between pt-6 border-t border-gray-100 dark:border-stone-700">
                  <button
                    disabled={currentQ === 0}
                    onClick={() => setCurrentQ(curr => curr - 1)}
                    className="px-6 py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-30 font-bold text-sm uppercase tracking-wide transition-colors flex items-center"
                  >
                    <ArrowLeft size={16} className="mr-2" /> Anterior
                  </button>

                  {currentQ < selectedExam.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQ(curr => curr + 1)}
                      className="bg-primary hover:bg-[#bda895] text-white dark:text-stone-900 px-8 py-3 rounded-xl transition-all shadow-lg shadow-primary/20 font-medium"
                    >
                      Próxima
                    </button>
                  ) : (
                    <button
                      onClick={finishExam}
                      disabled={answers.includes(-1)}
                      className="bg-secondary hover:bg-[#7a6a5e] dark:bg-secondary/90 text-white px-8 py-3 rounded-xl transition-all shadow-lg shadow-secondary/20 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Finalizar Simulado
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === 'result' && selectedExam && (
            // ... (Result View - same logic) 
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
              <div className="bg-white dark:bg-dark-card p-10 rounded-3xl shadow-level-3 border border-premium-border dark:border-stone-700 text-center relative overflow-hidden transition-colors">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary"></div>
                <h2 className="text-3xl font-serif text-secondary dark:text-primary mb-2">Resultado Final</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Confira abaixo seu desempenho detalhado</p>

                <div className="w-40 h-40 rounded-full border-4 border-secondary dark:border-primary flex flex-col items-center justify-center mx-auto mb-8 bg-surface dark:bg-dark-surface shadow-inner">
                  <span className="text-5xl font-bold text-gray-800 dark:text-gray-100 font-serif">
                    {selectedExam.questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0)}
                  </span>
                  <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">de {selectedExam.questions.length} Questões</span>
                </div>

                <button onClick={backToMenu} className="text-secondary dark:text-primary font-bold hover:text-primary dark:hover:text-white transition-colors underline decoration-2 underline-offset-4">
                  Voltar ao Menu de Provas
                </button>
              </div>
              {/* Question Review List */}
              <div className="space-y-6">
                {selectedExam.questions.map((q, i) => (
                  <div key={q.id} className="bg-white dark:bg-dark-card p-8 rounded-2xl shadow-level-1 border border-premium-border dark:border-stone-700 transition-colors">
                    <div className="flex items-start">
                      <div className="mt-1 mr-5">
                        {answers[i] === q.correct ? <CheckCircle className="text-green-500" size={24} /> : <XCircle className="text-red-500" size={24} />}
                      </div>
                      <div className="flex-1">
                        <p className="font-serif text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">{q.text}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div className={`p-4 rounded-xl border ${answers[i] === -1
                            ? 'bg-gray-100 border-gray-300'
                            : answers[i] === q.correct
                              ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                              : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                            }`}>
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase block mb-1">Sua resposta</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">
                              {answers[i] === -1 ? "Não respondida" : q.options[answers[i]]}
                            </span>
                          </div>

                          {answers[i] !== q.correct && (
                            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50">
                              <span className="text-xs text-green-600 dark:text-green-400 font-bold uppercase block mb-1">Resposta Correta</span>
                              <span className="font-medium text-green-800 dark:text-green-200">{q.options[q.correct]}</span>
                            </div>
                          )}
                        </div>

                        {q.explanation && (
                          <div className="relative bg-surface dark:bg-dark-surface p-5 rounded-xl text-gray-600 dark:text-gray-300 border-l-4 border-secondary/40 dark:border-primary/40">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle size={14} className="text-secondary dark:text-primary" />
                              <span className="font-bold text-secondary dark:text-primary text-xs uppercase tracking-wider">Comentário da Professora</span>
                            </div>
                            <p className="italic">"{q.explanation}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Excluir Simulado?"
        message="Tem certeza que deseja excluir este simulado? O histórico de tentativas dos alunos pode ser afetado se não for apenas inativado."
        confirmText="Excluir Definitivamente"
        cancelText="Cancelar"
        onConfirm={confirmDeleteExam}
        onCancel={() => setDeleteModalOpen(false)}
      />

      <ConfirmModal
        isOpen={optionDeleteModalOpen}
        title="Excluir Alternativa?"
        message="Tem certeza que deseja excluir esta alternativa? A resposta correta será ajustada automaticamente se necessário."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmDeleteOption}
        onCancel={() => setOptionDeleteModalOpen(false)}
      />
    </div>
  );
};

export default LanguageExam;