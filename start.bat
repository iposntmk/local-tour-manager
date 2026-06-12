@echo off
setlocal enabledelayedexpansion
title AgentMemory Daemon - local-tour-manager (Port 3111)

:: 1. Chuyển vào thư mục gốc của project
cd /d "%~dp0"

:: 2. Load tất cả biến từ .agentmemory/.env vào môi trường
:: Bỏ qua comment (#) và dòng trống
for /f "usebackq tokens=1,* delims==" %%A in (".agentmemory\.env") do (
    set "line=%%A"
    if not "!line!"=="" (
        set "first=!line:~0,1!"
        if not "!first!"=="#" (
            set "%%A=%%B"
        )
    )
)

:: 3. Ép buộc USERPROFILE về project dir để cô lập data
set USERPROFILE=%cd%
set AGENTMEMORY_CONFIG_PATH=%cd%\.agentmemory\.env

echo --------------------------------------------------------
echo [local-tour-manager] Dang khoi dong AgentMemory...
echo Config Path   : %AGENTMEMORY_CONFIG_PATH%
echo Home Context  : %USERPROFILE%
echo REST Port     : %III_REST_PORT%
echo Viewer Port   : %AGENTMEMORY_VIEWER_PORT%
echo Graph Extract : %GRAPH_EXTRACTION_ENABLED%
echo LLM Model     : %OPENAI_MODEL%
echo Viewer        : http://localhost:%AGENTMEMORY_VIEWER_PORT%
echo --------------------------------------------------------

:: 4. Chạy server
npx -y @agentmemory/agentmemory@latest

pause
