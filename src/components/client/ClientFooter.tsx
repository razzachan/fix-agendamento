import React from 'react';
import { MessageCircle, Phone, Mail, MapPin } from 'lucide-react';

export function ClientFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contato */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Contato</h3>
            <div className="space-y-3">
              <a 
                href="https://api.whatsapp.com/send?phone=5548988332664"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 text-gray-600 hover:text-green-600 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">(48) 98833-2664</span>
              </a>
              <a 
                href="tel:+5548988332664"
                className="flex items-center space-x-3 text-gray-600 hover:text-green-600 transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span className="text-sm">(48) 98833-2664</span>
              </a>
              <a 
                href="mailto:contato@eletrofix.com.br"
                className="flex items-center space-x-3 text-gray-600 hover:text-green-600 transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span className="text-sm">contato@eletrofix.com.br</span>
              </a>
            </div>
          </div>

          {/* Horário de Funcionamento */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Horário de Funcionamento</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Segunda - Sexta:</span>
                <span>08:00 - 18:00</span>
              </div>
              <div className="flex justify-between">
                <span>Sábado:</span>
                <span>08:00 - 12:00</span>
              </div>
              <div className="flex justify-between">
                <span>Domingo:</span>
                <span>Fechado</span>
              </div>
            </div>
          </div>

          {/* Localização */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Localização</h3>
            <div className="flex items-start space-x-3 text-gray-600">
              <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
              <div className="text-sm">
                <p>Rua das Flores, 123</p>
                <p>Centro - Florianópolis/SC</p>
                <p>CEP: 88010-000</p>
              </div>
            </div>
          </div>
        </div>

        {/* Linha divisória */}
        <div className="border-t border-gray-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-500">
              © 2025 Fix Fogões. Todos os direitos reservados.
            </div>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a href="#" className="hover:text-green-600 transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="hover:text-green-600 transition-colors">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
