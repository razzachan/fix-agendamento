
import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Phone, Mail, User, KeyRound } from 'lucide-react';
import { formatPhoneNumber } from '@/utils/phoneFormatter';

interface WorkshopBasicInfoFieldsProps {
  form: any;
  isEditing?: boolean;
}

const WorkshopBasicInfoFields: React.FC<WorkshopBasicInfoFieldsProps> = ({ 
  form,
  isEditing = false
}) => {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da Oficina</FormLabel>
            <FormControl>
              <Input 
                placeholder="Nome da oficina" 
                icon={<User className="h-4 w-4" />}
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>E-mail</FormLabel>
            <FormControl>
              <Input 
                type="email" 
                placeholder="email@oficina.com" 
                icon={<Mail className="h-4 w-4" />}
                {...field} 
                disabled={isEditing}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Telefone</FormLabel>
            <FormControl>
              <Input
                placeholder="(00) 00000-0000"
                icon={<Phone className="h-4 w-4" />}
                {...field}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  field.onChange(formatted);
                }}
                maxLength={15}
              />
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
            <FormLabel>
              {isEditing ? 'Nova senha (opcional)' : 'Senha'}
            </FormLabel>
            <FormControl>
              <Input 
                type="password" 
                placeholder={isEditing ? "Deixe em branco para manter a senha atual" : "Senha para acesso"}
                icon={<KeyRound className="h-4 w-4" />}
                {...field} 
              />
            </FormControl>
            {isEditing && (
              <FormDescription className="text-xs text-muted-foreground">
                Deixe em branco para manter a senha atual
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default WorkshopBasicInfoFields;
