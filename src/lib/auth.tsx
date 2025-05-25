'use client';

import { createContext, useContext, ReactNode } from 'react';

interface User {
  uid: string;
  email: string | null;
}

interface AuthContextType {
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({ user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  // For now, we'll just return a mock user
  const user = {
    uid: '1',
    email: 'user@example.com',
  };

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 