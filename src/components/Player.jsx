import { useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ChevronUp, Shuffle, Repeat, Repeat1 } from 'lucide-react';

export const Player = ({ playerExpanded }) => {
  const {
    currentSong,
    isPlaying,
    volume,
    progress,
    duration,
    repeat,
    shuffle,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    changeVolume,
    toggleRepeat,
    toggleShuffle,
    setPlayerExpanded,
  } = usePlayer();

  const progressRef = useRef(null);

  const handleSeek = (e) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * duration);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!currentSong) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out ${playerExpanded ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
      <div className="bg-gradient-to-b from-gray-900 to-black text-white px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <img
            src={currentSong.thumbnail}
            alt={currentSong.title}
            className="w-12 h-12 rounded-lg object-cover cursor-pointer"
            onClick={() => setPlayerExpanded(true)}
          />

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate text-sm cursor-pointer hover:underline" onClick={() => setPlayerExpanded(true)}>{currentSong.title}</h3>
            <p className="text-xs text-gray-400 truncate">{currentSong.channelTitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleShuffle} className={`p-1.5 rounded-full transition-colors ${shuffle ? 'text-green-400' : 'text-gray-400 hover:text-white'}`} title="Shuffle">
              <Shuffle size={16} />
            </button>
            <button onClick={playPrevious} className="p-1.5 hover:bg-gray-800 rounded-full transition-colors">
              <SkipBack size={18} />
            </button>
            <button onClick={togglePlay} className="p-2.5 bg-white text-black rounded-full hover:scale-105 transition-transform">
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button onClick={playNext} className="p-1.5 hover:bg-gray-800 rounded-full transition-colors">
              <SkipForward size={18} />
            </button>
            <button onClick={toggleRepeat} className={`p-1.5 rounded-full transition-colors ${repeat !== 'off' ? 'text-green-400' : 'text-gray-400 hover:text-white'}`} title="Repeat">
              {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            </button>
          </div>

          <div className="flex items-center gap-2 w-24">
            <button onClick={() => changeVolume(volume === 0 ? 0.5 : 0)} className="p-1.5 hover:bg-gray-800 rounded-full transition-colors">
              {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => changeVolume(parseFloat(e.target.value))} className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer" />
          </div>

          <button onClick={() => setPlayerExpanded(true)} className="p-1.5 hover:bg-gray-800 rounded-full transition-colors">
            <ChevronUp size={16} />
          </button>
        </div>

        <div className="mt-2.5">
          <div ref={progressRef} onClick={handleSeek} className="h-1 bg-gray-700 rounded-full cursor-pointer relative group">
            <div className="h-full bg-red-600 rounded-full relative" style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
