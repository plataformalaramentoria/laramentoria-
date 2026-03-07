import React, { useState, useMemo } from 'react';
import {
    CheckCircle,
    Circle,
    Lock,
    ChevronRight,
    X,
    FileText,
    AlertCircle,
    Pencil,
    Plus,
    Trash2,
    Save
} from 'lucide-react';

// --- Types ---
type StepStatus = 'LOCKED' | 'WAITING' | 'IN_PROGRESS' | 'DONE';

interface SubTask {
    id: string;
    title: string;
    completed: boolean;
}

interface JourneyStep {
    id: string;
    title: string;
    description: string;
    status: StepStatus;
    subTasks: SubTask[];
}

// --- Mock Data Initial State ---
const INITIAL_STEPS: JourneyStep[] = [
    {
        id: '1',
        title: 'Documentação Inicial',
        description: 'Envio de documentos pessoais e matrícula.',
        status: 'DONE',
        subTasks: [
            { id: '1-1', title: 'Upload do RG/CPF', completed: true },
            { id: '1-2', title: 'Comprovante de Residência', completed: true },
            { id: '1-3', title: 'Assinatura do Termo', completed: true },
        ]
    },
    {
        id: '2',
        title: 'Curriculum Lattes',
        description: 'Atualização e revisão do currículo na plataforma.',
        status: 'IN_PROGRESS',
        subTasks: [
            { id: '2-1', title: 'Atualizar Dados Pessoais', completed: true },
            { id: '2-2', title: 'Inserir Formação Acadêmica', completed: true },
            { id: '2-3', title: 'Registrar Produção Bibliográfica', completed: false },
            { id: '2-4', title: 'Revisão Final', completed: false },
        ]
    },
    {
        id: '3',
        title: 'Projeto de Pesquisa',
        description: 'Elaboração da primeira versão do projeto.',
        status: 'WAITING',
        subTasks: [
            { id: '3-1', title: 'Definição do Tema', completed: false },
            { id: '3-2', title: 'Escrita da Introdução', completed: false },
            { id: '3-3', title: 'Metodologia', completed: false },
            { id: '3-4', title: 'Referências Bibliográficas', completed: false },
        ]
    },
    {
        id: '4',
        title: 'Prova de Proficiência',
        description: 'Exame de língua estrangeira (Inglês/Espanhol).',
        status: 'WAITING',
        subTasks: [
            { id: '4-1', title: 'Inscrição no Exame', completed: false },
            { id: '4-2', title: 'Realizar Simulado 1', completed: false },
            { id: '4-3', title: 'Realizar Prova', completed: false },
        ]
    },
    {
        id: '5',
        title: 'Entrevista',
        description: 'Defesa do projeto perante a banca.',
        status: 'WAITING',
        subTasks: [
            { id: '5-1', title: 'Preparar Apresentação', completed: false },
            { id: '5-2', title: 'Agendar Banca', completed: false },
        ]
    }
];

