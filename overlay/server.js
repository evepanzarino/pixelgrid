const express = require('express');
const http    = require('http');
const WebSocket = require('ws');
const net     = require('net');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

const TWITCH_CHANNEL = process.env.TWITCH_CHANNEL || 'evepanzarino';
const PORT           = process.env.PORT || 3030;
const ALERT_SECRET   = process.env.ALERT_SECRET || 'changeme';

// Serve static files at both / (direct) and /overlay (nginx proxy strips nothing)
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/overlay', express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── Broadcast to all overlay clients ──────────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

// ── Manual alert trigger endpoint (mounted at both paths) ─────────────────
function handleAlert(req, res) {
  const { secret, type, user, amount, message } = req.body;
  if (secret !== ALERT_SECRET) return res.status(403).json({ error: 'forbidden' });
  broadcast({ event: 'alert', type, user, amount, message });
  res.json({ ok: true });
}
app.post('/alert', handleAlert);
app.post('/overlay/alert', handleAlert);

// ── Stream info update endpoint ────────────────────────────────────────────
function handleInfo(req, res) {
  const { secret, title, game } = req.body;
  if (secret !== ALERT_SECRET) return res.status(403).json({ error: 'forbidden' });
  broadcast({ event: 'info', title, game });
  res.json({ ok: true });
}
app.post('/info', handleInfo);
app.post('/overlay/info', handleInfo);

// ── Twitch IRC (anonymous, read-only) ─────────────────────────────────────
let twitchSocket = null;
let twitchReconnectTimer = null;

const BADGE_ICONS = {
  broadcaster: '🎙️',
  moderator:   '🗡️',
  subscriber:  '⭐',
  vip:         '💎',
};

function parseBadges(badgeStr) {
  if (!badgeStr) return '';
  return badgeStr.split(',').map(b => {
    const key = b.split('/')[0];
    return BADGE_ICONS[key] || '';
  }).filter(Boolean).join('');
}

function parseTwitchTags(raw) {
  const tags = {};
  raw.split(';').forEach(part => {
    const [k, v] = part.split('=');
    tags[k] = v || '';
  });
  return tags;
}

function connectTwitch() {
  if (twitchSocket) return;

  twitchSocket = new net.Socket();
  let buffer = '';

  twitchSocket.connect(6667, 'irc.chat.twitch.tv', () => {
    twitchSocket.write('CAP REQ :twitch.tv/tags twitch.tv/commands\r\n');
    twitchSocket.write('NICK justinfan12345\r\n');
    twitchSocket.write(`JOIN #${TWITCH_CHANNEL}\r\n`);
    console.log(`[Twitch] Connected to #${TWITCH_CHANNEL}`);
  });

  twitchSocket.on('data', data => {
    buffer += data.toString();
    const lines = buffer.split('\r\n');
    buffer = lines.pop();

    lines.forEach(line => {
      if (line.startsWith('PING')) {
        twitchSocket.write('PONG :tmi.twitch.tv\r\n');
        return;
      }

      // Parse tagged PRIVMSG: @tags :user!user@host PRIVMSG #channel :message
      const taggedMatch = line.match(/^@(\S+) :(\S+)!\S+ PRIVMSG #\S+ :(.+)$/);
      if (taggedMatch) {
        const tags    = parseTwitchTags(taggedMatch[1]);
        const rawUser = taggedMatch[2];
        const msg     = taggedMatch[3];
        const color   = tags['color'] || '#83bdc8';
        const name    = tags['display-name'] || rawUser;
        const badges  = parseBadges(tags['badges']);

        broadcast({ event: 'chat', platform: 'twitch', user: name, color, badges, message: msg });
        return;
      }

      // Plain PRIVMSG fallback
      const plainMatch = line.match(/:(\S+)!\S+ PRIVMSG #\S+ :(.+)$/);
      if (plainMatch) {
        broadcast({ event: 'chat', platform: 'twitch', user: plainMatch[1], color: '#83bdc8', badges: '', message: plainMatch[2] });
      }
    });
  });

  twitchSocket.on('close', () => {
    console.log('[Twitch] Disconnected — reconnecting in 5s');
    twitchSocket = null;
    clearTimeout(twitchReconnectTimer);
    twitchReconnectTimer = setTimeout(connectTwitch, 5000);
  });

  twitchSocket.on('error', err => {
    console.error('[Twitch] Error:', err.message);
    twitchSocket.destroy();
    twitchSocket = null;
  });
}

// ── WebSocket client handler ───────────────────────────────────────────────
wss.on('connection', ws => {
  ws.send(JSON.stringify({ event: 'connected', channel: TWITCH_CHANNEL }));
});

// ── Start ──────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Overlay server listening on :${PORT}`);
  connectTwitch();
});
