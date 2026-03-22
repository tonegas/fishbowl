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
# or
npm start
```

The server listens on port **9999** (or the port passed as argument). Configuration is loaded from `www/media/js/config.js`.

### Debug mode

With `--debug` you enable debug mode:

- **Q** — life +30, size +10
- **W** — size −10
- **Debug panel** (top-left) — average reception delay of other fish (ms, 1-second rolling average), fish count, network mode (emit/batch)

```bash
node fish_server.js 9999 --debug
# or
npm run start:debug
```

Debug mode is **disabled by default**.

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

## Configuration

Main parameters in `www/media/js/config.js`:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `lakeSize` | Lake dimensions (world units) | 10000 |
| `foodCount` | Number of food items | 1000 |
| `foodSpawnRadius` | Spawn radius around player | 500 |
| `algaeCount` | Number of algae | 150 |
| `playerSpawnRange` | Initial spawn area (centered) | 100 |
| `fishInitialLife` | Starting life (seconds) | 180 |
| `fishEndLife` | Time to reach max size (seconds) | 1200 |
| `batchIntervalMs` | Batch broadcast interval (ms), when in batch mode | 20 |
| `batchFishThreshold` | Fish count above which batch mode is used (< N = emit, ≥ N = batch) | 10 |
| `otherFishSmooth` | Smoothing factor for other fish position and orientation (0 = no smooth, 0.3 = moderate) | 0.25 |
| `virtualDelay` | Artificial delay (ms) for received updates (for testing) | 0 |

## Network modes

- **Emit** (few fish): each `fish_to_server` triggers an immediate `fish_to_client` broadcast. Lower latency.
- **Batch** (many fish): server collects state and sends `fish_batch` every `batchIntervalMs`. Fewer messages, fixed latency.

The mode switches automatically based on `batchFishThreshold`.

## Server deployment (PM2)

For production, use [PM2](https://pm2.keymetrics.io/):

```bash
# Start
pm2 start fish_server.js --name fishbowl -- 9999

# Restart after code changes
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
lsof -i :9999
# or
ss -tlnp | grep 9999

pm2 list
pm2 logs fishbowl
```

### Nginx

See `nginx-fishbowl.conf` for reverse proxy setup. The app must listen on `127.0.0.1:9999`.

## Project structure

```
fishbowl/
├── fish_server.js           # Node.js server (HTTP + Socket.IO)
├── package.json
├── fish_leaderboard.db      # Leaderboard database (created on first run)
├── server/
│   ├── http.js              # Static file server
│   ├── sockets.js           # Socket.IO handlers (fish state, batch/emit)
│   ├── leaderboard.js       # SQLite leaderboard
│   └── lake.js              # Lake and algae generation
└── www/
    ├── fish.html            # Main game page
    └── media/
        ├── js/
        │   ├── config.js    # Shared config (client + server)
        │   ├── main.js      # Entry point
        │   ├── game.js      # Game loop, keyboard, other fish extrapolation
        │   ├── network.js   # Socket.IO client (fish_to_server, fish_to_client, fish_batch)
        │   ├── ui.js        # Overlays (name, tutorial, leaderboard, debug)
        │   ├── socket.js    # Socket setup
        │   └── entities/
        │       ├── fish.js  # Player and other fish
        │       ├── food.js  # Floating food
        │       ├── algae.js # Lake decoration
        │       ├── lake.js  # Lake container
        │       ├── lakeBorder.js    # Lake glass border
        │       └── waterSurface.js  # Animated waves
        ├── lib/             # jQuery, CreateJS, Lodash, Kibo
        └── image/           # Sprites (algae SVGs)
```

## Socket.IO events

| Event | Direction | Description |
|-------|-----------|-------------|
| `register_name` | Client → Server | Register player name |
| `name_accepted` / `name_rejected` | Server → Client | Name validation |
| `new_fish` | Client → Server | Request to join the game |
| `new_fish_id` | Server → Client | Spawn data (position, lake with algae) |
| `fish_to_server` | Client → Server | Player fish state (pos, ctp, size, etc.) |
| `fish_to_client` | Server → Client | Single fish state (emit mode, < threshold) |
| `fish_batch` | Server → Client | All fish state (batch mode, ≥ threshold) |
| `fish_death` | Client → Server | Death and leaderboard update |
| `leaderboard_request` | Client → Server | Request leaderboard |
| `leaderboard` | Server → Client | Leaderboard rows |

## Technologies

| Component | Technology |
|-----------|------------|
| Backend | Node.js, HTTP |
| Real-time | Socket.IO 4.x |
| Database | SQLite3 (leaderboard) |
| Frontend | HTML5 Canvas, CreateJS (EaselJS) |
| Libraries | jQuery, Lodash, Kibo (keyboard) |

## Notes

- The `fish_leaderboard.db` database is created automatically in the project folder.
- Algae dimensions are read from SVG files at server startup.
- Food spawns around the player and repositions when it drifts beyond `foodSpawnRadius`.
- Other fish positions and orientations are extrapolated and smoothed between network updates.
