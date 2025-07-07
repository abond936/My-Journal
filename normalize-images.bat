@echo off
echo Image Normalization Script
echo =========================

if "%~1"=="" (
    echo Usage: normalize-images.bat [source-folder] [destination-folder]
    echo.
    echo Examples:
    echo   normalize-images.bat yEdited xNormalized
    echo   normalize-images.bat "My Photos" "Optimized Photos"
    echo.
    echo If no arguments provided, defaults to:
    echo   Source: yEdited
    echo   Destination: xNormalized
    echo.
    pause
    exit /b 1
)

set SOURCE_FOLDER=%~1
set DEST_FOLDER=%~2

if "%DEST_FOLDER%"=="" (
    set DEST_FOLDER=xNormalized
)

set ORIGINAL_DIR=%CD%

echo Current directory: %ORIGINAL_DIR%
echo Source folder: %SOURCE_FOLDER%
echo Destination folder: %DEST_FOLDER%
echo.

cd /d "C:\Users\alanb\my-journal"
npm run normalize:images "%ORIGINAL_DIR%\%SOURCE_FOLDER%" "%ORIGINAL_DIR%\%DEST_FOLDER%"

echo.
echo Script completed!

cd /d "%ORIGINAL_DIR%"
pause 