/**
 * Serviço para comunicação com os endpoints de autenticação da API
 */

import apiClient from './apiClient';
import { User, UserRole } from '@/types';

// Interfaces para os dados de autenticação
interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    session?: {
      access_token: string;
    };
  };
}

interface ProfileUpdateData {
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

interface PasswordResetRequestData {
  email: string;
}

interface PasswordResetData {
  token: string;
  password: string;
}

// Serviço de autenticação
export const authApiService = {
  // Login de usuário
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    // Se o login for bem-sucedido, armazenar o token
    if (response.success && response.data?.session?.access_token) {
      apiClient.setToken(response.data.session.access_token);
      
      // Armazenar o token no localStorage
      localStorage.setItem('auth_token', response.data.session.access_token);
    }
    
    return response;
  },
  
  // Registro de usuário
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', data);
  },
  
  // Logout de usuário
  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/logout');
    
    // Limpar o token
    apiClient.clearToken();
    localStorage.removeItem('auth_token');
    
    return response;
  },
  
  // Obter usuário atual
  async getCurrentUser(): Promise<AuthResponse> {
    return apiClient.get<AuthResponse>('/auth/me');
  },
  
  // Atualizar perfil do usuário
  async updateProfile(data: ProfileUpdateData): Promise<AuthResponse> {
    return apiClient.put<AuthResponse>('/auth/profile', data);
  },
  
  // Alterar senha
  async changePassword(data: PasswordChangeData): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/change-password', data);
  },
  
  // Solicitar redefinição de senha
  async forgotPassword(data: PasswordResetRequestData): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/forgot-password', data);
  },
  
  // Redefinir senha
  async resetPassword(data: PasswordResetData): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>('/auth/reset-password', data);
  },
  
  // Verificar se o usuário está autenticado
  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      apiClient.setToken(token);
      return true;
    }
    
    return false;
  },
  
  // Inicializar o serviço de autenticação
  initialize() {
    // Verificar se há um token armazenado
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      apiClient.setToken(token);
    }
    
    // Adicionar listener para eventos de logout
    window.addEventListener('auth:logout', () => {
      localStorage.removeItem('auth_token');
    });
  }
};

// Inicializar o serviço de autenticação
authApiService.initialize();

export default authApiService;
