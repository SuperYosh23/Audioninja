const STORAGE_KEYS = {
  PLAYLISTS: 'ym_playlists',
  LISTENING_HISTORY: 'ym_listening_history',
  PREFERENCES: 'ym_preferences',
};

export const storage = {
  getPlaylists: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
    return data ? JSON.parse(data) : [];
  },

  savePlaylists: (playlists) => {
    localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(playlists));
  },

  getListeningHistory: () => {
    const data = localStorage.getItem(STORAGE_KEYS.LISTENING_HISTORY);
    return data ? JSON.parse(data) : [];
  },

  saveListeningHistory: (history) => {
    localStorage.setItem(STORAGE_KEYS.LISTENING_HISTORY, JSON.stringify(history));
  },

  getPreferences: () => {
    const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return data ? JSON.parse(data) : { theme: 'dark', autoplay: true };
  },

  savePreferences: (preferences) => {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
  },
};

export const playlistUtils = {
  createPlaylist: (name, description = '') => {
    const playlists = storage.getPlaylists();
    const newPlaylist = {
      id: Date.now().toString(),
      name,
      description,
      songs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    playlists.push(newPlaylist);
    storage.savePlaylists(playlists);
    window.dispatchEvent(new Event('playlists-changed'));
    return newPlaylist;
  },

  updatePlaylist: (id, updates) => {
    const playlists = storage.getPlaylists();
    const index = playlists.findIndex(p => p.id === id);
    if (index !== -1) {
      playlists[index] = { ...playlists[index], ...updates, updatedAt: new Date().toISOString() };
      storage.savePlaylists(playlists);
      window.dispatchEvent(new Event('playlists-changed'));
      return playlists[index];
    }
    return null;
  },

  deletePlaylist: (id) => {
    const playlists = storage.getPlaylists();
    const filtered = playlists.filter(p => p.id !== id);
    storage.savePlaylists(filtered);
    window.dispatchEvent(new Event('playlists-changed'));
  },

  addSongToPlaylist: (playlistId, song) => {
    const playlists = storage.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.songs.push({ ...song, addedAt: new Date().toISOString() });
      playlist.updatedAt = new Date().toISOString();
      storage.savePlaylists(playlists);
      window.dispatchEvent(new Event('playlists-changed'));
      return playlist;
    }
    return null;
  },

  reorderPlaylistSongs: (playlistId, fromIndex, toIndex) => {
    const playlists = storage.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      const [moved] = playlist.songs.splice(fromIndex, 1);
      playlist.songs.splice(toIndex, 0, moved);
      playlist.updatedAt = new Date().toISOString();
      storage.savePlaylists(playlists);
      window.dispatchEvent(new Event('playlists-changed'));
      return playlist;
    }
    return null;
  },

  removeSongFromPlaylist: (playlistId, songId) => {
    const playlists = storage.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.songs = playlist.songs.filter(s => s.videoId !== songId);
      playlist.updatedAt = new Date().toISOString();
      storage.savePlaylists(playlists);
      window.dispatchEvent(new Event('playlists-changed'));
      return playlist;
    }
    return null;
  },
};

export const historyUtils = {
  addToHistory: (song) => {
    const history = storage.getListeningHistory();
    const existingIndex = history.findIndex(s => s.videoId === song.videoId);
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    history.unshift({ ...song, playedAt: new Date().toISOString() });
    const maxHistory = 100;
    if (history.length > maxHistory) {
      history.splice(maxHistory);
    }
    storage.saveListeningHistory(history);
    return history;
  },

  clearHistory: () => {
    storage.saveListeningHistory([]);
  },

};
