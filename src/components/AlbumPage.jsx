import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Shuffle } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { youtubeScraperService } from '../services/youtubeScraper';

export const AlbumPage = () => {
  const { subPage, navigateBack } = useNavigate();
  const { playSong, setQueueSongs, currentSong } = usePlayer();
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const album = subPage?.params;

  useEffect(() => {
    if (!album?.playlistId) return;
    setLoading(true);
    setError('');
    youtubeScraperService.getPlaylistTracks(album.playlistId)
      .then(data => {
        setTracks(data);
      })
      .catch(err => { console.error('Failed to load album tracks:', err); setError('Could not reach the music backend.'); })
      .finally(() => setLoading(false));
  }, [album?.playlistId]);

  if (!album) return null;

  const handlePlayAll = () => {
    if (tracks.length > 0) setQueueSongs(tracks, 0);
  };

  const handleShuffle = () => {
    if (tracks.length > 0) {
      const s = [...tracks].sort(() => Math.random() - 0.5);
      setQueueSongs(s, 0);
    }
  };

  const handlePlayTrack = (track) => {
    playSong(track, tracks);
  };

  return (
    <div className="p-6 animate-fadeIn">
      <button
        onClick={navigateBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="flex items-center gap-6 mb-8 animate-slideDown">
        <img
          src={album.thumbnail}
          alt={album.title}
          className="w-40 h-40 rounded-xl object-cover shadow-lg"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-white mb-2">{album.title}</h1>
          <p className="text-gray-400 mb-1">{album.channelTitle}</p>
          <p className="text-gray-500 text-sm mb-4">{tracks.length} tracks</p>
          <div className="flex gap-3">
            <button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <Play size={18} /> Play All
            </button>
            <button
              onClick={handleShuffle}
              className="flex items-center gap-2 px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors"
            >
              <Shuffle size={18} /> Shuffle
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4">Loading tracks...</p>
        </div>
      ) : tracks.length === 0 && !error ? (
        <p className="text-gray-400 text-center py-8">No tracks found</p>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, i) => (
            <div
              key={track.videoId}
              className={`flex items-center gap-4 p-3 rounded-lg transition-colors group cursor-pointer animate-slideUp ${
                currentSong?.videoId === track.videoId ? 'bg-red-600/20' : 'bg-gray-800/50 hover:bg-gray-800'
              }`}
              style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'backwards' }}
              onClick={() => handlePlayTrack(track)}
            >
              <span className="text-gray-500 w-6 text-center">{i + 1}</span>
              <img src={track.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{track.title}</p>
                <p className="text-gray-400 text-sm truncate">{track.channelTitle}</p>
              </div>
              <span className="text-gray-500 text-sm">
                {youtubeScraperService.formatDuration(track.duration)}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlayTrack(track); }}
                  className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                >
                  <Play size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
