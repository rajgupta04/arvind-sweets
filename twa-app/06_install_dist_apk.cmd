@echo off
setlocal enabledelayedexpansion

REM Installs the newest APK from twa-app\dist to a connected Android device via ADB.

set "ROOT=%~dp0"
set "DIST_DIR=%ROOT%dist"

where adb >nul 2>&1
if errorlevel 1 (
  echo [ERROR] adb not found on PATH.
  echo Install Android platform-tools or add adb.exe to PATH.
  exit /b 1
)

if not exist "%DIST_DIR%" (
  echo [ERROR] Missing "%DIST_DIR%".
  echo Run 05_package_apk.cmd first.
  exit /b 1
)

REM Find newest APK in dist/
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Get-ChildItem -Path '%DIST_DIR%' -Filter *.apk -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName"`) do set "APK=%%I"

if not defined APK (
  echo [ERROR] No .apk found in "%DIST_DIR%".
  echo Run 05_package_apk.cmd first.
  exit /b 1
)

REM Pick the first connected, authorized device.
set "DEVICE="
for /f "tokens=1,2" %%A in ('adb devices') do (
  if "%%B"=="device" (
    set "DEVICE=%%A"
    goto :haveDevice
  )
)

:haveDevice
if not defined DEVICE (
  echo [ERROR] No authorized device found.
  echo Make sure USB debugging is enabled, then accept the RSA prompt on the phone.
  echo.
  adb devices
  exit /b 1
)

echo [INFO] Installing:
echo   %APK%
echo [INFO] To device:
echo   %DEVICE%

adb -s %DEVICE% install -r "%APK%"
if errorlevel 1 (
  echo [WARN] Install update failed. Trying uninstall ^& reinstall...
  adb -s %DEVICE% uninstall com.arvindsweets.app >nul 2>&1
  adb -s %DEVICE% install "%APK%"
  if errorlevel 1 (
    echo [ERROR] adb install failed.
    exit /b 1
  )
)

echo [OK] Installed.
endlocal
