import { useState } from 'react';
import { Plus, Music, Sparkles, Search, Users, Settings, Play } from 'lucide-react';
import { useNavigate } from '../context/NavigationContext';
import { storage, playlistUtils } from '../utils/storage';

const navItems = [
  { id: 'home', label: 'Home', icon: Sparkles },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'artists', label: 'Artists', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export const Sidebar = ({ activeTab, onTabChange }) => {
  const [playlists, setPlaylists] = useState(() => storage.getPlaylists());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const { navigate } = useNavigate();

  const refresh = () => setPlaylists(storage.getPlaylists());

  const handleCreate = () => {
    if (!newName.trim()) return;
    playlistUtils.createPlaylist(newName);
    setNewName('');
    setShowCreate(false);
    refresh();
  };

  const handlePlaylistClick = (pl) => {
    navigate({ type: 'playlist', params: { id: pl.id } });
  };

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-700 flex flex-col overflow-hidden">
      {/* App title */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-700">
        <Play className="text-red-600" size={24} />
        <span className="text-base font-bold">audio<span className="text-red-600">NINJA</span></span>
      </div>

      {/* Nav links */}
      <nav className="p-2 space-y-0.5">
        {navItems.map((item, i) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => { onTabChange(item.id); navigate(null) }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all animate-slideUp ${
                activeTab === item.id
                  ? 'bg-red-600/20 text-red-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
              style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'backwards' }}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Playlists section */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-gray-700 pt-3 animate-slideUp" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
        <div className="flex items-center justify-between px-4 mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Playlists
          </h3>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Create playlist"
          >
            <Plus size={16} />
          </button>
        </div>

        {showCreate && (
          <div className="flex gap-2 px-4 mb-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name..."
              className="flex-1 px-2 py-1 bg-gray-800 text-white text-xs rounded focus:outline-none focus:ring-1 focus:ring-red-500"
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false) }}
              autoFocus
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2">
          {playlists.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-4">No playlists yet</p>
          ) : (
            playlists.map((pl, i) => {
              const thumb = pl.customThumbnail || pl.songs?.[0]?.thumbnail || null;
              return (
                <button
                  key={pl.id}
                  onClick={() => handlePlaylistClick(pl)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-gray-800 transition-colors group animate-slideUp"
                  style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'backwards' }}
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
                      <Music size={12} className="text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate group-hover:text-white">{pl.name}</p>
                    <p className="text-xs text-gray-600">{pl.songs.length} songs</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  )
}
