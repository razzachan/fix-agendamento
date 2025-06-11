@echo off
echo ========================================
echo BACKUP DOS ARQUIVOS IMPORTANTES
echo Eletro Fix Hub Pro
echo ========================================

set BACKUP_DIR=backup_projeto_%date:~-4,4%%date:~-10,2%%date:~-7,2%
mkdir %BACKUP_DIR%

echo Criando backup em: %BACKUP_DIR%

echo.
echo Copiando arquivos principais...

REM Arquivos de configuração
copy package.json %BACKUP_DIR%\
copy package-lock.json %BACKUP_DIR%\
copy tsconfig.json %BACKUP_DIR%\
copy tailwind.config.js %BACKUP_DIR%\
copy vite.config.ts %BACKUP_DIR%\

REM Documentação
copy PROJETO_RESUMO_COMPLETO.md %BACKUP_DIR%\
copy README.md %BACKUP_DIR%\ 2>nul

REM Criar estrutura de diretórios
mkdir %BACKUP_DIR%\src
mkdir %BACKUP_DIR%\src\components
mkdir %BACKUP_DIR%\src\components\dashboard
mkdir %BACKUP_DIR%\src\components\orders
mkdir %BACKUP_DIR%\src\components\schedules
mkdir %BACKUP_DIR%\src\hooks
mkdir %BACKUP_DIR%\src\hooks\data
mkdir %BACKUP_DIR%\src\services
mkdir %BACKUP_DIR%\src\services\calendar
mkdir %BACKUP_DIR%\src\services\orderLifecycle
mkdir %BACKUP_DIR%\src\types

REM Componentes importantes
copy src\components\dashboard\LifecycleDashboard.tsx %BACKUP_DIR%\src\components\dashboard\
copy src\components\orders\CreateOrderFromAgendamento.tsx %BACKUP_DIR%\src\components\orders\
copy src\components\schedules\TechnicianCalendarView.tsx %BACKUP_DIR%\src\components\schedules\
copy src\components\schedules\RoutingManager.tsx %BACKUP_DIR%\src\components\schedules\

REM Hooks
copy src\hooks\useCalendarSchedule.ts %BACKUP_DIR%\src\hooks\
copy src\hooks\data\useAgendamentosData.ts %BACKUP_DIR%\src\hooks\data\

REM Serviços
copy src\services\agendamentos.ts %BACKUP_DIR%\src\services\
copy src\services\calendar\CalendarService.ts %BACKUP_DIR%\src\services\calendar\
copy src\services\orderLifecycle\OrderLifecycleService.ts %BACKUP_DIR%\src\services\orderLifecycle\

REM Tipos
copy src\types\calendar.ts %BACKUP_DIR%\src\types\

echo.
echo ========================================
echo BACKUP CONCLUÍDO!
echo ========================================
echo.
echo Arquivos salvos em: %BACKUP_DIR%
echo.
echo Para restaurar no novo PC:
echo 1. Copie a pasta %BACKUP_DIR% para o novo computador
echo 2. Execute: npm install
echo 3. Configure as variáveis de ambiente
echo 4. Execute: npm run dev
echo.
pause
