@echo off
REM This script adds, commits, and pushes changes to GitHub.

REM 1. Add all changes
git add .

REM 2. Commit the changes with a message you provide
git commit -m "%1"

REM 3. Push to the main branch on GitHub
git push origin main

echo "Version saved to GitHub!"