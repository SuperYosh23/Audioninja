import { useState } from 'react';
import { Search as SearchIcon, Play } from 'lucide-react';
import { useNavigate } from './context/NavigationContext';
import { usePlayer } from './context/PlayerContext';
import { Sidebar } from './components/Sidebar';
import { Search as SearchComponent } from './components/Search';
import { Artists } from './components/Artists';
import { Recommendations } from './components/Recommendations';
import { Settings as SettingsComponent } from './components/Settings';
import { Player } from './components/Player';
import { ExpandedPlayer } from './components/ExpandedPlayer';
import { ArtistPage } from './components/ArtistPage';
import { PlaylistPage } from './components/PlaylistPage';
import { AlbumPage } from './components/AlbumPage';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const { subPage, navigate } = useNavigate();
  const { playerExpanded } = usePlayer();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveTab('search');
    navigate(null);
  };

  const renderMain = () => {
    if (subPage?.type === 'artist') return <ArtistPage />;
    if (subPage?.type === 'playlist') return <PlaylistPage />;
    if (subPage?.type === 'album') return <AlbumPage />;

    switch (activeTab) {
      case 'home': return <Recommendations />;
      case 'search': return <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case 'artists': return <Artists />;
      case 'settings': return <SettingsComponent />;
      default: return <Recommendations />;
    }
  };

  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white flex flex-col">
      {/* Top search bar */}
      <div className="bg-gray-900/95 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <form onSubmit={handleSearch} className="relative max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search for songs, albums, artists...'
              className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </form>
        </div>
      </div>

      {/* Sidebar + Main content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); navigate(null) }} />
        <main className={`flex-1 overflow-y-auto animate-fadeIn ${!playerExpanded ? 'pb-20' : ''}`}>
          {playerExpanded ? <ExpandedPlayer /> : renderMain()}
        </main>
      </div>

      {!playerExpanded && <Player />}
    </div>
  );
}

export default App;
