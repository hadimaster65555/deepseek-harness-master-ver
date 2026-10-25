@echo off
setlocal DisableDelayedExpansion
set "signTool=%MH_DESKTOP_WINDOWS_SIGNTOOL%"
set "certificateFile=%MH_DESKTOP_WINDOWS_CER_FILE%"
set "tokenPin=%MH_DESKTOP_WINDOWS_TOKEN_PIN%"
set "keyContainer=%MH_DESKTOP_WINDOWS_KEY_CONTAINER%"
set "targetFile=%MH_DESKTOP_WINDOWS_SIGN_TARGET%"
set "appendSignature="
if "%MH_DESKTOP_WINDOWS_SIGN_APPEND%"=="1" set "appendSignature=/as"
set "MH_DESKTOP_WINDOWS_SIGNTOOL="
set "MH_DESKTOP_WINDOWS_CER_FILE="
set "MH_DESKTOP_WINDOWS_TOKEN_PIN="
set "MH_DESKTOP_WINDOWS_KEY_CONTAINER="
set "MH_DESKTOP_WINDOWS_SIGN_TARGET="
set "MH_DESKTOP_WINDOWS_SIGN_APPEND="
set "signTool=" & set "certificateFile=" & set "tokenPin=" & set "keyContainer=" & set "targetFile=" & set "appendSignature=" & "%signTool%" sign /v /fd sha256 /f "%certificateFile%" /kc "[{{%tokenPin%}}]=%keyContainer%" /csp "eToken Base Cryptographic Provider" %appendSignature% "%targetFile%"
exit /b %errorlevel%
