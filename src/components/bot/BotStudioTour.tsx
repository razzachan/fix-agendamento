import React from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface Props { run: boolean; onFinish?: ()=>void }

export function BotStudioTour({ run, onFinish }: Props){
  const steps: Step[] = [
    {
      target: '[data-tour="tab-overview"]',
      content: 'Aqui você vê um panorama do seu Bot: status, persona e principais indicadores.',
      disableBeacon: true,
    },
    {
      target: '[data-tour="tab-llm"]',
      content: 'Defina o provedor e modelo de IA (OpenAI/Anthropic), temperatura e tamanho de resposta.',
    },
    {
      target: '[data-tour="tab-integrations"]',
      content: 'Conecte o WhatsApp em Canais para ativar o atendimento e automações.',
    },
    {
      target: '[data-tour="tab-working-hours"]',
      content: 'Configure horários de funcionamento para gerar disponibilidade correta.',
    },
    {
      target: '[data-tour="tab-blackouts"]',
      content: 'Cadastre bloqueios globais (ex.: almoço 12–13) e datas especiais.',
    },
    {
      target: '[data-tour="tab-schedule"]',
      content: 'Teste a disponibilidade e crie reservas de TESTE. Ótimo para validar regras rápidas.',
    },
    {
      target: '[data-tour="tab-decision-logs"]',
      content: 'Audite decisões do Bot em tempo real e exporte para análises.',
    },
    {
      target: '[data-tour="tab-tracing"]',
      content: 'Use o Tracing para depurar conversas e execução de ferramentas.',
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status } = data;
    const finished = [STATUS.FINISHED, STATUS.SKIPPED].includes(status);
    if (finished) onFinish?.();
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      showProgress
      locale={{ back: 'Voltar', close: 'Fechar', last: 'Concluir', next: 'Próximo', skip: 'Pular' }}
      styles={{ options: { zIndex: 10000 } }}
      callback={handleCallback}
    />
  );
}

export default BotStudioTour;

