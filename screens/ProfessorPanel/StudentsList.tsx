import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, User, Shield, Lock, Eye } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { supabaseAdmin } from '../../services/supabaseAdminClient';
import { StudentProfileView } from './StudentProfileView';
import { UserProfile } from '../../types';


export const StudentsList: React.FC = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Master-Detail State
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const fetchStudents = async () => {
            try {
                // Use admin client for guaranteed success in admin panel
                const { data, error } = await supabaseAdmin
                    .from('profiles')
                    .select('*')
                    .eq('role', 'STUDENT')
                    .order('full_name');
                if (error) throw error;

                if (mounted && data) {
                    setStudents(data);
                }
            } catch (err) {
                console.error("Erro ao buscar alunos:", err);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        fetchStudents();
        return () => { mounted = false; };

    }, []);

    // ----------------------------------------------------
    // DETAIL VIEW ROUTING
    // ----------------------------------------------------
    if (selectedStudentId) {
        return <StudentProfileView studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />;
    }

    // ----------------------------------------------------
    // MASTER VIEW
    // ----------------------------------------------------
    const filteredStudents = students.filter(student => 
        (student.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (student.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar estudante por nome ou e-mail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-card pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-stone-700 outline-none focus:ring-2 focus:ring-secondary/20 transition-all font-medium text-gray-700 dark:text-gray-200"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex w-full items-center justify-center py-20 animate-pulse">
                        <User size={32} className="text-gray-300 dark:text-stone-700" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center opacity-60">
                         <div className="w-16 h-16 bg-gray-50 dark:bg-stone-800 rounded-full flex items-center justify-center mb-4 border border-gray-100 dark:border-stone-700">
                             <User size={24} className="text-gray-400 dark:text-gray-500" />
                         </div>
                         <h3 className="font-bold text-gray-600 dark:text-gray-400 text-lg">Nenhum estudante encontrado!</h3>
                         <p className="text-gray-400 text-sm max-w-sm mt-2">
                            Não foi possível encontrar o registro que você estava procurando.
                         </p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface dark:bg-dark-surface text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold border-b border-gray-100 dark:border-stone-700">
                                <th className="p-4 pl-6">Aluno(a) / Perfil</th>
                                <th className="p-4">Cargo / Função</th>
                                <th className="p-4 text-right pr-6">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-stone-800">
                            {filteredStudents.map(student => (
                                <tr 
                                    key={student.id} 
                                    onClick={() => setSelectedStudentId(student.id)}
                                    className="hover:bg-gray-50 dark:hover:bg-stone-800/50 cursor-pointer transition-colors group"
                                >
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-secondary/10 dark:bg-primary/20 rounded-full flex shrink-0 items-center justify-center text-secondary dark:text-primary font-bold">
                                                {(student.full_name || 'Aluno').substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 dark:text-gray-100">{student.full_name || 'Sem nome'}</p>
                                                <p className="text-xs text-gray-400">{student.email || 'Email não cadastrado'}</p>
                                                {!student.is_active && (
                                                    <span className="text-[10px] font-bold text-red-500 uppercase">Conta Inativa</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    ALUNO/A
                                                </span>
                                                {student.access_type === 'RESTRICTED' ? (
                                                    <span className="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                        <Lock size={10} /> Restrito
                                                    </span>
                                                ) : (
                                                    <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                                        <Shield size={10} /> Full
                                                    </span>
                                                )}
                                            </div>
                                            {student.current_goal && (
                                                <span className="text-[10px] text-gray-400 italic">Objetivo: {student.current_goal}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-3 text-gray-400">
                                            <span className="text-[10px] font-bold uppercase group-hover:text-secondary dark:group-hover:text-primary transition-colors">Gerenciar</span>
                                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
