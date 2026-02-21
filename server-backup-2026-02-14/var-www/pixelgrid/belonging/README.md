# Belonging

A community app built with Express, React, and MySQL.

## Quick Start

### Development

1. Start the application:
```bash
docker compose up --build
```

2. Access the app:
- Frontend: http://localhost:5004/belonging
- API: http://localhost:5003/api

### Default Admin User

- **Username:** evepanzarino
- **Password:** TrueLove25320664!

## Architecture

- **Frontend:** React 18 with React Router
- **Backend:** Express.js with JWT authentication
- **Database:** MySQL 8.0

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user (requires auth)

### Health
- `GET /api/health` - Health check

## Environment Variables

### Server
- `DB_HOST` - MySQL host
- `DB_USER` - MySQL user
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret for JWT tokens

### Client
- `REACT_APP_API_URL` - Backend API URL
