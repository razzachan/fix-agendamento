
import { User, UserRole } from '@/types';

export interface ProfileData {
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface AuthResult {
  user: User | null;
  error: any;
}
