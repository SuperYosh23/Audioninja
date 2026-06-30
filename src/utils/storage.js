const STORAGE_KEYS = {
  PLAYLISTS: 'ym_playlists',
  FOLLOWED_ARTISTS: 'ym_followed_artists',
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

  getFollowedArtists: () => {
    const data = localStorage.getItem(STORAGE_KEYS.FOLLOWED_ARTISTS);
    return data ? JSON.parse(data) : [];
  },

  saveFollowedArtists: (artists) => {
    localStorage.setItem(STORAGE_KEYS.FOLLOWED_ARTISTS, JSON.stringify(artists));
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
    return newPlaylist;
  },

  updatePlaylist: (id, updates) => {
    const playlists = storage.getPlaylists();
    const index = playlists.findIndex(p => p.id === id);
    if (index !== -1) {
      playlists[index] = { ...playlists[index], ...updates, updatedAt: new Date().toISOString() };
      storage.savePlaylists(playlists);
      return playlists[index];
    }
    return null;
  },

  deletePlaylist: (id) => {
    const playlists = storage.getPlaylists();
    const filtered = playlists.filter(p => p.id !== id);
    storage.savePlaylists(filtered);
  },

  addSongToPlaylist: (playlistId, song) => {
    const playlists = storage.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.songs.push({ ...song, addedAt: new Date().toISOString() });
      playlist.updatedAt = new Date().toISOString();
      storage.savePlaylists(playlists);
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
      return playlist;
    }
    return null;
  },
};

function artistKey(a) {
  return a.artistId || a.name;
}

export const artistUtils = {
  followArtist: (artist) => {
    const artists = storage.getFollowedArtists();
    const key = artistKey(artist);
    if (!artists.find(a => artistKey(a) === key)) {
      artists.push({ ...artist, followedAt: new Date().toISOString() });
      storage.saveFollowedArtists(artists);
    }
    return artists;
  },

  unfollowArtist: (artistId, artistName) => {
    const artists = storage.getFollowedArtists();
    const filtered = artists.filter(a => (a.artistId || a.name) !== (artistId || artistName));
    storage.saveFollowedArtists(filtered);
    return filtered;
  },

  isFollowing: (artistId, artistName) => {
    const artists = storage.getFollowedArtists();
    return artists.some(a => (a.artistId || a.name) === (artistId || artistName));
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

  getTopArtists: (limit = 10) => {
    const history = storage.getListeningHistory();
    const artistMap = {};
    history.forEach(song => {
      if (song.artists) {
        song.artists.forEach(artist => {
          if (!artistMap[artist.name]) {
            artistMap[artist.name] = { name: artist.name, count: 0, thumbnail: song.thumbnail };
          }
          artistMap[artist.name].count += 1;
        });
      }
    });
    return Object.values(artistMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },
};
