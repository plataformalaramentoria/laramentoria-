import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, PlayCircle, Folder, FileText, ArrowLeft, Plus, Edit2, Trash2, GraduationCap, Video, AlertCircle, Eye, EyeOff, Download, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { X, UploadCloud, Youtube, Link as LinkIcon, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Course, CourseModule, CourseLesson } from '../types';
import { CourseModal, ModuleModal, LessonModal } from '../components/CoursesModals';
import { ConfirmModal } from '../components/ConfirmModal';

export const CoursesScreen: React.FC = () => {
    const { user, role } = useAuth();
    const isAdmin = role === 'ADMIN' || role === 'PROFESSOR';

    const [isLoading, setIsLoading] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);
    
    // View State
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
    const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
    const [expandedModuleIds, setExpandedModuleIds] = useState<string[]>([]);

    // Modals State
    const [courseModal, setCourseModal] = useState<{ isOpen: boolean, data?: Course | null }>({ isOpen: false });
    const [moduleModal, setModuleModal] = useState<{ isOpen: boolean, data?: CourseModule | null, courseId?: string }>({ isOpen: false });
    const [lessonModal, setLessonModal] = useState<{ isOpen: boolean, data?: CourseLesson | null, moduleId?: string }>({ isOpen: false });
    
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, action: () => Promise<void> | void }>({
        isOpen: false, title: '', message: '', action: () => {}
    });

    const activeCourse = courses.find(c => c.id === activeCourseId) || null;

    useEffect(() => {
        if (!user) return;
        fetchCoursesData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchCoursesData = async () => {
        setIsLoading(true);
        try {
            // Base query: get courses with modules and lessons
            let query = supabase
                .from('courses')
                .select(`
                    *,
                    course_modules (*, 
                        course_lessons (*)
                    )
                `)
                .order('order', { ascending: true });
            
            // Student restriction: only PUBLISHED and authorized
            if (!isAdmin && user) {
                const { data: accessData } = await supabase
                    .from('student_course_access')
                    .select('course_id')
                    .eq('student_id', user.id);
                
                const allowedIds = accessData?.map(a => a.course_id) || [];
                query = query
                    .eq('status', 'PUBLISHED')
                    .in('id', allowedIds);
            }

            const { data, error } = await query;
            if (error) throw error;
            
            // Format and sort nested data
            const formatted = (data || []).map(c => ({
                ...c,
                course_modules: (c.course_modules || [])
                    .sort((a: any, b: any) => a.order - b.order)
                    .map((m: any) => ({
                        ...m,
                        course_lessons: (m.course_lessons || []).sort((x: any, y: any) => x.order - y.order)
                    }))
            }));
            
            setCourses(formatted);
        } catch (err: any) {
            console.error("Error fetching courses", err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleModule = (moduleId: string) => {
        setExpandedModuleIds(prev => 
            prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
        );
    };

    const renderYouTubeIframe = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        const videoId = (match && match[2].length === 11) ? match[2] : null;

        if (!videoId) return (
            <div className="flex flex-col items-center justify-center h-full bg-stone-900 text-white p-6 text-center">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <p className="text-lg font-serif">Link de vídeo indisponível ou inválido.</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-secondary dark:text-primary hover:underline mt-4 text-sm">Abrir no YouTube diretamente</a>
            </div>
        );

        return (
            <iframe 
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0`} 
                className="w-full h-full absolute inset-0 rounded-2xl"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Lesson Video"
            />
        );
    };

    // ==========================================
    // ACTIONS: COURSE
    // ==========================================
    const handleSaveCourse = async (data: { title: string, description: string | null, status: 'DRAFT' | 'PUBLISHED', studentIds: string[] }) => {
        if (!user) return;
        
        let courseId = courseModal.data?.id;

        const coursePayload = { 
            title: data.title, 
            description: data.description, 
            status: data.status 
        };

        if (courseId) {
            const { error } = await supabase.from('courses').update(coursePayload).eq('id', courseId);
            if (error) throw error;
        } else {
            const { data: newCourse, error } = await supabase.from('courses').insert([{ 
                ...coursePayload, 
                order: courses.length, 
                created_by: user.id 
            }]).select();
            if (error) throw error;
            courseId = newCourse?.[0]?.id;
        }

        if (courseId) {
            // SYNC STUDENT ACCESS
            // 1. Remove current access
            await supabase.from('student_course_access').delete().eq('course_id', courseId);
            
            // 2. Add new access list
            if (data.studentIds.length > 0) {
                const accessPayload = data.studentIds.map(sid => ({
                    course_id: courseId,
                    student_id: sid
                }));
                const { error: accessError } = await supabase.from('student_course_access').insert(accessPayload);
                if (accessError) throw accessError;
            }
        }

        await fetchCoursesData();
    };

    const handleDeleteCourse = (courseId: string) => {
        const course = courses.find(c => c.id === courseId);
        if (course && course.course_modules && course.course_modules.length > 0) {
            alert("Este curso possui módulos internos. Exclua os módulos e aulas primeiro para garantir uma remoção segura.");
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Excluir Curso',
            message: 'Tem certeza que deseja remover este curso permanentemente? Esta ação não pode ser desfeita.',
            action: async () => {
                const { error } = await supabase.from('courses').delete().eq('id', courseId);
                if (error) throw error;
                await fetchCoursesData();
                if (activeCourseId === courseId) setActiveCourseId(null);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // ==========================================
    // ACTIONS: MODULE
    // ==========================================
    const handleSaveModule = async (title: string) => {
        if (!user) return;
        const courseId = moduleModal.courseId || moduleModal.data?.course_id;
        if (!courseId) return;

        if (moduleModal.data) {
            const { error } = await supabase.from('course_modules').update({ title }).eq('id', moduleModal.data.id);
            if (error) throw error;
        } else {
            const parent = courses.find(c => c.id === courseId);
            const order = parent?.course_modules?.length || 0;
            const { data: newMod, error } = await supabase.from('course_modules').insert([{ course_id: courseId, title, order }]).select();
            if (error) throw error;
            if (newMod) setExpandedModuleIds(prev => [...prev, newMod[0].id]);
        }
        await fetchCoursesData();
    };

    const handleDeleteModule = (moduleId: string, courseId: string) => {
        const parent = courses.find(c => c.id === courseId);
        const target = parent?.course_modules?.find(m => m.id === moduleId);
        
        if (target && target.course_lessons && target.course_lessons.length > 0) {
            alert("Este módulo possui aulas. Remova todas as aulas antes de excluir o módulo.");
            return;
        }

        setConfirmModal({
            isOpen: true,
            title: 'Excluir Módulo',
            message: 'Deseja remover este módulo definitivamente?',
            action: async () => {
                const { error } = await supabase.from('course_modules').delete().eq('id', moduleId);
                if (error) throw error;
                await fetchCoursesData();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // ==========================================
    // ACTIONS: LESSON
    // ==========================================
    const handleSaveLesson = async (data: { title: string, description: string | null, youtube_url: string, file: File | null }) => {
        if (!user) return;
        const moduleId = lessonModal.moduleId || lessonModal.data?.module_id;
        if (!moduleId) return;

        let pdf_url = lessonModal.data?.pdf_url || null;
        let pdf_path = lessonModal.data?.pdf_path || null;
        let pdf_size = lessonModal.data?.pdf_size || null;

        if (data.file) {
            const fPath = `course_lessons/${moduleId}/${Date.now()}_${data.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
            const { error: uploadError } = await supabase.storage.from('course_materials').upload(fPath, data.file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('course_materials').getPublicUrl(fPath);
            
            // Cleanup old file
            if (lessonModal.data?.pdf_path) {
                supabase.storage.from('course_materials').remove([lessonModal.data.pdf_path]); 
            }

            pdf_url = publicUrlData.publicUrl;
            pdf_path = fPath;
            pdf_size = (data.file.size / 1024 / 1024).toFixed(2) + ' MB';
        }

        const payload = { 
            title: data.title, 
            description: data.description, 
            youtube_url: data.youtube_url,
            pdf_url,
            pdf_path,
            pdf_size
        };

        if (lessonModal.data) {
            const { error } = await supabase.from('course_lessons').update(payload).eq('id', lessonModal.data.id);
            if (error) throw error;
        } else {
            const parentCourse = courses.find(c => c.course_modules?.some(m => m.id === moduleId));
            const targetMod = parentCourse?.course_modules?.find(m => m.id === moduleId);
            const order = targetMod?.course_lessons?.length || 0;
            const { data: newLess, error } = await supabase.from('course_lessons').insert([{ 
                module_id: moduleId, ...payload, order, created_by: user.id 
            }]).select();
            if (error) throw error;
            if (newLess) setActiveLesson(newLess[0] as CourseLesson);
        }
        await fetchCoursesData();
    };

    const handleDeleteLesson = (lessonId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Excluir Aula',
            message: 'Tem certeza que deseja apagar esta aula? Se houver um PDF anexado, ele também será removido.',
            action: async () => {
                const lesson = activeCourse?.course_modules?.flatMap(m => m.course_lessons || []).find(l => l.id === lessonId);
                if (lesson?.pdf_path) {
                    supabase.storage.from('course_materials').remove([lesson.pdf_path]);
                }
                const { error } = await supabase.from('course_lessons').delete().eq('id', lessonId);
                if (error) throw error;
                await fetchCoursesData();
                if (activeLesson?.id === lessonId) setActiveLesson(null);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleDownloadPDF = (url: string | undefined) => {
        if (url) window.open(url, '_blank');
    };

    // ==========================================
    // RENDER
    // ==========================================
    if (isLoading) return <CoursesSkeleton />;

    const filteredCourses = courses.filter(c => 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --- LMS EXPERIENCE VIEW ---
    if (activeCourseId && activeCourse) {
        return (
            <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in -mx-6 lg:-mx-12 -my-6 lg:-my-12 bg-surface dark:bg-[#0c0a09] relative overflow-hidden">
                {/* Fixed Top Nav */}
                <div className="bg-white dark:bg-dark-card border-b border-premium-border dark:border-stone-800 p-4 lg:px-8 flex items-center justify-between shrink-0 z-20 shadow-sm">
                    <div className="flex items-center gap-5">
                        <button 
                            onClick={() => { setActiveCourseId(null); setActiveLesson(null); }}
                            className="p-2.5 hover:bg-surface dark:hover:bg-stone-800 rounded-full transition-all text-gray-500 dark:text-gray-300"
                            title="Voltar para Biblioteca"
                        >
                            <ArrowLeft size={22} />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                {activeCourse.title}
                            </h2>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Plataforma de Cursos Mentoria</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Curriculum */}
                    <div className="w-80 bg-white dark:bg-dark-card border-r border-premium-border dark:border-stone-800 flex flex-col shrink-0 z-10 shadow-lg">
                        <div className="p-4 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-gray-50/50 dark:bg-stone-900/50">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-[0.2em] text-[10px]">Grade Curricular</h3>
                            {isAdmin && (
                                <button 
                                    onClick={() => setModuleModal({ isOpen: true, courseId: activeCourse.id, data: null })} 
                                    className="text-secondary dark:text-primary p-1.5 hover:bg-white dark:hover:bg-stone-800 rounded-lg shadow-sm border border-gray-100 dark:border-stone-700 transition-all active:scale-95" 
                                    title="Criar Novo Módulo"
                                >
                                    <Plus size={16} />
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                            {activeCourse.course_modules?.length === 0 ? (
                                <div className="p-10 text-center opacity-40">
                                    <Folder size={32} className="mx-auto mb-2" />
                                    <p className="text-xs italic">Nenhum conteúdo.</p>
                                </div>
                            ) : (
                                activeCourse.course_modules?.map(m => (
                                    <div key={m.id} className="rounded-2xl border border-gray-100 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900/40">
                                        <div 
                                            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-surface dark:hover:bg-stone-800 cursor-pointer group transition-colors"
                                            onClick={() => toggleModule(m.id)}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <span className={`${expandedModuleIds.includes(m.id) ? 'text-secondary dark:text-primary' : 'text-gray-400'}`}>
                                                    {expandedModuleIds.includes(m.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </span>
                                                <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{m.title}</h4>
                                            </div>
                                            {isAdmin && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 ml-2">
                                                    <button onClick={(e) => { e.stopPropagation(); setModuleModal({ isOpen: true, data: m }); }} className="p-1.5 text-gray-400 hover:text-functional dark:hover:text-gray-100"><Edit2 size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(m.id, activeCourse.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {expandedModuleIds.includes(m.id) && (
                                            <div className="bg-surface dark:bg-stone-900/60 transition-all border-t border-gray-50 dark:border-stone-800 pb-2">
                                                {m.course_lessons?.map(l => (
                                                    <div key={l.id} className="group relative">
                                                        <div 
                                                            onClick={() => setActiveLesson(l)}
                                                            className={`px-6 py-3 flex items-center gap-3 cursor-pointer border-l-4 transition-all ${activeLesson?.id === l.id ? 'bg-secondary/10 dark:bg-primary/10 border-secondary dark:border-primary' : 'hover:bg-gray-100 dark:hover:bg-stone-800 border-transparent'}`}
                                                        >
                                                            <PlayCircle size={14} className={activeLesson?.id === l.id ? 'text-secondary dark:text-primary' : 'text-gray-400'} />
                                                            <span className={`text-[13px] font-medium ${activeLesson?.id === l.id ? 'text-secondary dark:text-primary font-bold' : 'text-gray-600 dark:text-gray-300'}`}>{l.title}</span>
                                                        </div>
                                                        {isAdmin && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center bg-white dark:bg-stone-800 rounded-lg p-0.5 opacity-0 group-hover:opacity-100 shadow-md">
                                                                 <button onClick={() => setLessonModal({ isOpen: true, data: l, moduleId: m.id })} className="p-1.5 text-gray-400 hover:text-functional"><Edit2 size={12} /></button>
                                                                 <button onClick={() => handleDeleteLesson(l.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {isAdmin && (
                                                    <button 
                                                        onClick={() => setLessonModal({ isOpen: true, moduleId: m.id, data: null })} 
                                                        className="w-[calc(100%-2rem)] mx-4 mt-3 py-2 border-2 border-dashed border-gray-200 dark:border-stone-700 rounded-xl text-[11px] font-bold text-gray-400 hover:border-secondary hover:text-secondary dark:hover:border-primary dark:hover:text-primary transition-all flex items-center justify-center gap-2 active:scale-95"
                                                    >
                                                        <Plus size={14}/> Adicionar Aula
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-y-auto p-6 lg:p-12">
                        {activeLesson ? (
                            <div className="max-w-5xl mx-auto animate-fade-up">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <h1 className="text-3xl font-serif font-bold text-gray-800 dark:text-gray-100 leading-tight mb-2">{activeLesson.title}</h1>
                                        <div className="flex items-center gap-3">
                                            <span className="px-2.5 py-1 bg-secondary/10 dark:bg-primary/10 text-secondary dark:text-primary text-[10px] font-bold uppercase tracking-wider rounded-lg">Vídeo-Aula</span>
                                            {activeLesson.pdf_path && <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-lg border border-green-100 dark:border-green-900/50"><Download size={10}/> Material Incluso</span>}
                                        </div>
                                    </div>
                                    {activeLesson.pdf_url && (
                                        <button 
                                            onClick={() => handleDownloadPDF(activeLesson.pdf_url)}
                                            className="fixed bottom-8 right-8 lg:static flex items-center gap-3 px-6 py-3 bg-white dark:bg-dark-card border-2 border-premium-border dark:border-stone-700 text-functional dark:text-gray-200 rounded-2xl shadow-elevation-2 hover:shadow-elevation-3 transition-all font-bold text-sm lg:text-base z-30 group"
                                        >
                                            <FileText className="text-secondary dark:text-primary group-hover:scale-110 transition-transform" /> 
                                            Material Complementar (PDF)
                                        </button>
                                    )}
                                </div>
                                
                                <div className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-black border-[6px] border-white dark:border-stone-900 shadow-elevation-3 group">
                                    {renderYouTubeIframe(activeLesson.youtube_url)}
                                </div>

                                {activeLesson.description && (
                                    <div className="mt-10 bg-white dark:bg-dark-card p-10 rounded-[2.5rem] border border-gray-100 dark:border-stone-800 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-5">
                                            <FileText size={80} />
                                        </div>
                                        <h4 className="text-xs uppercase font-bold text-stone-400 tracking-[0.3em] mb-4">Notas de Estudo</h4>
                                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-medium text-lg">{activeLesson.description}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 text-center animate-pulse">
                                <div className="bg-white dark:bg-dark-card p-10 rounded-full shadow-inner mb-6">
                                    <GraduationCap size={80} className="text-stone-300" />
                                </div>
                                <h2 className="text-2xl font-serif font-bold text-gray-500 mb-2">Tudo pronto para começar?</h2>
                                <p className="text-gray-400 max-w-sm">Selecione uma aula no menu lateral para visualizar o conteúdo e materiais.</p>
                            </div>
                        )}
                    </main>
                </div>
                
                {/* Modals placed inside the active view container for consistency */}
                <ModuleModal isOpen={moduleModal.isOpen} initialData={moduleModal.data} onClose={() => setModuleModal({isOpen: false})} onSave={handleSaveModule} />
                <LessonModal isOpen={lessonModal.isOpen} initialData={lessonModal.data} onClose={() => setLessonModal({isOpen: false})} onSave={handleSaveLesson} />
                <ConfirmModal 
                    isOpen={confirmModal.isOpen} 
                    title={confirmModal.title} 
                    message={confirmModal.message} 
                    onConfirm={confirmModal.action} 
                    onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))} 
                />
            </div>
        );
    }

    // --- LIBRARY GALLERY VIEW ---
    return (
        <div className="animate-fade-in space-y-10">
            {/* Same as before... */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-premium-border dark:border-stone-800 pb-8">
                <div>
                    <h1 className="text-4xl font-serif text-secondary dark:text-primary font-bold tracking-tight mb-3 flex items-center gap-4">
                        <GraduationCap size={36} /> Biblioteca de Cursos
                    </h1>
                    <p className="text-functional dark:text-gray-400 font-medium text-lg max-w-2xl leading-relaxed">
                        Explore as trilhas de aprendizado e materiais acadêmicos exclusivos da sua mentoria.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-80 group">
                        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-secondary dark:group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por título ou descrição..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 rounded-2xl border border-gray-100 dark:border-stone-800 bg-white dark:bg-dark-card text-gray-700 dark:text-gray-200 outline-none focus:ring-4 focus:ring-secondary/10 dark:focus:ring-primary/10 transition-all font-medium shadow-sm"
                        />
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={() => setCourseModal({ isOpen: true, data: null })}
                            className="w-full md:w-auto px-8 py-3.5 bg-secondary hover:bg-[#6b5d52] text-white font-bold rounded-2xl transition-all shadow-elevation-2 flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-95"
                        >
                            <Plus size={22} /> Criar Novo Curso
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredCourses.length === 0 ? (
                    <div className="col-span-full py-32 text-center bg-white dark:bg-dark-card rounded-[3rem] border border-dashed border-gray-200 dark:border-stone-800">
                        <Folder size={64} className="mx-auto text-stone-200 dark:text-stone-800 mb-6" />
                        <h3 className="text-xl font-serif font-bold text-gray-600 dark:text-gray-400">
                            {isAdmin ? 'Nenhum curso encontrado.' : 'Nenhum curso disponível no momento.'}
                        </h3>
                        <p className="text-gray-400 mt-2 px-6">
                            {isAdmin 
                                ? 'Clique em "Criar Novo Curso" ou tente uma busca diferente.' 
                                : 'Você ainda não possui acesso a nenhum curso. Entre em contato com sua mentora para liberar seus materiais.'}
                        </p>
                    </div>
                ) : (
                    filteredCourses.map(course => {
                        const lessonCount = course.course_modules?.flatMap(m => m.course_lessons || []).length || 0;
                        const isDraft = course.status === 'DRAFT';

                        return (
                            <div 
                                key={course.id} 
                                className="group bg-white dark:bg-dark-card rounded-[2.5rem] border border-gray-100 dark:border-stone-800 shadow-elevation-1 hover:shadow-elevation-3 transition-all duration-500 overflow-hidden relative flex flex-col hover:-translate-y-2"
                            >
                                {/* Status Badge */}
                                <div className="flex justify-between items-start p-6 pb-2">
                                     <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isDraft ? 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/50' : 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/10 dark:border-green-900/50'}`}>
                                        {isDraft ? <><EyeOff size={12}/> Rascunho</> : <><Eye size={12}/> Publicado</>}
                                     </div>
                                     {isAdmin && (
                                         <div className="flex gap-2">
                                            <button onClick={() => setCourseModal({ isOpen: true, data: course })} className="p-2.5 bg-surface dark:bg-stone-800 text-gray-400 hover:text-secondary dark:hover:text-primary rounded-xl transition-colors shadow-sm"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteCourse(course.id)} className="p-2.5 bg-surface dark:bg-stone-800 text-gray-400 hover:text-red-500 rounded-xl transition-colors shadow-sm"><Trash2 size={16}/></button>
                                         </div>
                                     )}
                                </div>

                                <div className="p-8 pt-4 flex-1 flex flex-col cursor-pointer" onClick={() => { setActiveCourseId(course.id); setExpandedModuleIds(course.course_modules?.[0] ? [course.course_modules[0].id] : []); }}>
                                    <div className="w-16 h-16 bg-surface dark:bg-stone-800 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-inner group-hover:bg-secondary/5 dark:group-hover:bg-primary/5">
                                        <GraduationCap size={32} className="text-secondary dark:text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-100 mb-3 leading-snug group-hover:text-secondary dark:group-hover:text-primary transition-colors">{course.title}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-6 flex-1 font-medium">{course.description || 'Nenhuma descrição fornecida.'}</p>
                                    
                                    <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-stone-800">
                                        <div className="flex items-center gap-2">
                                             <div className="flex -space-x-2">
                                                 {[1,2,3].map(i => <div key={i} className={`w-6 h-6 rounded-full border-2 border-white dark:border-stone-900 bg-stone-100 dark:bg-stone-800 flex items-center justify-center`}><PlayCircle size={10} className="text-gray-400"/></div>)}
                                             </div>
                                             <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{lessonCount} Aulas</span>
                                        </div>
                                        <div className="p-2 bg-secondary/10 dark:bg-primary/10 rounded-full text-secondary dark:text-primary transition-transform group-hover:translate-x-1">
                                            <ChevronRight size={18} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Global Modals */}
            <CourseModal isOpen={courseModal.isOpen} initialData={courseModal.data} onClose={() => setCourseModal({isOpen: false})} onSave={handleSaveCourse} />
            <ModuleModal isOpen={moduleModal.isOpen} initialData={moduleModal.data} onClose={() => setModuleModal({isOpen: false})} onSave={handleSaveModule} />
            <LessonModal isOpen={lessonModal.isOpen} initialData={lessonModal.data} onClose={() => setLessonModal({isOpen: false})} onSave={handleSaveLesson} />
            
            <ConfirmModal 
                isOpen={confirmModal.isOpen} 
                title={confirmModal.title} 
                message={confirmModal.message} 
                onConfirm={confirmModal.action} 
                onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))} 
            />
        </div>
    );
};

const CoursesSkeleton: React.FC = () => (
    <div className="space-y-12 animate-pulse p-4">
        <div className="h-32 bg-gray-100 dark:bg-stone-900 rounded-[3rem] w-full max-w-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-96 bg-gray-50 dark:bg-stone-900/50 rounded-[3rem]"></div>
            ))}
        </div>
    </div>
);
