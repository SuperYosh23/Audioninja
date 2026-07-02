import { useState, useEffect } from 'react';
import { Music, Play, Clock, Sparkles, Plus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { storage } from '../utils/storage';
import { youtubeScraperService } from '../services/youtubeScraper';
import { PlaylistPickerModal } from './PlaylistPickerModal';
import { LoadingIndicator } from './LoadingIndicator';

export const Recommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
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
      <h2 className="text-2xl font-bold text-on-surface mb-6 flex items-center gap-2">
        <Sparkles size={24} />
        For You
      </h2>

      {error && (
        <div className="bg-error-container/30 border border-error rounded-lg p-4 mb-6 text-on-error-container text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-on-surface-variant py-8">
          <LoadingIndicator size="lg" className="mx-auto" />
          <p className="mt-4">Loading recommendations...</p>
        </div>
      ) : (
        <>
          {recommendations.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-on-surface mb-4 flex items-center gap-2 animate-slideUp">
                <Music size={20} />
                Recommended For You
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {recommendations.map((song, index) => (
                  <div
                    key={song.videoId}
                    className="bg-surface-container/50 rounded-xl p-3 cursor-pointer hover:bg-surface-container transition-all hover:scale-[1.02] group animate-slideUp"
                    style={{ animationDelay: `${index * 0.04}s`, animationFillMode: 'backwards' }}
                    onClick={() => handlePlaySong(song)}
                  >
                    <div className="relative">
                      <img
                        src={song.thumbnail}
                        alt={song.title}
                        className="w-full aspect-square rounded-lg object-cover mb-3"
                      />
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePlaySong(song); }}
                          className="p-3 bg-primary text-on-surface rounded-full hover:bg-primary/80 transition-colors shadow-lg"
                        >
                          <Play size={24} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPickerSong(song); }}
                          className="p-3 bg-surface-container-high text-on-surface rounded-full hover:bg-surface-container-highest transition-colors shadow-lg"
                          title="Add to playlist"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-on-surface font-medium truncate">{song.title}</h4>
                    <p
                      onClick={e => { e.stopPropagation(); navigate({ type: 'artist', params: { name: song.channelTitle, artistId: song.channelId || '', thumbnail: song.thumbnail || '' } }); }}
                      className="text-sm text-on-surface-variant truncate hover:text-on-surface cursor-pointer"
                    >
                      {song.channelTitle}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentHistory.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-on-surface mb-4 flex items-center gap-2 animate-slideUp">
                <Clock size={20} />
                Recently Played
              </h3>
              <div className="grid gap-3">
                {recentHistory.map((song, index) => (
                  <div
                    key={song.videoId}
                    className="flex items-center gap-4 p-3 bg-surface-container/50 rounded-xl hover:bg-surface-container transition-colors group cursor-pointer animate-slideUp"
                    style={{ animationDelay: `${index * 0.04}s`, animationFillMode: 'backwards' }}
                    onClick={() => handlePlayHistorySong(song)}
                  >
                    <img
                      src={song.thumbnail}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-on-surface truncate">{song.title}</h4>
                      <p className="text-sm text-on-surface-variant truncate">
                        <span
                          onClick={e => { e.stopPropagation(); navigate({ type: 'artist', params: { name: song.channelTitle, artistId: song.channelId || '', thumbnail: song.thumbnail || '' } }); }}
                          className="cursor-pointer hover:text-on-surface"
                        >
                          {song.channelTitle}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayHistorySong(song, index);
                        }}
                        className="p-2 bg-primary text-on-surface rounded-full hover:bg-primary/80 transition-colors"
                        title="Play"
                      >
                        <Play size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPickerSong(song); }}
                        className="p-2 bg-surface-container-high text-on-surface rounded-full hover:bg-surface-container-highest transition-colors"
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
            <div className="text-center text-on-surface-variant py-12">
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
