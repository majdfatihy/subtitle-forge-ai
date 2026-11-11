@echo off
cd /d "%~dp0"

title GitHub Repository Updater - subtitle-forge-ai

echo ======================================================
echo       Starting GitHub Push Process
echo ======================================================
echo Current Directory: %cd%
echo.

:: 1. Check Git installation
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not added to PATH.
    echo Please install Git from https://git-scm.com/
    goto end_script
)

:: 2. Check if folder is a git repository
if not exist ".git" (
    echo [ERROR] This directory is not a Git repository.
    echo Make sure this file is placed in the project root folder.
    goto end_script
)

:: 3. Check remote origin
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Remote 'origin' not found. Adding repository URL...
    git remote add origin https://github.com/majdfatihy/subtitle-forge-ai.git
)

:: 4. Pull latest changes
echo [1/4] Pulling latest changes from remote...
git pull origin main --rebase

:: 5. Stage modified files
echo.
echo [2/4] Staging changes...
git add .

:: 6. Enter commit message
echo.
set "commit_msg="
set /p commit_msg="Enter commit message (Press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Automated project update

:: 7. Commit changes
echo.
echo [3/4] Creating commit...
git commit -m "%commit_msg%"

:: 8. Push to GitHub
echo.
echo [4/4] Pushing changes to GitHub...
git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ======================================================
    echo        Push completed successfully!
    echo ======================================================
) else (
    echo [ERROR] Push failed. Check your network or credentials.
)

:end_script
echo.
echo Press any key to close this window...
pause >nul