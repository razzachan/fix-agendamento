# Guia de Instalação WhatsApp MCP - Windows

## Status do Setup 🔄 EM PROGRESSO
- ✅ Repositório clonado em: `whatsapp-mcp/`
- ✅ Go instalado: `go version go1.24.5 windows/amd64`
- ✅ Python instalado: `Python 3.12.10`
- ✅ uv instalado: `uv 0.8.2`
- ✅ MinGW-w64 instalado e funcionando: `gcc 14.2.0`
- ✅ Dependências Go atualizadas
- ⚠️ WhatsApp Bridge precisa de correções de API
- ✅ Servidor MCP Python executando
- ❌ Configuração Claude Desktop (próximo passo)
- ❌ FFmpeg não verificado (opcional)

## Pré-requisitos INSTALADOS ✅

### 1. Go (✅ INSTALADO)
- **Versão**: go1.24.5 windows/amd64
- **Caminho**: `C:\Program Files\Go\bin\go.exe`
- **Status**: Funcionando

### 2. Python e uv (✅ INSTALADOS)
- **Python**: 3.12.10
- **Caminho Python**: `C:\Users\akrom\AppData\Local\Programs\Python\Python312\python.exe`
- **uv**: 0.8.2
- **Caminho uv**: `C:\Users\akrom\AppData\Local\Programs\Python\Python312\Scripts\uv.exe`
- **Status**: Funcionando

### 3. MSYS2 (✅ INSTALADO)
- **Status**: Instalado via winget
- **Próximo passo**: Configurar PATH para gcc

### 4. FFmpeg (❌ PENDENTE - Opcional)
```bash
# Instalar se necessário para áudio:
winget install Gyan.FFmpeg
```

## Etapas de Configuração

### Etapa 1: Configurar o WhatsApp Bridge (Go)
```bash
cd whatsapp-mcp/whatsapp-bridge

# Habilitar CGO para Windows:
go env -w CGO_ENABLED=1

# Executar o bridge:
go run main.go
```
**Importante:** Escaneie o QR Code com WhatsApp (Aparelhos Conectados)

### Etapa 2: Configurar o Servidor MCP (Python)
```bash
cd ../whatsapp-mcp-server

# Instalar dependências:
uv sync

# Executar servidor:
uv run main.py
```

### Etapa 3: Configurar Claude Desktop
Criar arquivo: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "whatsapp": {
      "command": "C:\\caminho\\para\\uv.exe",
      "args": [
        "--directory",
        "C:\\Users\\akrom\\OneDrive\\Área de Trabalho\\eletro-fix-hub-pro-main\\whatsapp-mcp\\whatsapp-mcp-server",
        "run",
        "main.py"
      ]
    }
  }
}
```

### Etapa 4: Configurar Cursor (Alternativo)
Criar arquivo: `%USERPROFILE%\\.cursor\\mcp.json` com o mesmo conteúdo.

## Comandos de Verificação

```bash
# Verificar Go:
go version

# Verificar Python:
python --version

# Verificar uv:
uv --version

# Verificar FFmpeg (opcional):
ffmpeg -version

# Localizar uv para configuração:
where uv
```

## Próximos Passos

1. **Instalar pré-requisitos** (Go, Python, uv)
2. **Configurar CGO** para Windows
3. **Executar WhatsApp Bridge** e escanear QR
4. **Executar Servidor MCP**
5. **Configurar Claude/Cursor**
6. **Reiniciar aplicação**

## Ferramentas MCP Disponíveis

- `search_contacts` - Buscar contatos
- `list_messages` - Listar mensagens
- `send_message` - Enviar mensagens
- `send_file` - Enviar arquivos
- `send_audio_message` - Enviar áudio
- `download_media` - Baixar mídia

## Status Atual e Próximos Passos

### ✅ Concluído
1. Todas as dependências instaladas (Go, Python, uv, MinGW)
2. Repositório clonado e configurado
3. Servidor MCP Python funcionando
4. Dependências Go atualizadas

### ⚠️ Problema Atual
O código do WhatsApp Bridge precisa ser atualizado para a nova versão da API whatsmeow.
Erros encontrados:
- Funções requerem `context.Context` como primeiro parâmetro
- API de download de mídia mudou
- Métodos de store precisam de contexto

### 🔧 Soluções Possíveis

**Opção 1: Usar versão estável anterior**
```bash
cd whatsapp-bridge
go mod edit -require=go.mau.fi/whatsmeow@v0.0.0-20240307094001-123456789abc
go mod tidy
```

**Opção 2: Aguardar correção do repositório**
- O autor pode atualizar o código em breve
- Verificar issues no GitHub

**Opção 3: Usar fork atualizado**
- Procurar forks que já corrigiram a API

## Troubleshooting

- **CGO Error**: ✅ Resolvido com MinGW-w64
- **QR Code**: Usar WhatsApp > Aparelhos Conectados
- **API Errors**: Problema conhecido com versão atual
- **PATH**: Adicionar Go, Python, uv ao PATH do sistema
