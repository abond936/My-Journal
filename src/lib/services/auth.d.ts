declare module '@/lib/services/auth' {
  export interface User {
    id: string;
    email: string;
    role: 'author' | 'family';
  }

  export function useAuth(): {
    user: User | null;
    loading: boolean;
    error: Error | null;
  };
} 