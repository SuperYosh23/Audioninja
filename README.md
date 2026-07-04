<div align="center">

  <img src="newlogo.svg" alt="audioNINJA logo" width="180"/>

  # audioNINJA

  **A YouTube Music player powered by Electron and a local Python backend**

  [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/SuperYosh23/Audioninja)

  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?logo=tailwindcss" alt="Tailwind CSS v4" />
    <img src="https://img.shields.io/badge/Python_3-3776AB?logo=python" alt="Python 3" />
    <img src="https://img.shields.io/badge/Flask-000?logo=flask" alt="Flask" />
    <img src="https://img.shields.io/badge/Vite-646CFF?logo=vite" alt="Vite" />
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#development">Development</a> •
    <a href="#project-structure">Structure</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#scripts">Scripts</a>
  </p>

</div>

Search for songs, albums, and artists, create playlists, and get recommendations — all served through a hidden YouTube IFrame player.

---

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

---

## Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python 3** with pip

### 1. Set up the Python backend

```bash
python3 -m venv /tmp/ytmusic-backend
source /tmp/ytmusic-backend/bin/activate
pip install ytmusicapi flask flask-cors
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Launch the app (development)

```bash
npm run dev:all
```

This starts the Vite dev server on `http://localhost:5173` (proxying `/api` to Flask on `:5000`) and opens an Electron window — all with one command.

### Usage

Use the search bar at the top to find music. Navigate via the sidebar (Home, Search, Artists, Settings).

---

## Development

```bash
# Start Vite + Electron together (recommended)
npm run dev:all

# Or start each separately:
npm run dev          # Terminal 1: Vite dev server
npm run dev:electron # Terminal 2: Electron window
```

The Electron build spawns the Python backend automatically and removes the default menu bar for a cleaner UI.

### Build for distribution

| Platform | Command |
|----------|---------|
| Linux (AppImage + deb) | `npm run build:electron` |
| Windows (NSIS installer) | `npm run build:electron:win` |
| macOS (DMG) | `npm run build:electron:mac` |

---

## Project Structure

```
src/
├── components/
│   ├── App.jsx                     — Layout: search bar, sidebar, main content
│   ├── Sidebar.jsx                 — Navigation + playlist list
│   ├── Search.jsx                  — Search results with tabs
│   ├── Recommendations.jsx         — Home page (top artists, recommendations, history)
│   ├── Player.jsx                  — Bottom player bar
│   ├── ExpandedPlayer.jsx          — Full-window player view
│   ├── ArtistPage.jsx              — Artist detail page
│   ├── AlbumPage.jsx               — Album detail page
│   ├── PlaylistPage.jsx            — Playlist detail/edit page
│   ├── PlaylistPickerModal.jsx     — Add-to-playlist modal
│   ├── Artists.jsx                 — Followed artists list
│   └── Settings.jsx                — Preferences, import/export
├── context/
│   ├── PlayerContext.jsx           — Player state, YouTube IFrame lifecycle
│   └── NavigationContext.jsx       — Sub-page routing
├── services/
│   ├── apiService.js               — Calls Python backend, data mapping
│   └── youtubeScraper.js           — Delegates to apiService
└── utils/
    └── storage.js                  — LocalStorage helpers (playlists, artists, history)
backend/
├── server.py                       — Flask server wrapping ytmusicapi
electron/
└── main.js                         — Electron main process
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:electron` | Launch Electron window (dev mode) |
| `npm run dev:all` | Start both Vite and Electron concurrently |
| `npm run build` | Build frontend for production |
| `npm run build:electron` | Build Linux AppImage + deb |
| `npm run build:electron:win` | Build Windows NSIS installer |
| `npm run build:electron:mac` | Build macOS DMG |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint with oxlint |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Tailwind CSS v4, Lucide React icons |
| **Backend** | Python 3, Flask, ytmusicapi |
| **Player** | YouTube IFrame API (hidden) |
| **Desktop** | Electron, electron-builder |
| **Build** | Vite |
| **Storage** | Browser localStorage |
| **Linting** | oxlint |

---

## Build

```bash
npm run build
```

Outputs production files to `dist/`.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
