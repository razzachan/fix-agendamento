#!/bin/bash

# =====================================================
# SCRIPT DE DEPLOY AUTOMÁTICO PARA HOSTGATOR
# =====================================================
# Este script será executado pelo Cron Job no cPanel
# Sincroniza o repositório GitHub e faz build automático
# =====================================================

# Configurações - AJUSTE CONFORME SEU CPANEL
CPANEL_USER="miragioc"  # Seu usuário do cPanel
DOMAIN="app.fixfogoes.com.br"
REPO_DIR="/home/$CPANEL_USER/public_html/$DOMAIN"
BACKUP_DIR="/home/$CPANEL_USER/backups/app-fixfogoes"
LOG_FILE="/home/$CPANEL_USER/logs/deploy.log"
BRANCH="main"
NODE_PATH="/home/$CPANEL_USER/.nvm/versions/node/v18.17.0/bin"  # Ajuste conforme sua versão do Node

# Função para log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> $LOG_FILE
}

# Função para criar backup
create_backup() {
    log "Criando backup..."
    mkdir -p $BACKUP_DIR
    if [ -d "$REPO_DIR" ]; then
        tar -czf "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$REPO_DIR" .
        log "Backup criado com sucesso"
        
        # Manter apenas os 5 backups mais recentes
        cd $BACKUP_DIR
        ls -t backup-*.tar.gz | tail -n +6 | xargs -r rm
    fi
}

# Função principal de deploy
deploy() {
    log "=== INICIANDO DEPLOY AUTOMÁTICO ==="

    # Configurar PATH para Node.js
    export PATH="$NODE_PATH:$PATH"

    # Criar diretórios necessários
    mkdir -p $(dirname $LOG_FILE)
    mkdir -p $BACKUP_DIR
    
    # Verificar se o diretório existe
    if [ ! -d "$REPO_DIR" ]; then
        log "Diretório não existe. Clonando repositório..."
        mkdir -p $(dirname $REPO_DIR)
        cd $(dirname $REPO_DIR)
        git clone https://github.com/razzachan/fix-agendamento.git $(basename $REPO_DIR)
        cd $REPO_DIR
    else
        log "Entrando no diretório do projeto..."
        cd $REPO_DIR
    fi
    
    # Criar backup antes de atualizar
    create_backup
    
    # Fazer pull das mudanças
    log "Fazendo pull do repositório..."
    git fetch origin
    git reset --hard origin/$BRANCH
    
    # Verificar se há mudanças
    if git diff HEAD@{1} --quiet; then
        log "Nenhuma mudança detectada. Deploy cancelado."
        return 0
    fi
    
    log "Mudanças detectadas. Continuando deploy..."
    
    # Instalar dependências (se package.json mudou)
    if git diff HEAD@{1} --name-only | grep -q "package.json\|package-lock.json"; then
        log "Instalando dependências..."
        npm ci --production=false
    fi
    
    # Fazer build
    log "Fazendo build do projeto..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log "Build realizado com sucesso!"
        
        # Copiar arquivos da build para o diretório web
        if [ -d "dist" ]; then
            log "Copiando arquivos da build..."
            rsync -av --delete dist/ ./
            log "Arquivos copiados com sucesso!"
        fi
        
        # Definir permissões corretas
        find . -type f -name "*.html" -exec chmod 644 {} \;
        find . -type f -name "*.css" -exec chmod 644 {} \;
        find . -type f -name "*.js" -exec chmod 644 {} \;
        find . -type d -exec chmod 755 {} \;
        
        log "=== DEPLOY CONCLUÍDO COM SUCESSO ==="
        
        # Enviar notificação de sucesso (opcional)
        echo "Deploy realizado com sucesso em $(date)" | mail -s "Deploy Success - app.fixfogoes.com.br" admin@fixfogoes.com.br 2>/dev/null || true
        
    else
        log "ERRO: Build falhou!"
        
        # Restaurar backup em caso de erro
        log "Restaurando backup..."
        LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup-*.tar.gz | head -n1)
        if [ -n "$LATEST_BACKUP" ]; then
            tar -xzf "$LATEST_BACKUP" -C "$REPO_DIR"
            log "Backup restaurado com sucesso"
        fi
        
        # Enviar notificação de erro (opcional)
        echo "Deploy falhou em $(date). Backup restaurado." | mail -s "Deploy Failed - app.fixfogoes.com.br" admin@fixfogoes.com.br 2>/dev/null || true
        
        exit 1
    fi
}

# Executar deploy
deploy
