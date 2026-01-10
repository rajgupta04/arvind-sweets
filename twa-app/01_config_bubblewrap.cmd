@echo off
setlocal

REM Configure Bubblewrap to use an existing JDK 17 + Android SDK (avoids prompts/downloads)
set "JDK17=C:\Users\rgss9\.jdk\jdk-17.0.16"

REM Bubblewrap expects androidSdkPath to contain either:
REM - tools\ (legacy) OR
REM - bin\ (newer command-line tools layout)
REM Android Studio installs cmdline-tools under: %LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat
REM The Android SDK *root* usually won't pass Bubblewrap validation.

set "ANDROID_SDK="
if exist "%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest\bin\sdkmanager.bat" (
	set "ANDROID_SDK=%LOCALAPPDATA%\Android\Sdk\cmdline-tools\latest"
) else if exist "%LOCALAPPDATA%\Android\Sdk\tools\bin\sdkmanager.bat" (
	set "ANDROID_SDK=%LOCALAPPDATA%\Android\Sdk"
)

if "%ANDROID_SDK%"=="" (
	echo Could not find Android SDK command-line tools (sdkmanager).
	echo.
	echo Fix options:
	echo 1^) Android Studio -^> SDK Manager -^> SDK Tools -^> install "Android SDK Command-line Tools (latest)"
	echo 2^) Or run Bubblewrap again and answer Yes when it offers to install the Android SDK.
	echo.
	echo Then re-run this script.
	exit /b 1
)

echo Using JDK: %JDK17%
echo Using Android SDK: %ANDROID_SDK%
echo.

echo Configuring Bubblewrap...
call npx --yes @bubblewrap/cli updateConfig --jdkPath "%JDK17%" --androidSdkPath "%ANDROID_SDK%"

echo.
echo Done.
endlocal
