@echo off
setlocal

REM Creates the Android TWA project (interactive prompts; press Enter to accept defaults).
REM IMPORTANT: This uses the LIVE manifest URL. Make sure https://arvindsweets.com has the updated manifest + icons + sw.js deployed.

cd /d "%~dp0"

REM Optional: provide keystore passwords for build step (not required for init)
REM set "BUBBLEWRAP_KEYSTORE_PASSWORD=changeit"
REM set "BUBBLEWRAP_KEY_PASSWORD=changeit"

call npx --yes @bubblewrap/cli init --manifest https://arvindsweets.com/manifest.json --directory android

endlocal
