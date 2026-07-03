const API_BASE = globalThis.electronAPI?.backendUrl || '/api'

const lyricsCache = new Map()
const pendingLyrics = new Map()

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json()
}

async function doCheckLyrics(videoId) {
  if (pendingLyrics.has(videoId)) return pendingLyrics.get(videoId)
  const promise = (async () => {
    try {
      const data = await fetchJson(`${API_BASE}/lyrics/check/${videoId}`)
      const available = data.available ?? false
      lyricsCache.set(videoId, available)
      pendingLyrics.delete(videoId)
      return available
    } catch {
      lyricsCache.set(videoId, false)
      pendingLyrics.delete(videoId)
      return false
    }
  })()
  pendingLyrics.set(videoId, promise)
  return promise
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
    const [songData, albumData, playlistData] = await Promise.all([
      fetchJson(`${API_BASE}/search/songs?q=${encodeURIComponent(query)}&limit=20`),
      fetchJson(`${API_BASE}/search/albums?q=${encodeURIComponent(query)}&limit=10`),
      fetchJson(`${API_BASE}/search/playlists?q=${encodeURIComponent(query)}&limit=10`),
    ])
    return {
      songs: (songData.results || []).map(toSong),
      albums: (albumData.results || []).map(toAlbum),
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

  async checkLyrics(videoId) {
    if (lyricsCache.has(videoId)) return lyricsCache.get(videoId)
    return doCheckLyrics(videoId)
  },

  async getLyrics(videoId) {
    const data = await fetchJson(`${API_BASE}/lyrics/${videoId}`)
    return data
  },

  prefetchLyrics(videoIds) {
    for (const id of videoIds) {
      if (!id || lyricsCache.has(id)) continue
      doCheckLyrics(id)
    }
  },
}
