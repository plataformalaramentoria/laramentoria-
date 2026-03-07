
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
        let mounted = true;

        const initAuth = async () => {
            try {
                // 1. Check for mock session first so it survives F5
                const storedMockStr = localStorage.getItem('lara_mock_session');
                if (storedMockStr) {
                    try {
                        const storedMock = JSON.parse(storedMockStr);
                        if (mounted) {
                            setSession(storedMock);
                            setUser(storedMock.user);
                            setRole(storedMock.role);
                            setLoading(false);
                        }
                        return;
                    } catch (e) {
                        localStorage.removeItem('lara_mock_session');
                    }
                }

                // 2. Not a mock, retrieve Supabase real session
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    if (session?.user) {
                        setSession(session);
                        setUser(session.user);
                        await fetchUserProfile(session.user.id);
                    } else {
                        setSession(null);
                        setUser(null);
                        setRole(null);
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error("Error restoring session:", err);
                if (mounted) setLoading(false);
            }
        };

        // Fire initialization sequence
        initAuth();

        // 3. Listen for future auth changes gracefully
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            if (!mounted) return;
            // Never overwrite state if we are purposely mimicking another user locally
            if (localStorage.getItem('lara_mock_session')) return;

            if (currentSession?.user) {
                setSession(currentSession);
                setUser(currentSession.user);
                await fetchUserProfile(currentSession.user.id);
            } else {
                setSession(null);
                setUser(null);
                setRole(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
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
            setRole('STUDENT'); // Fallback if network fails but session exists
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
            const roleStr: Role = 'PROFESSOR';
            localStorage.setItem('lara_mock_session', JSON.stringify({ ...mockSession, role: roleStr }));

            setSession(mockSession);
            setUser(mockSession.user);
            setRole(roleStr); // or STUDENT based on need, User asked for specific access
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
            const roleStr: Role = 'STUDENT';
            localStorage.setItem('lara_mock_session', JSON.stringify({ ...mockSession, role: roleStr }));

            setSession(mockSession);
            setUser(mockSession.user);
            setRole(roleStr);
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
        try {
            if (!localStorage.getItem('lara_mock_session')) {
                await supabase.auth.signOut();
            }
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            localStorage.removeItem('lara_mock_session'); // Clear mock session
            localStorage.removeItem('lara_current_view'); // Clear saved view context
            setSession(null);
            setUser(null);
            setRole(null);
        }
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
