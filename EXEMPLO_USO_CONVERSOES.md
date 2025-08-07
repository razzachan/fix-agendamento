# 🎯 COMO USAR O SISTEMA DE CONVERSÕES INTELIGENTES

## 📊 **ESTRATÉGIA: DADOS SEPARADOS**

### **✅ PARA O GOOGLE ADS:**
- **Conversões categorizadas simples** (ex: "Microondas_Agendamento")
- **Valor da conversão** (ex: R$ 450,00)
- **GCLID** (para tracking)
- **Order ID** (para deduplicação)

### **✅ PARA NOSSO BANCO:**
- **Todos os dados detalhados** para análise interna
- **Informações do cliente, equipamento, problema**
- **Dados de rentabilidade, técnico, satisfação**

---

## 🚀 **EXEMPLO DE USO NO CÓDIGO:**

### **📱 NO MODAL DE AGENDAMENTO:**

```typescript
import { useGoogleAdsTracking } from '@/hooks/useGoogleAdsTracking';

const { recordSmartConversion } = useGoogleAdsTracking();

// Quando cliente agenda um serviço
const handleAgendamento = async () => {
  await recordSmartConversion(
    'OS_12345',                    // ID da ordem de serviço
    'Microondas Midea 30L',        // Descrição do equipamento
    350.00,                        // Valor do serviço
    {
      // 📊 DADOS DETALHADOS (salvos no nosso banco)
      equipmentBrand: 'Midea',
      equipmentModel: '30L',
      problemDescription: 'Não esquenta a comida',
      clientName: 'João Silva',
      clientPhone: '(48) 99999-9999',
      clientCity: 'Florianópolis',
      serviceType: 'diagnostico',
      initialCost: 350.00,
      leadSource: 'google_ads'
    }
  );
};
```

### **🎯 O QUE ACONTECE AUTOMATICAMENTE:**

**1. GOOGLE ADS RECEBE:**
```json
{
  "conversionName": "Microondas_Agendamento",
  "conversionValue": 350.00,
  "currency": "BRL",
  "gclid": "abc123...",
  "orderId": "OS_12345"
}
```

**2. NOSSO BANCO SALVA:**
```json
{
  "serviceOrderId": "OS_12345",
  "equipmentBrand": "Midea",
  "equipmentModel": "30L", 
  "problemDescription": "Não esquenta a comida",
  "clientName": "João Silva",
  "clientCity": "Florianópolis",
  "serviceType": "diagnostico",
  "initialCost": 350.00,
  "leadSource": "google_ads",
  "conversionTime": "2025-08-07T10:30:00Z"
}
```

---

## 🎯 **CONVERSÕES REGISTRADAS AUTOMATICAMENTE:**

Para o exemplo acima, o sistema registra **4 conversões no Google Ads**:

1. ✅ **Agendamento** (principal)
2. ✅ **Microondas_Agendamento** (categoria equipamento)
3. ✅ **Medio_Valor** (categoria valor R$ 300-800)
4. ✅ **FixEletros_Agendamento** (categoria site)

---

## 📊 **ANÁLISES POSSÍVEIS:**

### **🎯 NO GOOGLE ADS:**
- Qual categoria de equipamento converte mais?
- Qual faixa de valor tem melhor ROI?
- Qual site performa melhor?

### **🎯 NO NOSSO SISTEMA:**
- Quais marcas dão mais problema?
- Quais técnicos são mais eficientes?
- Quais cidades são mais rentáveis?
- Qual tipo de problema é mais comum?

---

## 🔧 **OUTROS EXEMPLOS:**

### **🔥 FOGÃO À GÁS:**
```typescript
await recordSmartConversion(
  'OS_12346',
  'Fogão Fischer 6 bocas',
  580.00,
  {
    equipmentBrand: 'Fischer',
    equipmentModel: '6 bocas',
    problemDescription: 'Cheiro de gás',
    clientCity: 'Balneário Camboriú',
    serviceType: 'conserto',
    finalCost: 580.00,
    technicianName: 'Carlos',
    leadSource: 'whatsapp'
  }
);
```

**Registra:**
- Agendamento
- Fogao_Gas_Agendamento  
- Medio_Valor
- FixEletros_Agendamento

### **👕 MÁQUINA DE LAVAR:**
```typescript
await recordSmartConversion(
  'OS_12347',
  'Máquina Brastemp 12kg',
  420.00,
  {
    equipmentBrand: 'Brastemp',
    equipmentModel: '12kg',
    problemDescription: 'Não centrifuga',
    clientCity: 'São José',
    serviceType: 'conserto',
    leadSource: 'google_ads'
  }
);
```

**Registra:**
- Agendamento
- Maquina_Lava_Seca_Agendamento
- Medio_Valor  
- FixEletros_Agendamento

---

## 🎉 **RESULTADO:**

### **✅ GOOGLE ADS:**
- **Dados limpos** e categorizados
- **Otimização automática** por categoria
- **Relatórios organizados** por equipamento/valor

### **✅ ANÁLISE INTERNA:**
- **Dados ricos** para business intelligence
- **Insights detalhados** sobre clientes e equipamentos
- **Otimização operacional** baseada em dados

**Melhor dos dois mundos!** 🎯🚀
