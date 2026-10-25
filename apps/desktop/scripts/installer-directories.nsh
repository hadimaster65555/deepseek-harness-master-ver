!include "LogicLib.nsh"

Var mhFinalDirectory
Var mhNewDirectory
Var mhOldDirectory
Var mhOldMoved
Var mhNewMoved
Var mhDirectoryError
Var mhDirectorySource
Var mhDirectoryDestination
Var mhRestoreError
Var mhDirectoryLogDirectory
Var mhRecoveryStopped

; MoveFileEx preserves the destination and exposes the Windows error before rollback changes it.
; Open files inside a directory can make its rename return access denied (5).
!macro mhDirectoryOperation SOURCE DESTINATION RESULT PHASE
  Push $0
  Push $1
  Push $2
  StrCpy $0 0
  ${Do}
    ${If} "${DESTINATION}" == ""
      System::Call 'kernel32::RemoveDirectoryW(w "${SOURCE}") i.r1 ?e'
    ${Else}
      System::Call 'kernel32::MoveFileExW(w "${SOURCE}", w "${DESTINATION}", i 0) i.r1 ?e'
    ${EndIf}
    Pop ${RESULT}
    ${If} "${DESTINATION}" == ""
      ${If} ${RESULT} == 2
      ${OrIf} ${RESULT} == 3
        StrCpy $1 1
      ${EndIf}
    ${EndIf}
    ${If} $1 != 0
      StrCpy ${RESULT} 0
      ${ExitDo}
    ${EndIf}
    ClearErrors
    FileOpen $2 "$PLUGINSDIR\directory-operations.log" a
    ${IfNot} ${Errors}
      FileSeek $2 0 END
      FileWrite $2 "${PHASE}: Windows error: ${RESULT}$\r$\n"
      FileClose $2
    ${EndIf}
    ${If} ${RESULT} != 5
    ${AndIf} ${RESULT} != 32
    ${AndIf} ${RESULT} != 33
      ${ExitDo}
    ${EndIf}
    IntOp $0 $0 + 1
    ${If} $0 >= 10
      ${ExitDo}
    ${EndIf}
    IntOp $1 $0 * 250
    Sleep $1
  ${Loop}
  Pop $2
  Pop $1
  Pop $0
!macroend

!macro mhReportDirectoryFailure
  ${If} $mhRestoreError != 0
    StrCpy $mhRecoveryStopped "1"
  ${EndIf}
  !ifmacrodef customInstallerDirectoryFailed
    !insertmacro customInstallerDirectoryFailed
  !else
    DetailPrint "Directory operation failed ($mhDirectoryError): $mhDirectorySource -> $mhDirectoryDestination; restore error: $mhRestoreError"
  !endif
!macroend

!macro mhExtractPayload FILE
  !ifmacrodef customInstallerExtract
    !insertmacro customInstallerExtract "${FILE}"
  !else
    nsExec::ExecToStack '"$PLUGINSDIR\mh-7za.exe" x -y -bd -bb0 "-o$INSTDIR" "${FILE}"'
    Pop $R0
    Pop $R1
  !endif
  ${If} $R0 != 0
    DetailPrint $R1
    Call mhRollbackDirectories
    !ifmacrodef customInstallerExtractFailed
      !insertmacro customInstallerExtractFailed "${FILE}"
    !else
      MessageBox MB_OK|MB_ICONEXCLAMATION "$(decompressionFailed)" /SD IDOK
    !endif
    SetErrorLevel 2
    Quit
  ${EndIf}
!macroend

!macro mhStageApplication
  !ifdef MH_INSTALLER_LOG_DIR
    ; electron-builder defines the cache name after including our function bodies, before this section expands.
    StrCpy $mhDirectoryLogDirectory "${MH_INSTALLER_LOG_DIR}"
  !endif
  StrCpy $mhFinalDirectory $INSTDIR
  System::Call 'ole32::CoCreateGuid(g .r0) i .r1'
  ${If} $1 != 0
    SetErrorLevel 2
    Quit
  ${EndIf}
  StrCpy $mhNewDirectory "$INSTDIR.new-$0"
  StrCpy $mhOldDirectory "$INSTDIR.old-$0"
  StrCpy $mhOldMoved ""
  StrCpy $mhNewMoved ""
  StrCpy $mhDirectoryError 0
  StrCpy $mhRestoreError 0
  StrCpy $mhRecoveryStopped ""
  ClearErrors
  CreateDirectory $mhNewDirectory
  ${If} ${Errors}
    SetErrorLevel 2
    Quit
  ${EndIf}
  File /oname=$PLUGINSDIR\mh-7za.exe "${MH_SEVENZIP_PATH}"
  StrCpy $INSTDIR $mhNewDirectory
  SetOutPath $INSTDIR
  !insertmacro installApplicationFiles
  !ifdef MH_SEVENZIP_LICENSE_DIR
    File /oname=7zip-installer-LICENSE.txt "${MH_SEVENZIP_LICENSE_DIR}\LICENSE.txt"
    File /oname=7zip-installer-COPYING.txt "${MH_SEVENZIP_LICENSE_DIR}\COPYING"
  !endif
  !ifdef UNINSTALLER_ICON
    File /oname=uninstallerIcon.ico "${UNINSTALLER_ICON}"
  !endif
  StrCpy $INSTDIR $mhFinalDirectory
  SetOutPath $PLUGINSDIR
