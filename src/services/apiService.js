const API_BASE = '/api'

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

function thumb(thumbnails) {
  if (!thumbnails || !thumbnails.length) return ''
  return thumbnails[thumbnails.length - 1].url
}

function artistNames(artists) {
  if (!artists || !artists.length) return ''
  return artists.map(a => a.name).join(', ')
}

function songId(artists) {
  if (!artists || !artists.length) return ''
  return artists[0].id || ''
}

function toSong(item) {
  return {
    videoId: item.videoId || '',
    title: item.title || '',
    artists: (item.artists || []).map(a => ({ name: a.name, artistId: a.id || '' })),
    channelTitle: artistNames(item.artists),
    channelId: songId(item.artists),
    thumbnail: thumb(item.thumbnails),
    duration: item.duration_seconds || 0,
    album: item.album?.name || '',
    albumId: item.album?.id || '',
  }
}

function toAlbum(item) {
  const artistName = item.artists?.map?.(a => a.name).join(', ') || ''
  return {
    type: 'album',
    browseId: item.browseId || '',
    playlistId: item.browseId || '',
    title: item.title || '',
    artist: artistName,
    channelTitle: artistName,
    channelId: songId(item.artists),
    thumbnail: thumb(item.thumbnails),
    videoCount: item.itemCount || item.trackCount || 0,
    year: item.year ? String(item.year) : '',
  }
}

function toArtist(item) {
  return {
    type: 'artist',
    browseId: item.browseId || '',
    name: item.title || item.name || '',
    subscribers: item.subscribers || item.subscriberCount || '',
    thumbnail: thumb(item.thumbnails),
  }
}

function toPlaylist(item) {
  const artistName = item.artists?.map?.(a => a.name).join(', ') || ''
  return {
    type: 'playlist',
    browseId: item.browseId || '',
    title: item.title || '',
    channelTitle: artistName || item.owner || '',
    channelId: songId(item.artists) || '',
    thumbnail: thumb(item.thumbnails),
    itemCount: item.itemCount || 0,
  }
}

export const apiService = {
  async searchSongs(query, limit = 20) {
    const data = await fetchJson(`${API_BASE}/search/songs?q=${encodeURIComponent(query)}&limit=${limit}`)
    return (data.results || []).map(toSong)
  },

  async searchAll(query) {
    const [songData, albumData, artistData, playlistData] = await Promise.all([
      fetchJson(`${API_BASE}/search/songs?q=${encodeURIComponent(query)}&limit=20`),
      fetchJson(`${API_BASE}/search/albums?q=${encodeURIComponent(query)}&limit=10`),
      fetchJson(`${API_BASE}/search/artists?q=${encodeURIComponent(query)}&limit=10`),
      fetchJson(`${API_BASE}/search/playlists?q=${encodeURIComponent(query)}&limit=10`),
    ])
    return {
      songs: (songData.results || []).map(toSong),
      albums: (albumData.results || []).map(toAlbum),
      artists: (artistData.results || []).map(toArtist),
      playlists: (playlistData.results || []).map(toPlaylist),
    }
  },

  async searchAlbums(query, limit = 10) {
    const data = await fetchJson(`${API_BASE}/search/albums?q=${encodeURIComponent(query)}&limit=${limit}`)
    return (data.results || []).map(toAlbum)
  },

  async getAlbum(browseId) {
    const data = await fetchJson(`${API_BASE}/album/${browseId}`)
    return {
      title: data.title || '',
      artist: data.artists?.[0]?.name || '',
      artistId: data.artists?.[0]?.id || '',
      year: data.year || '',
      thumbnail: thumb(data.thumbnails),
      tracks: (data.tracks || []).map(t => ({
        videoId: t.videoId || '',
        title: t.title || '',
        artists: (t.artists || []).map(a => ({ name: a.name, artistId: a.id || '' })),
        channelTitle: artistNames(t.artists),
        channelId: songId(t.artists),
        thumbnail: thumb(t.thumbnails),
        duration: t.duration_seconds || 0,
        album: data.title || '',
      })),
    }
  },

  async getArtist(browseId) {
    const data = await fetchJson(`${API_BASE}/artist/${browseId}`)
    const songs = (data.songs?.results || []).filter(s => s.resultType === 'song' || s.videoId).map(toSong)
    const albums = (data.albums?.results || []).map(toAlbum)
    return {
      name: data.name || '',
      thumbnail: thumb(data.thumbnails),
      subscribers: data.subscribers || '',
      songs,
      albums,
    }
  },

  async getPlaylist(playlistId) {
    const data = await fetchJson(`${API_BASE}/playlist/${playlistId}`)
    return {
      title: data.title || '',
      owner: data.owner?.name || '',
      thumbnail: thumb(data.thumbnails),
      trackCount: data.trackCount || 0,
      tracks: (data.tracks || []).map(t => ({
        videoId: t.videoId || '',
        title: t.title || '',
        artists: (t.artists || []).map(a => ({ name: a.name, artistId: a.id || '' })),
        channelTitle: artistNames(t.artists),
        channelId: songId(t.artists),
        thumbnail: thumb(t.thumbnails),
        duration: t.duration_seconds || 0,
      })),
    }
  },

  async getSong(videoId) {
    const data = await fetchJson(`${API_BASE}/song/${videoId}`)
    const vd = data.videoDetails || {}
    return {
      videoId: vd.videoId || videoId,
      title: vd.title || '',
      artists: [{ name: vd.author || '', artistId: vd.channelId || '' }],
      channelTitle: vd.author || '',
      channelId: vd.channelId || '',
      thumbnail: vd.thumbnail?.thumbnails?.[vd.thumbnail.thumbnails.length - 1]?.url || '',
      duration: parseInt(vd.lengthSeconds) || 0,
      description: vd.shortDescription || '',
    }
  },
}
