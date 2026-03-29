import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

const ForcePasswordChangeScreen: React.FC = () => {
    const { user, refreshProfileSession } = useAuth();
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword.length < 6) {
            setError("A nova senha deve ter no mínimo 6 caracteres.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("A nova senha e a confirmação não coincidem.");
            return;
        }

        if (!user?.email) {
            setError("Erro interno: E-mail do usuário não encontrado.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Validate the old temporary password by trying to sign in again
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: oldPassword,
            });

            if (signInError) {
                throw new Error("A senha antiga está incorreta.");
            }

            // 2. Update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                throw new Error("Falha ao atualizar a senha: " + updateError.message);
            }

            // 3. Clear the force_password_change flag in profiles
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ force_password_change: false })
                .eq('id', user.id);

            if (profileError) {
                console.error("Erro ao limpar a flag:", profileError);
                // We don't necessarily throw here, the password was changed successfully, 
                // but we need the flag cleared to let them in.
                // It's safer to throw so they know it didn't complete 100%
                throw new Error("Senha alterada, mas falha ao liberar acesso. Contate o suporte.");
            }

            // 4. Refresh the session context to unblock the UI
            await refreshProfileSession();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle,_#FFFFFF_0%,_#F0EEE9_100%)] dark:bg-[radial-gradient(circle_at_center,_#292524_0%,_#0c0a09_100%)] p-6">
            <div className="bg-white dark:bg-dark-card w-full max-w-md p-8 md:p-12 rounded-[24px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] dark:shadow-dark-soft border border-[#E6DCCA] dark:border-stone-700 relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/30">
                        <Lock className="text-red-500 dark:text-red-400" size={28} />
                    </div>
                    <h2 className="text-2xl font-serif text-secondary dark:text-primary mb-2 font-medium">Atualização Obrigatória</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Para garantir a segurança da sua conta, você precisa alterar sua senha provisória antes de acessar a plataforma.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Senha Provisória (Antiga)</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            className="w-full h-[50px] px-4 bg-white dark:bg-dark-surface rounded-lg border border-gray-300 dark:border-stone-600 focus:border-red-400 focus:outline-none transition-all text-gray-700 dark:text-gray-200"
                            placeholder="Sua senha atual"
                            required
                        />
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-stone-800">
                        <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Nova Senha</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full h-[50px] px-4 bg-white dark:bg-dark-surface rounded-lg border border-gray-300 dark:border-stone-600 focus:border-secondary dark:focus:border-primary focus:outline-none transition-all text-gray-700 dark:text-gray-200 mb-4"
                            placeholder="No mínimo 6 caracteres"
                            minLength={6}
                            required
                        />

                        <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-2">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-[50px] px-4 bg-white dark:bg-dark-surface rounded-lg border border-gray-300 dark:border-stone-600 focus:border-secondary dark:focus:border-primary focus:outline-none transition-all text-gray-700 dark:text-gray-200"
                            placeholder="Repita a nova senha"
                            minLength={6}
                            required
                        />
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-100 dark:border-red-900/30">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !oldPassword || !newPassword || !confirmPassword}
                        className="group w-full bg-secondary dark:bg-secondary/90 text-white font-medium h-[50px] rounded-xl hover:bg-[#6b5d52] dark:hover:bg-[#5c5148] transition-all duration-300 shadow-lg shadow-secondary/20 flex items-center justify-center uppercase tracking-[0.15em] text-xs disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                        {isLoading ? (
                            <span>Atualizando...</span>
                        ) : (
                            <>
                                <CheckCircle2 size={16} className="mr-2 opacity-70" />
                                <span>Salvar & Acessar</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordChangeScreen;
