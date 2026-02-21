# Timeline App

A chronological photo timeline with admin authentication.

## Features
- Scrollable timeline with lazy-loaded images
- Admin panel for uploading photos
- Automatic thumbnail generation
- MySQL database for storing entries
- JWT authentication

## Admin Credentials
- Username: `evepanzarino`
- Password: `TrueLove25320664!`

## Deployment

### Local Development
```bash
cd timeline
docker compose up --build
```

Access at: http://localhost:5008

### Production Deployment
```bash
# On VPS
cd /var/www/pixelgrid/timeline
docker compose up --build -d
```

The app will be available at:
- Client: http://localhost:5008 (mapped to /timeline via nginx)
- API: http://localhost:5007/api

## API Endpoints

- `POST /api/login` - Login
- `GET /api/me` - Get current user
- `GET /api/timeline` - Get all entries (public)
- `GET /api/timeline/:id` - Get single entry
- `POST /api/timeline` - Create entry (admin only)
- `PUT /api/timeline/:id` - Update entry (admin only)
- `DELETE /api/timeline/:id` - Delete entry (admin only)
