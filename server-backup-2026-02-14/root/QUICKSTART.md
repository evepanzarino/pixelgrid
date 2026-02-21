# Express, React, MySQL Full-Stack Application

This is a complete full-stack application demonstrating integration between:
- **Express.js** backend API
- **React** frontend
- **MySQL** database
- **Node.js** runtime

## Quick Start

### 1. Setup Database
```bash
# Option 1: Using MySQL command line
mysql -u root -p < database/init.sql

# Option 2: Create manually in MySQL
mysql -u root -p
> CREATE DATABASE app_database;
> USE app_database;
> [run SQL from database/init.sql]
```

### 2. Start Backend Server
```bash
cd server
npm install
npm run dev
```
Backend runs on: `http://localhost:5000`

### 3. Start Frontend (new terminal)
```bash
cd client
npm install
npm start
```
Frontend runs on: `http://localhost:3000`

## Features

✨ **Full CRUD Operations**
- Manage users and items
- Real-time data updates
- Error handling

🔧 **Technology Stack**
- Express.js for REST API
- React 18 for UI
- MySQL for data persistence
- Axios for HTTP requests
- CORS support

📁 **Project Structure**
- `/server` - Backend Express application
- `/client` - Frontend React application
- `/database` - SQL initialization scripts

## API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/items` | Get all items |
| POST | `/api/items` | Create item |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |

## Configuration

Update `/server/.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=app_database
SERVER_PORT=5000
```

## Troubleshooting

**CORS errors?**
- Make sure backend is running on port 5000
- Check `.env` file in server directory

**Database connection failed?**
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database is created

**React won't connect to API?**
- Confirm backend server is running
- Check proxy setting in client `package.json`
- Verify CORS is enabled in Express

---

Happy coding! 🚀
