import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Shuffle, Music, Trash2, Edit2, Camera } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from '../context/NavigationContext';
import { storage, playlistUtils } from '../utils/storage';
import { youtubeScraperService } from '../services/youtubeScraper';

export const PlaylistPage = () => {
  const { subPage, navigateBack } = useNavigate();
  const { playSong, setQueueSongs, currentSong } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (subPage?.params?.id) {
      const p = storage.getPlaylists().find(pl => pl.id === subPage.params.id);
      setPlaylist(p);
      if (p) setEditName(p.name);
    }
  }, [subPage?.params?.id]);

  if (!playlist) return (
    <div className="p-6">
      <button onClick={navigateBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft size={20} /> Back
      </button>
      <p className="text-gray-400 text-center py-8">Playlist not found</p>
    </div>
  );

  const handlePlayAll = () => {
    if (playlist.songs.length > 0) setQueueSongs(playlist.songs, 0);
  };

  const handleShuffle = () => {
    if (playlist.songs.length > 0) {
      const s = [...playlist.songs].sort(() => Math.random() - 0.5);
      setQueueSongs(s, 0);
    }
  };

  const handlePlaySong = (song) => {
    playSong(song, playlist.songs);
  };

  const handleRemoveSong = (songId) => {
    playlistUtils.removeSongFromPlaylist(playlist.id, songId);
    const updated = storage.getPlaylists().find(p => p.id === playlist.id);
    setPlaylist(updated);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    playlistUtils.updatePlaylist(playlist.id, { name: editName });
    setPlaylist({ ...playlist, name: editName });
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this playlist?')) {
      playlistUtils.deletePlaylist(playlist.id);
      navigateBack();
    }
  };

  const handleUploadThumbnail = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      playlistUtils.updatePlaylist(playlist.id, { customThumbnail: dataUrl });
      setPlaylist({ ...playlist, customThumbnail: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveThumbnail = () => {
    playlistUtils.updatePlaylist(playlist.id, { customThumbnail: null });
    setPlaylist({ ...playlist, customThumbnail: null });
  };

  const thumbnail = playlist.customThumbnail || playlist.songs?.[0]?.thumbnail || null;

  return (
    <div className="p-6 animate-fadeIn">
      <button
        onClick={navigateBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="flex items-center gap-6 mb-8 animate-slideDown">
        <div className="relative group flex-shrink-0">
          {thumbnail ? (
            <img src={thumbnail} alt={playlist.name} className="w-40 h-40 rounded-xl object-cover shadow-lg" />
          ) : (
            <div className="w-40 h-40 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center">
              <Music size={64} className="text-white/60" />
            </div>
          )}
          <div className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 bg-gray-800/80 rounded-full hover:bg-gray-700 transition-colors"
              title="Upload image"
            >
              <Camera size={20} />
            </button>
            {playlist.customThumbnail && (
              <button
                onClick={handleRemoveThumbnail}
                className="p-2 bg-red-800/80 rounded-full hover:bg-red-700 transition-colors"
                title="Remove custom image"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadThumbnail}
          />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2 items-center mb-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="bg-gray-700 text-white px-3 py-1 rounded text-2xl font-bold"
                autoFocus
              />
              <button onClick={handleSaveEdit} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">Save</button>
              <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600">Cancel</button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-white mb-2">{playlist.name}</h1>
          )}
          <p className="text-gray-400 mb-1">{playlist.songs.length} songs</p>
          {playlist.description && <p className="text-gray-500 text-sm mb-2">{playlist.description}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={handlePlayAll} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-full hover:bg-red-700">
              <Play size={18} /> Play All
            </button>
            <button onClick={handleShuffle} className="flex items-center gap-2 px-6 py-2 bg-gray-700 text-white rounded-full hover:bg-gray-600">
              <Shuffle size={18} /> Shuffle
            </button>
            <button
              onClick={() => setEditing(true)}
              className="p-2 bg-gray-700 text-white rounded-full hover:bg-gray-600"
              title="Edit"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 bg-red-600/50 text-white rounded-full hover:bg-red-600"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {playlist.songs.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No songs in this playlist</p>
        ) : (
          playlist.songs.map((song, i) => (
            <div
              key={song.videoId}
              className={`flex items-center gap-4 p-3 rounded-lg transition-colors group cursor-pointer animate-slideUp ${
                currentSong?.videoId === song.videoId ? 'bg-red-600/20' : 'bg-gray-800/50 hover:bg-gray-800'
              }`}
              style={{ animationDelay: `${i * 0.04}s`, animationFillMode: 'backwards' }}
              onClick={() => handlePlaySong(song)}
            >
              <span className="text-gray-500 w-6 text-center">{i + 1}</span>
              <img src={song.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{song.title}</p>
                <p className="text-gray-400 text-sm truncate">{song.channelTitle}</p>
              </div>
              <span className="text-gray-500 text-sm">
                {youtubeScraperService.formatDuration(song.duration)}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlaySong(song); }}
                  className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                >
                  <Play size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveSong(song.videoId); }}
                  className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
