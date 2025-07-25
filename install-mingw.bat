@echo off
echo Baixando MinGW-w64...

REM Criar diretório temporário
mkdir temp_mingw 2>nul
cd temp_mingw

REM Baixar MinGW-w64
echo Baixando MinGW-w64 (pode demorar alguns minutos)...
curl -L -o mingw64.7z "https://github.com/niXman/mingw-builds-binaries/releases/download/14.2.0-rt_v12-rev0/x86_64-14.2.0-release-posix-seh-ucrt-rt_v12-rev0.7z"

REM Verificar se o download foi bem-sucedido
if not exist mingw64.7z (
    echo Erro: Falha no download do MinGW-w64
    pause
    exit /b 1
)

echo Download concluído. Extraindo...

REM Extrair usando 7zip se disponível, senão usar PowerShell
where 7z >nul 2>&1
if %errorlevel% == 0 (
    7z x mingw64.7z -o"C:\"
) else (
    echo Usando PowerShell para extrair...
    powershell -command "Expand-Archive -Path 'mingw64.7z' -DestinationPath 'C:\' -Force"
)

REM Voltar ao diretório anterior
cd ..

REM Limpar arquivos temporários
rmdir /s /q temp_mingw

REM Adicionar ao PATH (temporariamente para esta sessão)
set PATH=C:\mingw64\bin;%PATH%

echo MinGW-w64 instalado em C:\mingw64
echo Testando gcc...
C:\mingw64\bin\gcc.exe --version

echo.
echo Para adicionar permanentemente ao PATH:
echo 1. Abra as Configurações do Sistema
echo 2. Vá em Variáveis de Ambiente
echo 3. Adicione C:\mingw64\bin ao PATH
echo.
echo Ou execute: setx PATH "%%PATH%%;C:\mingw64\bin"
echo.
pause
