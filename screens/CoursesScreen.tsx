import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, PlayCircle, Folder, ExternalLink } from 'lucide-react';

interface Course {
    id: string;
    title: string;
    description: string;
    status: 'Novo' | 'Em Andamento' | 'Concluído';
    externalUrl: string;
}

interface CourseFolder {
    id: string;
    name: string;
    courses: Course[];
}

const MOCK_FOLDERS: CourseFolder[] = [
    {
        id: '1',
        name: 'Redação Acadêmica',
        courses: [
            { id: '101', title: 'Estruturando o Projeto de Pesquisa', description: 'Aprenda os pilares de um projeto sólido.', status: 'Concluído', externalUrl: 'https://example.com/video/1' },
            { id: '102', title: 'Normas ABNT na Prática', description: 'Como formatar seu texto sem dor de cabeça.', status: 'Em Andamento', externalUrl: 'https://example.com/video/2' },
            { id: '103', title: 'Escrita Científica: Coesão e Coerência', description: 'Melhore a fluidez do seu texto acadêmico.', status: 'Novo', externalUrl: 'https://example.com/video/3' },
        ]
    },
    {
        id: '2',
        name: 'Metodologia Científica',
        courses: [
            { id: '201', title: 'Pesquisa Qualitativa vs Quantitativa', description: 'Entenda qual abordagem usar.', status: 'Novo', externalUrl: 'https://example.com/video/4' },
            { id: '202', title: 'Revisão Sistemática de Literatura', description: 'Passo a passo para uma revisão robusta.', status: 'Novo', externalUrl: 'https://example.com/video/5' },
            { id: '203', title: 'Entrevistas e Coleta de Dados', description: 'Técnicas para coleta de dados em campo.', status: 'Novo', externalUrl: 'https://example.com/video/6' },
        ]
    },
    {
        id: '3',
        name: 'Inglês para Mestrado',
        courses: [
            { id: '301', title: 'Reading Comprehension Strategies', description: 'Estratégias de leitura para textos acadêmicos.', status: 'Em Andamento', externalUrl: 'https://example.com/video/7' },
            { id: '302', title: 'Academic Vocabulary Builder', description: 'Expandindo seu vocabulário acadêmico.', status: 'Novo', externalUrl: 'https://example.com/video/8' },
            { id: '303', title: 'Abstract Writing Workshop', description: 'Como escrever um resumo eficaz em inglês.', status: 'Novo', externalUrl: 'https://example.com/video/9' },
        ]
    },
    {
        id: '4',
        name: 'Material Extra',
        courses: [] // Empty folder for validation
    }
];

export const CoursesScreen: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);

    useEffect(() => {
        // Simulate initial loading
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const toggleFolder = (folderId: string) => {
        setExpandedFolderId(prev => prev === folderId ? null : folderId);
    };

    const filteredFolders = MOCK_FOLDERS.map(folder => {
        // Check if folder matches
        const folderMatches = folder.name.toLowerCase().includes(searchQuery.toLowerCase());

        // Check if any course matches
        const matchingCourses = folder.courses.filter(course =>
            course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            course.description.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // If search is active, show matching courses or all if folder matches
        // But for this requirement, let's keep it simple: Filter structure

        if (searchQuery === '') return folder;

        if (folderMatches) return folder; // Return all courses if folder name matches

        if (matchingCourses.length > 0) {
            return { ...folder, courses: matchingCourses };
        }

        return null;
    }).filter((folder): folder is CourseFolder => folder !== null);

    // Auto-expand if searching and matches found
    useEffect(() => {
        if (searchQuery && filteredFolders.length > 0) {
            // Logic could be added here to auto-expand, but simple accordion is fine
            // Let's expanded all if searching for better UX
            setExpandedFolderId(filteredFolders[0].id);
        }
    }, [searchQuery]);


    if (isLoading) {
        return <CoursesSkeleton />;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-premium-border dark:border-stone-700 pb-4">
                <div>
                    <h1 className="text-3xl font-serif text-secondary dark:text-primary font-bold tracking-tight mb-2">
                        Cursos
                    </h1>
                    <p className="text-functional dark:text-gray-400 font-normal text-base">
                        Acesse seus cursos organizados por pastas.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar curso ou pasta..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-stone-700 bg-white dark:bg-dark-card text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all placeholder:text-gray-400"
                    />
                </div>
            </header>

            {/* Content */}
            <div className="space-y-4">
                {filteredFolders.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-dark-card rounded-2xl border border-dashed border-gray-200 dark:border-stone-700">
                        <Folder size={48} className="mx-auto text-gray-300 dark:text-stone-700 mb-4" />
                        <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">Nenhum curso encontrado</h3>
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                            Tente buscar por outro termo.
                        </p>
                    </div>
                ) : (
                    filteredFolders.map((folder) => (
                        <div
                            key={folder.id}
                            className="bg-white dark:bg-dark-card rounded-2xl shadow-elevation-1 dark:shadow-none border border-gray-100 dark:border-stone-700 overflow-hidden transition-all duration-300 hover:shadow-elevation-2"
                        >
                            {/* Folder Header */}
                            <button
                                onClick={() => toggleFolder(folder.id)}
                                className="w-full px-6 py-5 flex items-center justify-between hover:bg-surface-hover dark:hover:bg-dark-surface/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-functional/10 dark:bg-primary/10 p-2.5 rounded-lg text-functional dark:text-primary">
                                        <Folder size={24} />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{folder.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{folder.courses.length} cursos</p>
                                    </div>
                                </div>
                                <div className="text-gray-400 dark:text-gray-500">
                                    {expandedFolderId === folder.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </button>

                            {/* Folder Content (Accordion) */}
                            {expandedFolderId === folder.id && (
                                <div className="px-6 pb-6 animate-fade-in block">
                                    {folder.courses.length === 0 ? (
                                        <div className="py-8 text-center text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-stone-800/30 rounded-xl mt-2 text-sm italic">
                                            Nenhum curso nesta pasta ainda.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                                            {folder.courses.map((course) => (
                                                <div key={course.id} className="group bg-gray-50 dark:bg-stone-800/30 rounded-xl p-5 border border-transparent hover:border-premium-border dark:hover:border-stone-600 transition-all duration-300 relative">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                              ${course.status === 'Novo' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                                course.status === 'Em Andamento' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                                                    'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                            }
                            `}>
                                                            {course.status}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-serif font-bold text-gray-800 dark:text-gray-100 mb-2 group-hover:text-secondary dark:group-hover:text-primary transition-colors">
                                                        {course.title}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2">
                                                        {course.description}
                                                    </p>

                                                    <a
                                                        href={course.externalUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center text-sm font-bold text-functional dark:text-primary hover:text-secondary dark:hover:text-white transition-colors"
                                                    >
                                                        <PlayCircle size={16} className="mr-2" />
                                                        Acessar
                                                        <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// Skeleton Loader
const CoursesSkeleton: React.FC = () => (
    <div className="space-y-8 animate-pulse">
        <div className="flex flex-col md:flex-row justify-between gap-4 pb-4 border-b border-gray-100 dark:border-stone-800">
            <div>
                <div className="h-8 w-48 bg-gray-200 dark:bg-stone-800 rounded mb-2"></div>
                <div className="h-5 w-64 bg-gray-100 dark:bg-stone-800/50 rounded"></div>
            </div>
            <div className="h-11 w-72 bg-gray-100 dark:bg-stone-800 rounded-xl"></div>
        </div>
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-stone-800"></div>
            ))}
        </div>
    </div>
);
