@echo off
echo ====================================================
echo Starting MySQL80 Service and Quesole Django Backend
echo ====================================================

echo [1/2] Starting MySQL service...
net start MySQL80

echo.
echo [2/2] Starting Django backend on port 8000...
cd /d "%~dp0backend"
call .\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8000
pause
