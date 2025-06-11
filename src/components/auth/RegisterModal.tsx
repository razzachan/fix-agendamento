import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { toast } from 'sonner';
import { User, Mail, Lock, Eye, EyeOff, MapPin, CreditCard, Building } from 'lucide-react';

const registerSchemaFisica = z.object({
  type: z.literal('fisica'),
  name: z.string().min(2, "Nome completo é obrigatório"),
  cpf: z.string().min(11, "CPF deve ter 11 dígitos").max(14, "CPF inválido"),
  email: z.string().email("Email inválido"),
  address: z.string().min(5, "Endereço completo é obrigatório"),
  cep: z.string().min(8, "CEP deve ter 8 dígitos").max(9, "CEP inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const registerSchemaJuridica = z.object({
  type: z.literal('juridica'),
  razaoSocial: z.string().min(2, "Razão Social é obrigatória"),
  cnpj: z.string().min(14, "CNPJ deve ter 14 dígitos").max(18, "CNPJ inválido"),
  email: z.string().email("Email inválido"),
  address: z.string().min(5, "Endereço completo é obrigatório"),
  cep: z.string().min(8, "CEP deve ter 8 dígitos").max(9, "CEP inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const registerSchema = z.union([registerSchemaFisica, registerSchemaJuridica]);

type RegisterFormValues = z.infer<typeof registerSchema>;

interface RegisterModalProps {
  onClose: () => void;
}

export function RegisterModal({ onClose }: RegisterModalProps) {
  const { signUp } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerType, setRegisterType] = useState<'fisica' | 'juridica'>('fisica');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      type: 'fisica',
      name: '',
      cpf: '',
      email: '',
      address: '',
      cep: '',
      password: '',
      confirmPassword: '',
    } as any,
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsRegistering(true);
    
    try {
      const registerData = {
        email: data.email,
        password: data.password,
        name: data.type === 'fisica' ? data.name : data.razaoSocial,
        role: 'client' as UserRole,
        address: data.address,
        zip_code: data.cep,
        ...(data.type === 'fisica' 
          ? { cpf: data.cpf }
          : { cnpj: data.cnpj, razao_social: data.razaoSocial }
        )
      };

      await signUp(registerData);
      onClose();
      toast.success('Conta criada com sucesso! Você será redirecionado para o portal.');
    } catch (error: any) {
      console.error('Erro no registro:', error);
      toast.error(error.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleTypeChange = (value: 'fisica' | 'juridica') => {
    setRegisterType(value);
    form.setValue('type', value);
    // Reset form when changing type
    form.reset({
      type: value,
      email: '',
      address: '',
      cep: '',
      password: '',
      confirmPassword: '',
      ...(value === 'fisica' 
        ? { name: '', cpf: '' }
        : { razaoSocial: '', cnpj: '' }
      )
    } as any);
  };

  return (
    <div className="space-y-6">
      {/* Seletor de tipo */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-gray-700">Tipo de conta</Label>
        <RadioGroup
          value={registerType}
          onValueChange={handleTypeChange}
          className="flex space-x-6"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fisica" id="fisica" />
            <Label htmlFor="fisica" className="text-sm">Pessoa Física</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="juridica" id="juridica" />
            <Label htmlFor="juridica" className="text-sm">Pessoa Jurídica</Label>
          </div>
        </RadioGroup>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome/Razão Social */}
          <FormField
            control={form.control}
            name={registerType === 'fisica' ? 'name' : 'razaoSocial'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {registerType === 'fisica' ? 'Nome Completo' : 'Razão Social'}
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-[#E5B034] transition-colors" />
                    <Input
                      placeholder={registerType === 'fisica' ? 'Seu nome completo' : 'Razão social da empresa'}
                      className="pl-10 h-12 border-gray-200 focus:border-[#E5B034] focus:ring-[#E5B034] transition-all duration-200"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CPF/CNPJ */}
          <FormField
            control={form.control}
            name={registerType === 'fisica' ? 'cpf' : 'cnpj'}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {registerType === 'fisica' ? 'CPF' : 'CNPJ'}
                </FormLabel>
                <FormControl>
                  <div className="relative group">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-[#E5B034] transition-colors" />
                    <Input
                      placeholder={registerType === 'fisica' ? '000.000.000-00' : '00.000.000/0000-00'}
                      className="pl-10 h-12 border-gray-200 focus:border-[#E5B034] focus:ring-[#E5B034] transition-all duration-200"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
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
                      type="email"
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

          {/* Endereço */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço Completo</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-[#E5B034] transition-colors" />
                    <Input
                      placeholder="Rua, número, bairro, cidade"
                      className="pl-10 h-12 border-gray-200 focus:border-[#E5B034] focus:ring-[#E5B034] transition-all duration-200"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CEP */}
          <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-[#E5B034] transition-colors" />
                    <Input
                      placeholder="00000-000"
                      className="pl-10 h-12 border-gray-200 focus:border-[#E5B034] focus:ring-[#E5B034] transition-all duration-200"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Senha */}
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
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 pr-12 h-12 border-gray-200 focus:border-[#E5B034] focus:ring-[#E5B034] transition-all duration-200"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-[#E5B034] transition-colors duration-200 p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirmar Senha */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Senha</FormLabel>
                <FormControl>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-[#E5B034] transition-colors" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirme sua senha"
                      className="pl-10 pr-12 h-12 border-gray-200 focus:border-[#E5B034] focus:ring-[#E5B034] transition-all duration-200"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-[#E5B034] transition-colors duration-200 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Botões */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isRegistering}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-[#E5B034] to-[#D4A017] hover:from-[#D4A017] hover:to-[#B8860B] text-white font-semibold"
              disabled={isRegistering}
            >
              {isRegistering ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Criando...
                </div>
              ) : (
                'Criar Conta'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