!macroend

Function .onGUIEnd
  Call mhCleanupDirectories
FunctionEnd

Function mhCleanupDirectories
  ${If} $mhRecoveryStopped == "1"
    Return
  ${EndIf}
  ${If} $mhFinalDirectory != ""
    Call mhRollbackDirectories
  ${EndIf}
FunctionEnd

; Only directories created or renamed by this installer are removed during rollback.
Function mhRollbackDirectories
  SetOutPath $PLUGINSDIR
  ${If} $mhNewMoved == "1"
    RMDir /r "\\?\$mhFinalDirectory"
    StrCpy $mhNewMoved ""
  ${EndIf}
  ${If} $mhOldMoved == "1"
    !insertmacro mhDirectoryOperation "$mhOldDirectory" "$mhFinalDirectory" $mhRestoreError "restore"
    ${If} $mhRestoreError != 0
      ; Leave the complete backup in place if another process prevents restoration.
      DetailPrint $mhOldDirectory
      RMDir /r "\\?\$mhNewDirectory"
      Return
    ${EndIf}
    StrCpy $mhOldMoved ""
  ${EndIf}
  ${If} $mhNewDirectory != ""
    RMDir /r "\\?\$mhNewDirectory"
  ${EndIf}
  StrCpy $INSTDIR $mhFinalDirectory
FunctionEnd

Function mhPromoteDirectories
  !ifmacrodef InstallerPublishStage
    !insertmacro InstallerPublishStage 2
  !endif
  ; SetOutPath opens a directory handle; release it before either rename.
  SetOutPath $PLUGINSDIR
  ClearErrors
  ${If} ${FileExists} "$mhFinalDirectory\*.*"
    StrCpy $mhDirectorySource $mhFinalDirectory
    StrCpy $mhDirectoryDestination $mhOldDirectory
    !insertmacro mhDirectoryOperation "$mhDirectorySource" "$mhDirectoryDestination" $mhDirectoryError "backup"
    ${If} $mhDirectoryError != 0
      Call mhRollbackDirectories
      !insertmacro mhReportDirectoryFailure
      SetErrors
      Return
    ${EndIf}
    StrCpy $mhOldMoved "1"
  ${Else}
    ; NSIS can create the destination before the install section starts.
    StrCpy $mhDirectorySource $mhFinalDirectory
    StrCpy $mhDirectoryDestination ""
    !insertmacro mhDirectoryOperation "$mhDirectorySource" "" $mhDirectoryError "remove-empty"
    ${If} $mhDirectoryError != 0
      Call mhRollbackDirectories
      !insertmacro mhReportDirectoryFailure
      SetErrors
      Return
    ${EndIf}
  ${EndIf}
  ClearErrors
  StrCpy $mhDirectorySource $mhNewDirectory
  StrCpy $mhDirectoryDestination $mhFinalDirectory
  !insertmacro mhDirectoryOperation "$mhDirectorySource" "$mhDirectoryDestination" $mhDirectoryError "promote"
  ${If} $mhDirectoryError != 0
    Call mhRollbackDirectories
    !insertmacro mhReportDirectoryFailure
    SetErrors
    Return
  ${EndIf}
  StrCpy $mhNewMoved "1"
  SetOutPath $mhFinalDirectory
  !ifmacrodef InstallerPublishStage
    !insertmacro InstallerPublishStage 3
  !endif
  ClearErrors
FunctionEnd

!macro mhFinishDirectories
  StrCpy $mhNewMoved ""
  ${If} $mhOldMoved == "1"
    RMDir /r "\\?\$mhOldDirectory"
    StrCpy $mhOldMoved ""
  ${EndIf}
!macroend
