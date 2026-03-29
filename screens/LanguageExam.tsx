import React, { useState, useEffect } from 'react';
import { 
  Clock, CheckCircle, XCircle, Play, ArrowLeft, BarChart2, BookOpen, 
  AlertCircle, Edit2, Plus, Trash2, Save, MoreVertical, Eye, EyeOff,
  ChevronRight, Award, History, TrendingUp, Users, Calendar, Filter
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { supabase } from '../services/supabaseClient';
import { 
  LanguageExam as LanguageExamType, 
  LanguageQuestion, 
  LanguageExamAttempt,
  LanguageExamAnswer 
} from '../types';

// --- Local Interfaces for internal UI states ---
interface MappedAttempt extends LanguageExamAttempt {
  examTitle: string;
  date: string;
}

const LanguageExam: React.FC = () => {
  const { user, role } = useAuth();
  const isProfessor = role === 'PROFESSOR' || role === 'ADMIN';

  // --- UI Modes & Tabs ---
  const [activeTab, setActiveTab] = useState<'exams' | 'performance'>('exams');
  const [mode, setMode] = useState<'menu' | 'list' | 'taking' | 'result' | 'editor' | 'ranking'>('menu');
  const [selectedLanguage, setSelectedLanguage] = useState<'ENGLISH' | 'SPANISH' | null>(null);

  // --- Data State ---
  const [exams, setExams] = useState<LanguageExamType[]>([]);
  const [selectedExam, setSelectedExam] = useState<LanguageExamType | null>(null);
  const [examHistory, setExamHistory] = useState<MappedAttempt[]>([]);
  const [allAttempts, setAllAttempts] = useState<MappedAttempt[]>([]); // For Professor Ranking
  
  // --- Simulation Implementation State ---
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]); // Store selected option index or short answer text
  const [finishedResult, setFinishedResult] = useState<{
    correct: number;
    total: number;
    score: number;
    answers: LanguageExamAnswer[];
  } | null>(null);

  // --- Editor State ---
  const [editingExam, setEditingExam] = useState<LanguageExamType | null>(null);

  // --- Loader/Modals State ---
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });

  // --- Initial Data Load ---
  useEffect(() => {
    if (user) {
      fetchExams();
      if (isProfessor) fetchAllUserAttempts();
      else fetchMyAttempts();
    }
  }, [user, isProfessor]);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      // Joins questions via language_exam_questions
      const { data: dbExams, error } = await supabase
        .from('language_exams')
        .select(`
          *,
          questions:language_exam_questions(
            order,
            question:language_questions(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formatted = (dbExams || []).map((e: any) => ({
        ...e,
        questions: e.questions 
          ? e.questions
              .sort((a: any, b: any) => a.order - b.order)
              .map((q: any) => ({ ...q.question, order: q.order }))
          : []
      }));
      setExams(formatted);
    } catch (err: any) {
      console.error("fetchExams:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyAttempts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('language_exam_attempts')
        .select('*, language_exams(title)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mapped = (data || []).map((item: any) => ({
        ...item,
        examTitle: item.language_exams?.title || 'Simulado Excluído',
        date: new Date(item.created_at).toLocaleDateString('pt-BR')
      }));
      setExamHistory(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllUserAttempts = async () => {
    try {
      const { data, error } = await supabase
        .from('language_exam_attempts')
        .select('*, language_exams(title), profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mapped = (data || []).map((item: any) => ({
        ...item,
        examTitle: item.language_exams?.title || 'Simulado Excluído',
        date: new Date(item.created_at).toLocaleString('pt-BR')
      }));
      setAllAttempts(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  // --- Navigation & Core Logic ---

  const handleSelectLanguage = (lang: 'ENGLISH' | 'SPANISH') => {
    setSelectedLanguage(lang);
    setMode('list');
  };

  const startExam = (exam: LanguageExamType) => {
    if (!exam.questions || exam.questions.length === 0) {
      alert("Este simulado ainda não possui questões.");
      return;
    }
    setSelectedExam(exam);
    setAnswers(new Array(exam.questions.length).fill("-1"));
    setCurrentQ(0);
    setMode('taking');
  };

  const handleFinishExam = async () => {
    if (!selectedExam || !user) return;
    
    // Check if everything is answered (optional requirement, but good practice)
    const unansweredCount = answers.filter(a => a === "-1").length;
    if (unansweredCount > 0) {
        if (!confirm(`Você ainda tem ${unansweredCount} questões sem resposta. Deseja finalizar mesmo assim?`)) return;
    }

    setIsSaving(true);
    try {
      const questions = selectedExam.questions || [];
      let correctCount = 0;
      
      // Calculate score locally for the attempt result
      const processedAnswers = questions.map((q, i) => {
          const studentAnswer = answers[i];
          const isCorrect = studentAnswer === q.correct_answer;
          if (isCorrect) correctCount++;
          
          return {
              question_id: q.id,
              answer_text: studentAnswer,
              is_correct: isCorrect,
              question: q
          };
      });

      // 1. Create Attempt record
      const { data: attempt, error: attemptErr } = await supabase.from('language_exam_attempts').insert({
          student_id: user.id,
          exam_id: selectedExam.id,
          total_questions: questions.length,
          score: correctCount,
          status: 'COMPLETED',
          finished_at: new Date().toISOString()
      }).select().single();

      if (attemptErr) throw attemptErr;

      // 2. Create detailed Answer records
      const answersToInsert = processedAnswers.map(ans => ({
          attempt_id: attempt.id,
          question_id: ans.question_id,
          answer_text: ans.answer_text,
          is_correct: ans.is_correct
      }));

      const { error: answersErr } = await supabase.from('language_exam_answers').insert(answersToInsert);
      if (answersErr) throw answersErr;

      // 3. Set UI State for immediate result view
      setFinishedResult({
          correct: correctCount,
          total: questions.length,
          score: Math.round((correctCount / questions.length) * 100),
          answers: processedAnswers as any
      });
      
      setMode('result');
      fetchMyAttempts();
    } catch (err: any) {
      alert("Erro ao salvar simulado: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // --- Professor/Admin Management Logic ---

  const handleCreateExam = () => {
    const newExam: LanguageExamType = {
        id: crypto.randomUUID(),
        title: '',
        description: '',
        language: selectedLanguage || 'ENGLISH',
        duration_minutes: 30,
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        questions: []
    };
    setEditingExam(newExam);
    setMode('editor');
  };

  const handleSaveExam = async () => {
    if (!editingExam || !editingExam.title.trim()) {
        alert("O título do simulado é obrigatório.");
        return;
    }

    setIsSaving(true);
    try {
        const examId = editingExam.id;
        const examToSave = {
            id: examId,
            title: editingExam.title,
            description: editingExam.description,
            language: editingExam.language,
            duration_minutes: editingExam.duration_minutes,
            status: editingExam.status,
            created_by: user?.id
        };

        const { error: upsertErr } = await supabase.from('language_exams').upsert(examToSave);
        if (upsertErr) throw upsertErr;

        // Sync Questions (Bank Management Logic)
        // 1. Ensure questions exist in language_questions bank
        if (editingExam.questions && editingExam.questions.length > 0) {
            const { error: qErr } = await supabase.from('language_questions').upsert(
                editingExam.questions.map(q => ({
                    id: q.id,
                    language: q.language,
                    type: q.type,
                    text: q.text,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    explanation: q.explanation,
                    difficulty: q.difficulty,
                    created_by: user?.id
                }))
            );
            if (qErr) throw qErr;

            // 2. Refresh Join Table (Exam -> Questions mapping + order)
            await supabase.from('language_exam_questions').delete().eq('exam_id', examId);
            const { error: jErr } = await supabase.from('language_exam_questions').insert(
                editingExam.questions.map((q, idx) => ({
                    exam_id: examId,
                    question_id: q.id,
                    order: idx
                }))
            );
            if (jErr) throw jErr;
        }

        alert("Simulado salvo com sucesso!");
        fetchExams();
        setMode('list');
        setEditingExam(null);
    } catch (err: any) {
        alert("Erro ao salvar: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const confirmDeleteExam = async () => {
    if (!deleteModal.id) return;
    try {
        const { error } = await supabase.from('language_exams').delete().eq('id', deleteModal.id);
        if (error) throw error;
        fetchExams();
        setDeleteModal({ open: false, id: null });
    } catch (err: any) {
        alert("Erro ao excluir: " + err.message);
    }
  };

  // --- RENDER HELPERS (THEMING & COMPONENTS) ---

  const Badge = ({ status }: { status: string }) => {
    const colors = {
        DRAFT: 'bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700',
        PUBLISHED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30',
        INACTIVE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30',
        ENVIADO: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800/30'
    };
    const labels = { DRAFT: 'Rascunho', PUBLISHED: 'Publicado', INACTIVE: 'Desativado', ENVIADO: 'Enviado' };
    
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[status as keyof typeof colors] || colors.DRAFT}`}>
            {labels[status as keyof typeof labels] || status}
        </span>
    );
  };

  // --- SUB-VIEWS ---

  const renderLandingMenu = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
      {/* English Card */}
      <div
        onClick={() => handleSelectLanguage('ENGLISH')}
        className="group relative bg-white dark:bg-dark-card p-10 rounded-[2.5rem] shadow-level-2 border border-transparent hover:border-premium-border dark:hover:border-stone-700 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="w-16 h-16 bg-surface dark:bg-dark-surface rounded-2xl flex items-center justify-center text-secondary dark:text-primary mb-8 group-hover:scale-110 transition-transform shadow-inner">
          <BookOpen size={32} />
        </div>
        <h3 className="font-serif text-3xl text-gray-800 dark:text-gray-100 mb-4 font-bold">Inglês Acadêmico</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-lg italic">Reading, interpretation & instrumental grammar simulations.</p>
        <div className="flex items-center text-secondary dark:text-primary font-bold text-sm uppercase tracking-widest gap-2">
          <span>Ver simulados disponíveis</span>
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Spanish Card */}
      <div
        onClick={() => handleSelectLanguage('SPANISH')}
        className="group relative bg-white dark:bg-dark-card p-10 rounded-[2.5rem] shadow-level-2 border border-transparent hover:border-premium-border dark:hover:border-stone-700 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
        <div className="w-16 h-16 bg-surface dark:bg-dark-surface rounded-2xl flex items-center justify-center text-secondary dark:text-primary mb-8 group-hover:scale-110 transition-transform shadow-inner">
          <Award size={32} />
        </div>
        <h3 className="font-serif text-3xl text-gray-800 dark:text-gray-100 mb-4 font-bold">Espanhol Acadêmico</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-lg italic">Simulacros de lectura, interpretación y gramática instrumental.</p>
        <div className="flex items-center text-secondary dark:text-primary font-bold text-sm uppercase tracking-widest gap-2">
          <span>Ver simulados disponíveis</span>
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );

  const renderExamList = () => {
    const list = exams.filter(e => e.language === selectedLanguage && (isProfessor || e.status === 'PUBLISHED'));
    
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setMode('menu')} className="text-gray-400 hover:text-secondary flex items-center gap-2 text-sm font-bold uppercase tracking-widest transition-colors">
                    <ArrowLeft size={18} /> Voltar aos Idiomas
                </button>
                {isProfessor && (
                    <button onClick={handleCreateExam} className="bg-secondary dark:bg-primary text-white dark:text-stone-900 px-6 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform active:scale-95">
                        <Plus size={20} /> Criar Simulado
                    </button>
                )}
            </div>

            {list.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-dark-card rounded-[2rem] border-2 border-dashed border-premium-border dark:border-stone-800">
                    <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 font-serif italic text-lg">Nenhum simulado {isProfessor ? 'cadastrado' : 'publicado'} para este idioma ainda.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {list.map(exam => (
                        <div key={exam.id} className="bg-white dark:bg-dark-card p-8 rounded-3xl shadow-level-1 hover:shadow-level-2 border border-premium-border dark:border-stone-800 transition-all flex flex-col md:flex-row justify-between items-center gap-6 group">
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-2">
                                    <h3 className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100">{exam.title}</h3>
                                    {isProfessor && <Badge status={exam.status} />}
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 mb-5 italic max-w-2xl">{exam.description || 'Simulado preparatório para proficiência.'}</p>
                                <div className="flex gap-6 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    <span className="flex items-center gap-1.5"><ListIcon size={14} /> {exam.questions?.length || 0} QUESTÕES</span>
                                    <span className="flex items-center gap-1.5"><ClockIcon size={14} /> {exam.duration_minutes} MINUTOS</span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {isProfessor ? (
                                    <>
                                        <button 
                                            onClick={() => {
                                                setSelectedExam(exam);
                                                setMode('ranking');
                                            }} 
                                            className="p-3 text-secondary dark:text-primary hover:bg-surface dark:hover:bg-stone-800 rounded-xl transition-colors shadow-sm"
                                            title="Ver Ranking de Resultados"
                                        >
                                            <BarChart2 size={22} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingExam(JSON.parse(JSON.stringify(exam)));
                                                setMode('editor');
                                            }} 
                                            className="p-3 text-secondary dark:text-primary hover:bg-surface dark:hover:bg-stone-800 rounded-xl transition-colors shadow-sm"
                                            title="Editar"
                                        >
                                            <Edit2 size={22} />
                                        </button>
                                        <button 
                                            onClick={() => setDeleteModal({ open: true, id: exam.id })} 
                                            className="p-3 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={22} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => startExam(exam)}
                                        className="bg-secondary dark:bg-primary text-white dark:text-stone-900 px-8 py-3.5 rounded-2xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:translate-y-0"
                                    >
                                        Iniciar Simulado
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
  };

  const renderExamPlayer = () => {
    if (!selectedExam || !selectedExam.questions) return null;
    const q = selectedExam.questions[currentQ];
    
    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-12">
            <div className="bg-white dark:bg-dark-card p-10 rounded-[2.5rem] shadow-level-3 border border-premium-border dark:border-stone-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-1.5 bg-secondary/20 dark:bg-stone-800 w-full">
                    <div 
                        className="h-full bg-secondary dark:bg-primary transition-all duration-500 ease-out" 
                        style={{ width: `${((currentQ + 1) / selectedExam.questions.length) * 100}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center mb-10 pt-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Questão {currentQ + 1} de {selectedExam.questions.length}</span>
                    <button onClick={() => {if(confirm("Deseja interromper o simulado? Seu progresso não será salvo.")) setMode('list')}} className="text-gray-300 hover:text-red-500 transition-colors"><XIcon size={24} /></button>
                </div>

                <div className="mb-10">
                    <h2 className="text-2xl font-serif font-medium text-gray-800 dark:text-gray-100 leading-relaxed mb-8">{q.text}</h2>
                    
                    <div className="space-y-4">
                        {q.options?.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    const newAns = [...answers];
                                    newAns[currentQ] = String(idx);
                                    setAnswers(newAns);
                                }}
                                className={`w-full text-left p-6 rounded-2xl border-2 transition-all duration-300 flex items-center group ${
                                    answers[currentQ] === String(idx)
                                    ? 'bg-secondary/5 border-secondary dark:border-primary text-secondary dark:text-primary'
                                    : 'border-transparent bg-surface dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-stone-800 text-gray-600 dark:text-gray-300'
                                } shadow-sm`}
                            >
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center mr-5 text-sm font-bold border-2 transition-all ${
                                    answers[currentQ] === String(idx) 
                                    ? 'bg-secondary dark:bg-primary text-white dark:text-stone-900 border-secondary dark:border-primary' 
                                    : 'bg-white dark:bg-dark-card border-gray-100 dark:border-stone-700 text-gray-400 group-hover:border-secondary shadow-inner'
                                }`}>
                                    {String.fromCharCode(65 + idx)}
                                </span>
                                <span className="font-medium text-lg flex-1">{opt}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center pt-8 border-t border-gray-50 dark:border-stone-800/50">
                    <button
                        disabled={currentQ === 0}
                        onClick={() => setCurrentQ(curr => curr - 1)}
                        className="flex items-center gap-2 px-6 py-3 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-secondary disabled:opacity-0 transition-all"
                    >
                        <ArrowLeft size={16} /> Anterior
                    </button>

                    {currentQ < selectedExam.questions.length - 1 ? (
                        <button
                            onClick={() => setCurrentQ(curr => curr + 1)}
                            className="bg-secondary dark:bg-primary text-white dark:text-stone-900 px-10 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all"
                        >
                            Próxima Questão
                        </button>
                    ) : (
                        <button
                            onClick={handleFinishExam}
                            disabled={isSaving}
                            className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl active:scale-95 transition-all min-w-[180px] flex justify-center items-center"
                        >
                            {isSaving ? <Loader size={20} className="animate-spin" /> : 'Finalizar & Enviar'}
                        </button>
                    )}
                </div>
            </div>
            
            {/* Warning: Pedagogical feedback is hidden until finish */}
            <div className="mt-8 bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex items-center gap-4 text-amber-700 dark:text-amber-400">
                <AlertCircle size={24} className="shrink-0" />
                <p className="text-sm italic font-serif">O gabarito e as resoluções pedagógicas estarão disponíveis imediatamente após você finalizar sua tentativa.</p>
            </div>
        </div>
    );
  };

  const renderResult = () => {
    if (!finishedResult || !selectedExam) return null;

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-12">
            {/* Result Header */}
            <div className="bg-white dark:bg-dark-card p-12 rounded-[2.5rem] shadow-level-3 border border-premium-border dark:border-stone-700 text-center mb-10 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-secondary to-[#8a7a6c]"></div>
                <Award size={64} className="mx-auto text-secondary mb-6 animate-bounce" />
                <h2 className="text-4xl font-serif text-secondary dark:text-primary font-bold mb-4">Simulado Finalizado!</h2>
                <div className="flex justify-center gap-12 mt-8 mb-10">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Acertos</p>
                        <p className="text-4xl font-serif font-bold text-gray-800 dark:text-gray-100">{finishedResult.correct} / {finishedResult.total}</p>
                    </div>
                    <div className="text-center border-l border-gray-100 dark:border-stone-800 pl-12">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nota Final</p>
                        <p className="text-4xl font-serif font-bold text-secondary dark:text-primary">{finishedResult.score}%</p>
                    </div>
                </div>
                <button onClick={() => { setMode('menu'); setFinishedResult(null); }} className="px-10 py-4 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all">Voltar ao Menu</button>
            </div>

            {/* Resolution Cards (Question by Question Details) */}
            <h3 className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8 flex items-center gap-3">
                <History className="text-secondary" /> Revisão do Simulado
            </h3>
            <div className="space-y-8">
                {finishedResult.answers.map((ans: any, idx) => {
                    const q = ans.question;
                    const isCorrect = ans.is_correct;
                    
                    return (
                        <div key={idx} className={`bg-white dark:bg-dark-card p-10 rounded-3xl shadow-sm border-l-8 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'} border-premium-border dark:border-stone-700`}>
                            <div className="flex justify-between items-start mb-6">
                                <span className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isCorrect ? 'bg-green-50 text-green-700 dark:bg-green-900/20' : 'bg-red-50 text-red-700 dark:bg-red-900/20'}`}>
                                    {isCorrect ? 'Você acertou' : 'Você errou'}
                                </span>
                                <span className="text-gray-300 font-bold text-xs uppercase tracking-widest">Questão {idx+1}</span>
                            </div>

                            <p className="text-xl font-serif font-medium text-gray-800 dark:text-gray-100 mb-8 leading-relaxed">{q.text}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className={`p-5 rounded-2xl border-2 ${isCorrect ? 'bg-green-50/50 border-green-100 dark:bg-green-900/10' : 'bg-red-50/50 border-red-100 dark:bg-red-900/10'}`}>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Sua Escolha</p>
                                    <p className="font-bold text-gray-800 dark:text-gray-100">{q.options[parseInt(ans.answer_text)] || 'Não respondida'}</p>
                                </div>
                                {!isCorrect && (
                                    <div className="p-5 rounded-2xl bg-green-50/50 border-2 border-green-100 dark:bg-green-900/10">
                                        <p className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase mb-2 tracking-widest">Gabarito Correto</p>
                                        <p className="font-bold text-green-700 dark:text-green-300">{q.options[parseInt(q.correct_answer || '0')]}</p>
                                    </div>
                                )}
                            </div>

                            {q.explanation && (
                                <div className="bg-surface dark:bg-stone-800/50 p-6 rounded-2xl border border-premium-border dark:border-stone-700">
                                    <p className="text-[10px] font-bold text-secondary dark:text-primary uppercase mb-3 flex items-center gap-2 tracking-[0.2em]">
                                        <CheckIcon size={14} /> Resolução Pedagógica
                                    </p>
                                    <div className="text-gray-600 dark:text-gray-400 italic text-sm leading-relaxed whitespace-pre-wrap">{q.explanation}</div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderRanking = () => {
    if (!selectedExam) return null;
    const ranking = allAttempts.filter(att => att.exam_id === selectedExam.id);

    return (
        <div className="space-y-6 animate-fade-in">
            <header className="flex justify-between items-center mb-8">
                <button onClick={() => setMode('list')} className="text-gray-400 hover:text-secondary flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                    <ArrowLeft size={18} /> Voltar à Lista
                </button>
                <div className="text-right">
                    <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-100">{selectedExam.title}</h2>
                    <p className="text-xs text-gray-400 uppercase tracking-widest">Ranking Global de Desempenho</p>
                </div>
            </header>

            <div className="bg-white dark:bg-dark-card rounded-[2rem] shadow-level-2 border border-premium-border dark:border-stone-800 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-surface dark:bg-dark-surface border-b border-gray-100 dark:border-stone-800">
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Posição</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Estudante</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nota</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Finalizado em</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                        {ranking.sort((a,b) => b.score - a.score).map((att, idx) => (
                            <tr key={att.id} className="hover:bg-surface/50 dark:hover:bg-stone-800/30 transition-colors group">
                                <td className="px-8 py-6">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-stone-200 text-stone-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>
                                        {idx + 1}º
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-surface dark:bg-stone-800 rounded-lg flex items-center justify-center text-gray-400 dark:text-stone-600"><Users size={16} /></div>
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{(att as any).profiles?.full_name || 'Estudante Anônimo'}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                        <span className="text-xl font-serif font-bold text-secondary dark:text-primary">{Math.round((att.score / att.total_questions) * 100)}%</span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{att.score} de {att.total_questions} corretas</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-sm text-gray-500 font-medium">{att.date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {ranking.length === 0 && (
                    <div className="p-20 text-center text-gray-300 font-serif italic italic text-lg">Nenhuma tentativa concluída ainda para este simulado.</div>
                )}
            </div>
        </div>
    );
  };

  const renderExamEditor = () => {
    if (!editingExam) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
            <header className="flex justify-between items-center bg-white dark:bg-dark-card p-8 rounded-[2rem] shadow-level-1 border border-premium-border dark:border-stone-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => { if(confirm("Deseja cancelar a edição? Todas as alterações não salvas serão perdidas.")) setMode('list'); }} className="text-gray-400 hover:text-red-500 transition-colors"><XIcon size={24}/></button>
                    <div>
                        <h2 className="text-2xl font-serif font-bold text-secondary dark:text-primary">Configurar Simulado</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Painel Administrativo Laramentoria</p>
                    </div>
                </div>
                <button onClick={handleSaveExam} disabled={isSaving} className="bg-secondary dark:bg-primary text-white dark:text-stone-900 px-10 py-4 rounded-2xl font-bold shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                    {isSaving ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
                    Salvar Simulado
                </button>
            </header>

            {/* General Info */}
            <div className="bg-white dark:bg-dark-card p-10 rounded-[2.5rem] shadow-sm border border-premium-border dark:border-stone-800 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Título do Simulado</label>
                    <input 
                        type="text" 
                        value={editingExam.title} 
                        onChange={(e) => setEditingExam({...editingExam, title: e.target.value})}
                        className="w-full bg-surface dark:bg-stone-900 border-none rounded-2xl p-4 font-serif text-lg outline-none focus:ring-2 ring-secondary/20 transition-all font-bold text-gray-800 dark:text-gray-100"
                        placeholder="Ex: Simulado Acadêmico Inglês - Outubro 2026"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Status do Módulo</label>
                    <select 
                        value={editingExam.status}
                        onChange={(e) => setEditingExam({...editingExam, status: e.target.value as any})}
                        className="w-full bg-surface dark:bg-stone-900 border-none rounded-2xl p-4 font-bold text-sm outline-none focus:ring-2 ring-secondary/20 transition-all text-gray-800 dark:text-gray-100 cursor-pointer appearance-none"
                    >
                        <option value="DRAFT">Rascunho (Oculto)</option>
                        <option value="PUBLISHED">Publicado (Visível para Alunos)</option>
                        <option value="INACTIVE">Inativo / Arquivado</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Descrição / Instruções</label>
                    <textarea 
                        value={editingExam.description || ''} 
                        onChange={(e) => setEditingExam({...editingExam, description: e.target.value})}
                        className="w-full bg-surface dark:bg-stone-900 border-none rounded-2xl p-4 italic text-sm outline-none focus:ring-2 ring-secondary/20 transition-all min-h-[100px] resize-none text-gray-600 dark:text-gray-400"
                        placeholder="Instruções para o aluno ao iniciar este simulado..."
                    />
                </div>
            </div>

            {/* Questions Management */}
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-surface/50 dark:bg-stone-900/50 p-6 rounded-3xl border border-dashed border-premium-border dark:border-stone-800">
                    <h3 className="font-serif text-2xl font-bold flex items-center gap-3">
                        <ListIcon size={24} className="text-secondary" /> Questões ({editingExam.questions?.length})
                    </h3>
                    <button 
                        onClick={() => {
                            const newQ: LanguageQuestion = {
                                id: crypto.randomUUID(),
                                language: editingExam.language,
                                type: 'MULTIPLE_CHOICE',
                                text: '',
                                options: ['', '', '', ''],
                                correct_answer: '0',
                                explanation: '',
                                difficulty: 'MEDIUM',
                                category: null,
                                created_at: new Date().toISOString()
                            };
                            setEditingExam({...editingExam, questions: [...(editingExam.questions || []), newQ]});
                        }}
                        className="px-6 py-3 bg-white dark:bg-dark-card border border-premium-border dark:border-stone-700 rounded-xl font-bold text-sm text-secondary dark:text-primary flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
                    >
                        <Plus size={18} /> Adicionar Nova Questão
                    </button>
                </div>

                <div className="space-y-8">
                    {editingExam.questions?.map((q, qIdx) => (
                        <div key={q.id} className="bg-white dark:bg-dark-card p-10 rounded-[2.5rem] shadow-sm border border-premium-border dark:border-stone-800 relative group animate-fade-in">
                            <div className="absolute -top-4 -left-4 w-10 h-10 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-full flex items-center justify-center font-bold shadow-lg">#{qIdx+1}</div>
                            <button onClick={() => {
                                const qs = [...(editingExam.questions || [])];
                                qs.splice(qIdx, 1);
                                setEditingExam({...editingExam, questions: qs});
                            }} className="absolute top-6 right-8 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={24}/></button>

                            <div className="mb-10">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Enunciado da Questão</label>
                                <textarea 
                                    value={q.text} 
                                    onChange={(e) => {
                                        const qs = [...(editingExam.questions || [])];
                                        qs[qIdx] = {...qs[qIdx], text: e.target.value};
                                        setEditingExam({...editingExam, questions: qs});
                                    }}
                                    className="w-full bg-surface dark:bg-stone-900 border-none rounded-2xl p-5 font-serif text-xl outline-none focus:ring-2 ring-secondary/20 transition-all font-medium min-h-[120px] resize-none text-gray-800 dark:text-gray-100"
                                    placeholder="Escreva aqui o texto da questão..."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Alternativas & Gabarito</label>
                                    <div className="space-y-4">
                                        {q.options?.map((opt, optIdx) => (
                                            <div key={optIdx} className="flex items-center gap-3">
                                                <input 
                                                    type="radio" 
                                                    name={`correct-${q.id}`} 
                                                    checked={q.correct_answer === String(optIdx)}
                                                    onChange={() => {
                                                        const qs = [...(editingExam.questions || [])];
                                                        qs[qIdx] = {...qs[qIdx], correct_answer: String(optIdx)};
                                                        setEditingExam({...editingExam, questions: qs});
                                                    }}
                                                    className="w-5 h-5 accent-secondary cursor-pointer"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={opt}
                                                    onChange={(e) => {
                                                        const qs = [...(editingExam.questions || [])];
                                                        const opts = [...(qs[qIdx].options || [])];
                                                        opts[optIdx] = e.target.value;
                                                        qs[qIdx] = {...qs[qIdx], options: opts};
                                                        setEditingExam({...editingExam, questions: qs});
                                                    }}
                                                    className="flex-1 bg-surface dark:bg-stone-900 border-none rounded-xl p-3 text-sm outline-none font-medium focus:ring-2 ring-secondary/10 text-gray-700 dark:text-gray-300"
                                                    placeholder={`Alternativa ${String.fromCharCode(65+optIdx)}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-secondary dark:text-primary uppercase tracking-widest block mb-4">Explicação Pedagógica (Resolução)</label>
                                    <textarea 
                                        value={q.explanation || ''} 
                                        onChange={(e) => {
                                            const qs = [...(editingExam.questions || [])];
                                            qs[qIdx] = {...qs[qIdx], explanation: e.target.value};
                                            setEditingExam({...editingExam, questions: qs});
                                        }}
                                        className="w-full bg-surface dark:bg-stone-900 border-2 border-secondary/10 rounded-2xl p-5 italic text-sm outline-none focus:ring-2 ring-secondary/20 transition-all min-h-[160px] resize-none text-gray-600 dark:text-gray-400 leading-relaxed"
                                        placeholder="Esta explicação aparecerá ao aluno somente depois que ele finalizar o simulado..."
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  const renderPerformance = () => {
    const list = isProfessor ? [] : examHistory; // For simplicity in student view
    const totalSimulados = isProfessor ? exams.length : list.length;
    const avgScore = list.length > 0 ? Math.round(list.reduce((acc, curr) => acc + (curr.score / curr.total_questions), 0) / list.length * 100) : 0;
    const latestAttempt = list.length > 0 ? list[0] : null;

    return (
        <div className="space-y-10 animate-fade-in pb-12">
            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <MetricCard icon={<BookOpen />} label="Simulados Realizados" value={totalSimulados} />
                <MetricCard icon={<TrendingUp />} label="Média de Acertos" value={`${avgScore}%`} />
                <MetricCard icon={<Award />} label="Última Nota" value={latestAttempt ? `${Math.round((latestAttempt.score / latestAttempt.total_questions)*100)}%` : '-'} />
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-dark-card rounded-[2.5rem] shadow-level-2 border border-premium-border dark:border-stone-800 overflow-hidden">
                <div className="p-10 border-b border-gray-50 dark:border-stone-800 flex justify-between items-center">
                    <h3 className="font-serif text-2xl font-bold flex items-center gap-3"><History className="text-secondary" /> Histórico de Simulados</h3>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Apenas Tentativas Finalizadas</div>
                </div>
                {list.length === 0 ? (
                    <div className="p-20 text-center font-serif text-gray-300 italic text-lg">Você ainda não concluiu nenhum simulado.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-surface/50 dark:bg-stone-900/10 text-[10px] uppercase font-bold text-gray-400 tracking-[0.2em] border-b border-gray-50 dark:border-stone-800">
                                    <th className="px-10 py-5">Simulado</th>
                                    <th className="px-10 py-5">Data</th>
                                    <th className="px-10 py-5">Desempenho</th>
                                    <th className="px-10 py-5">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-stone-800">
                                {list.map(att => (
                                    <tr key={att.id} className="group hover:bg-surface/30 dark:hover:bg-stone-900/20 transition-colors">
                                        <td className="px-10 py-6 font-bold text-gray-700 dark:text-gray-200">{att.examTitle}</td>
                                        <td className="px-10 py-6 text-sm text-gray-500 font-medium italic">{att.date}</td>
                                        <td className="px-10 py-6">
                                            <div className="flex flex-col">
                                                <span className={`text-xl font-serif font-bold ${ (att.score / att.total_questions) >= 0.7 ? 'text-green-600' : 'text-amber-600' }`}>
                                                    {Math.round((att.score / att.total_questions) * 100)}%
                                                </span>
                                                <span className="text-[9px] uppercase tracking-tighter text-gray-400 font-bold">{att.score} acertos de {att.total_questions}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-6 text-right">
                                            <button 
                                                onClick={async () => {
                                                    // Fetch details and show result mode
                                                    setIsLoading(true);
                                                    try {
                                                        const { data, error } = await supabase.from('language_exam_answers')
                                                            .select('*, question:language_questions(*)')
                                                            .eq('attempt_id', att.id);
                                                        if(error) throw error;
                                                        
                                                        const exam = exams.find(e => e.id === att.exam_id);
                                                        setSelectedExam(exam || null);
                                                        setFinishedResult({
                                                            correct: att.score,
                                                            total: att.total_questions,
                                                            score: Math.round((att.score / att.total_questions) * 100),
                                                            answers: data as any
                                                        });
                                                        setMode('result');
                                                    } finally { setIsLoading(false); }
                                                }}
                                                className="text-secondary dark:text-primary font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:underline"
                                            >
                                                Ver Resolução <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
  };

  const MetricCard = ({ icon, label, value }: { icon: any, label: string, value: any }) => (
    <div className="bg-white dark:bg-dark-card p-10 rounded-[2rem] shadow-sm border border-premium-border dark:border-stone-800 transition-all hover:-translate-y-1">
        <div className="w-12 h-12 bg-surface dark:bg-stone-800 rounded-xl flex items-center justify-center text-secondary dark:text-primary mb-6 shadow-inner">{icon}</div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">{label}</p>
        <p className="text-4xl font-serif font-bold text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  );


  // --- MAIN RENDER ---

  const renderContent = () => {
      if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-40">
            <Loader className="animate-spin text-secondary mb-4" size={48} />
            <p className="text-gray-400 font-serif italic text-lg animate-pulse">Carregando conteúdos acadêmicos...</p>
        </div>
      );

      switch (mode) {
          case 'menu': return renderLandingMenu();
          case 'list': return renderExamList();
          case 'taking': return renderExamPlayer();
          case 'result': return renderResult();
          case 'editor': return renderExamEditor();
          case 'ranking': return renderRanking();
          default: return renderLandingMenu();
      }
  };

  return (
    <div className="min-h-screen animate-fade-in">
      {/* Dynamic Header */}
      {mode !== 'taking' && mode !== 'editor' && (
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-100 dark:border-stone-800 pb-8 mb-10 pt-4">
            <div>
                <h1 className="text-[2.5rem] font-serif font-bold text-gray-900 dark:text-gray-100 leading-tight">Prova de Língua</h1>
                <p className="text-gray-400 font-medium italic mt-1">Instrumental academic simulators for Master and PhD proficiency.</p>
            </div>
            
            {!isProfessor ? (
                <div className="bg-surface dark:bg-stone-900 p-1 rounded-2xl border border-premium-border dark:border-stone-800 flex shadow-inner">
                    <button 
                        onClick={() => setActiveTab('exams')}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'exams' ? 'bg-white dark:bg-dark-card shadow-md text-secondary dark:text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Simulados
                    </button>
                    <button 
                        onClick={() => setActiveTab('performance')}
                        className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'performance' ? 'bg-white dark:bg-dark-card shadow-md text-secondary dark:text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Meu Desempenho
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <div className="bg-secondary/10 dark:bg-primary/5 text-secondary dark:text-primary px-5 py-2.5 rounded-2xl border border-secondary/20 dark:border-primary/10 flex items-center gap-2">
                        <Eye size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">Visão Estrutural (Mentor)</span>
                    </div>
                </div>
            )}
        </header>
      )}

      {/* Main Body */}
      {activeTab === 'performance' && mode === 'menu' ? renderPerformance() : renderContent()}

      <ConfirmModal
        isOpen={deleteModal.open}
        title="Excluir Simulado Permanentemente?"
        message="Esta ação não pode ser desfeita. Todas as questões e o histórico de tentativas dos alunos serão afetados no banco de dados."
        confirmText="Sim, Excluir Definitivamente"
        cancelText="Cancelar"
        onConfirm={confirmDeleteExam}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </div>
  );
};

// --- Missing Icons ---
const Loader = ({ className, size }: { className?: string, size?: number }) => <svg className={className} width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>;
const ListIcon = ({ className, size }: { className?: string, size?: number }) => <svg className={className} width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const ClockIcon = ({ className, size }: { className?: string, size?: number }) => <svg className={className} width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const XIcon = ({ className, size }: { className?: string, size?: number }) => <svg className={className} width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const CheckIcon = ({ className, size }: { className?: string, size?: number }) => <svg className={className} width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;

export default LanguageExam;