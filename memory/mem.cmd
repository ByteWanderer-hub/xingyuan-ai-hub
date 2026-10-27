@echo off
rem Shared memory CLI wrapper (DSH / Codex / Claude on this machine).
rem Usage: mem.cmd briefing --scope machine   |   mem.cmd add --kind fact --text "..."
setlocal
chcp 65001 >nul 2>nul
set "PYTHONUTF8=1"
set "MEMDIR=%~dp0"
where python >nul 2>nul && (python "%MEMDIR%memory.py" %* & exit /b %ERRORLEVEL%)
where py >nul 2>nul && (py -3 "%MEMDIR%memory.py" %* & exit /b %ERRORLEVEL%)
echo [mem] python not found in PATH 1>&2
exit /b 9009
