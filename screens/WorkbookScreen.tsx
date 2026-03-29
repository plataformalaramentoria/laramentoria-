import React, { useState, useEffect } from 'react';
import {
    Folder, FileText, Plus, Edit2, Trash2,
    Download, ChevronRight, Home, Upload, ArrowLeft, Book
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { FolderModal, UploadApostilaModal } from '../components/ApostilasModals';
import { ApostilaFolder, Apostila } from '../types';

export const WorkbookScreen: React.FC = () => {
    const { user, role } = useAuth();
    const isAdmin = role === 'ADMIN';

    // --- State ---
    const [folders, setFolders] = useState<ApostilaFolder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals state
    const [folderModal, setFolderModal] = useState<{isOpen: boolean, data?: ApostilaFolder | null}>({ isOpen: false });
    const [uploadModal, setUploadModal] = useState<{isOpen: boolean, folderId: string, data?: Apostila | null}>({ isOpen: false, folderId: '' });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, action: () => Promise<void> | void }>({
        isOpen: false, title: '', message: '', action: () => {}
    });

    // Students list for visibility restrictions (Admin only)
    const [students, setStudents] = useState<{id: string, name: string}[]>([]);

    const fetchApostilasData = async () => {
        setIsLoading(true);
        try {
            // Fetch folders
            const { data: dbFolders, error: err1 } = await supabase.from('apostila_folders').select('*').order('created_at', { ascending: false });
            if (err1) throw err1;
            
            // Fetch apostilas (RLS will handle student visibility)
            const { data: dbApostilas, error: err2 } = await supabase.from('apostilas').select('*').order('created_at', { ascending: false });
            if (err2) throw err2;

            const combined = (dbFolders || []).map(folder => ({
                ...folder,
                apostilas: (dbApostilas || []).filter(apostila => apostila.folder_id === folder.id)
            }));
            
            // For students, show ONLY folders that have visible content
            const visibleToUser = isAdmin 
                ? combined 
                : combined.filter(f => (f.apostilas?.length || 0) > 0);
            
            setFolders(visibleToUser);

            if (isAdmin) {
                const { data: proflist } = await supabase.from('profiles').select('id, full_name').eq('role', 'STUDENT');
                if (proflist) setStudents(proflist.map(p => ({ id: p.id, name: p.full_name || 'Sem Nome' })));
            }
        } catch (err) {
            console.error("Error fetching apostilas:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchApostilasData();
    }, [user, role]);

    // --- Derived State ---
    const currentFolder = folders.find(f => f.id === currentFolderId);
    
    // Filter folders by search term (only in root view)
    const filteredFolders = folders.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentFiles = currentFolder?.apostilas || [];

    // --- Actions: Folders ---
    const handleSaveFolder = async (name: string) => {
        if (!user) throw new Error("Sem sessão.");
        
        if (folderModal.data) {
            const { error } = await supabase.from('apostila_folders').update({ 
                name,
                updated_at: new Date().toISOString()
            }).eq('id', folderModal.data.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('apostila_folders').insert([{ 
                name, 
                created_by: user.id 
            }]);
            if (error) throw error;
        }
        fetchApostilasData();
    };

    const executeDeleteFolder = async (folderId: string) => {
        const folder = folders.find(f => f.id === folderId);
        
        // Rule: Only delete if empty (prevents accidental loss)
        if (folder && folder.apostilas && folder.apostilas.length > 0) {
            alert("Esta pasta possui arquivos. Exclusão bloqueada por segurança. Remova todos os PDFs antes de apagar a pasta.");
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            return;
        }

        if (folder) {
            const { error } = await supabase.from('apostila_folders').delete().eq('id', folderId);
            if (error) throw error;
        }
        fetchApostilasData();
        if (currentFolderId === folderId) setCurrentFolderId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    // --- Actions: Files ---
    const handleSaveApostila = async (data: { title: string, description: string | null, file: File | null, visibility_type: 'ALL'|'SPECIFIC', visible_students: string[] }) => {
        if (!user) throw new Error("Sem sessão.");
        const folderId = uploadModal.folderId;

        let fileUrl = uploadModal.data?.file_url;
        let filePath = uploadModal.data?.file_path;
        let fileSize = uploadModal.data?.file_size;

        if (data.file) {
            const ext = data.file.name.split('.').pop();
            const newFileName = `apostila_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { error: uploadError } = await supabase.storage.from('apostilas').upload(newFileName, data.file);
            
            if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

            filePath = newFileName;
            const { data: publicUrlData } = supabase.storage.from('apostilas').getPublicUrl(newFileName);
            fileUrl = publicUrlData.publicUrl;
            fileSize = `${(data.file.size / 1024 / 1024).toFixed(2)} MB`;

            // Delete old physical file if updating
            if (uploadModal.data && uploadModal.data.file_path) {
                await supabase.storage.from('apostilas').remove([uploadModal.data.file_path]);
            }
        }

        if (uploadModal.data) {
            const { error } = await supabase.from('apostilas').update({
                title: data.title,
                description: data.description,
                visibility_type: data.visibility_type,
                visible_students: data.visible_students,
                file_url: fileUrl,
                file_path: filePath,
                file_size: fileSize,
                updated_at: new Date().toISOString()
            }).eq('id', uploadModal.data.id);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('apostilas').insert([{
                folder_id: folderId,
                title: data.title,
                description: data.description,
                visibility_type: data.visibility_type,
                visible_students: data.visible_students,
                file_url: fileUrl,
                file_path: filePath!,
                file_size: fileSize,
                created_by: user.id
            }]);
            if (error) throw error;
        }
        fetchApostilasData();
    };

    const executeDeleteApostila = async (apostilaId: string) => {
        const apostila = folders.flatMap(f => f.apostilas || []).find(a => a.id === apostilaId);
        if (apostila) {
            // Delete physical file first
            await supabase.storage.from('apostilas').remove([apostila.file_path]);
            const { error } = await supabase.from('apostilas').delete().eq('id', apostilaId);
            if (error) throw error;
        }
        fetchApostilasData();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    // --- Render ---
    if (!isLoading && folders.length === 0 && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in py-20">
                <div className="w-24 h-24 bg-gray-100 dark:bg-stone-800 rounded-full flex items-center justify-center mb-6">
                    <Book size={40} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-serif text-gray-800 dark:text-gray-100 mb-2">Sem apostilas no momento</h2>
                <p className="text-gray-500 max-w-md italic">Materiais didáticos e complementares da mentoria não encontrados.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-premium-border dark:border-stone-700 pb-8 pt-4">
                <div>
                    <h1 className="text-[2.5rem] font-serif text-secondary dark:text-primary font-bold leading-tight">Apostilas</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 italic">Materiais didáticos e complementares da mentoria.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    {/* Search Field (Only displayed in root view) */}
                    {!currentFolderId && (
                        <div className="relative w-full sm:w-64">
                            <input 
                                type="text"
                                placeholder="Buscar pasta..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white dark:bg-dark-card border border-premium-border dark:border-stone-700 rounded-xl px-10 py-2.5 text-sm outline-none focus:border-secondary transition-all shadow-sm"
                            />
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    )}

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {currentFolderId && (
                            <button
                                onClick={() => setCurrentFolderId(null)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-surface dark:bg-stone-800 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-secondary transition-all shadow-sm"
                            >
                                <ArrowLeft size={16} /> Voltar
                            </button>
                        )}
                        {isAdmin && !currentFolderId && (
                            <button
                                onClick={() => setFolderModal({ isOpen: true, data: null })}
                                className="flex-1 sm:flex-none bg-secondary dark:bg-primary text-white dark:text-stone-900 px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest"
                            >
                                <Plus size={18} /> Nova Pasta
                            </button>
                        )}
                        {isAdmin && currentFolderId && (
                            <button
                                onClick={() => setUploadModal({ isOpen: true, folderId: currentFolderId, data: null })}
                                className="flex-1 sm:flex-none bg-secondary dark:bg-primary text-white dark:text-stone-900 px-6 py-2.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest"
                            >
                                <Upload size={18} /> Adicionar PDF
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {currentFolderId ? (
                // FILE LIST VIEW
                <div className="animate-slide-up">
                    <div className="flex items-center gap-2 mb-8 text-gray-400 text-xs font-bold uppercase tracking-widest bg-surface dark:bg-stone-900/40 p-3 rounded-xl border border-premium-border dark:border-stone-800 w-fit">
                        <Home size={14} className="cursor-pointer hover:text-secondary transition-colors" onClick={() => setCurrentFolderId(null)} />
                        <ChevronRight size={14} />
                        <span className="text-secondary dark:text-primary">{currentFolder?.name}</span>
                    </div>

                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white dark:bg-dark-card rounded-2xl animate-pulse"></div>)}
                        </div>
                    ) : currentFiles.length === 0 ? (
                        <div className="text-center py-24 bg-white dark:bg-dark-card rounded-[2.5rem] border border-dashed border-premium-border dark:border-stone-800">
                            <FileText size={48} className="mx-auto text-gray-200 dark:text-stone-800 mb-6" />
                            <p className="text-gray-400 dark:text-gray-500 font-serif italic text-lg">Nenhuma apostila nesta pasta ainda.</p>
                            {isAdmin && <button onClick={() => setUploadModal({ isOpen: true, folderId: currentFolderId, data: null })} className="mt-6 text-secondary dark:text-primary font-bold hover:underline py-2 px-6 rounded-xl border border-secondary/20 hover:bg-secondary/5 transition-all">Adicionar Material</button>}
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {currentFiles.map(file => (
                                <div key={file.id} className="bg-white dark:bg-dark-card p-6 rounded-[2rem] shadow-level-1 border border-premium-border dark:border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center group hover:shadow-level-2 transition-all gap-6">
                                    <div className="flex items-center gap-6 flex-1 min-w-0">
                                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900/10 rounded-2xl flex items-center justify-center text-red-500 dark:text-red-400 shrink-0 shadow-inner">
                                            <FileText size={32} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100 truncate">{file.title}</h4>
                                            {file.description && <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-1 truncate">{file.description}</p>}
                                            <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                <span className="bg-gray-50 dark:bg-stone-800 px-2 py-1 rounded-md">{file.file_size || 'N/A'}</span>
                                                {isAdmin && (
                                                    <span className={`px-2 py-1 rounded-md ${file.visibility_type === 'ALL' ? 'text-green-500 bg-green-50 dark:bg-green-900/10' : 'text-orange-500 bg-orange-50 dark:bg-orange-900/10'}`}>
                                                        {file.visibility_type === 'ALL' ? 'Público' : 'Restrito'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <a 
                                            href={file.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="p-3 bg-surface dark:bg-stone-800 text-secondary dark:text-primary hover:scale-110 transition-all rounded-xl shadow-sm"
                                            title="Ver ou Baixar PDF"
                                        >
                                            <Download size={22} />
                                        </a>
                                        {isAdmin && (
                                            <>
                                                <button onClick={() => setUploadModal({ isOpen: true, folderId: currentFolderId, data: file })} className="p-3 bg-surface dark:bg-stone-800 text-gray-400 hover:text-secondary dark:hover:text-primary transition-all rounded-xl shadow-sm" title="Editar Metadados">
                                                    <Edit2 size={20} />
                                                </button>
                                                <button onClick={() => setConfirmModal({ isOpen: true, title: 'Excluir Material', message: `Tem certeza que deseja remover permanentemente "${file.title}"?`, action: () => executeDeleteApostila(file.id) })} className="p-3 bg-surface dark:bg-stone-800 text-gray-300 hover:text-red-500 transition-all rounded-xl shadow-sm" title="Excluir">
                                                    <Trash2 size={20} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // FOLDER LIST VIEW
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-slide-up">
                    {isLoading ? (
                        [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-44 bg-white dark:bg-dark-card rounded-[2.5rem] animate-pulse"></div>)
                    ) : filteredFolders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="bg-white dark:bg-dark-card p-8 rounded-[2.5rem] shadow-level-1 border border-premium-border dark:border-stone-800 hover:border-secondary dark:hover:border-primary cursor-pointer group transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Decorative element */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500"></div>
                            
                            <div className="mb-6">
                                <div className="w-16 h-16 bg-surface dark:bg-dark-surface rounded-2xl flex items-center justify-center text-secondary dark:text-primary mb-6 group-hover:scale-110 transition-transform shadow-inner">
                                    <Folder size={32} fill="currentColor" className="text-[#cdbaa6]/20" />
                                </div>
                                <h3 className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100 pr-8 leading-tight tracking-tight">{folder.name}</h3>
                                <div className="flex items-center gap-2 mt-4">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-stone-800 px-3 py-1 rounded-full">
                                        {(folder.apostilas || []).length} Materiais
                                    </span>
                                </div>
                            </div>

                            {isAdmin && (
                                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFolderModal({ isOpen: true, data: folder }); }}
                                        className="p-2.5 bg-white dark:bg-stone-800 rounded-xl shadow-md text-gray-400 hover:text-secondary dark:hover:text-primary transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setConfirmModal({ isOpen: true, title: 'Excluir Pasta', message: `Confirma a exclusão definitiva da pasta "${folder.name}"? Esta ação requer que a pasta esteja vazia.`, action: () => executeDeleteFolder(folder.id) }); }}
                                        className="p-2.5 bg-white dark:bg-stone-800 rounded-xl shadow-md text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {!isLoading && filteredFolders.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-dark-card rounded-[2.5rem] border border-dashed border-premium-border">
                            <Book size={48} className="mx-auto text-gray-200 mb-6" />
                            <p className="text-gray-400 font-serif italic text-lg">Nenhuma pasta encontrada.</p>
                            {isAdmin && <button onClick={() => setFolderModal({ isOpen: true, data: null })} className="mt-6 text-secondary dark:text-primary font-bold hover:underline px-8 py-3 rounded-2xl border border-secondary/20">Criar Primeira Pasta</button>}
                        </div>
                    )}
                </div>
            )}

            {/* --- Modals --- */}
            <FolderModal isOpen={folderModal.isOpen} initialData={folderModal.data} onClose={() => setFolderModal({ isOpen: false })} onSave={handleSaveFolder} />
            <UploadApostilaModal isOpen={uploadModal.isOpen} initialData={uploadModal.data} folderId={uploadModal.folderId} students={students} onClose={() => setUploadModal({ isOpen: false, folderId: '' })} onSave={handleSaveApostila} />
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />

        </div>
    );
};
