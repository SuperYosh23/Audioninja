import { useState, useRef, useEffect } from 'react';
import { Search as SearchIcon, Play } from 'lucide-react';
import { useNavigate } from './context/NavigationContext';
import { usePlayer } from './context/PlayerContext';
import { Sidebar } from './components/Sidebar';
import { Search as SearchComponent } from './components/Search';
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
  const [keepExpanded, setKeepExpanded] = useState(false);
  const searchRef = useRef(null);
  const { subPage, navigate } = useNavigate();
  const { playerExpanded, setPlayerExpanded, dragOffset } = usePlayer();

  const handleMinimize = () => {
    document.body.style.overflow = '';
    setKeepExpanded(true);
    setPlayerExpanded(false);
    setTimeout(() => setKeepExpanded(false), 350);
  };

  useEffect(() => {
    if (activeTab === 'search' && searchRef.current) {
      searchRef.current.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    if (playerExpanded) setPlayerExpanded(false);
  }, [activeTab, subPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setActiveTab('search');
    navigate(null);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(null);
    setPlayerExpanded(false);
  };

  const renderMain = () => {
    if (subPage?.type === 'artist') return <ArtistPage />;
    if (subPage?.type === 'playlist') return <PlaylistPage />;
    if (subPage?.type === 'album') return <AlbumPage />;

    switch (activeTab) {
      case 'home': return <Recommendations />;
      case 'search': return <SearchComponent searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case 'settings': return <SettingsComponent />;
      default: return <Recommendations />;
    }
  };

  return (
    <div className={`h-screen bg-surface-dim text-on-surface flex flex-col ${playerExpanded ? 'overflow-hidden' : ''}`}>
      {/* Top search bar */}
      <div className="relative z-40 bg-surface-container border-b border-outline-variant">
        <div className="px-4 py-2.5 flex justify-center">
          <form onSubmit={handleSearch} className="relative w-full max-w-xl">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search for songs, albums...'
              className="w-full pl-10 pr-4 py-2 bg-surface text-on-surface text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            />
          </form>
        </div>
      </div>

      {/* Sidebar + Main content */}
      <div className="flex flex-1 min-h-0">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} onNavigate={() => setPlayerExpanded(false)} />
        <main className="flex-1 relative" style={{ overflow: (playerExpanded || keepExpanded) ? 'hidden' : 'auto', paddingBottom: (playerExpanded || keepExpanded) ? 0 : '6rem' }}>
          <div>
            {renderMain()}
          </div>
          {(playerExpanded || keepExpanded || dragOffset > 0) && (
            <div className="absolute inset-0 z-10">
              <ExpandedPlayer closing={!playerExpanded && keepExpanded} onMinimize={handleMinimize} />
            </div>
          )}
        </main>
      </div>

      <Player playerExpanded={playerExpanded} />
    </div>
  );
}

export default App;
