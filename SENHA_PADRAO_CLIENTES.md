# 🔐 Senha Padrão para Clientes - Fix Fogões

## 📋 Informações Importantes

### **🔑 Nova Senha Padrão:**
```
FixFogoes@2024
```

### **📧 Formato de Email Temporário:**
```
cliente[TELEFONE]@fixfogoes.com.br
```

## 🎯 Por que a Mudança?

### **❌ Problema Anterior:**
- **Senha:** `123456` (muito fraca)
- **Email:** `cliente[TELEFONE]@fixfogoes.temp` (domínio inválido)

### **✅ Nova Implementação:**
- **Senha:** `FixFogoes@2024` (atende requisitos do Supabase)
- **Email:** `cliente[TELEFONE]@fixfogoes.com.br` (domínio válido)

## 📊 Requisitos do Supabase Auth

### **🔐 Política de Senhas:**
- ✅ **Mínimo 8 caracteres** (FixFogoes@2024 = 14 chars)
- ✅ **Letra maiúscula** (F, F)
- ✅ **Letra minúscula** (ix, ogoes)
- ✅ **Número** (2024)
- ✅ **Símbolo especial** (@)
- ✅ **Não está em lista de senhas vazadas**

## 🔧 Implementação

### **1. Middleware (Python):**
```python
senha_padrao = "FixFogoes@2024"
email = f"cliente{telefone_limpo}@fixfogoes.com.br"
```

### **2. Frontend (TypeScript):**
```typescript
password: 'FixFogoes@2024'
```

## 📱 Como Informar aos Clientes

### **📧 Email de Boas-vindas:**
```
Olá [NOME],

Sua conta foi criada com sucesso!

📧 Email: cliente[TELEFONE]@fixfogoes.com.br
🔐 Senha: FixFogoes@2024

Acesse: app.fixfogoes.com.br
```

### **📱 WhatsApp/SMS:**
```
🎉 Conta criada!
📧 cliente[TELEFONE]@fixfogoes.com.br
🔐 FixFogoes@2024
🌐 app.fixfogoes.com.br
```

## ⚠️ Observações Importantes

1. **🔄 Retrocompatibilidade:** Contas antigas com `123456` continuam funcionando
2. **🔐 Segurança:** Nova senha atende todos os requisitos do Supabase
3. **📧 Email válido:** Domínio real permite recuperação de senha
4. **🎯 Consistência:** Mesma senha em middleware e frontend

## 🚀 Próximos Passos

1. **✅ Deploy das alterações**
2. **📧 Configurar email de boas-vindas**
3. **📱 Atualizar templates de WhatsApp**
4. **📋 Treinar equipe sobre nova senha**
