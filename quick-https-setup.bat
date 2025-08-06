@echo off
echo.
echo 🔒 CONFIGURAÇÃO RÁPIDA DE HTTPS PARA MOBILE
echo ==========================================
echo.
echo Problema: Câmera não funciona em HTTP no mobile
echo Solução: Configurar HTTPS local
echo.

REM Verificar se o Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado. Instale em: https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
echo.

REM Verificar se o mkcert está instalado
mkcert -version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Instalando mkcert via Chocolatey...
    
    REM Verificar se o Chocolatey está instalado
    choco --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo ❌ Chocolatey não encontrado.
        echo.
        echo 🚀 INSTALAÇÃO MANUAL NECESSÁRIA:
        echo 1. Instale o Chocolatey: https://chocolatey.org/install
        echo 2. Execute: choco install mkcert
        echo 3. Execute este script novamente
        echo.
        echo OU baixe diretamente: https://github.com/FiloSottile/mkcert/releases
        pause
        exit /b 1
    )
    
    echo Instalando mkcert...
    choco install mkcert -y
    
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar mkcert
        pause
        exit /b 1
    )
)

echo ✅ mkcert encontrado
echo.

REM Instalar CA local
echo 🔑 Configurando autoridade certificadora local...
mkcert -install

REM Obter IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do (
        set LOCAL_IP=%%b
        goto :found_ip
    )
)
:found_ip

if "%LOCAL_IP%"=="" set LOCAL_IP=192.168.1.100

echo 📱 IP local detectado: %LOCAL_IP%
echo.

REM Gerar certificados
echo 🔐 Gerando certificados SSL...
mkcert localhost 127.0.0.1 %LOCAL_IP%

REM Renomear arquivos
for %%f in (localhost+*-key.pem) do ren "%%f" "localhost-key.pem"
for %%f in (localhost+*.pem) do (
    if not "%%f"=="localhost-key.pem" ren "%%f" "localhost.pem"
)

echo ✅ Certificados gerados!
echo.

REM Atualizar package.json
echo ⚙️ Adicionando scripts ao package.json...
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['dev:https'] = 'vite --host 0.0.0.0 --port 8082 --https';
pkg.scripts['dev:mobile'] = 'npm run dev:https';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Scripts adicionados!');
"

echo.
echo 🎉 CONFIGURAÇÃO COMPLETA!
echo.
echo 📱 COMO USAR NO MOBILE:
echo 1. Execute: npm run dev:https
echo 2. Acesse: https://%LOCAL_IP%:8082
echo 3. Aceite o certificado no navegador
echo 4. A câmera funcionará perfeitamente! 📸
echo.
echo 💡 DICA: Salve o endereço HTTPS nos favoritos
echo.

REM Perguntar se quer iniciar o servidor
set /p start_server="🚀 Iniciar servidor HTTPS agora? (s/n): "
if /i "%start_server%"=="s" (
    echo.
    echo Iniciando servidor HTTPS...
    npm run dev:https
)

pause
