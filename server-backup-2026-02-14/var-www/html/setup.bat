@echo off
REM Windows setup script
echo ========================================
echo Full Stack Application Setup
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js first.
    exit /b 1
)

echo [OK] Node.js found
for /f "tokens=*" %%i in ('node --version') do echo        %%i
for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm found: %%i
echo.

REM Setup backend
echo Setting up backend server...
cd server
echo Installing dependencies...
call npm install
echo [OK] Backend dependencies installed
cd ..
echo.

REM Setup frontend
echo Setting up frontend client...
cd client
echo Installing dependencies...
call npm install
echo [OK] Frontend dependencies installed
cd ..
echo.

echo ========================================
echo [OK] Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Set up your MySQL database:
echo    mysql -u root -p ^< database/init.sql
echo.
echo 2. Update database credentials in server/.env if needed
echo.
echo 3. Start the backend server:
echo    cd server ^&^& npm run dev
echo.
echo 4. In a new terminal, start the frontend:
echo    cd client ^&^& npm start
echo.
echo The app will be available at:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:5000
echo.
