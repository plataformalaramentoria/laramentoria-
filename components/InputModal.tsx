import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface InputModalProps {
    isOpen: boolean;
    title: string;
    initialValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

export const InputModal: React.FC<InputModalProps> = ({
    isOpen,
    title,
    initialValue = '',
    placeholder = '',
    confirmText = 'Salvar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
}) => {
    const [value, setValue] = useState(initialValue);

    // Reset value when modal opens/closes or initialValue changes
    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
        }
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            onConfirm(value);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-premium-border dark:border-stone-700 animate-slide-up">
                <div className="p-6 border-b border-gray-100 dark:border-stone-700 flex justify-between items-center">
                    <h3 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <input
                        autoFocus
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        className="w-full p-4 rounded-xl bg-surface dark:bg-dark-surface border border-transparent focus:border-secondary dark:focus:border-primary outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 transition-all font-medium"
                    />

                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-stone-800 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            type="submit"
                            disabled={!value.trim()}
                            className="px-6 py-3 rounded-xl font-bold bg-secondary dark:bg-primary text-white dark:text-stone-900 shadow-lg shadow-secondary/20 hover:bg-[#6b5d52] dark:hover:bg-[#bda895] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {confirmText}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
