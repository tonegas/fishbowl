# Fishbowl

A competitive multiplayer game in the style of *agar.io*: control a fish in a virtual lake, eat other fish and objects to grow, and compete with other players on the leaderboard.

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

The server listens on port **9999** (or the port passed as an argument).

## How to play

1. Open in your browser: **http://localhost:9999/www/fish.html**
2. Enter a name for your fish (max 12 characters)
3. Use the **arrow keys** to move around the lake
4. Eat algae and smaller fish to grow
5. Avoid bigger fish: they can eat you
6. Your life decreases over time: eat to survive
7. When you die, check the **leaderboard** and play again

## Project structure

```
fishbowl/
├── fish_server.js      # Node.js server + Socket.IO + SQLite
├── package.json
├── fish_leaderboard.db # Leaderboard database (created on first run)
└── www/
    ├── fish.html       # Main game page
    └── media/
        ├── js/         # fish.js, lake.js, food.js
        ├── lib/        # jQuery, CreateJS, Lodash, Kibo
        └── image/      # Sprites (algae, objects)
```

## Technologies

| Component | Technology |
|-----------|------------|
| Backend | Node.js, HTTP |
| Real-time communication | Socket.IO 4.x |
| Database | SQLite3 (leaderboard) |
| Frontend | HTML5 Canvas, CreateJS (EaselJS) |
| Libraries | jQuery, Lodash, Kibo (keyboard input) |

## Socket.IO events

- `register_name` — Register player name
- `new_fish` — Request to join the game
- `fish_to_server` / `fish_to_client` — Position synchronization
- `fish_death` — Death notification and leaderboard update
- `leaderboard_request` — Request leaderboard data

## Notes

- The `fish_leaderboard.db` database is created automatically in the project folder
