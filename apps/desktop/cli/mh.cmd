@echo off
setlocal DisableDelayedExpansion
set "ELECTRON_RUN_AS_NODE=1"
"%~dp0..\..\..\..\Master Harness.exe" --expose-internals "%~dp0..\..\..\app.asar\mh\node_modules\@master-harness\desktop-host\lib\cli.js" %*
exit /b %errorlevel%
