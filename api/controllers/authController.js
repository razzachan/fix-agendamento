import { validationResult } from 'express-validator';
import { supabase } from '../config/supabase.js';

const authController = {
  // Login de usuário
  login: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return res.status(401).json({
          error: true,
          message: 'Credenciais inválidas',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: {
          user: data.user,
          session: data.session
        }
      });
    } catch (error) {
      console.error('Erro no login:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao processar login',
        details: error.message
      });
    }
  },

  // Registro de usuário
  register: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role = 'client' } = req.body;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          }
        }
      });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao registrar usuário',
          details: error.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        data: {
          user: data.user
        }
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao processar registro',
        details: error.message
      });
    }
  },

  // Logout de usuário
  logout: async (req, res) => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao realizar logout',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao processar logout',
        details: error.message
      });
    }
  },

  // Obter usuário atual
  getCurrentUser: async (req, res) => {
    try {
      return res.status(200).json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      console.error('Erro ao obter usuário atual:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao obter usuário atual',
        details: error.message
      });
    }
  },

  // Atualizar perfil do usuário
  updateProfile: async (req, res) => {
    try {
      const { name, phone, address, city, state, zip_code } = req.body;
      
      const { data, error } = await supabase.auth.updateUser({
        data: {
          name,
          phone,
          address,
          city,
          state,
          zip_code
        }
      });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao atualizar perfil',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: {
          user: data.user
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao atualizar perfil',
        details: error.message
      });
    }
  },

  // Alterar senha
  changePassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      // Verificar senha atual
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword
      });

      if (signInError) {
        return res.status(401).json({
          error: true,
          message: 'Senha atual incorreta',
          details: signInError.message
        });
      }

      // Atualizar senha
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao alterar senha',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao alterar senha',
        details: error.message
      });
    }
  },

  // Solicitar redefinição de senha
  forgotPassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;

      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao solicitar redefinição de senha',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Email de redefinição de senha enviado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao solicitar redefinição de senha:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao solicitar redefinição de senha',
        details: error.message
      });
    }
  },

  // Redefinir senha
  resetPassword: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;

      const { error } = await supabase.auth.updateUser({
        password
      });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao redefinir senha',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Senha redefinida com sucesso'
      });
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao redefinir senha',
        details: error.message
      });
    }
  },

  // Criar usuário (apenas admin)
  createUser: async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role } = req.body;

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          role
        }
      });

      if (error) {
        return res.status(400).json({
          error: true,
          message: 'Erro ao criar usuário',
          details: error.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          user: data.user
        }
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return res.status(500).json({
        error: true,
        message: 'Erro ao criar usuário',
        details: error.message
      });
    }
  }
};

export default authController;