export const ProgressScreen: React.FC = () => {
    const [steps, setSteps] = useState<JourneyStep[]>(INITIAL_STEPS);
    const [selectedStep, setSelectedStep] = useState<JourneyStep | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // --- Logic: Calculate Global Progress ---
    const progressPercentage = useMemo(() => {
        let totalTasks = 0;
        let completedTasks = 0;

        steps.forEach(step => {
            step.subTasks.forEach(task => {
                totalTasks++;
                if (task.completed) completedTasks++;
            });
        });

        return totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    }, [steps]);

    // --- Logic: Sequential Locking & Status Update ---
    const updateStepStatuses = (currentSteps: JourneyStep[]): JourneyStep[] => {
        let previousStepDone = true; // First step is always unlocked

        return currentSteps.map(step => {
            const allSubTasksDone = step.subTasks.length > 0 && step.subTasks.every(t => t.completed);

            let newStatus: StepStatus = 'LOCKED';

            if (!previousStepDone) {
                newStatus = 'LOCKED';
            } else if (allSubTasksDone) {
                newStatus = 'DONE';
            } else {
                newStatus = 'IN_PROGRESS';
            }

            previousStepDone = (newStatus === 'DONE');
            return { ...step, status: newStatus };
        });
    };

    // --- Handlers: Task Toggling ---
    const handleToggleSubTask = (stepId: string, taskId: string) => {
        if (isEditMode) return; // Disable completing tasks while editing

        const newSteps = steps.map(step => {
            if (step.id !== stepId) return step;
            const newSubTasks = step.subTasks.map(task =>
                task.id === taskId ? { ...task, completed: !task.completed } : task
            );
            return { ...step, subTasks: newSubTasks };
        });

        const processedSteps = updateStepStatuses(newSteps);
        setSteps(processedSteps);

        if (selectedStep && selectedStep.id === stepId) {
            setSelectedStep(processedSteps.find(s => s.id === stepId) || null);
        }
    };

    // --- Handlers: Edit Logic ---
    const handleStepClick = (step: JourneyStep) => {
        // In Edit Mode, we allow opening any step to edit it (except maybe completely locked ones if deemed necessary, but let's allow all for flexibility)
        // Or keep logic: locked steps remain locked.
        if (step.status === 'LOCKED' && !isEditMode) return;
        setSelectedStep(step);
    };

    const handleEditStepTitle = (stepId: string, newTitle: string) => {
        const newSteps = steps.map(s => s.id === stepId ? { ...s, title: newTitle } : s);
        setSteps(newSteps);
    };

    const handleEditSubTaskTitle = (stepId: string, taskId: string, newTitle: string) => {
        const newSteps = steps.map(step => {
            if (step.id !== stepId) return step;
            const newSubTasks = step.subTasks.map(task =>
                task.id === taskId ? { ...task, title: newTitle } : task
            );
            return { ...step, subTasks: newSubTasks };
        });
        setSteps(newSteps);

        // Update modal view
        if (selectedStep && selectedStep.id === stepId) {
            setSelectedStep(newSteps.find(s => s.id === stepId) || null);
        }
    };

    const handleAddSubTask = (stepId: string) => {
        const newSteps = steps.map(step => {
            if (step.id !== stepId) return step;
            const newTask: SubTask = {
                id: `${stepId}-${Date.now()}`,
                title: 'Nova Tarefa',
                completed: false
            };
            return { ...step, subTasks: [...step.subTasks, newTask] };
        });

        // Recalculate because adding an uncompleted task might change status from DONE to IN_PROGRESS
        const processedSteps = updateStepStatuses(newSteps);
        setSteps(processedSteps);

        if (selectedStep && selectedStep.id === stepId) {
            setSelectedStep(processedSteps.find(s => s.id === stepId) || null);
        }
    };

    const handleRemoveSubTask = (stepId: string, taskId: string) => {
        const newSteps = steps.map(step => {
            if (step.id !== stepId) return step;
            return { ...step, subTasks: step.subTasks.filter(t => t.id !== taskId) };
        });

        // Recalculate
        const processedSteps = updateStepStatuses(newSteps);
        setSteps(processedSteps);

        if (selectedStep && selectedStep.id === stepId) {
            setSelectedStep(processedSteps.find(s => s.id === stepId) || null);
        }
    };


    return (
        <div className={`space-y-8 animate-fade-in relative ${isEditMode ? 'ring-4 ring-secondary/10 rounded-3xl p-4 -m-4 transition-all' : ''}`}>
            <header className="pb-6 border-b border-premium-border dark:border-stone-700">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h1 className="text-3xl font-serif text-secondary dark:text-primary font-medium flex items-center gap-3">
                            Sua Jornada
                            {isEditMode && <span className="text-xs bg-secondary text-white px-2 py-1 rounded-full font-sans tracking-wide">MODO EDIÇÃO</span>}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Acompanhe e personalize cada etapa do seu mestrado.</p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl border transition-all
                            ${isEditMode
                                    ? 'bg-secondary text-white border-secondary shadow-lg scale-105'
                                    : 'bg-white dark:bg-dark-card text-gray-600 dark:text-gray-300 border-gray-200 dark:border-stone-700 hover:border-secondary'}
                          `}
                        >
                            {isEditMode ? <CheckCircle size={18} /> : <Pencil size={18} />}
                            <span className="text-sm font-bold uppercase tracking-wider">{isEditMode ? 'Concluir Edição' : 'Editar Jornada'}</span>
                        </button>

                        {!isEditMode && (
                            <div className="text-right">
                                <span className="text-4xl font-bold text-secondary dark:text-primary">{progressPercentage}%</span>
                                <span className="text-xs uppercase tracking-widest text-[#cdbaa6] block font-bold">Concluído</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-surface dark:bg-dark-surface rounded-full h-4 overflow-hidden shadow-inner">
                    <div
                        className={`h-4 rounded-full transition-all duration-1000 ease-out ${isEditMode ? 'bg-gray-300 dark:bg-stone-600' : 'bg-secondary dark:bg-primary'}`}
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </header>

            {/* Timeline Container */}
            <div className="relative pl-8 md:pl-0 max-w-4xl mx-auto">
                <div className="absolute left-8 top-4 bottom-10 w-0.5 bg-gray-200 dark:bg-stone-800 md:left-1/2 md:-ml-[1px]"></div>

                <div className="space-y-12">
                    {steps.map((step, index) => {
                        const isLeft = index % 2 === 0;
                        const isLocked = step.status === 'LOCKED';
                        const isDone = step.status === 'DONE';
                        const isActive = step.status === 'IN_PROGRESS';

                        // In Edit Mode, all cards should be somewhat accessible or clearly editable
                        const canEdit = isEditMode;

                        return (
                            <div
                                key={step.id}
                                className={`relative flex items-center md:justify-between ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                            >
                                {/* Timeline Node (Icon) */}
                                <div className="absolute left-0 w-16 flex justify-center md:static md:w-1/2 md:flex md:justify-center md:items-center order-1 focus:outline-none z-10">
                                    <div
                                        className={`
                       w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-md
                       ${isDone ? 'bg-secondary border-secondary dark:bg-primary dark:border-primary' : ''}
                       ${isActive ? 'bg-white dark:bg-stone-900 border-secondary dark:border-primary scale-110' : ''}
                       ${isLocked ? 'bg-gray-100 dark:bg-stone-800 border-gray-300 dark:border-stone-700' : ''}
                       ${isEditMode ? 'animate-pulse border-dashed' : ''}
                     `}
                                    >
                                        {canEdit ? <Pencil size={14} className="text-gray-500" /> : (
                                            <>
                                                {isDone && <CheckCircle size={18} className="text-white dark:text-stone-900" />}
                                                {isActive && <div className="w-3 h-3 bg-secondary dark:bg-primary rounded-full animate-pulse" />}
                                                {isLocked && <Lock size={14} className="text-gray-400 dark:text-gray-600" />}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Content Card */}
                                <div
                                    onClick={() => handleStepClick(step)}
                                    className={`
                    ml-16 md:ml-0 w-full md:w-[45%] p-6 rounded-2xl border transition-all duration-300 cursor-pointer group relative
                    ${isActive
                                            ? 'bg-white dark:bg-dark-card border-secondary/50 dark:border-primary/50 shadow-card-hover dark:shadow-dark-soft transform md:scale-105'
                                            : ''}
                    ${isDone
                                            ? 'bg-surface/50 dark:bg-dark-surface/30 border-transparent hover:bg-white dark:hover:bg-dark-card'
                                            : ''}
                    ${isLocked && !isEditMode
                                            ? 'bg-gray-50 dark:bg-stone-900/50 border-transparent opacity-60 cursor-not-allowed grayscale'
                                            : ''}
                    ${isEditMode
                                            ? 'border-2 border-dashed border-secondary/30 bg-white dark:bg-dark-card hover:border-secondary'
                                            : ''}
                  `}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="w-full">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 block ${isActive ? 'text-secondary dark:text-primary' : 'text-gray-400'}`}>
                                                Etapa 0{index + 1}
                                            </span>

                                            {isEditMode ? (
                                                <input
                                                    type="text"
                                                    value={step.title}
                                                    onClick={(e) => e.stopPropagation()} // Prevent opening modal just when clicking input
                                                    onChange={(e) => handleEditStepTitle(step.id, e.target.value)}
                                                    className="text-lg font-bold mb-2 bg-transparent border-b border-gray-300 focus:border-secondary outline-none w-full text-gray-800 dark:text-gray-100"
                                                />
                                            ) : (
                                                <h3 className={`text-lg font-bold mb-2 ${isLocked ? 'text-gray-500' : 'text-gray-800 dark:text-gray-100'}`}>
                                                    {step.title}
                                                </h3>
                                            )}

                                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                                {step.description}
                                            </p>
                                        </div>
                                        {!isLocked && !isEditMode && (
                                            <div className="bg-surface dark:bg-stone-800 p-2 rounded-full text-secondary dark:text-gray-400 group-hover:bg-secondary group-hover:text-white dark:group-hover:bg-primary dark:group-hover:text-stone-900 transition-colors">
                                                <ChevronRight size={16} />
                                            </div>
                                        )}
                                        {isEditMode && (
                                            <div className="bg-surface dark:bg-stone-800 p-2 rounded-full text-secondary">
                                                <Pencil size={16} />
                                            </div>
                                        )}
                                    </div>

                                    {!isLocked && !isEditMode && (
                                        <div className="mt-4 flex items-center gap-3">
                                            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-stone-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-secondary dark:bg-primary transition-all duration-500"
                                                    style={{ width: `${(step.subTasks.filter(t => t.completed).length / step.subTasks.length) * 100}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-bold">
                                                {step.subTasks.filter(t => t.completed).length}/{step.subTasks.length}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Drill-down Modal/Drawer */}
            {selectedStep && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedStep(null)}
                    />

                    <div className="relative w-full md:w-[500px] h-full bg-white dark:bg-dark-card shadow-2xl p-8 flex flex-col animate-slide-in-right overflow-y-auto border-l border-premium-border dark:border-stone-700">
                        <button
                            onClick={() => setSelectedStep(null)}
                            className="absolute top-6 right-6 p-2 hover:bg-surface dark:hover:bg-dark-surface rounded-full transition-colors"
                        >
                            <X size={24} className="text-gray-500" />
                        </button>

                        <div className="mt-8 mb-8">
                            <span className="text-xs font-bold uppercase tracking-wider text-secondary dark:text-primary mb-2 block">
                                {isEditMode ? 'Editando Etapa' : 'Detalhes da Etapa'}
                            </span>
                            <h2 className="text-3xl font-serif text-gray-800 dark:text-gray-100 font-medium mb-4">
                                {selectedStep.title}
                            </h2>
                            {isEditMode && (
                                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-center gap-2 mb-4">
                                    <AlertCircle size={14} />
                                    Edições podem alterar o status de progresso das etapas.
                                </div>
                            )}
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {selectedStep.description}
                            </p>
                        </div>

                        {!isEditMode && selectedStep.status === 'DONE' && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4 rounded-xl flex items-start gap-3 mb-8">
                                <CheckCircle size={20} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-green-800 dark:text-green-300 text-sm">Etapa Concluída!</h4>
                                    <p className="text-green-700 dark:text-green-400 text-xs mt-1">
                                        Você pode revisar os itens abaixo, mas não é necessário mais nenhuma ação.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 flex-1">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                    <FileText size={18} /> Checklist
                                </h3>
                                {isEditMode && (
                                    <button
                                        onClick={() => handleAddSubTask(selectedStep.id)}
                                        className="text-xs bg-surface hover:bg-gray-200 dark:bg-stone-800 dark:hover:bg-stone-700 px-3 py-1.5 rounded-lg font-bold text-secondary dark:text-primary flex items-center gap-1 transition-colors"
                                    >
                                        <Plus size={14} /> Adicionar
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {selectedStep.subTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => !isEditMode && handleToggleSubTask(selectedStep.id, task.id)}
                                        className={`
                      flex items-center p-4 rounded-xl border transition-all duration-200 select-none group
                      ${!isEditMode && task.completed
                                                ? 'bg-surface/50 dark:bg-dark-surface/50 border-transparent'
                                                : 'bg-white dark:bg-dark-card border-gray-200 dark:border-stone-700 hover:border-secondary dark:hover:border-primary shadow-sm'}
                      ${!isEditMode ? 'cursor-pointer' : ''}
                    `}
                                    >
                                        {!isEditMode && (
                                            <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center mr-4 transition-colors
                        ${task.completed
                                                    ? 'bg-secondary border-secondary dark:bg-primary dark:border-primary'
                                                    : 'border-gray-300 dark:border-stone-600'}
                      `}>
                                                {task.completed && <CheckCircle size={14} className="text-white dark:text-stone-900" />}
                                            </div>
                                        )}

                                        {isEditMode ? (
                                            <div className="flex-1 flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={task.title}
                                                    onChange={(e) => handleEditSubTaskTitle(selectedStep.id, task.id, e.target.value)}
                                                    className="flex-1 bg-transparent border-b border-gray-200 dark:border-stone-700 focus:border-secondary outline-none text-sm py-1"
                                                />
                                                <button
                                                    onClick={() => handleRemoveSubTask(selectedStep.id, task.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`flex-1 text-sm font-medium ${task.completed ? 'text-gray-500 line-through decoration-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {task.title}
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {selectedStep.subTasks.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 dark:border-stone-700 rounded-xl">
                                        Nenhuma tarefa cadastrada nesta etapa.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-stone-700 text-center">
                            {isEditMode ? (
                                <button
                                    onClick={() => setIsEditMode(false)}
                                    className="w-full bg-secondary text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg hover:bg-[#6b5d52] transition-colors"
                                >
                                    Salvar Alterações
                                </button>
                            ) : (
                                <p className="text-xs text-gray-400">
                                    Complete todos os itens para desbloquear a próxima etapa.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
