
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoginPageLayout } from '@/components/auth/LoginPageLayout';
import { AuthLoading } from '@/components/auth/AuthLoading';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      // Redirecionar baseado na role do usuário
      if (user.role === 'client') {
        navigate('/client/portal');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  const toggleRegisterForm = () => {
    setShowRegister(!showRegister);
  };

  if (isLoading) {
    return <AuthLoading />;
  }

  const footerContent = showRegister ? (
    <p className="text-sm text-center text-gray-600">
      Ao criar uma conta, você concorda com nossos{' '}
      <a href="#" className="text-green-600 hover:text-green-700 font-medium">
        Termos de Uso
      </a>{' '}
      e{' '}
      <a href="#" className="text-green-600 hover:text-green-700 font-medium">
        Política de Privacidade
      </a>
    </p>
  ) : null;

  return (
    <LoginPageLayout
      title={showRegister ? "Criar Conta" : "Entrar"}
      description={showRegister
        ? "Crie sua conta para acessar nossos serviços"
        : "Acesse sua conta para gerenciar seus equipamentos"}
      footer={footerContent}
    >
      {showRegister ? (
        <RegisterForm onToggleForm={toggleRegisterForm} />
      ) : (
        <LoginForm onToggleRegisterForm={toggleRegisterForm} />
      )}
    </LoginPageLayout>
  );
};

export default Login;
