# audioNINJA

A browser-based YouTube Music player that runs entirely on GitHub Pages — no backend required.

## Features

- **Search** — songs, albums, and artists via YouTube Data API v3
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
- **YouTube Data API v3 key** (free — get one from [Google Cloud Console](https://console.cloud.google.com/apis/credentials))

## Setup

### 1. Get a YouTube Data API key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Create an API key (restrict it to "YouTube Data API v3" for security)

### 2. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser, then enter your API key in **Settings → YouTube API Key**.

## Build for production

```bash
npm run build
```

Serve the `dist/` folder with any static file server, or deploy to GitHub Pages.

## Deploy to GitHub Pages

This branch includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to `main`.

1. Go to your repo **Settings → Pages**
2. Under "Build and deployment", select **GitHub Actions**
3. Push to `main` — the workflow will deploy automatically

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
    Albums.jsx           — Album search page
    Settings.jsx         — Preferences, API key, import/export
  context/
    PlayerContext.jsx    — Player state, YouTube IFrame lifecycle
    NavigationContext.jsx — Sub-page routing
  services/
    apiService.js        — YouTube Data API v3 calls, data mapping
    youtubeScraper.js    — Service wrapper
  utils/
    storage.js           — LocalStorage helpers (playlists, artists, history)
```

## Tech Stack

- **Frontend**: React, Tailwind CSS v4, Lucide React icons
- **Data**: YouTube Data API v3
- **Player**: YouTube IFrame API (hidden)
- **Storage**: browser localStorage

## License

MIT
