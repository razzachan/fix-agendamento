# WhatsApp MCP - Comandos Rápidos

## 🚀 **COMANDOS PARA RETOMAR RAPIDAMENTE**

### **1. Navegar para o Projeto**
```bash
cd "C:\Users\akrom\OneDrive\Área de Trabalho\eletro-fix-hub-pro-main"
```

### **2. Iniciar WhatsApp Bridge (Terminal 1)**
```bash
cd whatsapp-mcp/whatsapp-bridge
PATH="$(pwd)/mingw64/bin:$PATH" "/c/Program Files/Go/bin/go.exe" run main.go
```
**Resultado esperado:** QR Code aparece no terminal

### **3. Iniciar Servidor MCP Python (Terminal 2)**
```bash
cd whatsapp-mcp/whatsapp-mcp-server
"/c/Users/akrom/AppData/Local/Programs/Python/Python312/Scripts/uv.exe" run main.py
```
**Resultado esperado:** Servidor roda silenciosamente

### **4. Conectar WhatsApp**
1. Abrir WhatsApp no celular
2. **Configurações** > **Aparelhos Conectados**
3. **Conectar um aparelho**
4. Escanear QR Code do terminal

### **5. Testar no VS Code**
1. Abrir Chat Copilot: `Ctrl+Alt+I`
2. Selecionar **Agent** mode
3. Clicar em **Tools**
4. Verificar ferramentas WhatsApp disponíveis

---

## 🔧 **COMANDOS DE TROUBLESHOOTING**

### **Se WhatsApp Bridge não compilar:**
```bash
cd whatsapp-mcp/whatsapp-bridge
PATH="$(pwd)/mingw64/bin:$PATH" "/c/Program Files/Go/bin/go.exe" mod tidy
PATH="$(pwd)/mingw64/bin:$PATH" "/c/Program Files/Go/bin/go.exe" build -v main.go
```

### **Se Servidor MCP não iniciar:**
```bash
cd whatsapp-mcp/whatsapp-mcp-server
"/c/Users/akrom/AppData/Local/Programs/Python/Python312/Scripts/uv.exe" sync
"/c/Users/akrom/AppData/Local/Programs/Python/Python312/Scripts/uv.exe" run main.py
```

### **Verificar Dependências:**
```bash
# Go
"/c/Program Files/Go/bin/go.exe" version

# Python
"/c/Users/akrom/AppData/Local/Programs/Python/Python312/python.exe" --version

# uv
"/c/Users/akrom/AppData/Local/Programs/Python/Python312/Scripts/uv.exe" --version
```

---

## 📱 **TESTE RÁPIDO NO VS CODE**

### **Comandos de Teste:**
```
@agent Busque meus contatos do WhatsApp
@agent Liste minhas conversas recentes
@agent Envie "Teste MCP" para [número]
```

### **Ferramentas Esperadas:**
- ✅ search_contacts
- ✅ list_messages  
- ✅ send_message
- ✅ send_file
- ✅ download_media

---

## 📂 **ARQUIVOS IMPORTANTES**

### **Configuração:**
- `.vscode/mcp.json` - Configuração MCP do VS Code
- `whatsapp-mcp/whatsapp-bridge/main.go` - Bridge corrigido
- `whatsapp-mcp/whatsapp-mcp-server/main.py` - Servidor MCP

### **Documentação:**
- `WHATSAPP_MCP_STATUS_FINAL.md` - Status completo
- `whatsapp-mcp-setup-guide.md` - Guia de instalação
- `WHATSAPP_MCP_COMANDOS_RAPIDOS.md` - Este arquivo

---

## ⚡ **RESUMO ULTRA-RÁPIDO**

1. **Terminal 1:** `cd whatsapp-mcp/whatsapp-bridge && PATH="$(pwd)/mingw64/bin:$PATH" go run main.go`
2. **Terminal 2:** `cd whatsapp-mcp/whatsapp-mcp-server && uv run main.py`  
3. **WhatsApp:** Escanear QR Code
4. **VS Code:** Agent Mode > Tools > Testar WhatsApp

**Status:** PRONTO PARA CONEXÃO ✅
