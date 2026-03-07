import React, { useState } from 'react';
import { Shield, Lock, Key, RefreshCw, UserPlus, AlertTriangle, Users } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';

export const AccessManagement: React.FC = () => {
    const [resetEmail, setResetEmail] = useState('');

    // New User Form State (Supports Student & Admin)
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'STUDENT', plan: 'Mentoria Completa' });

    // Mock Freeze State
    const [freezeData, setFreezeData] = useState<{ isOpen: boolean, student: string | null }>({ isOpen: false, student: null });

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        const roleLabel = newUser.role === 'PROFESSOR' ? 'Administradora' : 'Aluna';
        alert(`${roleLabel} ${newUser.name} cadastrada com sucesso!`);
        setNewUser({ name: '', email: '', role: 'STUDENT', plan: 'Mentoria Completa' });
    };

    const handleFreeze = () => {
        alert(`Acesso de ${freezeData.student} congelado temporariamente.`);
        setFreezeData({ isOpen: false, student: null });
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">

            {/* Centralized Registration (Admin & Student) */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-stone-700 bg-secondary/5 dark:bg-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary dark:bg-primary rounded-lg text-white dark:text-stone-900">
                            <UserPlus size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">Cadastrar Novo Usuário</h3>
                            <p className="text-xs text-gray-500 font-medium">Crie o acesso para uma nova aluna ou administradora</p>
                        </div>
                    </div>
                </div>
                <div className="p-8">
                    <form onSubmit={handleRegister} className="grid md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome Completo</label>
                            <input
                                type="text"
                                value={newUser.name}
                                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                required
                                className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors"
                                placeholder="Ex: Ana Luiza Silva"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">E-mail de Acesso</label>
                            <input
                                type="email"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                required
                                className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors"
                                placeholder="email@exemplo.com"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Perfil de Acesso</label>
                            <div className="flex bg-surface dark:bg-dark-surface rounded-xl p-1 border border-gray-200 dark:border-stone-600">
                                <button
                                    type="button"
                                    onClick={() => setNewUser({ ...newUser, role: 'STUDENT' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newUser.role === 'STUDENT' ? 'bg-white dark:bg-stone-700 shadow-sm text-secondary dark:text-primary' : 'text-gray-500'}`}
                                >
                                    Aluna
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewUser({ ...newUser, role: 'PROFESSOR' })}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newUser.role === 'PROFESSOR' ? 'bg-white dark:bg-stone-700 shadow-sm text-secondary dark:text-primary' : 'text-gray-500'}`}
                                >
                                    Professora
                                </button>
                            </div>
                        </div>

                        {newUser.role === 'STUDENT' && (
                            <div className="animate-fade-in">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Plano Inicial</label>
                                <select
                                    value={newUser.plan}
                                    onChange={e => setNewUser({ ...newUser, plan: e.target.value })}
                                    className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors text-gray-700 dark:text-gray-300"
                                >
                                    <option>Mentoria Completa</option>
                                    <option>Plano Básico</option>
                                    <option>Apenas Conteúdos</option>
                                </select>
                            </div>
                        )}

                        {newUser.role === 'PROFESSOR' && (
                            <div className="animate-fade-in flex items-center p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                                <Shield size={16} className="text-amber-600 dark:text-amber-500 mr-2" />
                                <p className="text-xs text-amber-800 dark:text-amber-200">
                                    <strong>Atenção:</strong> Este perfil terá acesso total ao painel administrativo.
                                </p>
                            </div>
                        )}

                        <div className="md:col-span-2 pt-4 flex justify-end">
                            <button type="submit" className="px-8 py-3 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-xl font-bold hover:brightness-110 shadow-md transition-all">
                                {newUser.role === 'PROFESSOR' ? 'Cadastrar Administradora' : 'Cadastrar Aluna'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Access Controls Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Change Password Card */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-gray-100 dark:bg-stone-800 rounded-lg text-gray-600 dark:text-gray-300">
                            <Lock size={20} />
                        </div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Reset de Senha</h3>
                    </div>
                    <form className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">E-mail do Usuário</label>
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={e => setResetEmail(e.target.value)}
                                placeholder="ex: usuario@email.com"
                                className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors"
                            />
                        </div>
                        <button type="button" className="w-full py-3 bg-gray-800 dark:bg-stone-700 text-white rounded-xl font-bold hover:bg-black dark:hover:bg-stone-600 transition-colors flex items-center justify-center gap-2">
                            <Key size={18} /> Enviar Link de Redefinição
                        </button>
                    </form>
                </div>

                {/* Freeze Access Card */}
                <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">Congelar Acesso</h3>
                            <p className="text-[10px] text-gray-400 uppercase">Bloqueio Temporário</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Selecione o Usuário</label>
                            <select
                                className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors text-gray-600 dark:text-gray-300"
                                onChange={(e) => { if (e.target.value) setFreezeData({ isOpen: true, student: e.target.value }) }}
                            >
                                <option value="">Selecione...</option>
                                <option value="Ana Luiza">Ana Luiza (Aluna)</option>
                                <option value="Carlos Eduardo">Carlos Eduardo (Aluno)</option>
                                <option value="Prof. Convidada">Prof. Convidada (Admin)</option>
                            </select>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-xs text-blue-700 dark:text-blue-300 leading-relaxed border border-blue-100 dark:border-blue-900/30">
                            O congelamento impede o login e interações, mas <strong>mantém todos os dados</strong> salvos.
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={freezeData.isOpen}
                title={`Congelar acesso de ${freezeData.student}?`}
                message="O usuário perderá acesso imediato à plataforma, mas seus dados serão preservados. Você pode reativar a qualquer momento."
                confirmText="Confirmar Congelamento"
                cancelText="Cancelar"
                onConfirm={handleFreeze}
                onCancel={() => setFreezeData({ isOpen: false, student: null })}
            />
        </div>
    );
};
