const INNERTUBE_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30'
const CLIENT_VERSION = '1.20250501.00.00'

const useProxy = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
const usePiped = !useProxy

const PIPED_INSTANCES = [
  'pipedapi.kavin.rocks',
  'pipedapi.adminforge.de',
]

async function pipedFetch(path, timeoutMs = 8000) {
  let lastErr = null
  for (const inst of PIPED_INSTANCES) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), timeoutMs)
      const res = await fetch(`https://${inst}${path}`, { signal: ctrl.signal })
      clearTimeout(t)
      if (!res.ok) { lastErr = new Error(`${inst} returned ${res.status}`); continue }
      return res.json()
    } catch (e) { lastErr = e; continue }
  }
  throw lastErr || new Error('Piped instances unavailable')
}

function pipedSong(item) {
  const vid = item.url?.replace('/watch?v=', '') || item.videoId || ''
  const artistList = (item.artists || []).length
    ? item.artists.map(a => ({ name: typeof a === 'string' ? a : (a.name || item.uploaderName || ''), artistId: '' }))
    : [{ name: item.uploaderName || '', artistId: (item.uploaderUrl || '').replace('/channel/', '') || '' }]
  return {
    videoId: vid,
    title: item.title || '',
    artists: artistList,
    channelTitle: item.uploaderName || '',
    channelId: (item.uploaderUrl || '').replace('/channel/', '') || '',
    thumbnail: item.thumbnailUrl || item.thumbnail || '',
    duration: item.duration || 0,
    album: item.album || '',
    albumId: '',
  }
}

function pipedChannel(item) {
  return {
    type: 'artist',
    browseId: (item.url || '').replace('/channel/', '') || item.authorId || '',
    name: item.name || item.author || item.uploaderName || '',
    subscribers: item.subscribers ? fmtNum(item.subscribers) : '',
    thumbnail: item.avatarUrl || item.thumbnailUrl || item.thumbnail || '',
  }
}

function pipedPlaylist(item) {
  return {
    type: 'playlist',
    browseId: (item.url || '').replace('/playlist?list=', '') || item.playlistId || '',
    title: item.name || item.title || '',
    channelTitle: item.uploaderName || item.author || '',
    channelId: (item.uploaderUrl || '').replace('/channel/', '') || item.authorId || '',
    thumbnail: item.thumbnailUrl || item.thumbnail || item.playlistThumbnail || '',
    itemCount: item.videos || item.videoCount || 0,
  }
}

function fmtNum(n) {
  if (!n) return ''
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function nav(data, path, fallback) {
  let current = data
  for (const key of path) {
    if (current == null) return arguments.length > 2 ? fallback : undefined
    current = current[key]
  }
  return current
}

function thumb(thumbnails) {
  if (!thumbnails?.length) return ''
  return thumbnails[thumbnails.length - 1]?.url || ''
}

function parseDuration(text) {
  if (!text) return 0
  const parts = text.split(':')
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1])
  if (parts.length === 3) return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2])
  return 0
}

