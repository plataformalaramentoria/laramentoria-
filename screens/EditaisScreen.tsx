import React, { useState } from 'react';
import {
    Folder,
    FileText,
    Plus,
    MoreVertical,
    Download,
    Trash2,
    Edit2,
    ChevronRight,
    Upload,
    ArrowLeft,
    Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// --- Types ---
interface EditalFile {
    id: string;
    title: string;
    fileName: string;
    url: string; // Mock URL for now
    size: string;
    createdAt: string;
}

interface EditalFolder {
    id: string;
    name: string;
    files: EditalFile[];
    createdAt: string;
}

// --- Mock Data ---
const INITIAL_FOLDERS: EditalFolder[] = [
    {
        id: '1',
        name: 'Editais 2026',
        createdAt: '2026-01-15',
        files: [
            { id: '101', title: 'Edital de Abertura', fileName: 'edital_abertura_2026.pdf', url: '#', size: '2.5 MB', createdAt: '2026-01-10' },
            { id: '102', title: 'Cronograma Retificado', fileName: 'cronograma_v2.pdf', url: '#', size: '1.2 MB', createdAt: '2026-01-12' },
        ]
    },
    {
        id: '2',
        name: 'Modelos de Documentos',
        createdAt: '2025-12-01',
        files: [
            { id: '201', title: 'Modelo de Projeto', fileName: 'template_projeto.pdf', url: '#', size: '500 KB', createdAt: '2025-12-05' },
        ]
    },
    {
        id: '3',
        name: 'Bolsas e Fomento',
        createdAt: '2026-01-05',
        files: []
    }
];

export const EditaisScreen: React.FC = () => {
    const { role } = useAuth();
    const isAdmin = role === 'PROFESSOR' || role === 'ADMIN';

    const [folders, setFolders] = useState<EditalFolder[]>(INITIAL_FOLDERS);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Actions: Folders ---
    const handleCreateFolder = () => {
        const name = prompt("Nome da nova pasta:");
        if (!name) return;

        const newFolder: EditalFolder = {
            id: Date.now().toString(),
            name,
            files: [],
            createdAt: new Date().toISOString().split('T')[0]
        };
        setFolders([...folders, newFolder]);
    };

    const handleRenameFolder = (id: string) => {
        const folder = folders.find(f => f.id === id);
        if (!folder) return;

        const newName = prompt("Novo nome da pasta:", folder.name);
        if (newName && newName !== folder.name) {
            setFolders(folders.map(f => f.id === id ? { ...f, name: newName } : f));
        }
    };

    const handleDeleteFolder = (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta pasta e todos os seus arquivos?")) {
            setFolders(folders.filter(f => f.id !== id));
            if (currentFolderId === id) setCurrentFolderId(null);
        }
    };

    // --- Actions: Files ---
    const handleUploadFile = (folderId: string) => {
        // Mock upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const newFile: EditalFile = {
                    id: Date.now().toString(),
                    title: file.name.replace('.pdf', ''),
                    fileName: file.name,
                    url: '#',
                    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                    createdAt: new Date().toISOString().split('T')[0]
                };

                setFolders(folders.map(f => {
                    if (f.id !== folderId) return f;
                    return { ...f, files: [...f.files, newFile] };
                }));
            }
        };
        input.click();
    };

    const handleRenameFile = (folderId: string, fileId: string) => {
        const folder = folders.find(f => f.id === folderId);
        const file = folder?.files.find(f => f.id === fileId);
        if (!file) return;

        const newTitle = prompt("Novo título do edital:", file.title);
        if (newTitle && newTitle !== file.title) {
            setFolders(folders.map(f => {
                if (f.id !== folderId) return f;
                return {
                    ...f,
                    files: f.files.map(fileItem => fileItem.id === fileId ? { ...fileItem, title: newTitle } : fileItem)
                };
            }));
        }
    };

    const handleDeleteFile = (folderId: string, fileId: string) => {
        if (confirm("Excluir este arquivo?")) {
            setFolders(folders.map(f => {
                if (f.id !== folderId) return f;
                return {
                    ...f,
                    files: f.files.filter(fileItem => fileItem.id !== fileId)
                };
            }));
        }
    };

    // --- Render Helpers ---
    const currentFolder = folders.find(f => f.id === currentFolderId);

    // Filter folders/files (simple implementation)
    const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="space-y-8 animate-fade-in h-full flex flex-col">
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
                        ) : 'Editais e Documentos'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {currentFolder
                            ? `${currentFolder.files.length} arquivos nesta pasta`
                            : 'Gerencie e acesse todos os editais do programa.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-white dark:bg-stone-800 border border-gray-200 dark:border-stone-700 rounded-xl text-sm focus:outline-none focus:border-secondary transition-all w-48 md:w-64"
                        />
                    </div>

                    {isAdmin && !currentFolder && (
                        <button
                            onClick={handleCreateFolder}
                            className="bg-secondary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#6b5d52] transition-colors shadow-lg"
                        >
                            <Plus size={18} /> <span className="hidden md:inline">Nova Pasta</span>
                        </button>
                    )}
                    {isAdmin && currentFolder && (
                        <button
                            onClick={() => handleUploadFile(currentFolder.id)}
                            className="bg-secondary text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#6b5d52] transition-colors shadow-lg"
                        >
                            <Upload size={18} /> <span className="hidden md:inline">Adicionar Edital</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-[400px]">

                {/* Folder View (Root) */}
                {!currentFolder && (
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
                                                onClick={() => handleRenameFolder(folder.id)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-stone-700 rounded-full text-gray-500"
                                                title="Renomear"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFolder(folder.id)}
                                                className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-gray-500 hover:text-red-500"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 mb-1">{folder.name}</h3>
                                <p className="text-sm text-gray-500">{folder.files.length} arquivos</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* File View (Inside Folder) */}
                {currentFolder && (
                    <div className="space-y-3">
                        {currentFolder.files.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-stone-700 rounded-2xl">
                                <FileText size={48} className="mb-4 opacity-50" />
                                <p>Esta pasta está vazia.</p>
                                {isAdmin && <p className="text-sm mt-2">Clique em "Adicionar Edital" para começar.</p>}
                            </div>
                        ) : (
                            currentFolder.files.map(file => (
                                <div
                                    key={file.id}
                                    className="group flex items-center p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-stone-800 shadow-level-1 hover:shadow-level-2 hover:translate-y-[-2px] transition-all"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500 shrink-0 mr-4">
                                        <FileText size={20} />
                                    </div>

                                    <div className="flex-1 min-w-0 mr-4">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-200 truncate">{file.title}</h4>
                                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                            <span className="truncate max-w-[200px]">{file.fileName}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span>{file.size}</span>
                                            <span className="hidden md:inline"><span className="w-1 h-1 bg-gray-300 rounded-full inline-block mx-2"></span>{file.createdAt}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-gray-500 hover:text-secondary hover:bg-surface dark:hover:bg-stone-800 rounded-lg transition-colors" title="Baixar">
                                            <Download size={20} />
                                        </button>

                                        {isAdmin && (
                                            <div className="flex items-center gap-1 border-l border-gray-200 dark:border-stone-700 pl-2 ml-2">
                                                <button
                                                    onClick={() => handleRenameFile(currentFolder.id, file.id)}
                                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFile(currentFolder.id, file.id)}
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
        </div>
    );
};
