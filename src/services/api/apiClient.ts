/**
 * Cliente para comunicação com a API do EletroFix Hub Pro
 */

// Configuração da URL base da API
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Classe para gerenciar as requisições à API
class ApiClient {
  private token: string | null = null;

  // Método para definir o token de autenticação
  setToken(token: string) {
    this.token = token;
  }

  // Método para limpar o token de autenticação
  clearToken() {
    this.token = null;
  }

  // Método para obter os cabeçalhos da requisição
  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Método para fazer requisições GET
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    if (!API_BASE_URL) {
      throw new Error('API URL não configurada');
    }

    const url = new URL(`${API_BASE_URL}${endpoint}`);

    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key].toString());
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  // Método para fazer requisições POST
  async post<T>(endpoint: string, data?: any): Promise<T> {
    if (!API_BASE_URL) {
      throw new Error('API URL não configurada');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  // Método para fazer requisições PUT
  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  // Método para fazer requisições PATCH
  async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  // Método para fazer requisições DELETE
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw await this.handleError(response);
    }

    return response.json();
  }

  // Método para tratar erros nas requisições
  private async handleError(response: Response): Promise<Error> {
    let errorMessage = 'Erro na requisição';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      
      // Se for erro de autenticação, limpar o token
      if (response.status === 401) {
        this.clearToken();
        // Disparar evento de logout
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      
      return new Error(errorMessage);
    } catch (error) {
      return new Error(`${errorMessage} (${response.status})`);
    }
  }
}

// Exportar uma instância única do cliente de API
export const apiClient = new ApiClient();

export default apiClient;
