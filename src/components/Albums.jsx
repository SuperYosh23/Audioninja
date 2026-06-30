import { useState } from 'react';
import { Disc3, Search as SearchIcon } from 'lucide-react';
import { useNavigate } from '../context/NavigationContext';
import { youtubeScraperService } from '../services/youtubeScraper';

export const Albums = () => {
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const { navigate } = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setError('');
    try {
      const results = await youtubeScraperService.searchAlbums(query, 20);
      setAlbums(results);
    } catch (err) {
      console.error('Album search failed:', err);
      setError('Could not reach the music backend. Make sure the Python server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAlbum = (album) => {
    navigate({ type: 'album', params: album });
  };

  const handleOpenArtist = (album) => {
    if (album.channelTitle) {
      navigate({ type: 'artist', params: { name: album.channelTitle, artistId: album.channelId } });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Disc3 size={24} />
        Albums
      </h2>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-2xl mx-auto">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for albums..."
            className="w-full pl-12 pr-4 py-3 bg-gray-800 text-white rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-400 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4">Searching albums...</p>
        </div>
      )}

      {!loading && !error && searched && albums.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <Disc3 size={48} className="mx-auto mb-4 opacity-50" />
          <p>No albums found for "{query}"</p>
        </div>
      )}

      {!loading && albums.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {albums.map((album) => (
            <div
              key={album.playlistId}
              onClick={() => handleOpenAlbum(album)}
              className="bg-gray-800/50 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors hover:scale-[1.02]"
            >
              <img
                src={album.thumbnail}
                alt={album.title}
                className="w-full aspect-square rounded-lg object-cover mb-3"
              />
              <p className="text-white font-medium truncate">{album.title}</p>
              <p
                onClick={(e) => { e.stopPropagation(); handleOpenArtist(album); }}
                className="text-gray-400 text-sm truncate hover:text-white cursor-pointer"
              >
                {album.channelTitle}
              </p>
              <p className="text-gray-500 text-xs mt-1">{album.videoCount} tracks</p>
            </div>
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center text-gray-400 py-12">
          <Disc3 size={64} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">Search for an artist or album name to find albums</p>
        </div>
      )}
    </div>
  );
};
