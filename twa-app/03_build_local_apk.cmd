@echo off
setlocal

REM Builds the project locally (APK/AAB depending on Bubblewrap version and template).
REM No Play Store upload is involved.

cd /d "%~dp0\android"

REM If you created android.keystore with password 'changeit', set these so Bubblewrap won't prompt:
set "BUBBLEWRAP_KEYSTORE_PASSWORD=changeit"
set "BUBBLEWRAP_KEY_PASSWORD=changeit"

call npx --yes @bubblewrap/cli build

echo.
echo If you want to install to a connected phone:
REM Typical output APK path can vary. You can use adb from platform-tools.
REM "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb" install -r path\to\your.apk

endlocal
