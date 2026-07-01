import { useState, useEffect } from 'react';
import { Music, Clock, TrendingUp, Sparkles, Plus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { storage, historyUtils } from '../utils/storage';
import { youtubeScraperService } from '../services/youtubeScraper';
import { PlaylistPickerModal } from './PlaylistPickerModal';

export const Recommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickerSong, setPickerSong] = useState(null);
  const { playSong, setQueueSongs } = usePlayer();
  const { navigate } = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const history = storage.getListeningHistory();
      const topArtistsList = historyUtils.getTopArtists(5);
      setTopArtists(topArtistsList);
      setRecentHistory(history.slice(0, 10));

      if (history.length > 0) {
        const lastPlayed = history[0];
        const query = lastPlayed.channelTitle || lastPlayed.title;
        const relatedSongs = query
          ? await youtubeScraperService.getRelatedVideos(query, 10)
          : [];
        setRecommendations(relatedSongs);
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      setError('Could not reach the music backend. Make sure the Python server is running on port 3614.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlaySong = (song) => {
    playSong(song, recommendations);
  };

  const handlePlayArtist = async (artistName) => {
    try {
      const songs = await youtubeScraperService.getArtistVideos(artistName, 10);
      if (songs.length > 0) {
        setQueueSongs(songs, 0);
      }
    } catch (error) {
      console.error('Failed to play artist:', error);
    }
  };

  const handleViewArtist = (artist) => {
    navigate({ type: 'artist', params: { name: artist.name, thumbnail: artist.thumbnail } });
  };

  const handlePlayHistorySong = (song) => {
    playSong(song, recentHistory);
  };

  return (
    <div className="p-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Sparkles size={24} />
        For You
      </h2>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4">Loading recommendations...</p>
        </div>
      ) : (
        <>
          {topArtists.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2 animate-slideUp">
                <TrendingUp size={20} />
                Your Top Artists
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {topArtists.map((artist, i) => (
                  <div
                    key={artist.name}
                    className="flex-shrink-0 w-32 rounded-lg cursor-pointer animate-slideUp"
                    style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'backwards' }}
                  >
                    <div
                      onClick={() => handleViewArtist(artist)}
                      className="p-4 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg hover:scale-105 transition-transform"
                    >
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-white/20">
                        {artist.thumbnail ? (
                          <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl font-bold text-white">{artist.name[0]}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-white text-sm font-medium truncate text-center">{artist.name}</p>
                      <p className="text-white/70 text-xs text-center">{artist.count} plays</p>
                    </div>
                    <button
                      onClick={() => handlePlayArtist(artist.name)}
                      className="mt-2 w-full px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-700 transition-colors"
                    >
                      Play
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2 animate-slideUp">
                <Music size={20} />
                Recommended For You
              </h3>
              <div className="grid gap-3">
                {recommendations.map((song, index) => (
                  <div
                    key={song.videoId}
                    className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer animate-slideUp"
                    style={{ animationDelay: `${index * 0.04}s`, animationFillMode: 'backwards' }}
                    onClick={() => handlePlaySong(song)}
                  >
                    <span className="text-gray-500 w-6 text-center">{index + 1}</span>
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">{song.title}</h4>
                      <p className="text-sm text-gray-400 truncate">{song.channelTitle}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySong(song);
                        }}
                        className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                        title="Play"
                      >
                        <Music size={14} />
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
            </div>
          )}

          {recentHistory.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2 animate-slideUp">
                <Clock size={20} />
                Recently Played
              </h3>
              <div className="grid gap-3">
                {recentHistory.map((song, index) => (
                  <div
                    key={song.videoId}
                    className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors group cursor-pointer animate-slideUp"
                    style={{ animationDelay: `${index * 0.04}s`, animationFillMode: 'backwards' }}
                    onClick={() => handlePlayHistorySong(song)}
                  >
                    <span className="text-gray-500 w-6 text-center">{index + 1}</span>
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">{song.title}</h4>
                      <p className="text-sm text-gray-400 truncate">{song.channelTitle}</p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayHistorySong(song, index);
                        }}
                        className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                        title="Play"
                      >
                        <Music size={14} />
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
            </div>
          )}

          {!loading && recommendations.length === 0 && topArtists.length === 0 && recentHistory.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              <Sparkles size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No recommendations yet</p>
              <p className="text-sm">Start listening to music to get personalized recommendations!</p>
            </div>
          )}
        </>
      )}

      {pickerSong && (
        <PlaylistPickerModal song={pickerSong} onClose={() => setPickerSong(null)} />
      )}
    </div>
  );
};
