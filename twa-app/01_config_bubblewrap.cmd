@echo off
setlocal

REM Configure Bubblewrap to use an existing JDK 17 + Android SDK (avoids prompts/downloads)
set "JDK17=C:\Users\rgss9\.jdk\jdk-17.0.16"
set "ANDROID_SDK=%LOCALAPPDATA%\Android\Sdk"

echo Using JDK: %JDK17%
echo Using Android SDK: %ANDROID_SDK%
echo.

echo Configuring Bubblewrap...
call npx --yes @bubblewrap/cli updateConfig --jdkPath "%JDK17%" --androidSdkPath "%ANDROID_SDK%"

echo.
echo Done.
endlocal
