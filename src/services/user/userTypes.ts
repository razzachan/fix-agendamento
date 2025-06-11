
import { User } from '@/types';

export interface CreateUserParams {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'technician' | 'client' | 'workshop';
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface UpdateUserParams {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface UserServiceResponse {
  success: boolean;
  data?: User | null;
  error?: Error | string;
}
