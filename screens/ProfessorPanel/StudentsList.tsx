import React, { useState } from 'react';
import { Search, MoreVertical, Plus, User, Trash2, Edit2, ExternalLink, Snowflake } from 'lucide-react';
import { ConfirmModal } from '../../components/ConfirmModal';

export const StudentsList: React.FC = () => {
    const [students, setStudents] = useState([
        { id: '1', name: 'Ana Luiza', email: 'ana.luiza@email.com', plan: 'Mentoria Completa', status: 'Ativo' },
        { id: '2', name: 'Carlos Eduardo', email: 'carlos@email.com', plan: 'Básico', status: 'Ativo' },
        { id: '3', name: 'Mariana Silva', email: 'mariana@email.com', plan: 'Mentoria Completa', status: 'Congelado' },
    ]);

    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });
    const [freezeModal, setFreezeModal] = useState<{ isOpen: boolean, id: string | null }>({ isOpen: false, id: null });

    const handleDelete = () => {
        if (confirmModal.id) {
            setStudents(students.filter(s => s.id !== confirmModal.id));
        }
        setConfirmModal({ isOpen: false, id: null });
    };

    const handleToggleFreeze = () => {
        if (freezeModal.id) {
            setStudents(students.map(s => {
                if (s.id === freezeModal.id) {
                    return { ...s, status: s.status === 'Congelado' ? 'Ativo' : 'Congelado' };
                }
                return s;
            }));
        }
        setFreezeModal({ isOpen: false, id: null });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filter Bar - Reduced top clutter */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar aluno..."
                        className="w-full bg-white dark:bg-dark-card pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-secondary/20 transition-all font-medium text-gray-700 dark:text-gray-200"
                    />
                </div>
                {/* Create Button Removed - Centralized in Access Tab */}
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-surface dark:bg-dark-surface text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold border-b border-gray-100 dark:border-stone-700">
                            <th className="p-4 pl-6">Aluno</th>
                            <th className="p-4">Plano</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right pr-6">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-stone-800">
                        {students.map(student => (
                            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-stone-800/50 transition-colors group">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-secondary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-secondary dark:text-primary font-bold">
                                            {student.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-gray-100">{student.name}</p>
                                            <p className="text-xs text-gray-500">{student.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{student.plan}</td>
                                <td className="p-4">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase flex w-fit items-center gap-1
                            ${student.status === 'Ativo' ? 'bg-green-100/50 text-green-600 dark:bg-green-900/20' :
                                            student.status === 'Congelado' ? 'bg-blue-100/50 text-blue-600 dark:bg-blue-900/20' :
                                                'bg-red-100/50 text-red-600 dark:bg-red-900/20'}`}>
                                        {student.status === 'Congelado' && <Snowflake size={10} />}
                                        {student.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right pr-6">
                                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-gray-400 hover:text-secondary dark:hover:text-primary transition-colors hover:bg-surface dark:hover:bg-stone-800 rounded-lg" title="Acessar Dashboard">
                                            <ExternalLink size={18} />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-blue-500 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Editar">
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => setFreezeModal({ isOpen: true, id: student.id })}
                                            className={`p-2 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg ${student.status === 'Congelado' ? 'text-blue-500' : 'text-gray-400 hover:text-blue-500'}`}
                                            title={student.status === 'Congelado' ? 'Descongelar' : 'Congelar'}
                                        >
                                            <Snowflake size={18} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmModal({ isOpen: true, id: student.id })}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title="Excluir Aluno?"
                message="Tem certeza que deseja remover este aluno? Todo o histórico e progresso serão perdidos permanentemente."
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={handleDelete}
                onCancel={() => setConfirmModal({ isOpen: false, id: null })}
            />

            <ConfirmModal
                isOpen={freezeModal.isOpen}
                title={students.find(s => s.id === freezeModal.id)?.status === 'Congelado' ? 'Reativar Aluno?' : 'Congelar Aluno?'}
                message={students.find(s => s.id === freezeModal.id)?.status === 'Congelado'
                    ? "O aluno voltará a ter acesso imediato à plataforma e seus dados."
                    : "O acesso será bloqueado temporariamente. Nenhum dado será perdido."}
                confirmText={students.find(s => s.id === freezeModal.id)?.status === 'Congelado' ? 'Reativar' : 'Congelar'}
                cancelText="Cancelar"
                onConfirm={handleToggleFreeze}
                onCancel={() => setFreezeModal({ isOpen: false, id: null })}
            />
        </div>
    );
};
