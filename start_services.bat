@echo off
echo ====================================================
echo Starting Quesole Django Backend (Port 8001)
echo ====================================================

cd /d "%~dp0backend"
if exist .\venv\Scripts\activate.bat (
    call .\venv\Scripts\activate.bat
)
python manage.py runserver 0.0.0.0:8001
pause
