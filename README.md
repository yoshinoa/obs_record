# TERA OBS Recording Module

This TERA Toolbox module integrates with OBS Studio to automatically start and stop recording based on in-game events, such as entering combat or defeating a boss. Recordings are saved with specific filenames based on the current dungeon and boss.

## Prerequisites

1. **OBS Studio**: This module requires OBS Studio with WebSocket support enabled.

   - OBS WebSocket is included with OBS Studio, so no additional installation is required.
   - **Enable WebSocket in OBS**: Follow the steps below to enable the WebSocket server.
     - Step 1: Go to Tools->WebSocket Server Settings
     - Step 2: Click Enable WebSocket server, if it isn't already enabled.

2. **WebSocket Configuration**: You can choose to use WebSocket with or without authentication.
   - If you use authentication, you need to fill out the password in the `config.json` file that is generated the first time you run the module.

## Installation

1. **Copy the Module**: Download module.json and put it in your mods folder.

2. **Config File**: After launching the module, a `config.json` file will be automatically created in the module folder.
   - You will need to update the WebSocket configuration with your OBS WebSocket address and password (if authentication is enabled).

Example `config.json` file:

```
{
    "obs": {
        "address": "ws://127.0.0.1:4455",
        "password": "your-password-here"
    }
}
```

3. **OBS Setup**: Make sure that OBS is running, and the WebSocket server is enabled with the correct address and password (if applicable).

## How It Works

- The module automatically starts recording when you enter combat and stops recording when the boss is defeated or the instance changes.
- Filenames are automatically formatted based on the current dungeon, boss, and timestamp.

Example file format:

```
Tera/{DungeonName}/{BossName}_{PlayerName}_{ShortTimestamp}.mkv
```

## Troubleshooting

- **Failed to connect to OBS WebSocket**: If you see this error, double-check that:
  - WebSocket is enabled in OBS.
  - The WebSocket address and password in `config.json` are correct.
  - OBS is running and WebSocket is listening on the correct port (default: 4455).
