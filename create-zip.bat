@echo off
echo 🔥 Criando arquivo ZIP para deploy...

REM Verificar se a pasta dist existe
if not exist "dist" (
    echo ❌ Erro: Pasta dist não encontrada!
    echo Execute 'npm run build' primeiro
    pause
    exit /b 1
)

REM Criar ZIP com PowerShell
echo 📦 Compactando arquivos...
powershell -command "Compress-Archive -Path 'dist\*' -DestinationPath 'fix-fogoes-deploy.zip' -Force"

if exist "fix-fogoes-deploy.zip" (
    echo ✅ Arquivo criado: fix-fogoes-deploy.zip
    echo 📊 Tamanho do arquivo:
    dir "fix-fogoes-deploy.zip" | findstr "fix-fogoes-deploy.zip"
    echo.
    echo 🎉 Pronto para upload!
    echo.
    echo 📋 PRÓXIMOS PASSOS:
    echo 1. Compre um domínio
    echo 2. Configure hospedagem com HTTPS
    echo 3. Faça upload do arquivo fix-fogoes-deploy.zip
    echo 4. Extraia os arquivos na raiz do site
    echo 5. Use PWA Builder para gerar APK
) else (
    echo ❌ Erro ao criar arquivo ZIP
)

pause
