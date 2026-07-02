import { useState, useEffect } from 'react';
import { ArrowLeft, Music, Play, Shuffle, Plus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { youtubeScraperService } from '../services/youtubeScraper';
import { PlaylistPickerModal } from './PlaylistPickerModal';

export const ArtistPage = () => {
  const { subPage, navigateBack } = useNavigate();
  const { playSong, setQueueSongs } = usePlayer();
  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pickerSong, setPickerSong] = useState(null);

  const artist = subPage?.params;

  useEffect(() => {
    if (!artist?.name) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      youtubeScraperService.search(artist.name, 20),
      youtubeScraperService.searchAlbums(artist.name),
    ]).then(([songResults, albumResults]) => {
      if (!cancelled) {
        setSongs(songResults);
        setAlbums(albumResults);
      }
    }).catch(err => {
      if (!cancelled) { console.error('Failed to load artist data:', err); setError('Could not reach the music backend.'); }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [artist?.name]);

  const handlePlaySong = (song) => {
    playSong(song, songs);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) setQueueSongs(songs, 0);
  };

  const handleShuffle = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      setQueueSongs(shuffled, 0);
    }
  };

  const handlePlayAlbum = (album) => {
    youtubeScraperService.getPlaylistTracks(album.playlistId).then(tracks => {
      if (tracks.length > 0) setQueueSongs(tracks, 0);
    });
  };

  if (!artist) return null;

  const thumbnail = artist.thumbnail || songs[0]?.thumbnail || '';

  return (
    <div className="p-6 animate-fadeIn">
      <button
        onClick={navigateBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Back
      </button>

      <div className="flex items-center gap-6 mb-8 animate-slideDown">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-purple-800 flex-shrink-0">
          {thumbnail ? (
            <img src={thumbnail} alt={artist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music size={48} className="text-white/60" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-white mb-2">{artist.name}</h1>
          <p className="text-gray-400">{songs.length} songs</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <Play size={18} />
              Play All
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
            >
              <Shuffle size={18} />
              Shuffle
            </button>

          </div>
        </div>
      </div>

      {albums.length > 0 && (
        <div className="mb-8 animate-slideUp">
          <h2 className="text-xl font-bold text-white mb-4">Albums</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {albums.map((album, i) => (
              <div
                key={album.playlistId}
                onClick={() => handlePlayAlbum(album)}
                className="flex-shrink-0 w-40 cursor-pointer hover:scale-105 transition-transform animate-scaleIn"
                style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'backwards' }}
              >
                <img
                  src={album.thumbnail}
                  alt={album.title}
                  className="w-40 h-40 rounded-lg object-cover mb-2"
                />
                <p className="text-white text-sm font-medium truncate">{album.title}</p>
                <p className="text-gray-400 text-xs">{album.videoCount} videos</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-white mb-4">Songs</h2>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4">Loading songs...</p>
        </div>
      ) : songs.length === 0 && !error ? (
        <p className="text-gray-400 text-center py-8">No songs found</p>
      ) : (
        <div className="space-y-2">
          {songs.map((song, i) => (
            <div
              key={song.videoId}
              className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer animate-slideUp"
              style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'backwards' }}
              onClick={() => handlePlaySong(song)}
            >
              <span className="text-gray-500 w-6 text-center">{i + 1}</span>
              <img src={song.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{song.title}</p>
                <p className="text-gray-400 text-sm truncate">{song.channelTitle}</p>
              </div>
              <span className="text-gray-500 text-sm">
                {youtubeScraperService.formatDuration(song.duration)}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlaySong(song); }}
                  className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setPickerSong(song); }}
                  className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
                  title="Add to playlist"
                >
                  <Plus size={14} />
                </button>
              </div>
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
