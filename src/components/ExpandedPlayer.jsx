import { useRef, useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, ChevronDown, Volume2, VolumeX, Download } from 'lucide-react';

function getBestThumbnail(url) {
  if (!url) return url;
  if (url.includes('i.ytimg.com')) {
    return url.replace(/\/(hq|mq|sd)?default\.jpg$/, '/maxresdefault.jpg');
  }
  if (url.includes('lh3.googleusercontent.com')) {
    return url.replace(/=w\d+-h\d+/, '=w576-h576');
  }
  return url;
}

export const ExpandedPlayer = ({ closing, onMinimize }) => {
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
  } = usePlayer();
  const [imgSrc, setImgSrc] = useState(() => currentSong?.thumbnail ? getBestThumbnail(currentSong.thumbnail) : '');
  const [prevImgSrc, setPrevImgSrc] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const progressRef = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = '' };
  }, []);

  useEffect(() => {
    if (currentSong?.thumbnail) {
      const newSrc = getBestThumbnail(currentSong.thumbnail);
      if (newSrc !== imgSrc) {
        setPrevImgSrc(imgSrc);
        setImgSrc(newSrc);
        setTimeout(() => setPrevImgSrc(null), 350);
      }
    }
  }, [currentSong?.thumbnail]);

  const handleDownload = async () => {
    if (!currentSong?.videoId || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/download/${currentSong.videoId}`);
      if (!res.ok) throw new Error('Server error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentSong.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

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
    <div className={`h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white ${closing ? 'animate-slideDownToBottom' : 'animate-slideUpFromBottom'}`}>
      {/* Header */}
      <div className="flex items-center justify-end px-6 py-4">
        <button
          onClick={onMinimize}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          title="Minimize"
        >
          <ChevronDown size={20} />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-8">
        <div className="flex items-start gap-12 w-full max-w-4xl">
          {/* Album art */}
          <div className="relative flex-shrink-0 w-72 h-72">
            {prevImgSrc && (
              <img
                src={prevImgSrc}
                alt=""
                className="absolute inset-0 w-full h-full rounded-2xl object-cover shadow-2xl animate-fadeOut"
              />
            )}
            <img
              src={imgSrc}
              alt={currentSong.title}
              className={`w-full h-full rounded-2xl object-cover shadow-2xl ${prevImgSrc ? 'animate-fadeIn' : ''}`}
              onError={() => currentSong?.thumbnail && setImgSrc(currentSong.thumbnail)}
            />
          </div>

          {/* Song info + controls */}
          <div className="flex-1 flex flex-col justify-between min-h-72">
            {/* Info */}
            <div>
              <h2 className="text-3xl font-bold text-white truncate">{currentSong.title}</h2>
              <p className="text-lg text-gray-300 mt-2">{currentSong.channelTitle}</p>
              {currentSong.album && (
                <p className="text-base text-gray-500 mt-1">{currentSong.album}</p>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Progress */}
              <div>
                <div
                  ref={progressRef}
                  onClick={handleSeek}
                  className="h-1.5 bg-gray-700 rounded-full cursor-pointer relative group"
                >
                  <div
                    className="h-full bg-red-600 rounded-full relative"
                    style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1.5">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={toggleShuffle} className={`p-2.5 rounded-full transition-colors ${shuffle ? 'text-green-400' : 'text-gray-400 hover:text-white'}`} title="Shuffle">
                    <Shuffle size={22} />
                  </button>
                  <button onClick={playPrevious} className="p-2.5 hover:bg-gray-800 rounded-full transition-colors">
                    <SkipBack size={24} />
                  </button>
                  <button onClick={togglePlay} className="p-4 bg-white text-black rounded-full hover:scale-105 transition-transform">
                    {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                  </button>
                  <button onClick={playNext} className="p-2.5 hover:bg-gray-800 rounded-full transition-colors">
                    <SkipForward size={24} />
                  </button>
                  <button onClick={toggleRepeat} className={`p-2.5 rounded-full transition-colors ${repeat !== 'off' ? 'text-green-400' : 'text-gray-400 hover:text-white'}`} title="Repeat">
                    {repeat === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="p-2.5 text-gray-400 hover:text-white rounded-full transition-colors disabled:opacity-50"
                    title={downloading ? 'Downloading...' : 'Download MP3'}
                  >
                    <Download size={20} />
                  </button>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 w-32">
                  <Volume2 size={18} className="text-gray-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {downloading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl animate-scaleIn">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-white text-lg font-medium">Please wait...</p>
            <p className="text-gray-400 text-sm truncate max-w-64">{currentSong?.title}</p>
          </div>
        </div>
      )}
    </div>
  );
};
