import { useState, useEffect } from 'react';
import { Search as SearchIcon, Music, User, Disc3, Clock, Plus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { youtubeScraperService } from '../services/youtubeScraper';
import { PlaylistPickerModal } from './PlaylistPickerModal';

export const Search = ({ searchQuery, setSearchQuery }) => {
  const [results, setResults] = useState({ songs: [], albums: [], artists: [], playlists: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('songs');
  const [pickerSong, setPickerSong] = useState(null);
  const { playSong, addToQueue } = usePlayer();
  const { navigate } = useNavigate();

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ songs: [], albums: [], artists: [], playlists: [] });
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    youtubeScraperService.searchAll(searchQuery)
      .then(data => { if (!cancelled) setResults(data) })
      .catch(err => { if (!cancelled) { console.error('Search failed:', err); setError(err.message) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [searchQuery])

  useEffect(() => {
    const tabOrder = ['songs', 'albums', 'artists']
    if (!tabOrder.includes(activeTab) || results[activeTab]?.length === 0) {
      const first = tabOrder.find(t => (results[t]?.length || 0) > 0)
      if (first) setActiveTab(first)
    }
  }, [results])

  const handlePlaySong = (song) => {
    playSong(song, results.songs);
  };

  const handleAddToQueue = (song) => {
    addToQueue(song);
  };

  const handleAddToPlaylist = (song) => {
    setPickerSong(song);
  };

  const openArtist = (name, browseId, thumb) =>
    navigate({ type: 'artist', params: { name, artistId: browseId, thumbnail: thumb } });

  const openAlbum = (album) => navigate({ type: 'album', params: album });

  const tabs = [
    { id: 'songs', label: 'Songs', icon: Music, count: results.songs.length },
    { id: 'albums', label: 'Albums', icon: Disc3, count: results.albums.length },
    { id: 'artists', label: 'Artists', icon: User, count: results.artists.length },
  ];

  if (!searchQuery.trim()) {
    return (
      <div className="p-6 text-center text-gray-500 py-20 animate-fadeIn">
        <Music size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">Search for music, albums, and artists</p>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fadeIn">
      {loading && (
        <div className="text-center text-gray-400 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4">Searching...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-200 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && !results.songs.length && !results.albums.length && !results.artists.length && (
        <div className="text-center text-gray-400 py-8">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>No results found for "{searchQuery}"</p>
        </div>
      )}

      {!loading && results.songs.length + results.albums.length + results.artists.length > 0 && (
        <div className="flex gap-4 mb-6 border-b border-gray-700 pb-4 overflow-x-auto">
          {tabs.filter(t => t.count > 0).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      )}

      {/* Songs */}
      {!loading && activeTab === 'songs' && results.songs.length > 0 && (
        <div className="space-y-2">
          {results.songs.map((song, i) => (
            <div key={song.videoId} className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group animate-slideUp" style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'backwards' }}>
              <span className="text-gray-500 w-6 text-center">{i + 1}</span>
              <img src={song.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-white">{song.title}</p>
                <p onClick={e => { e.stopPropagation(); openArtist(song.channelTitle, song.channelId, song.thumbnail) }}
                   className="text-sm text-gray-400 truncate hover:text-white cursor-pointer">
                  {song.channelTitle}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handlePlaySong(song)} className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700" title="Play"><Music size={16} /></button>
                <button onClick={() => handleAddToQueue(song)} className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600" title="Queue"><Clock size={16} /></button>
                <button onClick={() => handleAddToPlaylist(song)} className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600" title="Add to playlist"><Plus size={16} /></button>
                <button onClick={() => openArtist(song.channelTitle, song.channelId, song.thumbnail)} className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600" title="Artist"><User size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Albums */}
      {!loading && activeTab === 'albums' && results.albums.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.albums.map((album, i) => (
            <div key={album.playlistId} onClick={() => openAlbum(album)}
                 className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors hover:scale-[1.02] animate-scaleIn" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'backwards' }}>
              <img src={album.thumbnail} alt="" className="w-full aspect-square rounded-lg object-cover mb-3" />
              <p className="text-white font-medium truncate">{album.title}</p>
              <p onClick={e => { e.stopPropagation(); openArtist(album.channelTitle, album.channelId, album.thumbnail) }}
                 className="text-gray-400 text-sm truncate hover:text-white cursor-pointer">
                {album.channelTitle}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Artists */}
      {!loading && activeTab === 'artists' && results.artists.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.artists.map((artist, i) => (
            <div key={artist.browseId} onClick={() => openArtist(artist.name, artist.browseId, artist.thumbnail)}
                 className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors hover:scale-[1.02] text-center animate-scaleIn" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'backwards' }}>
              <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-purple-800">
                {artist.thumbnail ? <img src={artist.thumbnail} alt="" className="w-full h-full object-cover" /> : <User size={36} className="text-white/60 mx-auto mt-6" />}
              </div>
              <p className="text-white font-medium truncate">{artist.name}</p>
              <p className="text-gray-400 text-xs truncate">{artist.subscribers}</p>
            </div>
          ))}
        </div>
      )}

      {pickerSong && (
        <PlaylistPickerModal song={pickerSong} onClose={() => setPickerSong(null)} />
      )}
    </div>
  );
};
