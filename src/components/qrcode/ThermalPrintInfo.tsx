/**
 * Componente informativo sobre impressão térmica
 * Orienta técnicos sobre como usar impressoras Bluetooth
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Smartphone, 
  Bluetooth, 
  Printer, 
  CheckCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wifi,
  Download
} from 'lucide-react';
import ThermalPrintService from '@/services/qrcode/thermalPrintService';

interface ThermalPrintInfoProps {
  className?: string;
}

export const ThermalPrintInfo: React.FC<ThermalPrintInfoProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isMobile = ThermalPrintService.isMobileEnvironment();
  const hasBluetoothAPI = ThermalPrintService.isBluetoothAvailable();
  const isSafariIOS = ThermalPrintService.isSafariIOS();

  return (
    <Card className={`border-purple-200 ${className}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-purple-50 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-purple-600" />
                <span>📱 Guia do Técnico - Impressão Térmica</span>
                {isMobile && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    ✅ Mobile
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-purple-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-purple-600" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Status do ambiente */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Smartphone className={`h-4 w-4 ${isMobile ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm">
                  Mobile: {isMobile ? (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      ✅ Detectado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Desktop
                    </Badge>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Bluetooth className={`h-4 w-4 ${hasBluetoothAPI ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm">
                  Bluetooth: {hasBluetoothAPI ? (
                    <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                      ✅ Disponível
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs">
                      ❌ Não suportado
                    </Badge>
                  )}
                </span>
              </div>
            </div>

            {/* Instruções para técnicos mobile */}
            {isMobile ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        🎯 Modo Técnico Mobile Ativo
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Sistema otimizado para técnicos em campo com impressoras portáteis
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      ✅ Opção 1: Compartilhamento (Mais Confiável)
                    </h4>
                    <ol className="text-xs text-green-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="font-bold">1.</span>
                        <span>Clique em <strong>"📱 Térmica"</strong> → Menu de compartilhamento abre</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">2.</span>
                        <span>Selecione seu app de impressão térmica</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">3.</span>
                        <span>App recebe dados da etiqueta automaticamente</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      ✅ Opção 2: Download PNG (Mais Segura)
                    </h4>
                    <ol className="text-xs text-blue-700 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="font-bold">1.</span>
                        <span>Clique em <strong>"📱 PNG"</strong> → Baixa imagem</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">2.</span>
                        <span>Abra a imagem na galeria do celular</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-bold">3.</span>
                        <span>Compartilhe com seu app de impressão</span>
                      </li>
                    </ol>
                  </div>
                </div>

                {isSafariIOS ? (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Safari iOS Detectado
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          O Safari não suporta Bluetooth Web. Use um app de impressão térmica da App Store.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : hasBluetoothAPI ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Bluetooth className="h-4 w-4 text-blue-600" />
                      Como usar Bluetooth:
                    </h4>
                    <ol className="text-xs text-gray-600 space-y-1 ml-6">
                      <li>1. Ligue sua impressora térmica</li>
                      <li>2. Ative o Bluetooth no celular</li>
                      <li>3. Clique em "📱 Térmica" na etiqueta</li>
                      <li>4. Selecione sua impressora na lista</li>
                      <li>5. Aguarde a impressão automática</li>
                    </ol>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">
                          Bluetooth Web API não disponível
                        </p>
                        <p className="text-xs text-orange-700 mt-1">
                          Use um app de impressão térmica ou atualize seu navegador.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Download className="h-4 w-4 text-purple-600" />
                    📱 Apps Recomendados para Técnicos:
                  </h4>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">🥇 Mais Fáceis (Recomendados):</h5>
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <div className="font-bold text-green-800">📱 "Bluetooth Thermal Printer"</div>
                        <div className="text-green-600 mt-1">✅ Funciona com impressoras genéricas</div>
                        <div className="text-green-600">✅ Interface simples para técnicos</div>
                      </div>
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <div className="font-bold text-green-800">📱 "ESC/POS Printer"</div>
                        <div className="text-green-600 mt-1">✅ Protocolo padrão de impressoras térmicas</div>
                        <div className="text-green-600">✅ Configuração flexível</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-700">🥈 Marcas Específicas:</h5>
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <strong>📱 Brother iPrint&Label</strong> - Para impressoras Brother
                      </div>
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <strong>📱 EPSON iPrint</strong> - Para impressoras EPSON
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                    <p className="text-xs text-yellow-800">
                      <strong>💡 Dica do Técnico:</strong> Instale um app genérico como "Bluetooth Thermal Printer"
                      que funciona com qualquer impressora térmica 58mm/80mm. É mais versátil!
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Wifi className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Ambiente Desktop
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Use a impressão padrão do navegador ou configure uma impressora térmica via USB/Wi-Fi.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Impressoras compatíveis */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Impressoras Térmicas Testadas:</h4>
              <div className="grid grid-cols-1 gap-1 text-xs">
                <div className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                  <span>Impressoras 58mm genéricas</span>
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    ✅ Compatível
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                  <span>Brother QL-820NWB</span>
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    ✅ Compatível
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                  <span>Zebra ZD230</span>
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    ✅ Compatível
                  </Badge>
                </div>
              </div>
            </div>

            {/* Dicas importantes */}
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">💡 Dicas Importantes:</h4>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Mantenha a impressora próxima ao celular (máx. 10m)</li>
                <li>• Certifique-se que a impressora está pareada no Bluetooth</li>
                <li>• Use papel térmico de 58mm ou 80mm</li>
                <li>• Teste a impressão antes de ir ao cliente</li>
              </ul>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default ThermalPrintInfo;
