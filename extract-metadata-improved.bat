@echo off
echo Image Metadata Extraction Script - IMPROVED VERSION
echo ==================================================
echo.

REM Check if Node.js is installed
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo ✅ Node.js is installed

REM Get the current directory (where images are)
set IMAGE_DIR=%CD%
echo [2/6] Image directory: %IMAGE_DIR%
echo.

REM Find the project root (where Sharp is installed)
echo [3/6] Looking for project directory...
set PROJECT_DIR=
set SEARCH_DIR=%IMAGE_DIR%

:find_project_loop
echo   Searching in: %SEARCH_DIR%
if exist "%SEARCH_DIR%\node_modules\sharp" (
    set PROJECT_DIR=%SEARCH_DIR%
    echo ✅ Found project with Sharp: %PROJECT_DIR%
    goto :found_project
)
if exist "%SEARCH_DIR%\package.json" (
    set PROJECT_DIR=%SEARCH_DIR%
    echo ✅ Found project: %PROJECT_DIR%
    goto :found_project
)

REM Go up one directory level
set PARENT_DIR=%SEARCH_DIR%\..
if "%PARENT_DIR%"=="%SEARCH_DIR%" (
    echo ❌ ERROR: Could not find project directory with Sharp installed
    echo Searched in: %IMAGE_DIR%
    echo.
    echo Please ensure Sharp is installed in your project:
    echo   npm install sharp
    echo.
    pause
    exit /b 1
)

set SEARCH_DIR=%PARENT_DIR%
goto :find_project_loop

:found_project
echo.

REM Test libraries using the test script
echo [4/6] Testing required libraries...
pushd "%PROJECT_DIR%"
if exist "test-libraries.js" (
    node test-libraries.js >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ ERROR: Library tests failed
        echo Please check the library installation:
        echo   npm install sharp exif-reader
        echo.
        popd
        pause
        exit /b 1
    )
    echo ✅ Library tests passed
) else (
    echo ⚠️  Test script not found, skipping library tests
)
popd
echo.

REM Check if the extraction script exists in the project
echo [5/6] Looking for extraction script...
set SCRIPT_PATH=%PROJECT_DIR%\extract-image-metadata-enhanced.js

if not exist "%SCRIPT_PATH%" (
    echo ❌ ERROR: Metadata extraction script not found in project
    echo Looked for:
    echo   %PROJECT_DIR%\extract-image-metadata-enhanced.js
    echo.
    pause
    exit /b 1
)

echo ✅ Found script: %SCRIPT_PATH%
echo.

REM Check if there are any image files in the current directory
echo [6/6] Checking for image files...
set IMAGE_COUNT=0
for %%f in (*.jpg *.jpeg *.png *.gif *.bmp *.tiff *.tif *.webp) do (
    echo   Found: %%f
    set /a IMAGE_COUNT+=1
)

if %IMAGE_COUNT% equ 0 (
    echo ❌ No image files found in current directory
    echo Supported formats: jpg, jpeg, png, gif, bmp, tiff, tif, webp
    echo.
    pause
    exit /b 1
)

echo ✅ Found %IMAGE_COUNT% image file(s) to process
echo.

REM Confirm before proceeding
set /p CONFIRM="Do you want to extract metadata from these images? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Operation cancelled.
    echo.
    pause
    exit /b 0
)

echo.
echo ==================================================
echo STARTING METADATA EXTRACTION
echo ==================================================
echo.

REM Change to project directory and run the script
echo Changing to project directory: %PROJECT_DIR%
pushd "%PROJECT_DIR%"

REM Run the extraction script from project directory
node "%SCRIPT_PATH%" "%IMAGE_DIR%"

REM Check if script ran successfully
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: Script execution failed with error code %errorlevel%
    echo Check the output above for error messages.
    echo.
    popd
    pause
    exit /b 1
)

REM Return to original directory
popd

echo.
echo ==================================================
echo METADATA EXTRACTION COMPLETE
echo ==================================================
echo.

REM Check if JSON files were created
echo Checking for created JSON files...
set JSON_COUNT=0
for %%f in (*.json) do (
    echo   Found JSON: %%f
    set /a JSON_COUNT+=1
)

if %JSON_COUNT% equ 0 (
    echo ❌ WARNING: No JSON files were created!
    echo.
    echo This might be due to:
    echo 1. Script errors (check the output above)
    echo 2. Permission issues
    echo 3. Image format not supported
    echo.
    echo Try running: node test-libraries.js
) else (
    echo ✅ Successfully created %JSON_COUNT% JSON file(s)
)

echo.
echo ==================================================
echo NEXT STEPS
echo ==================================================
echo 1. Review the generated JSON files
echo 2. Complete the manual entry fields (Who, What, When, Where, Story)
echo 3. Use the JSON files when uploading images to your system
echo.

pause 