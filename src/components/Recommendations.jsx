import { useState, useEffect } from 'react';
import { Music, Play, Clock, Sparkles, Plus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { storage } from '../utils/storage';
import { youtubeScraperService } from '../services/youtubeScraper';
import { PlaylistPickerModal } from './PlaylistPickerModal';

export const Recommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickerSong, setPickerSong] = useState(null);
  const { playSong } = usePlayer();
  const { navigate } = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setLoading(true);
    setError('');
    try {
      const history = storage.getListeningHistory();
      setRecentHistory(history.slice(0, 10));

      if (history.length > 0) {
        const artistCounts = {};
        history.forEach(song => {
          const artist = song.channelTitle || song.title;
          if (artist) {
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
          }
        });

        const topArtists = Object.entries(artistCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([artist]) => artist);

        const searches = topArtists.map(artist =>
          youtubeScraperService.getRelatedVideos(artist, 4)
        );
        const searchResults = await Promise.all(searches);

        const historyIds = new Set(history.map(s => s.videoId));
        const seen = new Set();
        const combined = searchResults.flat().filter(song => {
          if (historyIds.has(song.videoId)) return false;
          if (seen.has(song.videoId)) return false;
          seen.add(song.videoId);
          return true;
        });

        combined.sort(() => Math.random() - 0.5);
        setRecommendations(combined.slice(0, 20));
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
                      <p
                        onClick={e => { e.stopPropagation(); navigate({ type: 'artist', params: { name: song.channelTitle, artistId: song.channelId || '', thumbnail: song.thumbnail || '' } }); }}
                        className="text-sm text-gray-400 truncate hover:text-white cursor-pointer"
                      >
                        {song.channelTitle}
                      </p>
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
                      <p
                        onClick={e => { e.stopPropagation(); navigate({ type: 'artist', params: { name: song.channelTitle, artistId: song.channelId || '', thumbnail: song.thumbnail || '' } }); }}
                        className="text-sm text-gray-400 truncate hover:text-white cursor-pointer"
                      >
                        {song.channelTitle}
                      </p>
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
            </div>
          )}

          {!loading && recommendations.length === 0 && recentHistory.length === 0 && (
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
