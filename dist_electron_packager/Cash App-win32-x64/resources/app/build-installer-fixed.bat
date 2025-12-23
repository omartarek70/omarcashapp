@echo off
REM Run this script as Administrator. It requires NSIS installed and in PATH (makensis).
REM It packages the portable folder into an NSIS Setup.exe using installer.nsi.

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
