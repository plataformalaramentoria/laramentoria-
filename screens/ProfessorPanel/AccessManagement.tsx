import React, { useState, useEffect } from 'react';
import {
    Shield, Lock, UserPlus, Users, MonitorPlay, Check,
    Edit2, ToggleLeft, ToggleRight, AlertCircle, RefreshCw, X, Save
} from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { supabaseAdmin } from '../../services/supabaseAdminClient';
import { useAuth } from '../../contexts/AuthContext';
import { UserProfile, StudentAccessType, Role } from '../../types';

// ──────────────────────────────────────────────
// Sub-component: Edit User Modal
// ──────────────────────────────────────────────
interface EditUserModalProps {
    user: UserProfile;
    courses: { id: string; title: string }[];
    onClose: () => void;
    onSaved: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, courses, onClose, onSaved }) => {
    const [form, setForm] = useState({
        full_name: user.full_name,
        role: user.role as Role,
        access_type: (user.access_type || 'FULL') as StudentAccessType,
        is_active: user.is_active,
    });
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingCourses, setIsFetchingCourses] = useState(false);

    useEffect(() => {
        const fetchAccess = async () => {
            setIsFetchingCourses(true);
            try {
                const { data } = await supabase.from('student_course_access').select('course_id').eq('student_id', user.id);
                if (data) setSelectedCourseIds(data.map(a => a.course_id));
            } finally {
                setIsFetchingCourses(false);
            }
        };
        if (user.role === 'STUDENT') fetchAccess();
    }, [user.id, user.role]);

    const toggleCourseId = (courseId: string) => {
        setSelectedCourseIds(prev =>
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Update profile via admin client
            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    full_name: form.full_name,
                    role: form.role,
                    access_type: form.role === 'STUDENT' ? form.access_type : 'FULL',
                    is_active: form.is_active,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // 2. Update course access via admin client
            if (form.role === 'STUDENT') {
                // Clear existing
                await supabaseAdmin.from('student_course_access').delete().eq('student_id', user.id);
                
                // Add new if restricted
                if (form.access_type === 'RESTRICTED' && selectedCourseIds.length > 0) {
                    const accessRows = selectedCourseIds.map(courseId => ({
                        student_id: user.id,
                        course_id: courseId,
                    }));
                    const { error: accessError } = await supabaseAdmin.from('student_course_access').insert(accessRows);
                    if (accessError) throw accessError;
                }
            }

            onSaved();
            onClose();
        } catch (err: any) {
            console.error('Error updating user:', err);
            alert('Erro ao salvar alterações: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-stone-700 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Editar Usuário</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-full transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome Completo</label>
                        <input
                            type="text"
                            value={form.full_name}
                            onChange={e => setForm({ ...form, full_name: e.target.value })}
                            className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors text-sm dark:text-gray-200"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Perfil de Acesso</label>
                        <div className="flex bg-surface dark:bg-dark-surface rounded-xl p-1 border border-gray-200 dark:border-stone-600">
                            {(['STUDENT', 'PROFESSOR', 'ADMIN'] as Role[]).map(r => (
                                <button
                                    key={r}
                                    type="button"
                                    onClick={() => setForm({ ...form, role: r })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${form.role === r ? 'bg-white dark:bg-stone-700 shadow-sm text-secondary dark:text-primary' : 'text-gray-400'}`}
                                >
                                    {r === 'STUDENT' ? 'Aluno' : r === 'PROFESSOR' ? 'Professor' : 'Admin'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.role === 'STUDENT' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Tipo de Acesso a Cursos</label>
                            <div className="flex bg-surface dark:bg-dark-surface rounded-xl p-1 border border-gray-200 dark:border-stone-600">
                                {(['FULL', 'RESTRICTED'] as StudentAccessType[]).map(at => (
                                    <button
                                        key={at}
                                        type="button"
                                        onClick={() => setForm({ ...form, access_type: at })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${form.access_type === at ? 'bg-white dark:bg-stone-700 shadow-sm text-secondary dark:text-primary' : 'text-gray-400'}`}
                                    >
                                        {at === 'FULL' ? '✅ Acesso Total' : '🔒 Acesso Restrito'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {form.role === 'STUDENT' && form.access_type === 'RESTRICTED' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Cursos Autorizados</label>
                            {isFetchingCourses ? (
                                <div className="py-4 flex justify-center"><div className="w-6 h-6 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div></div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {courses.map(course => {
                                        const active = selectedCourseIds.includes(course.id);
                                        return (
                                            <button
                                                key={course.id}
                                                type="button"
                                                onClick={() => toggleCourseId(course.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left text-sm ${active ? 'bg-secondary/5 border-secondary/30 dark:bg-primary/5 dark:border-primary/30' : 'bg-white dark:bg-dark-card border-gray-100 dark:border-stone-800 opacity-60'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <MonitorPlay size={14} className={active ? 'text-secondary dark:text-primary' : 'text-gray-400'} />
                                                    <span className={`font-medium ${active ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>{course.title}</span>
                                                </div>
                                                {active && <Check size={15} className="text-secondary dark:text-primary" />}
                                            </button>
                                        );
                                    })}
                                    {courses.length === 0 && <p className="text-gray-400 text-xs text-center py-2">Nenhum curso cadastrado.</p>}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Status da Conta</label>
                        <button
                            type="button"
                            onClick={() => setForm({ ...form, is_active: !form.is_active })}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border w-full transition-all ${form.is_active ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'}`}
                        >
                            {form.is_active ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} className="text-red-500" />}
                            <span className={`font-bold text-sm ${form.is_active ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                {form.is_active ? 'Conta Ativa' : 'Conta Desativada'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 dark:border-stone-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-xl transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-xl font-bold hover:brightness-110 shadow-md transition-all disabled:opacity-50 text-sm flex items-center gap-2"
                    >
                        <Save size={15} />
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ──────────────────────────────────────────────
// Main Component: AccessManagement
// ──────────────────────────────────────────────
export const AccessManagement: React.FC = () => {
    const { role } = useAuth();
    const isAdmin = role === 'ADMIN';

    const [isLoading, setIsLoading] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        tempPassword: '',
        role: 'STUDENT' as Role,
        access_type: 'FULL' as StudentAccessType,
    });
    const [selectedCourseIdsForNew, setSelectedCourseIdsForNew] = useState<string[]>([]);

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
    const [isFetchingData, setIsFetchingData] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    // ── GUARD: Only ADMIN can reach this component ──
    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
                    <Lock size={28} className="text-red-400" />
                </div>
                <h3 className="font-bold text-lg text-gray-700 dark:text-gray-300">Acesso Negado</h3>
                <p className="text-gray-400 text-sm mt-2 max-w-xs">
                    Apenas administradores podem criar usuários e gerenciar permissões.
                </p>
            </div>
        );
    }

    const fetchData = async () => {
        setIsFetchingData(true);
        setFetchError(null);
        try {
            const [usersResult, coursesResult] = await Promise.all([
                supabaseAdmin.from('profiles').select('*').order('full_name'),
                supabaseAdmin.from('courses').select('id, title').order('order'),
            ]);

            if (usersResult.error) throw usersResult.error;
            if (coursesResult.error) throw coursesResult.error;

            setUsers((usersResult.data as UserProfile[]) || []);
            setCourses(coursesResult.data || []);
        } catch (err: any) {
            console.error('Error loading admin data:', err);
            setFetchError('Não foi possível carregar os dados. Verifique se as funções SQL foram criadas.');
        } finally {
            setIsFetchingData(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleCourseForNew = (courseId: string) => {
        setSelectedCourseIdsForNew(prev =>
            prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
        );
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newUser.tempPassword.length < 6) {
            alert('A senha provisória deve ter no mínimo 6 caracteres.');
            return;
        }
        if (!newUser.email || !newUser.name) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        setIsLoading(true);
        try {
            // Step 1: Create user via Auth Admin API (uses service_role key)
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: newUser.email,
                password: newUser.tempPassword,
                email_confirm: true,
                user_metadata: { full_name: newUser.name, role: newUser.role },
            });

            if (authError) throw authError;
            if (!authData?.user) throw new Error('Usuário não foi criado.');

            const newUserId = authData.user.id;

            // Step 2: Wait for trigger to create profile (with retry logic)
            let profileExists = false;
            for (let attempt = 0; attempt < 5; attempt++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                const { data: prof } = await supabaseAdmin.from('profiles').select('id').eq('id', newUserId).maybeSingle();
                if (prof) { profileExists = true; break; }
            }

            // Step 3: Upsert profile with correct role
            const profileData = {
                id: newUserId,
                email: newUser.email,
                full_name: newUser.name,
                role: newUser.role,
                access_type: newUser.role === 'STUDENT' ? newUser.access_type : 'FULL',
                force_password_change: true,
                is_active: true,
            };

            const { error: upsertError } = await supabaseAdmin
                .from('profiles')
                .upsert(profileData, { onConflict: 'id' });

            if (upsertError) throw upsertError;

            // Step 4: If student RESTRICTED, set course access
            if (newUser.role === 'STUDENT' && newUser.access_type === 'RESTRICTED' && selectedCourseIdsForNew.length > 0) {
                const accessRows = selectedCourseIdsForNew.map(courseId => ({
                    student_id: newUserId,
                    course_id: courseId,
                }));
                await supabaseAdmin.from('student_course_access').insert(accessRows);
            }

            const roleLabel = newUser.role === 'STUDENT' ? 'Aluno' : newUser.role === 'PROFESSOR' ? 'Professor' : 'Administrador';
            alert(`✅ Acesso para ${newUser.name} criado com sucesso como ${roleLabel}!`);

            setNewUser({ name: '', email: '', tempPassword: '', role: 'STUDENT', access_type: 'FULL' });
            setSelectedCourseIdsForNew([]);
            await fetchData();
        } catch (err: any) {
            console.error('Erro completo:', err);
            alert('Erro ao salvar: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getRoleBadge = (r: Role) => {
        const map: Record<Role, { label: string; cls: string }> = {
            ADMIN: { label: 'Admin', cls: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
            PROFESSOR: { label: 'Professor', cls: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
            STUDENT: { label: 'Aluno', cls: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' },
        };
        const { label, cls } = map[r] || { label: r, cls: 'bg-gray-50 text-gray-500' };
        return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cls}`}>{label}</span>;
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl mx-auto pb-12">

            {/* ─── Registration Form ─── */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-stone-700 bg-secondary/5 dark:bg-primary/5 flex items-center gap-3">
                    <div className="p-2 bg-secondary dark:bg-primary rounded-lg text-white dark:text-stone-900">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">Cadastrar Novo Usuário</h3>
                        <p className="text-xs text-gray-500 font-medium">Crie o acesso para um novo aluno, professor ou administrador</p>
                    </div>
                </div>
                <div className="p-8">
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Nome Completo *</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    required
                                    className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors text-sm dark:text-gray-200"
                                    placeholder="Ex: Ana Luiza Silva"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">E-mail de Acesso *</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    required
                                    className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors text-sm dark:text-gray-200"
                                    placeholder="email@exemplo.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Senha Provisória *</label>
                                <input
                                    type="text"
                                    value={newUser.tempPassword}
                                    onChange={e => setNewUser({ ...newUser, tempPassword: e.target.value })}
                                    required
                                    minLength={6}
                                    className="w-full p-3 bg-surface dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-stone-600 outline-none focus:border-secondary transition-colors text-sm dark:text-gray-200"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        </div>

                        {/* Role selector */}
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Perfil de Acesso</label>
                            <div className="flex bg-surface dark:bg-dark-surface rounded-xl p-1 border border-gray-200 dark:border-stone-600">
                                {(['STUDENT', 'PROFESSOR', 'ADMIN'] as Role[]).map(r => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setNewUser({ ...newUser, role: r })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newUser.role === r ? 'bg-white dark:bg-stone-700 shadow-sm text-secondary dark:text-primary' : 'text-gray-400'}`}
                                    >
                                        {r === 'STUDENT' ? 'Aluno' : r === 'PROFESSOR' ? 'Professor' : 'Admin'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Access type — only for STUDENT */}
                        {newUser.role === 'STUDENT' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Tipo de Acesso a Cursos</label>
                                <div className="flex bg-surface dark:bg-dark-surface rounded-xl p-1 border border-gray-200 dark:border-stone-600">
                                    {(['FULL', 'RESTRICTED'] as StudentAccessType[]).map(at => (
                                        <button
                                            key={at}
                                            type="button"
                                            onClick={() => setNewUser({ ...newUser, access_type: at })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${newUser.access_type === at ? 'bg-white dark:bg-stone-700 shadow-sm text-secondary dark:text-primary' : 'text-gray-400'}`}
                                        >
                                            {at === 'FULL' ? '✅ Acesso Total (todos os cursos)' : '🔒 Acesso Restrito (cursos selecionados)'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Course selector — only for STUDENT RESTRICTED */}
                        {newUser.role === 'STUDENT' && newUser.access_type === 'RESTRICTED' && (
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Cursos Autorizados</label>
                                <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                    {courses.map(course => {
                                        const active = selectedCourseIdsForNew.includes(course.id);
                                        return (
                                            <button
                                                key={course.id}
                                                type="button"
                                                onClick={() => toggleCourseForNew(course.id)}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left text-sm ${active ? 'bg-secondary/5 border-secondary/30 dark:bg-primary/5 dark:border-primary/30' : 'bg-white dark:bg-dark-card border-gray-100 dark:border-stone-800 opacity-60'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <MonitorPlay size={14} className={active ? 'text-secondary dark:text-primary' : 'text-gray-400'} />
                                                    <span className={`font-medium ${active ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>{course.title}</span>
                                                </div>
                                                {active && <Check size={14} className="text-secondary dark:text-primary" />}
                                            </button>
                                        );
                                    })}
                                    {courses.length === 0 && <p className="text-gray-400 text-xs col-span-2 py-2 text-center">Nenhum curso cadastrado ainda.</p>}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex justify-end">
                            <button type="submit" disabled={isLoading} className="px-8 py-3 bg-secondary dark:bg-primary text-white dark:text-stone-900 rounded-xl font-bold hover:brightness-110 shadow-md transition-all disabled:opacity-50 text-sm flex items-center gap-2">
                                <UserPlus size={16} />
                                {isLoading ? 'Criando usuário...' : 'Cadastrar Usuário'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* ─── User List ─── */}
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-premium-border dark:border-stone-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-stone-700 bg-secondary/5 dark:bg-primary/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary dark:bg-primary rounded-lg text-white dark:text-stone-900">
                            <Users size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-gray-100">Usuários Cadastrados</h3>
                            <p className="text-xs text-gray-500 font-medium">{users.length} usuário(s) encontrado(s)</p>
                        </div>
                    </div>
                    <button onClick={fetchData} disabled={isFetchingData} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-secondary dark:hover:text-primary transition-colors px-3 py-2 rounded-xl hover:bg-surface dark:hover:bg-stone-800">
                        <RefreshCw size={14} className={isFetchingData ? 'animate-spin' : ''} />
                        Atualizar
                    </button>
                </div>

                {fetchError && (
                    <div className="m-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
                        <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="font-bold text-red-600 dark:text-red-400 text-sm">Erro ao carregar dados</p>
                            <p className="text-xs text-red-500 dark:text-red-300 mt-1">{fetchError}</p>
                            <p className="text-xs text-red-400 mt-2">Verifique se o script SQL de migração foi executado no Supabase.</p>
                        </div>
                    </div>
                )}

                {isFetchingData && !fetchError && (
                    <div className="py-16 flex justify-center">
                        <div className="w-8 h-8 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
                    </div>
                )}

                {!isFetchingData && !fetchError && (
                    <div className="divide-y divide-gray-50 dark:divide-stone-800">
                        {users.length === 0 && (
                            <p className="text-center text-gray-400 py-12 text-sm">Nenhum usuário encontrado.</p>
                        )}
                        {users.map(u => (
                            <div key={u.id} className="flex items-center justify-between p-5 hover:bg-gray-50/50 dark:hover:bg-stone-800/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-secondary/10 dark:bg-primary/20 rounded-full flex items-center justify-center text-secondary dark:text-primary font-bold text-sm shrink-0">
                                        {(u.full_name || 'U').substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">{u.full_name || 'Sem nome'}</p>
                                            {getRoleBadge(u.role)}
                                            {u.role === 'STUDENT' && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${u.access_type === 'FULL' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'}`}>
                                                    {u.access_type === 'FULL' ? 'Acesso Total' : 'Acesso Restrito'}
                                                </span>
                                            )}
                                            {!u.is_active && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400">
                                                    Inativo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setEditingUser(u)}
                                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-secondary dark:hover:text-primary hover:bg-surface dark:hover:bg-stone-800 rounded-xl transition-colors"
                                >
                                    <Edit2 size={14} />
                                    Editar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    courses={courses}
                    onClose={() => setEditingUser(null)}
                    onSaved={fetchData}
                />
            )}
        </div>
    );
};
