import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Excluir",
    cancelText = "Cancelar",
    variant = 'danger'
}) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState('');

    // Reset state when opening
    React.useEffect(() => {
        if (isOpen) {
            setIsLoading(false);
            setErrorMsg('');
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            await onConfirm();
        } catch (error: any) {
            setErrorMsg(error.message || 'Erro ao confirmar a ação.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-level-3 border border-premium-border dark:border-stone-700 p-8 animate-fade-in transform scale-100">
                <h3 className="font-serif text-2xl font-bold text-gray-800 dark:text-gray-100 mb-3">
                    {title}
                </h3>

                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                    {message}
                </p>

                <div className="flex gap-4">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-surface hover:bg-gray-100 dark:bg-stone-800 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className={`flex-1 flex justify-center items-center py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                            ${variant === 'danger'
                                ? 'bg-[#c94f4f] hover:bg-[#b04040] shadow-red-500/20'
                                : 'bg-secondary hover:bg-[#6b5d52] shadow-secondary/20'
                            }`}
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : confirmText}
                    </button>
                </div>
                {errorMsg && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg text-center animate-fade-in border border-red-100 dark:border-red-900/30">
                        {errorMsg}
                    </div>
                )}
            </div>
        </div>
    );
};