async function innertube(endpoint, body) {
  const targetUrl = `https://music.youtube.com/youtubei/v1/${endpoint}?key=${INNERTUBE_KEY}`
  const url = useProxy
    ? `/proxy-yt/youtubei/v1/${endpoint}?key=${INNERTUBE_KEY}`
    : `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: CLIENT_VERSION,
          hl: 'en',
          gl: 'US',
        },
      },
      ...body,
    }),
  })
  if (!res.ok) {
    if (res.status === 429) throw new Error('Rate limited by YouTube. Try again later.')
    const text = await res.text().catch(() => '')
    throw new Error(`YouTube Music error: ${res.status}${text ? ' - ' + text.slice(0, 100) : ''}`)
  }
  return res.json()
}

function getSectionList(data) {
  let slr = nav(data, ['contents', 'sectionListRenderer'])
  if (slr) return slr
  slr = nav(data, ['contents', 'singleColumnBrowseResultsRenderer', 'tabs', 0, 'tabRenderer', 'content', 'sectionListRenderer'])
  if (slr) return slr
  slr = nav(data, ['contents', 'twoColumnBrowseResultsRenderer', 'secondaryContents', 'sectionListRenderer'])
  if (slr) return slr
  return null
}

function findHeader(data) {
  const paths = [
    ['contents', 'musicResponsiveHeaderRenderer'],
    ['header', 'musicResponsiveHeaderRenderer'],
    ['contents', 'musicImmersiveHeaderRenderer'],
    ['header', 'musicImmersiveHeaderRenderer'],
  ]
  for (const p of paths) {
    const h = nav(data, p)
    if (h) return h
  }
  const twoCol = nav(data, ['contents', 'twoColumnBrowseResultsRenderer', 'tabs', 0, 'tabRenderer', 'content', 'sectionListRenderer', 'contents'])
  if (twoCol) {
    for (const section of twoCol) {
      const h = section.musicResponsiveHeaderRenderer
      if (h) return h
    }
  }
  return null
}

function extractItem(renderer) {
  const r = renderer.musicResponsiveListItemRenderer
  if (!r) return null

  const title = nav(r, ['flexColumns', 0, 'musicResponsiveListItemFlexColumnRenderer', 'text', 'runs', 0, 'text']) || ''
  const subtitleRuns = nav(r, ['flexColumns', 1, 'musicResponsiveListItemFlexColumnRenderer', 'text', 'runs']) || []
  const fixedRuns = nav(r, ['fixedColumns', 0, 'musicResponsiveListItemFixedColumnRenderer', 'text', 'runs']) || []
  const thumbnailArr = nav(r, ['thumbnail', 'musicThumbnailRenderer', 'thumbnail', 'thumbnails']) || []
  const navEndpoint = nav(r, ['navigationEndpoint']) || {}

  const watchEp = navEndpoint.watchEndpoint
  const browseEp = navEndpoint.browseEndpoint

  let videoId = ''
  let browseId = ''
  let playlistId = ''
  let resultType = 'song'

  if (watchEp) {
    videoId = watchEp.videoId || ''
    playlistId = watchEp.playlistId || ''
    resultType = 'song'
  } else if (browseEp) {
    browseId = browseEp.browseId || ''
    if (browseId.startsWith('MPRE')) resultType = 'album'
    else if (browseId.startsWith('MPSP')) resultType = 'playlist'
    else if (browseId.startsWith('VL') || browseId.startsWith('PL')) resultType = 'playlist'
    else if (browseId.startsWith('UC')) resultType = 'artist'
    else if (browseId.startsWith('MP')) resultType = 'album'
    else resultType = 'artist'
  } else {
    const vid = nav(r, ['playlistItemData', 'videoId'])
    if (vid) {
      videoId = vid
      resultType = 'song'
    }
  }

  const TYPE_LABELS = new Set(['song', 'artist', 'album', 'playlist', 'video', 'single', 'ep', 'episode', 'profile'])
  const hasAlbumRef = subtitleRuns.some(r => {
    const bid = nav(r, ['navigationEndpoint', 'browseEndpoint', 'browseId']) || ''
    return bid.startsWith('MPRE')
  })
  const typeLabelRun = subtitleRuns.find(r => {
    const t = (r.text || '').toLowerCase()
    return TYPE_LABELS.has(t) && !r.navigationEndpoint
  })
  const category = (typeLabelRun?.text || '').toLowerCase()
  const metaRuns = subtitleRuns.filter(r => {
    const t = (r.text || '').toLowerCase()
    return !TYPE_LABELS.has(t) || r.navigationEndpoint
  })

  let artists = []
  let album = ''
  let year = ''
  let itemCount = 0
  let duration = 0
  let subscribers = ''

  const fixedText = fixedRuns?.[0]?.text
  if (fixedText) duration = parseDuration(fixedText)

  if (resultType === 'song') {
    let i = 0
    while (i < metaRuns.length) {
      const run = metaRuns[i]
      const text = run.text || ''
      if (text === ' • ' || text === ', ' || text === ' & ') { i++; continue }
      if (text.match(/^\d+:\d+$/)) { duration = parseDuration(text); i++; continue }
      if (text.match(/^\d{4}$/)) { year = text; i++; continue }
      if (text.match(/^[\d,.]+[MK]?\s*views?$/i)) { i++; continue }
      if (text.match(/^[A-Z][a-z]+ \d{1,2}(,? \d{4})?$/)) { i++; continue }
      const hasNav = run.navigationEndpoint?.browseEndpoint || run.navigationEndpoint?.watchEndpoint
      if (hasNav) {
        const bid = run.navigationEndpoint.browseEndpoint?.browseId || ''
        if (bid.startsWith('MPRE')) {
          album = text
        } else if (bid) {
          artists.push({ name: text, id: bid })
        } else {
          album = text
        }
      } else if (artists.length > 0 && !artists[artists.length - 1].id && !album) {
        album = text
      } else {
        artists.push({ name: text, id: '' })
      }
      i++
    }
    if (artists.length === 0) {
      const fallback = metaRuns.map(r => r.text).filter(Boolean).filter(t => {
        if (t === ' • ' || t === ', ' || t === ' & ') return false
        if (t.match(/^\d+:\d+$/)) return false
        if (t.match(/^\d{4}$/)) return false
        if (t.match(/^[\d,.]+[MK]?\s*views?$/i)) return false
        if (t.match(/^[A-Z][a-z]+ \d{1,2}(,? \d{4})?$/)) return false
        return true
      }).join(' ')
      if (fallback) artists.push({ name: fallback, id: '' })
    }
  } else if (resultType === 'album') {
    for (const run of metaRuns) {
      const text = run.text || ''
      if (text === ' • ' || text === ', ' || text === ' & ') continue
      if (text.match(/^\d{4}$/)) { year = text; continue }
      if (text.match(/^\d+\s*(song|track|video)s?$/i)) { itemCount = parseInt(text) || 0; continue }
      if (text.match(/^[\d,.]+[MK]?\s*views?$/i)) continue
      if (text.match(/^[A-Z][a-z]+ \d{1,2}(,? \d{4})?$/)) continue
      if (!artists.length) {
        const id = nav(run, ['navigationEndpoint', 'browseEndpoint', 'browseId']) || ''
        artists.push({ name: text, id })
      }
    }
  } else if (resultType === 'artist') {
    const subText = metaRuns.map(r => r.text).filter(t => t !== ' • ' && t !== ', ' && t !== ' & ').join(' ')
    subscribers = subText
  } else if (resultType === 'playlist') {
    for (const run of metaRuns) {
      const text = run.text || ''
      if (text === ' • ' || text === ', ' || text === ' & ') continue
      if (text.match(/^\d+\s*(song|track|video)s?$/i)) { itemCount = parseInt(text) || 0; continue }
      if (text.match(/^[\d,.]+[MK]?\s*views?$/i)) continue
      if (text.match(/^[A-Z][a-z]+ \d{1,2}(,? \d{4})?$/)) continue
      if (!artists.length) {
        const id = nav(run, ['navigationEndpoint', 'browseEndpoint', 'browseId']) || ''
        artists.push({ name: text, id })
      }
    }
  }

  const item = {
    videoId,
    title,
    artists,
    thumbnails: thumbnailArr,
    duration_seconds: duration,
    album: album ? { name: album, id: '' } : undefined,
    year: year || undefined,
    itemCount: itemCount || undefined,
    browseId,
    playlistId,
    resultType,
    category,
    hasAlbumRef,
  }

  if (resultType === 'artist') item.subscribers = subscribers

  return item
}

function extractTwoRowItem(renderer) {
  const r = renderer.musicTwoRowItemRenderer
  if (!r) return null

  const title = nav(r, ['title', 'runs', 0, 'text']) || ''
  const browseId = nav(r, ['navigationEndpoint', 'browseEndpoint', 'browseId']) || ''
  const thumbnailArr = nav(r, ['thumbnailRenderer', 'musicThumbnailRenderer', 'thumbnail', 'thumbnails']) || []
  const subtitleRuns = nav(r, ['subtitle', 'runs']) || []

  let year = ''
  let artist = ''
  for (const run of subtitleRuns) {
    const text = run.text || ''
    if (text.match(/^\d{4}$/)) { year = text; continue }
    if (run.navigationEndpoint?.browseEndpoint) {
      artist = text
    }
  }

  let itemCount = 0
  let resultType = 'album'
  if (browseId.startsWith('MPSP')) resultType = 'playlist'
  else if (browseId.startsWith('VL') || browseId.startsWith('PL')) resultType = 'playlist'
  else if (browseId.startsWith('UC')) resultType = 'artist'
  else if (browseId.startsWith('MP')) resultType = 'album'

  const item = {
    videoId: '',
    title,
    artists: artist ? [{ name: artist, id: '' }] : [],
    thumbnails: thumbnailArr,
    duration_seconds: 0,
    album: undefined,
    year: year || undefined,
    itemCount: itemCount || undefined,
    browseId,
    playlistId: '',
    resultType,
  }

  return item
}

function extractShelfItems(data) {
  const slr = getSectionList(data)
  if (!slr) return []
  const sections = slr.contents || []
  const items = []
  for (const section of sections) {
    const shelf = section.musicShelfRenderer || section.musicCarouselShelfRenderer
    if (!shelf) continue
    const shelfContents = shelf.contents || []
    for (const c of shelfContents) {
      const item = c.musicResponsiveListItemRenderer ? extractItem(c) : (c.musicTwoRowItemRenderer ? extractTwoRowItem(c) : null)
      if (item) items.push(item)
    }
  }
  return items
}

function extractSearchResults(data) {
  const sections = nav(data, ['contents', 'tabbedSearchResultsRenderer', 'tabs', 0, 'tabRenderer', 'content', 'sectionListRenderer', 'contents']) || []
  const items = []
  for (const section of sections) {
    const card = section.musicCardShelfRenderer
    if (card) {
      const cardItems = card.contents || []
      for (const c of cardItems) {
        const item = extractItem(c)
        if (item) items.push(item)
      }
      continue
    }
    const itemSec = section.itemSectionRenderer
    if (itemSec) {
      for (const c of (itemSec.contents || [])) {
        const item = extractItem(c)
        if (item) items.push(item)
      }
      continue
    }
    const shelf = section.musicShelfRenderer || section.musicCarouselShelfRenderer
    if (shelf) {
      for (const c of (shelf.contents || [])) {
        const item = extractItem(c)
        if (item) items.push(item)
      }
    }
  }
  return items
}

function toSong(item) {
  return {
    videoId: item.videoId || '',
    title: item.title || '',
    artists: (item.artists || []).map(a => ({ name: a.name, artistId: a.id || '' })),
    channelTitle: (item.artists || []).map(a => a.name).join(', '),
    channelId: item.artists?.[0]?.id || '',
    thumbnail: thumb(item.thumbnails),
    duration: item.duration_seconds || 0,
    album: item.album?.name || '',
    albumId: item.album?.id || '',
  }
}

function toAlbum(item) {
  return {
    type: 'album',
    browseId: item.browseId || '',
    playlistId: item.browseId || '',
    title: item.title || '',
    artist: (item.artists || []).map(a => a.name).join(', '),
    channelTitle: (item.artists || []).map(a => a.name).join(', '),
    channelId: item.artists?.[0]?.id || '',
    thumbnail: thumb(item.thumbnails),
    videoCount: item.itemCount || 0,
    year: item.year || '',
  }
}

function toArtist(item) {
  return {
    type: 'artist',
    browseId: item.browseId || '',
    name: item.title || '',
    subscribers: item.subscribers || '',
    thumbnail: thumb(item.thumbnails),
  }
}

function toPlaylist(item) {
  const artistName = (item.artists || []).map(a => a.name).join(', ')
  return {
    type: 'playlist',
    browseId: item.browseId || '',
    title: item.title || '',
    channelTitle: artistName,
    channelId: item.artists?.[0]?.id || '',
    thumbnail: thumb(item.thumbnails),
    itemCount: item.itemCount || 0,
  }
}

function parseBrowseHeader(data) {
  const header = findHeader(data)
  if (!header) return {}

  const title = nav(header, ['title', 'runs', 0, 'text']) ||
    nav(header, ['title', 'text', 'runs', 0, 'text']) || ''
  const thumbnailArr = nav(header, ['thumbnail', 'musicThumbnailRenderer', 'thumbnail', 'thumbnails']) || []
  const subtitleRuns = nav(header, ['subtitle', 'runs']) || []

  let artist = ''
  let year = ''
  let trackCount = 0
  let subscribers = ''

  for (const run of subtitleRuns) {
    const text = run.text || ''
    if (text.match(/^\d{4}$/)) { year = text; continue }
    if (text.match(/^\d+\s*(song|track|video)s?$/i)) { trackCount = parseInt(text) || 0; continue }
    if (text.match(/^\d/) && !artist) continue
    if (!artist && run.navigationEndpoint?.browseEndpoint) {
      artist = text
    }
  }

  const secondTitle = nav(header, ['secondTitle', 'runs', 0, 'text']) || ''
  subscribers = secondTitle

  return { title, thumbnail: thumbnailArr, artist, year, trackCount, subscribers }
}

function parseBrowseTracks(data) {
  const slr = getSectionList(data)
  if (!slr) return []
  const contents = slr.contents || []
  const tracks = []

  for (const section of contents) {
    const shelf = section.musicShelfRenderer || section.musicCarouselShelfRenderer
    if (!shelf) continue
    const items = shelf.contents || []
    for (const c of items) {
      const r = c.musicResponsiveListItemRenderer
      if (!r) continue

      const title = nav(r, ['flexColumns', 0, 'musicResponsiveListItemFlexColumnRenderer', 'text', 'runs', 0, 'text']) || ''
      const runs = nav(r, ['flexColumns', 1, 'musicResponsiveListItemFlexColumnRenderer', 'text', 'runs']) || []
      const fixedRuns = nav(r, ['fixedColumns', 0, 'musicResponsiveListItemFixedColumnRenderer', 'text', 'runs']) || []
      const thumbnailArr = nav(r, ['thumbnail', 'musicThumbnailRenderer', 'thumbnail', 'thumbnails']) || []
      const navEp = nav(r, ['navigationEndpoint']) || {}

      const videoId = navEp.watchEndpoint?.videoId || nav(navEp, ['watchEndpoint', 'videoId']) || ''
      const setVideoId = nav(r, ['menu', 'menuRenderer', 'items', 0, 'menuNavigationItemRenderer', 'navigationEndpoint', 'watchEndpoint', 'videoId'], true)

      let channelTitle = ''
      let channelId = ''
      let duration = 0
      const fixedText = fixedRuns?.[0]?.text
      if (fixedText) duration = parseDuration(fixedText)

      let artists = []
      for (const run of runs) {
        const text = run.text || ''
        if (text === ' • ' || text === ', ') continue
        if (text.match(/^\d+:\d+$/)) { duration = parseDuration(text); continue }
        if (run.navigationEndpoint?.browseEndpoint || run.navigationEndpoint?.watchEndpoint) {
          const id = run.navigationEndpoint.browseEndpoint?.browseId ||
            run.navigationEndpoint.watchEndpoint?.playlistId || ''
          artists.push({ name: text, id })
          if (!channelTitle) channelTitle = text
          if (!channelId) channelId = id
        } else if (!artists.length) {
          artists.push({ name: text, id: '' })
          channelTitle = text
        }
      }

      tracks.push({
        videoId: videoId || setVideoId || nav(r, ['playlistItemData', 'videoId']) || '',
        title,
        artists: artists.map(a => ({ name: a.name, artistId: a.id })),
        channelTitle: artists.map(a => a.name).join(', '),
        channelId: artists[0]?.id || '',
        thumbnail: thumb(thumbnailArr),
        duration,
        album: '',
      })
    }
  }
  return tracks
}

function isValidSearchSong(i) {
  if (i.resultType !== 'song' || !i.videoId || !i.artists?.length) return false
  if (i.category === 'video' || i.category === 'episode') return false
  if (!i.category && !i.hasAlbumRef) return false
  return true
}

export const apiService = {
  async searchSongs(query, limit = 20) {
    if (usePiped) {
      const data = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`)
      const items = data.items || []
      return items.slice(0, limit).map(pipedSong)
    }
    const data = await innertube('search', { query })
    const items = extractSearchResults(data)
    return items.filter(isValidSearchSong).slice(0, limit).map(toSong)
  },

  async searchAll(query) {
    if (usePiped) {
      const [songsRes, channelsRes, playlistsRes] = await Promise.allSettled([
        pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=music_songs`),
        pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=channels`),
        pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=playlists`),
      ])
      return {
        songs: (songsRes.value?.items || []).slice(0, 20).map(pipedSong),
        albums: [],
        artists: (channelsRes.value?.items || []).slice(0, 10).map(pipedChannel),
        playlists: (playlistsRes.value?.items || []).slice(0, 10).map(pipedPlaylist),
      }
    }
    const data = await innertube('search', { query })
    const items = extractSearchResults(data)
    return {
      songs: items.filter(isValidSearchSong).slice(0, 20).map(toSong),
      albums: items.filter(i => i.resultType === 'album' && i.browseId).slice(0, 10).map(toAlbum),
      artists: items.filter(i => i.resultType === 'artist' && i.browseId).slice(0, 10).map(toArtist),
      playlists: items.filter(i => i.resultType === 'playlist' && i.browseId).slice(0, 10).map(toPlaylist),
    }
  },

  async searchAlbums(query, limit = 10) {
    if (usePiped) return []
    const data = await innertube('search', { query })
    const items = extractSearchResults(data)
    return items.filter(i => i.resultType === 'album' && i.browseId).slice(0, limit).map(toAlbum)
  },

  async searchArtists(query, limit = 10) {
    if (usePiped) {
      const data = await pipedFetch(`/search?q=${encodeURIComponent(query)}&filter=channels`)
      const items = data.items || []
      return items.slice(0, limit).map(pipedChannel)
    }
    const data = await innertube('search', { query })
    const items = extractSearchResults(data)
    return items.filter(i => i.resultType === 'artist' && i.browseId).slice(0, limit).map(toArtist)
  },

  async getAlbum(browseId) {
    const data = await innertube('browse', { browseId })
    const header = parseBrowseHeader(data)
    const tracks = parseBrowseTracks(data)
    return {
      title: header.title || '',
      artist: header.artist || '',
      artistId: '',
      year: header.year || '',
      thumbnail: thumb(header.thumbnail),
      tracks: tracks.map(t => ({ ...t, album: header.title || '' })),
    }
  },

  async getArtist(browseId) {
    const data = await innertube('browse', { browseId })
    const header = parseBrowseHeader(data)
    const items = extractShelfItems(data)
    const songs = items.filter(i => i.resultType === 'song' && i.videoId).map(toSong)
    const albums = items.filter(i => i.resultType === 'album' && i.browseId).map(toAlbum)
    return {
      name: header.title || '',
      thumbnail: thumb(header.thumbnail),
      subscribers: header.subscribers || '',
      songs,
      albums,
    }
  },

  async getPlaylist(playlistId) {
    const cleanId = playlistId.replace(/^VL/, '')
    if (usePiped) {
      try {
        const data = await pipedFetch(`/playlists/${cleanId}`)
        const videos = data.videos || []
        return {
          title: data.name || '',
          owner: data.uploader || '',
          thumbnail: data.thumbnailUrl || data.uploaderAvatar || '',
          trackCount: videos.length,
          tracks: videos.map(v => ({
            videoId: v.videoId || '',
            title: v.title || '',
            artists: [{ name: v.uploaderName || '', artistId: (v.uploaderUrl || '').replace('/channel/', '') || '' }],
            channelTitle: v.uploaderName || '',
            channelId: (v.uploaderUrl || '').replace('/channel/', '') || '',
            thumbnail: v.thumbnailUrl || '',
            duration: v.duration || 0,
            album: '',
          })),
        }
      } catch {}
    }
    const data = await innertube('browse', { browseId: cleanId })
    const header = parseBrowseHeader(data)
    const tracks = parseBrowseTracks(data)
    return {
      title: header.title || '',
      owner: header.artist || '',
      thumbnail: thumb(header.thumbnail),
      trackCount: header.trackCount || tracks.length,
      tracks,
    }
  },

  async getSong(videoId) {
    if (usePiped) {
      try {
        const data = await pipedFetch(`/streams/${videoId}`)
        return {
          videoId: data.videoId || videoId,
          title: data.title || '',
          artists: [{ name: data.uploader || '', artistId: (data.uploaderUrl || '').replace('/channel/', '') || '' }],
          channelTitle: data.uploader || '',
          channelId: (data.uploaderUrl || '').replace('/channel/', '') || '',
          thumbnail: data.thumbnailUrl || '',
          duration: data.duration || 0,
          description: data.description || '',
        }
      } catch {}
    }
    const data = await innertube('player', { videoId, playlistId: `OLAK5uy_${videoId}` })
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
