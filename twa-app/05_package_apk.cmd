@echo off
setlocal enabledelayedexpansion

REM Packages the latest built APK into twa-app\dist for easy sharing.
REM Works with the Gradle-built outputs in twa-app\android\app\build\outputs\apk\

set "ROOT=%~dp0"
set "ANDROID_DIR=%ROOT%android"
set "DIST_DIR=%ROOT%dist"

if not exist "%ANDROID_DIR%\gradlew.bat" (
  echo [ERROR] Missing Android project at "%ANDROID_DIR%".
  echo Run 02_init_twa.cmd ^(Bubblewrap^) or ensure twa-app\android exists.
  exit /b 1
)

if not exist "%DIST_DIR%" (
  mkdir "%DIST_DIR%" >nul 2>&1
)

REM Find newest APK under outputs\apk (debug/release/etc)
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$p='%ANDROID_DIR%\\app\\build\\outputs\\apk'; Get-ChildItem -Path $p -Recurse -Filter *.apk -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName"`) do set "APK=%%I"

if not defined APK (
  echo [ERROR] No APK found under "%ANDROID_DIR%\app\build\outputs\apk".
  echo Build one first:
  echo   cd /d "%ANDROID_DIR%" ^&^& gradlew.bat :app:assembleDebug
  exit /b 1
)

for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd-HHmm'"`) do set "TS=%%T"

set "OUT=%DIST_DIR%\arvind-sweets-twa-%TS%.apk"

copy /y "%APK%" "%OUT%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to copy APK.
  exit /b 1
)

echo [OK] Copied:
echo   From: %APK%
echo   To:   %OUT%

endlocal
