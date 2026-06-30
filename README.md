# audioNINJA

A browser-based YouTube Music player with a local Python backend. Search for songs, albums, and artists, create playlists, and get recommendations — all served through a hidden YouTube IFrame player.


## Features

- **Search** — songs, albums, and artists via `ytmusicapi`
- **Artist & Album pages** — dedicated pages with play-all, shuffle
- **Playlists** — create, edit, reorder, custom thumbnail upload
- **Recommendations** — "Recommended For You" and "Recently Played" based on listening history
- **Follow artists** — keep track of your favorites
- **Player** — play, pause, skip, seek, shuffle, repeat (off/one/all), volume
- **Expanded player** — full-window player view
- **Import/Export data** — backup your playlists, history, and followed artists as JSON
- **Light/Dark theme**
- **Animated UI** — staggered list animations, page transitions

## Prerequisites

- **Node.js** 18+ and npm
- **Python 3** with pip

## Setup

### 1. Python backend

```bash
python3 -m venv /tmp/ytmusic-backend
source /tmp/ytmusic-backend/bin/activate
pip install ytmusicapi flask flask-cors
```

### 2. Start the backend

```bash
python3 backend/server.py
```

The Flask server runs on `http://localhost:5000`.

### 3. Install frontend dependencies

```bash
npm install
```

### 4. Start the dev server

```bash
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to the Python backend.

## Usage

1. Both the Python backend (`python3 backend/server.py`) and Vite dev server (`npm run dev`) must be running.
2. Open `http://localhost:5173` in your browser.
3. Use the search bar at the top to find music.
4. Navigate via the sidebar (Home, Search, Artists, Settings).

## Desktop App (Electron)

The app can also run as a standalone desktop application via Electron. The Electron build spawns the Python backend automatically and removes the default menu bar for a cleaner UI.

### Development

```bash
# Start both Vite dev server and Electron together
npm run dev:all

# Or start separately:
npm run dev          # Terminal 1: Vite dev server
npm run dev:electron # Terminal 2: Electron window
```

### Build for distribution

```bash
npm run build:electron      # Linux (AppImage + deb)
npm run build:electron:win  # Windows (NSIS installer)
npm run build:electron:mac  # macOS (DMG)
```

## Build

```bash
npm run build
```

Serve the `dist/` folder with any static file server.

## Project Structure

```
src/
  components/
    App.jsx              — Layout: search bar, sidebar, main content
    Sidebar.jsx          — Navigation + playlist list
    Search.jsx           — Search results with tabs
    Recommendations.jsx  — Home page (top artists, recommendations, history)
    Player.jsx           — Bottom player bar
    ExpandedPlayer.jsx   — Full-window player view
    ArtistPage.jsx       — Artist detail page
    AlbumPage.jsx        — Album detail page
    PlaylistPage.jsx     — Playlist detail/edit page
    PlaylistPickerModal.jsx  — Add-to-playlist modal
    Artists.jsx          — Followed artists list
    Settings.jsx         — Preferences, import/export
  context/
    PlayerContext.jsx    — Player state, YouTube IFrame lifecycle
    NavigationContext.jsx — Sub-page routing
  services/
    apiService.js        — Calls Python backend, data mapping
    youtubeScraper.js    — Delegates to apiService
  utils/
    storage.js           — LocalStorage helpers (playlists, artists, history)
backend/
  server.py              — Flask server wrapping ytmusicapi
```

## Tech Stack

- **Frontend**: React, Tailwind CSS v4, Lucide React icons
- **Backend**: Python Flask, ytmusicapi
- **Player**: YouTube IFrame API (hidden)
- **Storage**: browser localStorage
