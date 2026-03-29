import React, { useState } from 'react';
import { X, Upload, FileText, Check, AlertCircle } from 'lucide-react';

interface UploadProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string, file: File }) => Promise<void>;
}

export const UploadProjectModal: React.FC<UploadProjectModalProps> = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setError('');
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            setError('Defina um título para a versão do projeto.');
            return;
        }
        if (!file) {
            setError('Selecione um arquivo (PDF ou DOCX) para enviar.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await onSave({ title, file });
            setTitle('');
            setFile(null);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar projeto.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-dark-card w-full max-w-md p-6 rounded-2xl shadow-level-2 border border-gray-100 dark:border-stone-700">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-xl font-bold text-secondary dark:text-primary">Enviar Nova Versão</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center text-sm">
                        <AlertCircle size={16} className="mr-2 shrink-0" />
                        <span className="flex-1">{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Título/Identificação</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-surface dark:bg-stone-800 border-none rounded-xl p-3 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-secondary/50 outline-none"
                            placeholder="Ex: Versão 1.0, Revisão Final"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Arquivo do Projeto</label>
                        <div className="relative">
                            <input
                                type="file"
                                id="project-upload"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={isLoading}
                            />
                            <label
                                htmlFor="project-upload"
                                className={`w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                                    file ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'border-gray-200 dark:border-stone-700 hover:border-secondary hover:text-secondary text-gray-400'
                                }`}
                            >
                                {file ? (
                                    <>
                                        <Check size={20} />
                                        <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={20} />
                                        <span className="text-sm font-medium">Selecionar Arquivo PDF/DOCX</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-stone-800 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading || !file || !title}
                            className="flex-1 py-3 text-white bg-secondary dark:bg-primary dark:text-stone-900 rounded-xl font-bold hover:bg-[#6b5d52] transition-colors flex justify-center items-center disabled:opacity-50"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-t-white dark:border-t-stone-900 border-white/30 dark:border-stone-900/30 rounded-full animate-spin"></div> : 'Enviar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface FeedbackModalProps {
    isOpen: boolean;
    initialStatus: 'ENVIADO' | 'EM_ANALISE' | 'REVISADO' | 'APROVADO';
    initialFeedback: string | null;
    onClose: () => void;
    onSave: (data: { status: 'ENVIADO' | 'EM_ANALISE' | 'REVISADO' | 'APROVADO', feedback: string, feedbackFile: File | null }) => Promise<void>;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, initialStatus, initialFeedback, onClose, onSave }) => {
    const [status, setStatus] = useState<'ENVIADO' | 'EM_ANALISE' | 'REVISADO' | 'APROVADO'>(initialStatus);
    const [feedback, setFeedback] = useState(initialFeedback || '');
    const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            // Default to 'REVISADO' if the current status is purely 'ENVIADO' or 'EM_ANALISE'
            // This ensures it moves out of the 'Pending' dashboard count automatically
            if (initialStatus === 'ENVIADO' || initialStatus === 'EM_ANALISE') {
                setStatus('REVISADO');
            } else {
                setStatus(initialStatus);
            }
            setFeedback(initialFeedback || '');
            setFeedbackFile(null);
            setError('');
        }
    }, [isOpen, initialStatus, initialFeedback]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFeedbackFile(e.target.files[0]);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        try {
            await onSave({ status, feedback, feedbackFile });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar feedback.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-dark-card w-full max-w-lg p-6 rounded-2xl shadow-level-2 border border-gray-100 dark:border-stone-700">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-stone-700 pb-4">
                    <h3 className="font-serif text-xl font-bold text-secondary dark:text-primary">Avaliar & Devolver Projeto</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg flex items-center text-sm">
                        <AlertCircle size={16} className="mr-2 shrink-0" />
                        <span className="flex-1">{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Status Atual da Versão</label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full bg-surface dark:bg-stone-800 border-none rounded-xl p-3 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-secondary/50 outline-none appearance-none font-bold"
                            disabled={isLoading}
                        >
                            <option value="ENVIADO">Enviado (Aguardando)</option>
                            <option value="EM_ANALISE">Em Análise</option>
                            <option value="REVISADO">Revisado (Fazer Ajustes)</option>
                            <option value="APROVADO">Aprovado</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Parecer da Professora (Texto)</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="w-full bg-surface dark:bg-stone-800 border-none rounded-xl p-3 text-sm text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-secondary/50 outline-none resize-none"
                            rows={4}
                            placeholder="Escreva suas considerações, o que deve ser melhorado etc."
                            disabled={isLoading}
                        ></textarea>
                    </div>

                    <div>
                        <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">Devolutiva em Arquivo (Opcional)</label>
                        <div className="relative">
                            <input
                                type="file"
                                id="feedback-upload"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                className="hidden"
                                disabled={isLoading}
                            />
                            <label
                                htmlFor="feedback-upload"
                                className={`w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                                    feedbackFile ? 'border-secondary bg-secondary/5 text-secondary' : 'border-gray-200 dark:border-stone-700 hover:border-secondary hover:text-secondary text-gray-400'
                                }`}
                            >
                                {feedbackFile ? (
                                    <>
                                        <Check size={18} />
                                        <span className="text-sm font-medium truncate max-w-[200px]">{feedbackFile.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <FileText size={18} />
                                        <span className="text-sm font-medium">Anexar PDF/DOC Corrigido</span>
                                    </>
                                )}
                            </label>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Se anexado, o arquivo substituirá o anexo de feedback anterior desta versão, se houver.</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-stone-800 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-stone-700 transition-colors"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex-1 py-3 text-white bg-secondary dark:bg-primary dark:text-stone-900 rounded-xl font-bold hover:bg-[#6b5d52] transition-colors flex justify-center items-center disabled:opacity-50"
                        >
                            {isLoading ? <div className="w-5 h-5 border-2 border-t-white dark:border-t-stone-900 border-white/30 dark:border-stone-900/30 rounded-full animate-spin"></div> : 'Salvar Devolutiva'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
