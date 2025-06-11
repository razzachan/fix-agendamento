import { User } from '@/types';

const SESSION_KEY = 'eletrofix_session';

/**
 * Salva os dados do usuário no localStorage para persistência da sessão
 */
export function saveUserSession(user: User): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    console.log('Sessão salva no localStorage:', user.email);
  } catch (error) {
    console.error('Erro ao salvar sessão no localStorage:', error);
  }
}

/**
 * Recupera os dados do usuário do localStorage
 */
export function getUserSession(): User | null {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    
    const user = JSON.parse(sessionData) as User;
    console.log('Sessão recuperada do localStorage:', user.email);
    return user;
  } catch (error) {
    console.error('Erro ao recuperar sessão do localStorage:', error);
    return null;
  }
}

/**
 * Remove os dados do usuário do localStorage
 */
export function clearUserSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    console.log('Sessão removida do localStorage');
  } catch (error) {
    console.error('Erro ao remover sessão do localStorage:', error);
  }
}
