
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserRole } from '@/types';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { RegisterModal } from './RegisterModal';

const loginSchema = z.object({
  email: z.string().refine(val => {
    if (val.toLowerCase() === 'admin' || val.toLowerCase() === 'oficina') return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }, { message: 'E-mail inválido' }),
  password: z.string().min(1, 'Senha é obrigatória'),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export type LoginValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface LoginFormProps {
  onToggleRegisterForm: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleRegisterForm }) => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Estado do modal de registro
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });





  const onSubmit = async (values: LoginValues) => {
    setIsSubmitting(true);
    setLoginError(null);
    
    try {
      console.log(`Tentando login com: ${values.email} / ${values.password}`);
      await signIn({email: values.email, password: values.password});
    } catch (error: any) {
      console.error("Falha no login:", error);
      setLoginError(error?.message || "Email ou senha inválidos");
      toast.error("Falha no login. Email ou senha inválidos");
      form.setValue('password', '');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <>
      {loginError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{loginError}</AlertDescription>
        </Alert>
      )}
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-[#E5B034] transition-colors" />
                    <Input
                      placeholder="seu@email.com"
                      className="pl-10 h-12 border-gray-200 focus:border-[#E5B034] focus:ring-[#E5B034] transition-all duration-200"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-[#E5B034] transition-colors" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Sua senha"
                      className="pl-10 pr-12 h-12 border-gray-200 focus:border-[#E5B034] focus:ring-[#E5B034] transition-all duration-200"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-[#E5B034] transition-colors duration-200 p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#E5B034] to-[#D4A017] hover:from-[#D4A017] hover:to-[#B8860B] text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                <span>Entrando...</span>
              </div>
            ) : (
              <span className="flex items-center justify-center">
                <span>Entrar</span>
                <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </Button>
          
          <div className="mt-6 text-center space-y-4">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{" "}
              <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="text-[#E5B034] hover:text-[#D4A017] font-medium transition-colors"
                  >
                    Criar conta gratuita
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-gray-900">
                      Criar Conta Gratuita
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Preencha os dados abaixo para criar sua conta
                    </DialogDescription>
                  </DialogHeader>

                  <RegisterModal onClose={() => setIsRegisterModalOpen(false)} />
                </DialogContent>
              </Dialog>
            </p>

            <div className="flex items-center">
              <div className="flex-1 border-t border-gray-300"></div>
              <div className="px-4 text-xs text-gray-500 bg-white">ou</div>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            <p className="text-xs text-gray-500">
              Precisa de ajuda?{' '}
              <a
                href="https://api.whatsapp.com/send?phone=5548988332664&text=Olá! Preciso de ajuda com o login."
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#E5B034] hover:text-[#D4A017] font-medium transition-colors"
              >
                Fale conosco no WhatsApp
              </a>
            </p>
          </div>
        </form>
      </Form>
    </>
  );
};
