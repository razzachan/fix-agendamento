@echo off
echo Liberando portas no Windows Firewall...
echo.

netsh advfirewall firewall add rule name="Webhook AI 3100" dir=in action=allow protocol=TCP localport=3100
if %errorlevel% equ 0 (
    echo ✓ Porta 3100 liberada com sucesso
) else (
    echo ✗ Erro ao liberar porta 3100
)

netsh advfirewall firewall add rule name="API 3001" dir=in action=allow protocol=TCP localport=3001
if %errorlevel% equ 0 (
    echo ✓ Porta 3001 liberada com sucesso
) else (
    echo ✗ Erro ao liberar porta 3001
)

netsh advfirewall firewall add rule name="Vite 8082" dir=in action=allow protocol=TCP localport=8082
if %errorlevel% equ 0 (
    echo ✓ Porta 8082 liberada com sucesso
) else (
    echo ✗ Erro ao liberar porta 8082
)

echo.
echo Todas as portas foram configuradas!
echo Agora você pode acessar de outros dispositivos:
echo - Webhook: http://192.168.0.15:3100/health
echo - API: http://192.168.0.15:3001
echo - Frontend: http://192.168.0.15:8082
echo.
pause
