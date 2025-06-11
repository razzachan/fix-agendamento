# Processo de Ordens de Serviço - EletroFix Hub Pro

Este documento descreve o processo completo de ordens de serviço no sistema EletroFix Hub Pro, incluindo os diferentes tipos de atendimento, fluxos de trabalho e responsabilidades.

## Tipos de Atendimento

O sistema suporta três tipos principais de atendimento:

### 1. Em Domicílio (`em_domicilio`)

Serviços realizados na residência do cliente, sem necessidade de coleta do equipamento.

**Fluxo de Trabalho:**
1. **Pendente** - Ordem de serviço registrada
2. **Agendado** - Visita agendada com o cliente
3. **A Caminho** - Técnico a caminho do local
4. **Em Andamento** - Serviço sendo executado
5. **Pagamento Pendente** - Aguardando confirmação do pagamento
6. **Concluído** - Serviço finalizado com sucesso

**Responsabilidades:**
- **Atendente/Admin**: Registrar a ordem, agendar a visita, atribuir técnico
- **Técnico**: Deslocar-se até o cliente, realizar o serviço, registrar o progresso
- **Cliente**: Estar presente no horário agendado, efetuar o pagamento

### 2. Coleta para Conserto (`coleta_conserto`)

Coleta do equipamento com orçamento final fechado, sem necessidade de diagnóstico prévio.

**Fluxo de Trabalho:**
1. **Pendente** - Ordem de serviço registrada
2. **Coleta Agendada** - Agendamento da coleta do equipamento
3. **A Caminho** - Técnico a caminho para coletar o equipamento
4. **Coletado** - Equipamento coletado
5. **Na Oficina** - Equipamento deixado na oficina
6. **Em Reparo** - Serviço sendo executado
7. **Pronto para Entrega** - Reparo concluído, aguardando coleta para entrega
8. **Coletado na Oficina** - Equipamento coletado na oficina para entrega
9. **Em Rota de Entrega** - Em rota para entrega ao cliente
10. **Pagamento Pendente** - Aguardando confirmação do pagamento
11. **Concluído** - Serviço finalizado com sucesso

**Responsabilidades:**
- **Atendente/Admin**: Registrar a ordem, agendar coleta, atribuir técnico
- **Técnico de Coleta**: Coletar o equipamento, transportar para a oficina
- **Oficina**: Realizar o reparo conforme orçamento fechado
- **Técnico de Entrega**: Coletar o equipamento na oficina, entregar ao cliente
- **Cliente**: Estar presente nos horários agendados, efetuar o pagamento

### 3. Coleta para Diagnóstico (`coleta_diagnostico`)

Coleta com sinal de R$350,00 e orçamento posterior após diagnóstico detalhado.

**Fluxo de Trabalho:**
1. **Pendente** - Ordem de serviço registrada
2. **Coleta Agendada** - Agendamento da coleta do equipamento
3. **A Caminho** - Técnico a caminho para coletar o equipamento
4. **Coletado para Diagnóstico** - Equipamento coletado para diagnóstico
5. **Na Oficina** - Equipamento deixado na oficina
6. **Diagnóstico Concluído** - Diagnóstico realizado, aguardando aprovação do cliente
7. **Pronto para Entrega** - Reparo concluído ou diagnóstico rejeitado, aguardando coleta
8. **Coletado na Oficina** - Equipamento coletado na oficina para entrega
9. **Em Rota de Entrega** - Em rota para entrega ao cliente
10. **Pagamento Pendente** - Aguardando confirmação do pagamento
11. **Concluído** - Serviço finalizado com sucesso

**Responsabilidades:**
- **Atendente/Admin**: Registrar a ordem, agendar coleta, atribuir técnico, coletar sinal
- **Técnico de Coleta**: Coletar o equipamento, transportar para a oficina
- **Oficina**: Realizar diagnóstico detalhado, gerar orçamento, aguardar aprovação
- **Cliente**: Aprovar ou rejeitar o orçamento
- **Técnico de Entrega**: Coletar o equipamento na oficina, entregar ao cliente
- **Cliente**: Estar presente nos horários agendados, efetuar o pagamento

## Detalhes do Processo de Diagnóstico

