
import { register } from './register';
import { login } from './login';
import { getCurrentUser, logout } from './session';
import { updateProfile } from './profile';
import { saveUserSession, getUserSession, clearUserSession } from './persistentSession';
import { ProfileData, AuthResult } from './types';

/**
 * Service responsável por operações de autenticação usando Supabase
 */
export const supabaseAuthService = {
  register,
  login,
  getCurrentUser,
  logout,
  updateProfile,
  saveUserSession,
  getUserSession,
  clearUserSession
};

export type { ProfileData, AuthResult };
