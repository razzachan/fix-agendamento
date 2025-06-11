# Correção do Sistema de Garantia

## Problema Identificado

O sistema de garantia não estava exibindo corretamente as informações de garantia na interface do usuário, mesmo que os dados estivessem sendo salvos corretamente no banco de dados.

### Sintomas
- A interface exibia "Sem Informações de Garantia" mesmo quando os dados de garantia estavam presentes no banco de dados
- Os logs do console mostravam que as propriedades de garantia eram `undefined` no objeto `serviceOrder`

## Causa Raiz

A função `mapServiceOrder` no arquivo `src\services\serviceOrder\queries\mapServiceOrder.ts` não estava mapeando os campos de garantia (warranty_period, warranty_start_date, warranty_end_date, warranty_terms) do banco de dados para o objeto ServiceOrder que é usado no frontend.

## Solução Implementada

### 1. Correção do Mapeamento de Dados

Adicionamos os campos de garantia ao objeto mapeado na função `mapServiceOrder`:

```typescript
// Campos de garantia - Mapeamento dos campos do banco de dados (snake_case) para o formato do frontend (camelCase)
// Estes campos são usados pelo componente WarrantyInfo para exibir informações de garantia
warrantyPeriod: order.warranty_period,         // Período de garantia em meses
warrantyStartDate: order.warranty_start_date,  // Data de início da garantia
warrantyEndDate: order.warranty_end_date,      // Data de término da garantia
warrantyTerms: order.warranty_terms,           // Termos e condições da garantia
relatedWarrantyOrderId: order.related_warranty_order_id, // ID da ordem original (para atendimentos em garantia)
```

### 2. Mapeamento Completo de Todos os Campos

Além dos campos de garantia, verificamos e adicionamos o mapeamento para todos os campos da interface `ServiceOrder` que não estavam sendo mapeados:

```typescript
clientCity: order.client_city || order.client?.city || '',
clientState: order.client_state || order.client?.state || '',
clientZipCode: order.client_zip_code || order.client?.zip_code || '',
archived: order.archived || false,

// Campos para controle de atualizações
updatedById: order.updated_by_id || null,
updatedByName: order.updated_by_name || null,
updatedAt: order.updated_at || null,
notes: order.notes || null,

// Diagnóstico do equipamento (se disponível)
diagnosis: order.diagnosis ? {
  id: order.diagnosis.id,
  createdAt: order.diagnosis.created_at,
  updatedAt: order.diagnosis.updated_at,
  serviceOrderId: order.diagnosis.service_order_id,
  workshopUserId: order.diagnosis.workshop_user_id,
  diagnosisDetails: order.diagnosis.diagnosis_details,
  recommendedService: order.diagnosis.recommended_service,
  estimatedCost: order.diagnosis.estimated_cost,
  estimatedCompletionDate: order.diagnosis.estimated_completion_date,
  partsPurchaseLink: order.diagnosis.parts_purchase_link
} : undefined
```

### 3. Criação de Mapeadores Específicos para Cada Tipo

Para garantir a consistência no mapeamento de dados, criamos mapeadores específicos para cada tipo de entidade:

#### Cliente (Client)
```typescript
export const mapClientData = (data: any): Client => {
  const client: Client = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    address: data.address || null,
    city: data.city || null,
    state: data.state || null,
    zipCode: data.zip_code || null, // Mapeia zip_code para zipCode
    cpfCnpj: data.cpf_cnpj || null, // Mapeia cpf_cnpj para cpfCnpj
    addressComplement: data.address_complement || null, // Mapeia address_complement para addressComplement
    addressReference: data.address_reference || null, // Mapeia address_reference para addressReference
  };

  return client;
};
```

#### Técnico (Technician)
```typescript
export const mapTechnicianData = (data: any): Technician => {
  const technician: Technician = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    specialties: data.specialties || null,
    location: data.location || null,
    isActive: data.is_active !== false, // Mapeia is_active para isActive (default: true)
  };

  return technician;
};
```

