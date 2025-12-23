@echo off
REM Build NSIS installer (run as Administrator). Requires NSIS (makensis) in PATH.

cd /d "%~dp0"
echo Building NSIS installer...

:: Check for makensis
where makensis >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Error: makensis not found. Install NSIS (https://nsis.sourceforge.io/Download) and add to PATH.
    pause
    exit /b 1
)

makensis installer.nsi
if %ERRORLEVEL% neq 0 (
    echo NSIS build failed.
    pause
    exit /b 1
)

echo Installer created at dist_electron_packager\CashApp-Setup.exe
pause