
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Role } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: Role | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setRole(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                // Fallback or setup logic
                setRole('STUDENT');
            } else if (data) {
                setRole(data.role as Role);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile', err);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        // --- MOCK AUTHENTICATION BYPASS ---
        if (email === 'jotajoao29@gmail.com' && password === 'gg8754070302') {
            console.log("Using Mock Auth Credentials");
            const mockSession: Session = {
                access_token: 'mock-token',
                refresh_token: 'mock-refresh-token',
                expires_in: 3600,
                token_type: 'bearer',
                user: {
                    id: 'mock-user-id',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: email,
                    app_metadata: { provider: 'email' },
                    user_metadata: {},
                    created_at: new Date().toISOString(),
                }
            };

            setSession(mockSession);
            setUser(mockSession.user);
            setRole('PROFESSOR'); // or STUDENT based on need, User asked for specific access
            setLoading(false);
            return { error: null };
        } else if (email === 'joaovilelaestudos@gmail.com' && password === 'gg8754070302') {
            console.log("Using Mock Auth Credentials (Student)");
            const mockSession: Session = {
                access_token: 'mock-token-student',
                refresh_token: 'mock-refresh-token-student',
                expires_in: 3600,
                token_type: 'bearer',
                user: {
                    id: 'mock-user-id-student',
                    aud: 'authenticated',
                    role: 'authenticated',
                    email: email,
                    app_metadata: { provider: 'email' },
                    user_metadata: {},
                    created_at: new Date().toISOString(),
                }
            };

            setSession(mockSession);
            setUser(mockSession.user);
            setRole('STUDENT');
            setLoading(false);
            return { error: null };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, role, loading, signIn, signOut }}>
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
