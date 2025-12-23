!define APP_NAME "Cash App"
!define APP_EXE "Cash App.exe"
!define INSTALL_DIR "$PROGRAMFILES64\${APP_NAME}"

; Request application privileges for Windows
RequestExecutionLevel admin

SetCompressor lzma
OutFile "dist_electron_packager\CashApp-Setup.exe"
InstallDir ${INSTALL_DIR}

Page directory
Page instfiles

Section "Install"
  SetOutPath "$INSTDIR"
  ; Copy all files from packaged app folder
  File /r "dist_electron_packager\Cash App-win32-x64\*"

  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  ; Create shortcuts
  CreateShortcut "$DESKTOP\\${APP_NAME}.lnk" "$INSTDIR\\${APP_EXE}"
  CreateDirectory "$SMPROGRAMS\\${APP_NAME}"
  CreateShortcut "$SMPROGRAMS\\${APP_NAME}\\${APP_NAME}.lnk" "$INSTDIR\\${APP_EXE}"

  ; Write install location to registry
  WriteRegStr HKLM "Software\${APP_NAME}" "Install_Dir" "$INSTDIR"
SectionEnd

Section "Uninstall"
  ; Remove shortcuts
  Delete "$DESKTOP\\${APP_NAME}.lnk"
  Delete "$SMPROGRAMS\\${APP_NAME}\\${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\\${APP_NAME}"

  ; Remove files
  RMDir /r "$INSTDIR"

  ; Remove registry key
  DeleteRegKey HKLM "Software\${APP_NAME}"
SectionEnd
