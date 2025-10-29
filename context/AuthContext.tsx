import React, { createContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  currentUser: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isInitializing: boolean;
  isAuthenticating: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children?: ReactNode;
}

// Helper function to fetch user profile, used after a successful login.
const fetchUserProfile = async (session: Session): Promise<User> => {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

    if (error) {
        console.error("Error fetching user profile:", error.message);
        throw error; // Propagate error to be caught by the caller
    }

    if (profile) {
        return {
            id: session.user.id,
            email: session.user.email!,
            role: profile.role,
            fullName: profile.full_name,
        };
    }
    
    throw new Error("User is authenticated but a profile is missing.");
};


export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  // Per the new requirement, we no longer initialize a session on page load.
  // The app will always start in a logged-out state, so isInitializing is always false.
  const [isInitializing, setIsInitializing] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    // The listener now ONLY handles explicit SIGNED_OUT events.
    // It no longer handles SIGNED_IN, which is now managed directly by the login function.
    // This prevents the app from trying to auto-login on refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setSession(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            return { error: error.message };
        }

        if (data.session) {
            try {
                const userProfile = await fetchUserProfile(data.session);
                setCurrentUser(userProfile);
                setSession(data.session);
                return { error: null }; // Success
            } catch (profileError: any) {
                // Critical error: user exists in auth but not in profiles table.
                // Log them out to prevent a broken state.
                await supabase.auth.signOut();
                return { error: "Login successful, but failed to retrieve user profile. Please contact support." };
            }
        }
        
        return { error: "An unknown error occurred during login." };
    } catch (e: any) {
        return { error: e.message || "An unexpected network error occurred." };
    } finally {
        setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    }
    // The onAuthStateChange listener will handle clearing the state.
  }, []);
  
  const value = useMemo(() => ({ 
    session, 
    currentUser, 
    login, 
    logout, 
    isInitializing,
    isAuthenticating
  }), [session, currentUser, isInitializing, isAuthenticating, login, logout]);

  // The "Initializing Session..." screen is no longer needed as the app loads instantly.
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};