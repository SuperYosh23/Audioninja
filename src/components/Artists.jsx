import { useState, useEffect } from 'react';
import { User, UserMinus, Music } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { storage, artistUtils } from '../utils/storage';
import { youtubeScraperService } from '../services/youtubeScraper';

export const Artists = () => {
  const [followedArtists, setFollowedArtists] = useState([]);
  const { setQueueSongs } = usePlayer();
  const { navigate } = useNavigate();

  useEffect(() => {
    loadFollowedArtists();
  }, []);

  const loadFollowedArtists = () => {
    setFollowedArtists(storage.getFollowedArtists());
  };

  const handleUnfollowArtist = (artist) => {
    if (window.confirm(`Unfollow ${artist.name}?`)) {
      artistUtils.unfollowArtist(artist.artistId, artist.name);
      loadFollowedArtists();
    }
  };

  const handleViewArtist = (artist) => {
    navigate({ type: 'artist', params: { name: artist.name, artistId: artist.artistId, thumbnail: artist.thumbnail } });
  };

  const handlePlayArtist = async (artist) => {
    try {
      const songs = await youtubeScraperService.getArtistVideos(artist.name, 20);
      if (songs.length > 0) setQueueSongs(songs, 0);
    } catch (err) {
      console.error('Failed to play artist:', err);
      alert(err.message);
    }
  };

  return (
    <div className="p-6 animate-fadeIn">
      <h2 className="text-2xl font-bold text-white mb-6">Followed Artists</h2>

      {followedArtists.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <User size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No followed artists yet</p>
          <p className="text-sm">Search for music and follow your favorite artists!</p>
        </div>
      ) : (
        <div className="grid gap-4 mb-8">
          {followedArtists.map((artist, i) => (
            <div
              key={artist.artistId || artist.name}
              className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer group animate-slideUp"
              style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'backwards' }}
              onClick={() => handleViewArtist(artist)}
            >
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-purple-800 flex-shrink-0">
                {artist.thumbnail ? (
                  <img src={artist.thumbnail} alt={artist.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={32} className="text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{artist.name}</h3>
                <p className="text-sm text-gray-400">
                  Followed {new Date(artist.followedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlayArtist(artist); }}
                  className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
                  title="Play"
                >
                  <Music size={16} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleUnfollowArtist(artist); }}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                  title="Unfollow"
                >
                  <UserMinus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
