# Belonging

A community app built with Express, React, and MySQL with Discord integration.

## Quick Start

### Development

1. Copy the environment file and configure Discord:
```bash
cp .env.example .env
# Edit .env with your Discord credentials
```

2. Start the application:
```bash
docker compose up --build
```

3. Access the app:
- Frontend: http://localhost:5004/belonging
- API: http://localhost:5003/api

### Default Admin User

- **Username:** evepanzarino
- **Password:** TrueLove25320664!

## Discord Integration

The platform includes two-way sync with Discord:

### Features
- Posts on the website appear in Discord as threads
- Discord messages from users with "connected" role appear on the website
- Comments sync as thread replies
- Users can link their Discord accounts for attribution
- Edits and deletes sync both ways
- Rate limiting to avoid Discord API limits

### Setup

1. Create a Discord Application at https://discord.com/developers/applications

2. **Bot Setup:**
   - Go to the Bot tab
   - Click "Add Bot"
   - Enable "Message Content Intent" under Privileged Gateway Intents
   - Copy the bot token to `DISCORD_TOKEN` in `.env`

3. **OAuth2 Setup:**
   - Go to OAuth2 > General
   - Copy Client ID to `DISCORD_CLIENT_ID`
   - Copy Client Secret to `DISCORD_CLIENT_SECRET`
   - Add redirect URL: `https://belonging.lgbt/api/auth/discord/callback`

4. **Invite Bot to Server:**
   - Go to OAuth2 > URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select permissions: `Send Messages`, `Create Public Threads`, `Send Messages in Threads`, `Read Message History`, `Manage Messages`
   - Use generated URL to invite bot to your server

5. **Server Configuration:**
   - Create a role named "connected" for verified users
   - Get your server ID and add to `DISCORD_GUILD_ID`
   - Get the channel ID for syncing and add to `WEBSITE_CHANNEL_ID`

## Architecture

- **Frontend:** React 18 with React Router
- **Backend:** Express.js with JWT authentication
- **Database:** MySQL 8.0
- **Discord Bot:** Discord.js for two-way sync

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user (requires auth)
- `GET /api/auth/discord` - Start Discord OAuth flow
- `GET /api/auth/discord/callback` - Discord OAuth callback
- `DELETE /api/auth/discord` - Unlink Discord account
- `GET /api/auth/discord/status` - Check Discord connection status

### Health
- `GET /api/health` - Health check

## Environment Variables

### Server
- `DB_HOST` - MySQL host
- `DB_USER` - MySQL user
- `DB_PASSWORD` - MySQL password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret for JWT tokens
- `DISCORD_CLIENT_ID` - Discord OAuth client ID
- `DISCORD_CLIENT_SECRET` - Discord OAuth client secret
- `DISCORD_REDIRECT_URI` - Discord OAuth redirect URL
- `DISCORD_BOT_URL` - URL of the Discord bot service
- `BOT_TOKEN_SECRET` - Shared secret for bot API auth

### Discord Bot
- `DISCORD_TOKEN` - Discord bot token
- `DISCORD_GUILD_ID` - Discord server ID
- `CONNECTED_ROLE_NAME` - Role name for connected users
- `WEBSITE_CHANNEL_ID` - Channel for website sync
- `BOT_TOKEN_SECRET` - Shared secret for API auth
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database connection

### Client
- `REACT_APP_API_URL` - Backend API URL
