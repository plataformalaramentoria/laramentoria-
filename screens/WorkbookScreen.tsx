import React, { useState } from 'react';
import {
    Folder, FileText, Plus, MoreVertical, Edit2, Trash2,
    Download, ChevronRight, Home, Upload, Search, ArrowLeft, Book
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { InputModal } from '../components/InputModal';

// --- Types ---
interface FolderData {
    id: string;
    name: string;
    createdAt: string;
}

interface FileData {
    id: string;
    folderId: string;
    name: string;
    url: string; // Mock URL
    size: string;
    createdAt: string;
}

// --- Mock Data ---
const MOCK_FOLDERS: FolderData[] = [
    { id: '1', name: 'Módulo 1: Estrutura do Projeto', createdAt: '2025-01-10' },
    { id: '2', name: 'Módulo 2: Escrita Acadêmica', createdAt: '2025-01-15' },
    { id: '3', name: 'Materiais Complementares', createdAt: '2025-01-20' },
];

const MOCK_FILES: FileData[] = [
    { id: '101', folderId: '1', name: 'Template de Projeto.pdf', url: '#', size: '2.4 MB', createdAt: '2025-01-10' },
    { id: '102', folderId: '1', name: 'Guia de Normas ABNT.pdf', url: '#', size: '1.1 MB', createdAt: '2025-01-12' },
    { id: '201', folderId: '2', name: 'Artigo: Coesão Textual.pdf', url: '#', size: '3.5 MB', createdAt: '2025-01-15' },
];

export const WorkbookScreen: React.FC = () => {
    const { role } = useAuth();
    const isProfessor = role === 'PROFESSOR';

    // --- State ---
    const [folders, setFolders] = useState<FolderData[]>(MOCK_FOLDERS);
    const [files, setFiles] = useState<FileData[]>(MOCK_FILES);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // Modals state
    const [inputModal, setInputModal] = useState<{
        isOpen: boolean;
        type: 'FOLDER_CREATE' | 'FOLDER_EDIT' | 'FILE_EDIT' | 'FILE_CREATE'; // FILE_CREATE for upload mock
        targetId?: string;
        initialValue?: string;
    }>({ isOpen: false, type: 'FOLDER_CREATE' });

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'FOLDER_DELETE' | 'FILE_DELETE';
        targetId?: string;
    }>({ isOpen: false, type: 'FOLDER_DELETE' });

    // --- Derived State ---
    const currentFolder = folders.find(f => f.id === currentFolderId);
    const currentFiles = files.filter(f => f.folderId === currentFolderId);

    // --- Actions: Folders ---
    const handleCreateFolder = (name: string) => {
        const newFolder: FolderData = {
            id: Date.now().toString(),
            name,
            createdAt: new Date().toLocaleDateString('pt-BR')
        };
        setFolders([...folders, newFolder]);
        closeInputModal();
    };

    const handleEditFolder = (newName: string) => {
        if (inputModal.targetId) {
            setFolders(folders.map(f => f.id === inputModal.targetId ? { ...f, name: newName } : f));
        }
        closeInputModal();
    };

    const handleDeleteFolder = () => {
        if (confirmModal.targetId) {
            setFolders(folders.filter(f => f.id !== confirmModal.targetId));
            // Also delete files in folder
            setFiles(files.filter(f => f.folderId !== confirmModal.targetId));
        }
        closeConfirmModal();
    };

    // --- Actions: Files ---
    const handleUploadFile = (name: string) => {
        if (!currentFolderId) return;
        const newFile: FileData = {
            id: Date.now().toString(),
            folderId: currentFolderId,
            name: name.endsWith('.pdf') ? name : `${name}.pdf`,
            url: '#',
            size: '1.5 MB', // Mock
            createdAt: new Date().toLocaleDateString('pt-BR')
        };
        setFiles([...files, newFile]);
        closeInputModal();
    };

    const handleEditFile = (newName: string) => {
        if (inputModal.targetId) {
            setFiles(files.map(f => f.id === inputModal.targetId ? { ...f, name: newName } : f));
        }
        closeInputModal();
    };

    const handleDeleteFile = () => {
        if (confirmModal.targetId) {
            setFiles(files.filter(f => f.id !== confirmModal.targetId));
        }
        closeConfirmModal();
    };

    // --- Modal Helpers ---
    const openCreateFolder = () => setInputModal({ isOpen: true, type: 'FOLDER_CREATE', initialValue: '' });

    const openEditFolder = (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setInputModal({ isOpen: true, type: 'FOLDER_EDIT', targetId: id, initialValue: name });
    };

    const openDeleteFolder = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmModal({ isOpen: true, type: 'FOLDER_DELETE', targetId: id });
    };

    const openUploadFile = () => setInputModal({ isOpen: true, type: 'FILE_CREATE', initialValue: '' }); // Mocking upload with name input

    const openEditFile = (id: string, name: string) => {
        setInputModal({ isOpen: true, type: 'FILE_EDIT', targetId: id, initialValue: name });
    };

    const openDeleteFile = (id: string) => {
        setConfirmModal({ isOpen: true, type: 'FILE_DELETE', targetId: id });
    };

    const closeInputModal = () => setInputModal({ ...inputModal, isOpen: false });
    const closeConfirmModal = () => setConfirmModal({ ...confirmModal, isOpen: false });

    // --- Render ---

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-premium-border dark:border-stone-700 pb-6">
                <div>
                    <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium flex items-center gap-2">
                        <Book size={32} className="text-[#cdbaa6]" /> Apostilas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Materiais didáticos e complementares do curso.</p>
                </div>

                {/* Breadcrumb / Actions */}
                <div className="flex items-center gap-4">
                    {currentFolderId && (
                        <button
                            onClick={() => setCurrentFolderId(null)}
                            className="flex items-center gap-2 text-gray-500 hover:text-secondary dark:hover:text-primary transition-colors font-bold text-sm uppercase tracking-wider"
                        >
                            <ArrowLeft size={16} /> Voltar
                        </button>
                    )}
                    {isProfessor && !currentFolderId && (
                        <button
                            onClick={openCreateFolder}
                            className="bg-secondary dark:bg-primary text-white dark:text-stone-900 px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 hover:bg-[#6b5d52] dark:hover:bg-[#bda895] transition-all"
                        >
                            <Plus size={18} /> Nova Pasta
                        </button>
                    )}
                    {isProfessor && currentFolderId && (
                        <button
                            onClick={openUploadFile}
                            className="bg-secondary dark:bg-primary text-white dark:text-stone-900 px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 hover:bg-[#6b5d52] dark:hover:bg-[#bda895] transition-all"
                        >
                            <Upload size={18} /> Adicionar PDF
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            {currentFolderId ? (
                // FILE LIST VIEW
                <div className="animate-slide-up">
                    <div className="flex items-center gap-2 mb-6 text-gray-400 text-sm">
                        <Home size={14} className="cursor-pointer hover:text-secondary" onClick={() => setCurrentFolderId(null)} />
                        <ChevronRight size={14} />
                        <span className="font-bold text-secondary dark:text-primary">{currentFolder?.name}</span>
                    </div>

                    {currentFiles.length === 0 ? (
                        <div className="text-center py-20 bg-white dark:bg-dark-card rounded-3xl border border-dashed border-gray-300 dark:border-stone-700">
                            <FileText size={48} className="mx-auto text-gray-300 dark:text-stone-600 mb-4" />
                            <p className="text-gray-400 dark:text-gray-500 font-medium">Nenhuma apostila nesta pasta.</p>
                            {isProfessor && <button onClick={openUploadFile} className="mt-4 text-secondary dark:text-primary font-bold hover:underline">Adicionar a primeira</button>}
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {currentFiles.map(file => (
                                <div key={file.id} className="bg-white dark:bg-dark-card p-4 rounded-xl shadow-sm border border-premium-border dark:border-stone-700 flex justify-between items-center group hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-red-50 dark:bg-red-900/10 rounded-lg flex items-center justify-center text-red-500 dark:text-red-400">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-gray-800 dark:text-gray-100 text-lg">{file.name}</h4>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{file.size} • Adicionado em {file.createdAt}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-gray-400 hover:text-secondary dark:hover:text-primary transition-colors" title="Download">
                                            <Download size={20} />
                                        </button>
                                        {isProfessor && (
                                            <>
                                                <button onClick={() => openEditFile(file.id, file.name)} className="p-2 text-gray-400 hover:text-secondary dark:hover:text-primary transition-colors" title="Editar">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => openDeleteFile(file.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Excluir">
                                                    <Trash2 size={18} />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-slide-up">
                    {folders.map(folder => (
                        <div
                            key={folder.id}
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-card dark:shadow-none border border-premium-border dark:border-stone-700 hover:border-secondary/50 dark:hover:border-primary/50 cursor-pointer group transition-all duration-300 relative"
                        >
                            <div className="mb-4">
                                <div className="w-14 h-14 bg-surface dark:bg-dark-surface rounded-2xl flex items-center justify-center text-secondary dark:text-primary mb-4 group-hover:scale-110 transition-transform">
                                    <Folder size={28} fill="currentColor" className="text-[#cdbaa6]/20 dark:text-[#cdbaa6]/10" stroke="currentColor" />
                                </div>
                                <h3 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100 pr-8 leading-tight">{folder.name}</h3>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">
                                    {files.filter(f => f.folderId === folder.id).length} arquivos
                                </p>
                            </div>

                            {isProfessor && (
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <button
                                        onClick={(e) => openEditFolder(folder.id, folder.name, e)}
                                        className="p-2 bg-white dark:bg-stone-800 rounded-lg shadow-sm text-gray-500 hover:text-secondary dark:hover:text-primary"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={(e) => openDeleteFolder(folder.id, e)}
                                        className="p-2 bg-white dark:bg-stone-800 rounded-lg shadow-sm text-gray-500 hover:text-red-500"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    {folders.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400">
                            Nenhuma pasta criada. {isProfessor && "Crie uma para começar!"}
                        </div>
                    )}
                </div>
            )}

            {/* --- Modals --- */}

            {/* Input Modal */}
            <InputModal
                isOpen={inputModal.isOpen}
                title={
                    inputModal.type === 'FOLDER_CREATE' ? 'Nova Pasta' :
                        inputModal.type === 'FOLDER_EDIT' ? 'Editar Nome da Pasta' :
                            inputModal.type === 'FILE_CREATE' ? 'Upload de Apostila (Simulado)' :
                                'Renomear Arquivo'
                }
                initialValue={inputModal.initialValue}
                placeholder={inputModal.type.includes('FILE') ? "Nome do arquivo PDF" : "Nome da pasta"}
                confirmText="Salvar"
                onConfirm={(val) => {
                    if (inputModal.type === 'FOLDER_CREATE') handleCreateFolder(val);
                    if (inputModal.type === 'FOLDER_EDIT') handleEditFolder(val);
                    if (inputModal.type === 'FILE_CREATE') handleUploadFile(val);
                    if (inputModal.type === 'FILE_EDIT') handleEditFile(val);
                }}
                onCancel={closeInputModal}
            />

            {/* Confirm Deletion */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.type === 'FOLDER_DELETE' ? "Excluir Pasta?" : "Excluir Arquivo?"}
                message={
                    confirmModal.type === 'FOLDER_DELETE'
                        ? "Ao excluir esta pasta, todos os arquivos dentro dela também serão removidos. Esta ação não pode ser desfeita."
                        : "Tem certeza que deseja remover esta apostila?"
                }
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={() => {
                    if (confirmModal.type === 'FOLDER_DELETE') handleDeleteFolder();
                    if (confirmModal.type === 'FILE_DELETE') handleDeleteFile();
                }}
                onCancel={closeConfirmModal}
            />

        </div>
    );
};
