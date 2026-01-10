@echo off
setlocal

cd /d "%~dp0\android"

REM Prefer adb on PATH, fallback to Android SDK adb
set "ADB=adb"
where adb >nul 2>nul
if errorlevel 1 (
  set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
)

echo Using ADB: %ADB%
echo.

echo Connected devices:
"%ADB%" devices
echo.

echo Searching for APK outputs...
for /f "usebackq delims=" %%F in (`dir /s /b "*.apk" 2^>nul`) do (
  set "APK=%%F"
  goto :found
)

echo No APK found yet.
echo Build first using: 03_build_local_apk.cmd
exit /b 1

:found
echo Installing:
echo %APK%
echo.
"%ADB%" install -r "%APK%"

echo.
echo Done.
endlocal
