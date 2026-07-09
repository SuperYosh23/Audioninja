import { useState, useEffect } from 'react';
import { Search as SearchIcon, Music, Play, User, Disc3, Clock, Plus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { youtubeScraperService } from '../services/youtubeScraper';
import { PlaylistPickerModal } from './PlaylistPickerModal';
import { LoadingIndicator } from './LoadingIndicator';
import { RetryImage } from './RetryImage';

export const Search = ({ searchQuery, setSearchQuery }) => {
  const [results, setResults] = useState({ songs: [], albums: [], playlists: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('songs');
  const [pickerSong, setPickerSong] = useState(null);
  const { playSong, addToQueue } = usePlayer();
  const { navigate } = useNavigate();

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ songs: [], albums: [], playlists: [] });
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    youtubeScraperService.searchAll(searchQuery)
      .then(data => { if (!cancelled) setResults(data) })
      .catch(err => { if (!cancelled) { console.error('Search failed:', err); setError('Could not reach the music backend. Make sure the Python server is running on port 3614.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [searchQuery])

  useEffect(() => {
    const tabOrder = ['songs', 'albums']
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
  ];

  if (!searchQuery.trim()) {
    return (
      <div className="p-6 text-center text-outline py-20 animate-fadeIn">
        <Music size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">Search for music and albums</p>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fadeIn">
      {loading && (
        <div className="text-center text-on-surface-variant py-8">
          <LoadingIndicator size="lg" className="mx-auto" />
          <p className="mt-4">Searching...</p>
        </div>
      )}

      {error && (
        <div className="bg-error-container/30 border border-error rounded-lg p-4 mb-6 text-on-error-container text-sm">
          {error}
        </div>
      )}

      {!loading && !error && !results.songs.length && !results.albums.length && (
        <div className="text-center text-on-surface-variant py-8">
          <SearchIcon size={48} className="mx-auto mb-4 opacity-50" />
          <p>No results found for "{searchQuery}"</p>
        </div>
      )}

      {!loading && results.songs.length + results.albums.length > 0 && (
        <div className="flex gap-4 mb-6 border-b border-outline-variant pb-4 overflow-x-auto">
          {tabs.filter(t => t.count > 0).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-primary text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
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
            <div key={song.videoId} className="flex items-center gap-4 p-3 bg-surface-container/50 rounded-xl hover:bg-surface-container transition-colors group animate-slideUp" style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'backwards' }}>
              <RetryImage src={song.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-on-surface">{song.title}</p>
                <p className="text-sm text-on-surface-variant truncate">
                  <span onClick={e => { e.stopPropagation(); openArtist(song.channelTitle, song.channelId, song.thumbnail) }}
                     className="cursor-pointer hover:text-on-surface">
                    {song.channelTitle}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handlePlaySong(song)} className="p-2 bg-primary text-on-surface rounded-full hover:bg-primary/80" title="Play"><Play size={16} /></button>
                <button onClick={() => handleAddToQueue(song)} className="p-2 bg-surface-container-high text-on-surface rounded-full hover:bg-surface-container-highest" title="Queue"><Clock size={16} /></button>
                <button onClick={() => handleAddToPlaylist(song)} className="p-2 bg-surface-container-high text-on-surface rounded-full hover:bg-surface-container-highest" title="Add to playlist"><Plus size={16} /></button>
                <button onClick={() => openArtist(song.channelTitle, song.channelId, song.thumbnail)} className="p-2 bg-surface-container-high text-on-surface rounded-full hover:bg-surface-container-highest" title="Artist"><User size={16} /></button>
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
                 className="bg-surface-container/50 rounded-xl p-4 cursor-pointer hover:bg-surface-container transition-colors hover:scale-[1.02] animate-scaleIn" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'backwards' }}>
              <RetryImage src={album.thumbnail} alt="" className="w-full aspect-square rounded-lg object-cover mb-3" />
              <p className="text-on-surface font-medium truncate">{album.title}</p>
              <p className="text-on-surface-variant text-sm truncate">
                <span onClick={e => { e.stopPropagation(); openArtist(album.channelTitle, album.channelId, album.thumbnail) }}
                   className="cursor-pointer hover:text-on-surface">
                  {album.channelTitle}
                </span>
              </p>
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