#### Serviço Agendado (ScheduledService)
```typescript
export const mapScheduledService = (rawData: any): ScheduledService => {
  return {
    id: rawData.id,
    createdAt: rawData.created_at || new Date().toISOString(), // Mapeia created_at para createdAt
    serviceOrderId: rawData.service_order_id, // Mapeia service_order_id para serviceOrderId
    technicianId: rawData.technician_id, // Mapeia technician_id para technicianId
    technicianName: rawData.technician_name, // Mapeia technician_name para technicianName
    clientId: rawData.client_id, // Mapeia client_id para clientId
    clientName: rawData.client_name, // Mapeia client_name para clientName
    scheduledStartTime: rawData.scheduled_start_time, // Mapeia scheduled_start_time para scheduledStartTime
    scheduledEndTime: rawData.scheduled_end_time, // Mapeia scheduled_end_time para scheduledEndTime
    address: rawData.address,
    description: rawData.description,
    status: rawData.status,
  };
};
```

#### Diagnóstico (EquipmentDiagnosis)
```typescript
export const mapDiagnosisData = (data: any): EquipmentDiagnosis => {
  return {
    id: data.id,
    createdAt: data.created_at || null, // Mapeia created_at para createdAt
    updatedAt: data.updated_at || null, // Mapeia updated_at para updatedAt
    serviceOrderId: data.service_order_id, // Mapeia service_order_id para serviceOrderId
    workshopUserId: data.workshop_user_id, // Mapeia workshop_user_id para workshopUserId
    diagnosisDetails: data.diagnosis_details, // Mapeia diagnosis_details para diagnosisDetails
    recommendedService: data.recommended_service || null, // Mapeia recommended_service para recommendedService
    estimatedCost: data.estimated_cost || null, // Mapeia estimated_cost para estimatedCost
    estimatedCompletionDate: data.estimated_completion_date || null, // Mapeia estimated_completion_date para estimatedCompletionDate
    partsPurchaseLink: data.parts_purchase_link || null, // Mapeia parts_purchase_link para partsPurchaseLink
  };
};
```

#### Serviço em Garantia (WarrantyService)
```typescript
return data.map(item => ({
  id: item.id,
  originalOrderId: item.original_order_id, // Mapeia original_order_id para originalOrderId
  warrantyOrderId: item.warranty_order_id, // Mapeia warranty_order_id para warrantyOrderId
  createdAt: item.created_at, // Mapeia created_at para createdAt
  notes: item.notes
}));
```

## Resultado

Após a implementação da solução, as informações de garantia são exibidas corretamente na interface do usuário:

1. Para ordens sem garantia:
   - É exibida a mensagem "Sem Informações de Garantia"
   - O botão "Configurar Garantia" está disponível

2. Para ordens com garantia ativa:
   - É exibida a mensagem "Garantia Ativa"
   - São exibidas as datas de início e término da garantia
   - É exibido o progresso da garantia
   - São exibidos os termos da garantia
   - O botão "Criar Atendimento em Garantia" está disponível
   - O botão "Editar Configurações de Garantia" está disponível

3. Para ordens com garantia expirada:
   - É exibida a mensagem "Garantia Expirada"
   - São exibidas as datas de início e término da garantia
   - É exibido o progresso da garantia
   - São exibidos os termos da garantia
   - O botão "Editar Configurações de Garantia" está disponível

4. Para atendimentos em garantia:
   - É exibida a mensagem "Atendimento em Garantia"
   - É exibido o ID da ordem original
   - O botão "Ver Ordem Original" está disponível

## Lições Aprendidas

1. **Importância do mapeamento de dados**: É crucial garantir que todos os campos necessários sejam mapeados corretamente entre o backend e o frontend.

2. **Uso de logs de depuração**: Os logs de depuração são essenciais para identificar problemas e verificar se a solução foi aplicada corretamente.

3. **Abordagem sistemática**: Uma abordagem sistemática para identificar e resolver problemas é fundamental para o sucesso.

## Recomendações

1. **Testes automatizados**: Implementar testes automatizados para garantir que o mapeamento de dados esteja funcionando corretamente.

2. **Validação de dados**: Implementar validação de dados para garantir que os dados estejam no formato correto antes de serem salvos no banco de dados.

3. **Documentação**: Manter a documentação atualizada para facilitar a manutenção futura.

4. **Revisão de código**: Realizar revisões de código regularmente para identificar problemas semelhantes antes que eles afetem os usuários.
