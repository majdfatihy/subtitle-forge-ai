@echo off
echo ==================================================
echo       Updating Subtitle Forge on Vercel
echo ==================================================
echo.

set /p desc="Enter commit message (or press Enter to skip): "
if "%desc%"=="" set desc="New project updates"

echo.
echo [1/3] Staging files...
git add .

echo [2/3] Committing changes...
git commit -m "%desc%"

echo [3/3] Pushing to GitHub...
git push

echo.
echo ==================================================
echo Successfully pushed! Vercel will now update the site.
echo ==================================================
pause