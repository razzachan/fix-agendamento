
import React, { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginPageLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  belowCard?: ReactNode;
}

export const LoginPageLayout: React.FC<LoginPageLayoutProps> = ({
  title,
  description,
  children,
  footer,
  belowCard
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo e Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <img
              src="/fix fogoes.png"
              alt="Fix Fogões"
              className="w-24 h-24 object-contain drop-shadow-lg"
            />
          </div>
          <p className="text-sm text-gray-500">
            Gestão Inteligente de Assistência Técnica
          </p>
        </div>

        {/* Formulário */}
        <Card className="shadow-2xl border-0 backdrop-blur-sm bg-white/95">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-gray-900">
              {title}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 text-center">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">{children}</CardContent>
          {footer && (
            <CardFooter className="flex-col space-y-2 pt-0">
              {footer}
            </CardFooter>
          )}
        </Card>

        {belowCard}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2025 Fix Fogões. Todos os direitos reservados.
          </p>
          <div className="flex items-center justify-center space-x-4 mt-3">
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Política de Privacidade
            </a>
            <span className="text-gray-300">•</span>
            <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Termos de Uso
            </a>
            <span className="text-gray-300">•</span>
            <a
              href="https://api.whatsapp.com/send?phone=5548988332664"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-[#E5B034] transition-colors"
            >
              Suporte
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