O processo de diagnóstico é uma etapa crítica para o tipo de atendimento "Coleta para Diagnóstico":

1. **Coleta do Equipamento**: O técnico coleta o equipamento e o cliente paga um sinal de R$350,00.
2. **Diagnóstico na Oficina**: A oficina realiza um diagnóstico detalhado do equipamento.
3. **Registro do Diagnóstico**: A oficina registra:
   - Detalhes do diagnóstico
   - Serviço recomendado
   - Custo estimado
   - Data estimada de conclusão
   - Link para compra de peças (se necessário)
4. **Aprovação do Cliente**: O cliente é notificado e pode:
   - **Aprovar**: O reparo é iniciado e o valor do sinal é descontado do valor total
   - **Rejeitar**: O equipamento é preparado para devolução e o sinal não é reembolsado

## Responsabilidades por Perfil

### Administrador
- Gerenciar todas as ordens de serviço
- Atribuir técnicos e oficinas
- Monitorar o progresso de todas as ordens
- Gerenciar pagamentos e financeiro

### Técnico
- Visualizar ordens atribuídas
- Atualizar status durante atendimento
- Registrar detalhes do serviço realizado
- Coletar e entregar equipamentos

### Oficina
- Receber equipamentos para diagnóstico/reparo
- Realizar diagnósticos detalhados
- Registrar orçamentos
- Executar reparos
- Atualizar status do serviço

### Cliente
- Acompanhar o status da ordem de serviço
- Aprovar ou rejeitar orçamentos
- Agendar coletas e entregas
- Efetuar pagamentos

## Transições de Status Permitidas

O sistema controla rigorosamente as transições de status permitidas para garantir a integridade do processo:

- De **Pendente** para: Agendado, Coleta Agendada, Cancelado
- De **Agendado** para: A Caminho, Cancelado
- De **Coleta Agendada** para: A Caminho, Cancelado
- De **A Caminho** para: Em Andamento, Coletado, Coletado para Diagnóstico, Cancelado
- De **Coletado** para: Na Oficina, Cancelado
- De **Coletado para Diagnóstico** para: Na Oficina, Cancelado
- De **Na Oficina** para: Em Reparo, Diagnóstico Concluído, Cancelado
- De **Diagnóstico Concluído** para: Em Reparo, Pronto para Entrega, Cancelado
- De **Em Reparo** para: Pronto para Entrega, Cancelado
- De **Pronto para Entrega** para: Coletado na Oficina, Cancelado
- De **Coletado na Oficina** para: Em Rota de Entrega
- De **Em Rota de Entrega** para: Pagamento Pendente
- De **Pagamento Pendente** para: Concluído
- De **Concluído** para: (estado final)
- De **Cancelado** para: (estado final)

## Dicas para Uso Eficiente

1. **Selecione o Tipo de Atendimento Correto**: Escolha cuidadosamente entre atendimento em domicílio, coleta para conserto ou coleta para diagnóstico.

2. **Atualize os Status Regularmente**: Mantenha o cliente informado atualizando o status da ordem de serviço em tempo real.

3. **Registre Notas Detalhadas**: Adicione notas detalhadas em cada transição de status para manter um histórico completo.

4. **Diagnósticos Precisos**: Para coletas com diagnóstico, forneça informações detalhadas e precisas para ajudar o cliente a tomar uma decisão informada.

5. **Acompanhe os Prazos**: Monitore os prazos estimados para conclusão e mantenha o cliente informado sobre qualquer alteração.

## Solução de Problemas Comuns

1. **Status Incorreto**: Se uma ordem estiver com status incorreto, o administrador pode usar a função de edição direta para corrigir.

2. **Transição Bloqueada**: Se uma transição de status estiver bloqueada, verifique se todas as etapas anteriores foram concluídas corretamente.

3. **Diagnóstico Pendente**: Se um diagnóstico estiver pendente por muito tempo, verifique se a oficina foi notificada corretamente.

4. **Problemas de Coleta/Entrega**: Se houver problemas com coletas ou entregas, verifique se o endereço e as informações de contato estão corretos.

5. **Cancelamentos**: Para cancelar uma ordem, sempre registre o motivo detalhado do cancelamento para referência futura.
