@echo off
setlocal EnableExtensions
if "%~1"=="" (
  echo Usage:
  echo   %~nx0 ROOT_DIR        List all xNormalized, yEdited, zOriginals ^(full paths^)
  echo   %~nx0 ROOT_DIR /T     Same, with indentation + full path on each line
  echo.
  echo Example:
  echo   %~nx0 "D:\Photos\Archive"
  exit /b 1
)

set "TREE="
if /I "%~2"=="/T" set "TREE=-Tree"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0list-xyz-folders.ps1" -Root "%~1" %TREE%
exit /b %ERRORLEVEL%
