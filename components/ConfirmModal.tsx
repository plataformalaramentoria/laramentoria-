import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
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
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-surface hover:bg-gray-100 dark:bg-stone-800 dark:hover:bg-stone-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]
                            ${variant === 'danger'
                                ? 'bg-[#c94f4f] hover:bg-[#b04040] shadow-red-500/20'
                                : 'bg-secondary hover:bg-[#6b5d52] shadow-secondary/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
