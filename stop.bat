@echo off
setlocal enabledelayedexpansion
title Stop AgentMemory
cd /d "%~dp0"

echo --------------------------------------------------------
echo  Tat AgentMemory (worker + engine detached)
echo  Ports: 3111 (REST) / 3112 (streams) / 49134 (engine)
echo --------------------------------------------------------

set "FOUND="
for %%P in (3111 3112 49134) do (
    for /f "tokens=5" %%I in ('netstat -ano ^| findstr ":%%P " ^| findstr LISTENING') do (
        echo   - giet PID %%I  ^(port %%P^)
        taskkill /F /PID %%I >nul 2>&1
        set "FOUND=1"
    )
)

:: Xoa pidfile cu de lan start sau khong nham (USERPROFILE=%cd% -> pidfile o day)
del /q ".agentmemory\iii.pid" ".agentmemory\worker.pid" >nul 2>&1

if not defined FOUND (
    echo   Khong co gi dang chay tren 3111/3112/49134.
) else (
    echo   Da tat xong.
)
echo --------------------------------------------------------

pause
