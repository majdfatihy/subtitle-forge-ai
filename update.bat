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
    goto end_script
)

:: 2. Check repository
if not exist ".git" (
    echo [ERROR] This directory is not a Git repository.
    goto end_script
)

:: 3. Check remote origin
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Remote 'origin' not found. Adding repository URL...
    git remote add origin https://github.com/majdfatihy/subtitle-forge-ai.git
)

:: 4. Stage changes
echo [1/4] Staging changes...
git add .

:: 5. Commit changes
echo.
set "commit_msg="
set /p commit_msg="Enter commit message (Press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Automated project update

echo.
echo [2/4] Creating commit...
git commit -m "%commit_msg%"

:: 6. Pull latest changes safely (working tree is clean now)
echo.
echo [3/4] Pulling latest changes from remote...
git pull origin main --rebase

:: 7. Push to GitHub
echo.
echo [4/4] Pushing changes to GitHub...
git push -u origin main

echo.
if %ERRORLEVEL% equ 0 (
    echo ======================================================
    echo        Push completed successfully!
    echo ======================================================
) else (
    echo [ERROR] Push failed. Check your network or resolve rebase conflicts.
)

:end_script
echo.
echo Press any key to close this window...
pause >nul