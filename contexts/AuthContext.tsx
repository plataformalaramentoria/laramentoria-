
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Role, StudentAccessType } from '../types';


interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: Role | null;
    accessType: StudentAccessType | null;
    isActive: boolean;
    forcePasswordChange: boolean;
    fullName: string | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    refreshProfileSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);

    // Cache local para carregamento instantâneo no F5 (apenas UX — não é fonte da verdade)
    const [role, setRole] = useState<Role | null>(() => {
        return (localStorage.getItem('lara_role') as Role) || null;
    });
    const [accessType, setAccessType] = useState<StudentAccessType | null>(() => {
        return (localStorage.getItem('lara_access_type') as StudentAccessType) || null;
    });
    const [isActive, setIsActive] = useState<boolean>(true);
    const [forcePasswordChange, setForcePasswordChange] = useState<boolean>(() => {
        return localStorage.getItem('lara_force_pwd') === 'true';
    });
    const [fullName, setFullName] = useState<string | null>(() => {
        return localStorage.getItem('lara_full_name') || null;
    });
    const [loading, setLoading] = useState<boolean>(() => {
        return !localStorage.getItem('lara_role');
    });

    const loadingRef = useRef(loading);
    loadingRef.current = loading;

    const clearLocalCache = () => {
        localStorage.removeItem('lara_role');
        localStorage.removeItem('lara_force_pwd');
        localStorage.removeItem('lara_access_type');
        localStorage.removeItem('lara_full_name');
    };

    const resolveProfile = async (userId: string, email: string | undefined, mounted: { current: boolean }): Promise<void> => {
        // Usuários: buscar perfil no banco de dados
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, access_type, is_active, force_password_change, full_name')
                .eq('id', userId)
                .single();

            if (!mounted.current) return;

            if (error || !data) {
                console.error('Error fetching profile:', error);
                setRole('STUDENT');
                setAccessType('FULL');
                setIsActive(true);
                setForcePasswordChange(false);
                localStorage.setItem('lara_role', 'STUDENT');
                localStorage.setItem('lara_access_type', 'FULL');
                localStorage.setItem('lara_force_pwd', 'false');
            } else {
                // Usuário inativo: forçar logout
                if (data.is_active === false) {
                    console.warn('User is inactive, signing out.');
                    await supabase.auth.signOut();
                    clearLocalCache();
                    setSession(null);
                    setUser(null);
                    setRole(null);
                    setAccessType(null);
                    setIsActive(false);
                    setForcePasswordChange(false);
                    setLoading(false);
                    return;
                }

                const fetchedRole = data.role as Role;
                const fetchedAccessType = (data.access_type as StudentAccessType) || 'FULL';
                const fetchedForcePwd = Boolean(data.force_password_change);
                const fetchedName = data.full_name || null;
                
                setRole(fetchedRole);
                setAccessType(fetchedAccessType);
                setIsActive(true);
                setForcePasswordChange(fetchedForcePwd);
                setFullName(fetchedName);

                localStorage.setItem('lara_role', fetchedRole);
                localStorage.setItem('lara_access_type', fetchedAccessType);
                localStorage.setItem('lara_force_pwd', String(fetchedForcePwd));
                if (fetchedName) localStorage.setItem('lara_full_name', fetchedName);
                else localStorage.removeItem('lara_full_name');
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            if (mounted.current) {
                setRole('STUDENT');
                setAccessType('FULL');
                setIsActive(true);
            }
        } finally {
            if (mounted.current) setLoading(false);
        }
    };

    const profileResolvedRef = useRef<string | null>(null);

    useEffect(() => {
        const mountedRef = { current: true };

        // Fallback de segurança: nunca travar a tela por mais de 6 segundos
        const authTimeout = setTimeout(() => {
            if (mountedRef.current && loadingRef.current) {
                console.warn('Auth timeout reached, forcing load completion');
                setLoading(false);
            }
        }, 6000);

        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) console.error('Error restoring session:', error);

                if (!mountedRef.current) return;

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);
                    // O perfil será resolvido pelo useEffect secundário ao detectar o User
                } else {
                    setSession(null);
                    setUser(null);
                    setRole(null);
                    setAccessType(null);
                    setIsActive(true);
                    setForcePasswordChange(false);
                    clearLocalCache();
                    setLoading(false);
                }
            } catch (err) {
                console.error('Critical error in initAuth:', err);
                if (mountedRef.current) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
            if (!mountedRef.current) return;

            if (currentSession?.user) {
                // Se o usuário mudou, limpamos o ref para forçar nova resolução
                if (profileResolvedRef.current !== currentSession.user.id) {
                    profileResolvedRef.current = null;
                }
                setSession(currentSession);
                setUser(currentSession.user);
            } else {
                profileResolvedRef.current = null;
                setSession(null);
                setUser(null);
                setRole(null);
                setAccessType(null);
                setIsActive(true);
                setForcePasswordChange(false);
                clearLocalCache();
                setLoading(false);
            }
        });

        return () => {
            mountedRef.current = false;
            clearTimeout(authTimeout);
            subscription.unsubscribe();
        };
    }, []);

    // Resolutor de Perfil Reativo: Evita Deadlock no Supabase
    useEffect(() => {
        const mountedRef = { current: true };
        
        if (user && profileResolvedRef.current !== user.id) {
            profileResolvedRef.current = user.id;
            resolveProfile(user.id, user.email, mountedRef);
        }

        return () => { mountedRef.current = false; };
    }, [user]);

    const refreshProfileSession = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role, access_type, is_active, force_password_change, full_name')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setRole(data.role as Role);
                setAccessType((data.access_type as StudentAccessType) || 'FULL');
                setIsActive(Boolean(data.is_active));
                setForcePasswordChange(Boolean(data.force_password_change));
                setFullName(data.full_name || null);
                
                localStorage.setItem('lara_role', data.role);
                localStorage.setItem('lara_access_type', data.access_type || 'FULL');
                localStorage.setItem('lara_force_pwd', String(data.force_password_change));
                if (data.full_name) localStorage.setItem('lara_full_name', data.full_name);
            }
        } catch (err) {
            console.error('Error refreshing profile:', err);
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            localStorage.removeItem('lara_current_view');
            clearLocalCache();
            setSession(null);
            setUser(null);
            setRole(null);
            setAccessType(null);
            setIsActive(true);
            setForcePasswordChange(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            session, user, role, accessType, isActive, fullName,
            forcePasswordChange, loading, signIn, signOut, refreshProfileSession
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
