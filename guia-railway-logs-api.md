# 🔍 Guia: Acessar Logs do Railway via API

## 📋 **Passo a Passo para Acessar Logs**

### **🔑 1. Criar Token da API**

1. **Acesse**: https://railway.com/account/tokens
2. **Clique**: "Create Token"
3. **Escolha**: Account Token (acesso completo) ou Team Token
4. **Copie**: O token gerado

### **🔧 2. Configurar Token**

#### **Windows (PowerShell):**
```powershell
$env:RAILWAY_TOKEN="seu_token_aqui"
```

#### **Linux/Mac (Bash):**
```bash
export RAILWAY_TOKEN="seu_token_aqui"
```

#### **Ou adicione no .env:**
```env
RAILWAY_TOKEN=seu_token_aqui
```

### **🚀 3. Testar API Básica**

```bash
curl --request POST \
  --url https://backboard.railway.com/graphql/v2 \
  --header 'Authorization: Bearer SEU_TOKEN_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{"query":"query { me { name email } }"}'
```

### **📋 4. Listar Projetos e Serviços**

```bash
curl --request POST \
  --url https://backboard.railway.com/graphql/v2 \
  --header 'Authorization: Bearer SEU_TOKEN_AQUI' \
  --header 'Content-Type: application/json' \
  --data '{
    "query": "query { projects { edges { node { id name services { edges { node { id name } } } } } } }"
  }'
```

### **🔍 5. Descobrir Estrutura de Logs**

Execute o script Python que criamos:

```bash
python test-railway-api.py
```

## 📊 **Queries Comuns para Logs**

### **🔍 Query de Introspection (Descobrir Schema):**
```graphql
query IntrospectionQuery {
  __schema {
    types {
      name
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
```

### **📋 Possíveis Queries para Logs:**

#### **1. Logs de Deployment:**
```graphql
query {
  deployment(id: "DEPLOYMENT_ID") {
    logs {
      message
      timestamp
      severity
    }
  }
}
```

#### **2. Logs de Serviço:**
```graphql
query {
  service(id: "SERVICE_ID") {
    deployments {
      edges {
        node {
          id
          logs {
            message
            timestamp
          }
        }
      }
    }
  }
}
```

#### **3. Logs Recentes:**
```graphql
query {
  project(id: "PROJECT_ID") {
    services {
      edges {
        node {
          name
          deployments(first: 1) {
            edges {
              node {
                logs(last: 50) {
                  message
                  timestamp
                }
              }
            }
          }
        }
      }
    }
  }
}
```

## 🎯 **Como Encontrar IDs Necessários**

### **📋 1. Project ID:**
- **Dashboard**: URL do projeto (`railway.app/project/PROJECT_ID`)
- **Cmd+K**: No dashboard, copiar Project ID

### **🔧 2. Service ID:**
- **Dashboard**: Dentro do projeto, URL do serviço
- **API**: Query de projetos (mostrada acima)

### **🚀 3. Deployment ID:**
- **Dashboard**: Na aba Deployments
- **API**: Query de deployments do serviço

## 🔧 **Script Python Completo**

Use o arquivo `test-railway-api.py` que criamos:

```python
# 1. Definir token
export RAILWAY_TOKEN="seu_token_aqui"

# 2. Executar script
python test-railway-api.py
```

**O script vai:**
- ✅ Testar conexão com a API
- ✅ Listar seus projetos e serviços
- ✅ Descobrir estrutura de logs via introspection
- ✅ Tentar queries específicas para logs

## 📱 **Alternativas Rápidas**

### **🌐 1. GraphiQL Playground:**
- **URL**: https://railway.com/graphiql
- **Headers**: `{"Authorization": "Bearer SEU_TOKEN"}`
- **Vantagem**: Interface visual para testar queries

### **🔧 2. Railway CLI:**
```bash
# Instalar CLI
npm install -g @railway/cli

# Login
railway login

# Ver logs
railway logs
```

### **📊 3. Dashboard Web:**
- **URL**: https://railway.com/project/SEU_PROJECT_ID
- **Aba**: Deployments → Ver logs
- **Vantagem**: Interface visual completa

## 🎯 **Para Verificar OS da Liana**

### **📋 1. Primeiro, encontre o Service ID:**
```bash
curl --request POST \
  --url https://backboard.railway.com/graphql/v2 \
  --header 'Authorization: Bearer SEU_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "query": "query { projects { edges { node { name services { edges { node { id name } } } } } } }"
  }'
```

### **🔍 2. Depois, busque logs recentes:**
```bash
curl --request POST \
  --url https://backboard.railway.com/graphql/v2 \
  --header 'Authorization: Bearer SEU_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "query": "query { service(id: \"SERVICE_ID_AQUI\") { deployments(first: 1) { edges { node { logs(last: 100) { message timestamp } } } } } }"
  }'
```

### **🔍 3. Filtrar por "Liana":**
```bash
# Salvar logs em arquivo
curl ... > logs.json

# Filtrar por Liana
grep -i "liana" logs.json
```

## ⚡ **Execução Rápida**

### **🚀 1. Configurar:**
```bash
export RAILWAY_TOKEN="seu_token_railway"
```

### **🔍 2. Executar:**
```bash
python test-railway-api.py
```

### **📊 3. Analisar:**
O script vai mostrar:
- ✅ Se a API está funcionando
- ✅ Seus projetos e serviços
- ✅ Estrutura disponível para logs
- ✅ Tentativas de queries específicas

## 🎯 **Próximos Passos**

1. **Execute o script** para descobrir a estrutura exata
2. **Identifique o Service ID** do seu middleware
3. **Teste queries específicas** para logs
4. **Filtre por "Liana"** nos resultados
5. **Analise** se a OS foi criada ou se houve erro

**Com essas informações, você conseguirá acessar os logs do Railway e verificar se a OS da Liana foi criada ou se houve algum erro no processo! 🔍✨**
