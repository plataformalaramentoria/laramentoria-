import React, { useState, useEffect } from 'react';
import {
    Folder,
    FileText,
    Plus,
    Download,
    Trash2,
    Edit2,
    Upload,
    ArrowLeft,
    Search
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { NoticeFolder, Notice } from '../types';
import { FolderModal, UploadNoticeModal } from '../components/EditaisModals';
import { ConfirmModal } from '../components/ConfirmModal';

export const EditaisScreen: React.FC = () => {
    const { user, role } = useAuth();
    const isAdmin = role === 'PROFESSOR' || role === 'ADMIN';

    const [folders, setFolders] = useState<NoticeFolder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Extracted students for the modal list (mocked specifically for demo, real from profiles later if needed)
    const [students, setStudents] = useState<{id: string, name: string}[]>([]);

    // Modals
    const [folderModal, setFolderModal] = useState<{isOpen: boolean, data?: NoticeFolder | null}>({ isOpen: false });
    const [uploadModal, setUploadModal] = useState<{isOpen: boolean, folderId: string, data?: Notice | null}>({ isOpen: false, folderId: '' });
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, title: string, message: string, action: () => Promise<void> | void }>({
        isOpen: false, title: '', message: '', action: () => {}
    });

    const fetchEditaisData = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            if (user.id.startsWith('mock')) {
                const fStr = localStorage.getItem('lara_notice_folders');
                const nStr = localStorage.getItem('lara_notices');
                const mockFolders: NoticeFolder[] = fStr ? JSON.parse(fStr) : [];
                const mockNotices: Notice[] = nStr ? JSON.parse(nStr) : [];
                
                // RBAC for mock student
                const filteredNotices = isAdmin ? mockNotices : mockNotices.filter(n => n.visibility_type === 'ALL' || n.visible_students.includes(user.id));
                
                const combined = mockFolders.map(folder => ({
                    ...folder,
                    notices: filteredNotices.filter(notice => notice.folder_id === folder.id)
                }));
                // Only show folders to students if they have visible files, or show all to admin
                setFolders(isAdmin ? combined : combined.filter(f => (f.notices?.length || 0) > 0));
                
                // Load mock students to appear in the select list
                setStudents([{id: 'mock-user-id-student', name: 'João Vilela (Test)'}]);
                
            } else {
                const { data: dbFolders, error: err1 } = await supabase.from('notice_folders').select('*').order('created_at', { ascending: false });
                if (err1) throw err1;
                
                const { data: dbNotices, error: err2 } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
                if (err2) throw err2;

                const combined = (dbFolders || []).map(folder => ({
                    ...folder,
                    notices: (dbNotices || []).filter(notice => notice.folder_id === folder.id)
                }));
                
                setFolders(isAdmin ? combined : combined.filter(f => (f.notices?.length || 0) > 0));

                if (isAdmin) {
                    const { data: proflist } = await supabase.from('profiles').select('id, full_name, role').eq('role', 'STUDENT');
                    if (proflist) setStudents(proflist.map(p => ({ id: p.id, name: p.full_name || 'Sem Nome' })));
                }
            }
        } catch (err) {
            console.error("Error fetching editais:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEditaisData();
    }, [user, role]);

    // --- Actions: Folders ---
    const handleSaveFolder = async (name: string) => {
        if (!user) throw new Error("Sem sessão.");
        
        if (user.id.startsWith('mock')) {
            const mockFolders = JSON.parse(localStorage.getItem('lara_notice_folders') || '[]');
            if (folderModal.data) {
                const updated = mockFolders.map((f: any) => f.id === folderModal.data!.id ? { ...f, name } : f);
                localStorage.setItem('lara_notice_folders', JSON.stringify(updated));
            } else {
                const newFolder = { id: `mock-folder-${Date.now()}`, name, created_at: new Date().toISOString() };
                localStorage.setItem('lara_notice_folders', JSON.stringify([...mockFolders, newFolder]));
            }
            fetchEditaisData();
            return;
        }

        if (folderModal.data) {
            const { error } = await supabase.from('notice_folders').update({ name }).eq('id', folderModal.data.id);
            if (error) throw new Error(error.message);
        } else {
            const { error } = await supabase.from('notice_folders').insert([{ name }]);
            if (error) throw new Error(error.message);
        }
        fetchEditaisData();
    };

    const executeDeleteFolder = async (folderId: string) => {
        const folder = folders.find(f => f.id === folderId);
        if (folder && folder.notices && folder.notices.length > 0) {
            alert("Esta pasta possui arquivos. Exclua todos os editais antes de apagar a pasta.");
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            return;
        }

        if (user?.id.startsWith('mock')) {
            const mockFolders = JSON.parse(localStorage.getItem('lara_notice_folders') || '[]');
            localStorage.setItem('lara_notice_folders', JSON.stringify(mockFolders.filter((f:any) => f.id !== folderId)));
        } else {
            const { error } = await supabase.from('notice_folders').delete().eq('id', folderId);
            if (error) throw new Error(error.message);
        }
        fetchEditaisData();
        if (currentFolderId === folderId) setCurrentFolderId(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    // --- Actions: Files ---
    const handleSaveNotice = async (data: { title: string, description: string | null, file: File | null, visibility_type: 'ALL'|'SPECIFIC', visible_students: string[] }) => {
        if (!user) throw new Error("Sem sessão.");
        
        const folderId = uploadModal.folderId;

        if (user.id.startsWith('mock')) {
            const mockNotices = JSON.parse(localStorage.getItem('lara_notices') || '[]');
            if (uploadModal.data) {
                const updated = mockNotices.map((n: any) => n.id === uploadModal.data!.id ? { 
                    ...n, 
                    title: data.title, 
                    description: data.description, 
                    visibility_type: data.visibility_type, 
                    visible_students: data.visible_students 
                } : n);
                localStorage.setItem('lara_notices', JSON.stringify(updated));
            } else {
                if (!data.file) throw new Error("Arquivo obrigatório no mock");
                const newNotice = { 
                    id: `mock-notice-${Date.now()}`, 
                    folder_id: folderId,
                    title: data.title,
                    description: data.description,
                    visibility_type: data.visibility_type,
                    visible_students: data.visible_students,
                    file_url: 'dummy_url',
                    file_path: data.file.name,
                    file_size: `${(data.file.size / 1024 / 1024).toFixed(2)} MB`,
                    created_at: new Date().toISOString() 
                };
                localStorage.setItem('lara_notices', JSON.stringify([...mockNotices, newNotice]));
            }
            fetchEditaisData();
            return;
        }

        // Real Supabase Flow
        let fileUrl = uploadModal.data?.file_url;
        let filePath = uploadModal.data?.file_path;
        let fileSize = uploadModal.data?.file_size;

        if (data.file) {
            const ext = data.file.name.split('.').pop();
            const newFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { data: uploadData, error: uploadError } = await supabase.storage.from('notices').upload(newFileName, data.file);
            
            if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

            filePath = newFileName;
            const { data: publicUrlData } = supabase.storage.from('notices').getPublicUrl(newFileName);
            fileUrl = publicUrlData.publicUrl;
            fileSize = `${(data.file.size / 1024 / 1024).toFixed(2)} MB`;

            // Delete old file if updating
            if (uploadModal.data && uploadModal.data.file_path) {
                await supabase.storage.from('notices').remove([uploadModal.data.file_path]);
            }
        }

        if (uploadModal.data) {
            const { error } = await supabase.from('notices').update({
                title: data.title,
                description: data.description,
                visibility_type: data.visibility_type,
                visible_students: data.visible_students,
                file_url: fileUrl,
                file_path: filePath,
                file_size: fileSize
            }).eq('id', uploadModal.data.id);
            if (error) throw new Error(error.message);
        } else {
            const { error } = await supabase.from('notices').insert([{
                folder_id: folderId,
                title: data.title,
                description: data.description,
                visibility_type: data.visibility_type,
                visible_students: data.visible_students,
                file_url: fileUrl,
                file_path: filePath!,
                file_size: fileSize
            }]);
            if (error) throw new Error(error.message);
        }
        fetchEditaisData();
    };

    const executeDeleteNotice = async (noticeId: string) => {
        const notice = folders.flatMap(f => f.notices || []).find(n => n.id === noticeId);
        
        if (user?.id.startsWith('mock')) {
            const mockNotices = JSON.parse(localStorage.getItem('lara_notices') || '[]');
            localStorage.setItem('lara_notices', JSON.stringify(mockNotices.filter((n:any) => n.id !== noticeId)));
        } else if (notice) {
            await supabase.storage.from('notices').remove([notice.file_path]);
            const { error } = await supabase.from('notices').delete().eq('id', noticeId);
            if (error) throw new Error(error.message);
        }
        fetchEditaisData();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    const downloadFakeFile = (fileName: string) => {
        alert(`Disparando download simulado de: ${fileName}`);
    };


    // --- Render Helpers ---
    const currentFolder = folders.find(f => f.id === currentFolderId);
    const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!isLoading && folders.length === 0 && !isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center animate-fade-in py-20">
                <div className="w-24 h-24 bg-gray-100 dark:bg-stone-800 rounded-full flex items-center justify-center mb-6">
                    <FileText size={40} className="text-gray-400 dark:text-gray-500" />
                </div>
                <h2 className="text-2xl font-serif text-gray-800 dark:text-gray-100 mb-2">Sem editais no momento</h2>
                <p className="text-gray-500 max-w-md">Não há nenhum edital ou documento público disponibilizado para você no momento. Verifique com sua mentora se aguarda alguma liberação.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in h-full flex flex-col relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-premium-border dark:border-stone-700 pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium flex items-center gap-2">
                        {currentFolder ? (
                            <>
                                <button
                                    onClick={() => setCurrentFolderId(null)}
                                    className="hover:bg-surface dark:hover:bg-stone-800 p-1 rounded-lg transition-colors"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <span className="text-gray-400">/</span>
                                {currentFolder.name}
                            </>
                        ) : 'Biblioteca de Documentos'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {currentFolder
                            ? `${(currentFolder.notices || []).length} arquivos nesta pasta`
                            : 'Gerencie e consulte todos os editais e templates do programa.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar pasta..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:border-secondary transition-all w-48 md:w-64"
                        />
                    </div>

                    {isAdmin && !currentFolder && (
                        <button
                            onClick={() => setFolderModal({ isOpen: true, data: null })}
                            className="bg-secondary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#6b5d52] transition-colors shadow-lg"
                        >
                            <Plus size={18} /> <span className="hidden md:inline">Nova Pasta</span>
                        </button>
                    )}
                    {isAdmin && currentFolder && (
                        <button
                            onClick={() => setUploadModal({ isOpen: true, folderId: currentFolder.id, data: null })}
                            className="bg-secondary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#6b5d52] transition-colors shadow-lg"
                        >
                            <Upload size={18} /> <span className="hidden md:inline">Upload PDF</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto pb-10">
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-stone-800 rounded-2xl"></div>)}
                    </div>
                )}

                {/* Folder View (Root) */}
                {!isLoading && !currentFolder && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFolders.map(folder => (
                            <div
                                key={folder.id}
                                onClick={() => setCurrentFolderId(folder.id)}
                                className="group bg-white dark:bg-dark-card p-6 rounded-2xl border border-transparent hover:border-premium-border/50 shadow-level-1 hover:shadow-level-2 transition-all cursor-pointer relative"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-surface dark:bg-stone-800 rounded-xl text-secondary dark:text-primary group-hover:scale-110 transition-transform">
                                        <Folder size={28} />
                                    </div>
                                    {isAdmin && (
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setFolderModal({ isOpen: true, data: folder })}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-stone-700 rounded-full text-gray-500"
                                                title="Renomear"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmModal({ isOpen: true, title: 'Excluir Pasta', message: `Atenção: A pasta só pode ser excluída se estiver vazia. Confirma exclusão de "${folder.name}"?`, action: () => executeDeleteFolder(folder.id) })}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-gray-500 hover:text-red-500"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">{folder.name}</h3>
                                <p className="text-sm text-gray-500">{(folder.notices || []).length} arquivos</p>
                            </div>
                        ))}
                        {filteredFolders.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-400">Nenhuma pasta encontrada.</div>
                        )}
                    </div>
                )}

                {/* File View (Inside Folder) */}
                {!isLoading && currentFolder && (
                    <div className="space-y-3">
                        {(currentFolder.notices || []).length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-stone-700 rounded-2xl bg-surface/30">
                                <FileText size={48} className="mb-4 opacity-50" />
                                <p>Esta pasta está vazia.</p>
                                {isAdmin && <p className="text-sm mt-2 font-medium text-secondary">Clique em "Upload PDF" para começar.</p>}
                            </div>
                        ) : (
                            (currentFolder.notices || []).map(file => (
                                <div
                                    key={file.id}
                                    className="group flex flex-col md:flex-row md:items-center p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-stone-800 shadow-level-1 hover:shadow-level-2 transition-all gap-4"
                                >
                                    <div className="flex items-center flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 shrink-0 mr-4">
                                            <FileText size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200 truncate">{file.title}</h4>
                                            {file.description && <p className="text-sm text-gray-500 truncate mt-0.5">{file.description}</p>}
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">
                                                <span className="truncate max-w-[150px]">{file.file_path}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                <span>{file.file_size}</span>
                                                {isAdmin && (
                                                    <>
                                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                        <span className={file.visibility_type === 'ALL' ? 'text-green-500' : 'text-orange-500'}>
                                                            {file.visibility_type === 'ALL' ? 'PÚBLICO' : 'RESTRITO'}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 justify-end mt-2 md:mt-0">
                                        {user?.id.startsWith('mock') ? (
                                            <button onClick={() => downloadFakeFile(file.file_path)} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-surface dark:text-gray-300 dark:bg-stone-800 hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors w-full md:w-auto">
                                                <Download size={16} /> Download
                                            </button>
                                        ) : (
                                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-surface dark:text-gray-300 dark:bg-stone-800 hover:text-secondary hover:bg-secondary/10 rounded-lg transition-colors w-full md:w-auto">
                                                <Download size={16} /> Abrir
                                            </a>
                                        )}

                                        {isAdmin && (
                                            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-stone-700 pl-2 ml-2">
                                                <button
                                                    onClick={() => setUploadModal({ isOpen: true, folderId: currentFolder.id, data: file })}
                                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({ isOpen: true, title: 'Excluir Edital', message: `Confirma a exclusão (e a quebra de links ativos) de "${file.title}"?`, action: () => executeDeleteNotice(file.id) })}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Overlays */}
            <FolderModal isOpen={folderModal.isOpen} initialData={folderModal.data} onClose={() => setFolderModal({ isOpen: false })} onSave={handleSaveFolder} />
            <UploadNoticeModal isOpen={uploadModal.isOpen} initialData={uploadModal.data} folderId={uploadModal.folderId} students={students} onClose={() => setUploadModal({ isOpen: false, folderId: '' })} onSave={handleSaveNotice} />
            <ConfirmModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.action} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} />

        </div>
    );
};
