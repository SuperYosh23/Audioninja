import { useState } from 'react';
import { Plus, Music, ListMusic } from 'lucide-react';
import { useNavigate } from '../context/NavigationContext';
import { storage, playlistUtils } from '../utils/storage';

export const PlaylistSidebar = ({ onClose }) => {
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

  const handleOpen = (pl) => {
    navigate({ type: 'playlist', params: { id: pl.id } });
    onClose?.();
  };

  return (
    <div className="w-64 bg-gray-900/95 border-r border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <ListMusic size={16} />
            Playlists
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            title="Create playlist"
          >
            <Plus size={16} />
          </button>
        </div>
        {showCreate && (
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Playlist name"
              className="flex-1 px-2 py-1 bg-gray-800 text-white text-sm rounded focus:outline-none focus:ring-1 focus:ring-red-500"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              onClick={handleCreate}
              className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {playlists.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <Music size={24} className="mx-auto mb-2 opacity-50" />
            <p>No playlists yet</p>
          </div>
        ) : (
          playlists.map(pl => (
            <button
              key={pl.id}
              onClick={() => handleOpen(pl)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-800 transition-colors group"
            >
              <div className="w-8 h-8 rounded bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center flex-shrink-0">
                <Music size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{pl.name}</p>
                <p className="text-xs text-gray-500">{pl.songs.length} songs</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
