@echo off
setlocal EnableExtensions
if "%~1"=="" (
  echo Usage:
  echo   %~nx0 ROOT_DIR           Remove empty xNormalized, yEdited, zOriginals under ROOT_DIR
  echo   %~nx0 ROOT_DIR /L        List only ^(dry run^) — no folders deleted
  echo.
  echo Example:
  echo   %~nx0 "D:\Photos\Archive"
  exit /b 1
)

set "DRY="
if /I "%~2"=="/L" set "DRY=-WhatIf"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0remove-empty-xyz-folders.ps1" -Root "%~1" %DRY%
set "EC=%ERRORLEVEL%"
exit /b %EC%
