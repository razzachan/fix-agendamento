
import { User, UserRole } from '@/types';

export interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: any) => Promise<void>;
  signUp: (data: { 
    email: string; 
    password: string; 
    name: string;
    role?: UserRole;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  }) => Promise<{user: User | null, error: any}>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}
