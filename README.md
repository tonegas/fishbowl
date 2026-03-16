# Fishbowl

A competitive multiplayer game in the style of *agar.io*: control a fish in a virtual lake, eat food and algae to grow, and compete with other players on the leaderboard.

## Requirements

- **Node.js** (v14 or higher)
- **npm**

## Installation

```bash
cd fishbowl
npm install
```

## Running

```bash
node fish_server.js 9999
```

The server listens on port **9999** (or the port passed as argument). Config is loaded from `www/media/js/config.js`.

### Cheat mode (crescere con tasto Q)

Per abilitare il cheat che permette di far crescere il pesce premendo **Q** (vita +30, dimensione +10):

```bash
node fish_server.js 9999 --cheat
# oppure
npm run start:cheat
```

Il cheat è **disabilitato di default** (`false`).

## Server deployment (PM2)

For production, use [PM2](https://pm2.keymetrics.io/) to keep the process running:

```bash
# Start
pm2 start fish_server.js --name fishbowl -- 9999

# Restart after code changes (PM2 does NOT auto-restart on file edit)
pm2 restart fishbowl

# Zero-downtime reload
pm2 reload fishbowl

# Optional: watch mode (auto-restart on file changes)
pm2 start fish_server.js --name fishbowl --watch --ignore-watch="node_modules" -- 9999

# Persist across reboots
pm2 save
pm2 startup
```

### Verify the server is running

```bash
# Check process on port 9999
lsof -i :9999
# or
ss -tlnp | grep 9999

# PM2 status
pm2 list
pm2 logs fishbowl
```

### Nginx

See `nginx-fishbowl.conf` for reverse proxy setup. The app must listen on `127.0.0.1:9999`.

## How to play

1. Open in your browser: **http://localhost:9999/www/fish.html**
2. Enter a name for your fish (max 12 characters)
3. Use the **arrow keys** to move:
   - **↑** — swim faster
   - **↓** — swim slower
   - **← →** — turn and move
4. Eat food and algae smaller than you to gain life
5. Avoid bigger fish: they can eat you
6. Life decreases over time: eat to survive
7. When you die, check the **leaderboard** and play again

A tutorial overlay appears at game start and disappears when you press any movement key.

## Project structure

```
fishbowl/
├── fish_server.js         # Node.js server (HTTP + Socket.IO)
├── package.json
├── fish_leaderboard.db    # Leaderboard database (created on first run)
├── server/
│   ├── http.js            # Static file server
│   ├── sockets.js         # Socket.IO handlers
│   ├── leaderboard.js     # SQLite leaderboard
│   └── lake.js            # Lake and algae generation
└── www/
    ├── fish.html          # Main game page
    └── media/
        ├── js/
        │   ├── config.js       # Shared config (client + server)
        │   ├── main.js         # Entry point
        │   ├── game.js         # Game loop, keyboard
        │   ├── network.js      # Socket.IO client
        │   ├── ui.js           # Overlays (name, tutorial, leaderboard)
        │   ├── socket.js       # Socket setup
        │   └── entities/
        │       ├── fish.js     # Player and other fish
        │       ├── food.js     # Floating food
        │       ├── algae.js    # Lake decoration
        │       ├── lake.js     # Lake container
        │       ├── lakeBorder.js   # Lake glass border
        │       └── waterSurface.js # Animated waves
        ├── lib/            # jQuery, CreateJS, Lodash, Kibo
        └── image/          # Sprites (algae SVGs)
```

## Configuration

Main parameters in `www/media/js/config.js`:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `lakeSize` | Lake dimensions (world units) | 10000 |
| `foodCount` | Number of food items | 1000 |
| `foodSpawnRadius` | Spawn radius around player; food wraps when too far | 1000 |
| `algaeCount` | Number of algae | 150 |
| `playerSpawnRange` | Initial spawn area (centered) | 9000 |
| `fishInitialLife` | Starting life (seconds) | 180 |
| `fishEndLife` | Time to reach max size (seconds) | 1200 |

## Technologies

| Component | Technology |
|-----------|------------|
| Backend | Node.js, HTTP |
| Real-time | Socket.IO 4.x |
| Database | SQLite3 (leaderboard) |
| Frontend | HTML5 Canvas, CreateJS (EaselJS) |
| Libraries | jQuery, Lodash, Kibo (keyboard) |

## Socket.IO events

- `register_name` — Register player name
- `name_accepted` / `name_rejected` — Name validation
- `new_fish` — Request to join the game
- `new_fish_id` — Spawn data (position, lake with algae)
- `fish_to_server` / `fish_to_client` — Position sync
- `fish_death` — Death and leaderboard update
- `leaderboard_request` — Request leaderboard

## Notes

- The `fish_leaderboard.db` database is created automatically in the project folder
- Algae dimensions are read from SVG files at server startup
- Food spawns around the player and repositions when it drifts beyond `foodSpawnRadius`
