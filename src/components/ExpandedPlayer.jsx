import { useEffect, useState, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, ChevronDown, Volume2, VolumeX, Download } from 'lucide-react';
import { LoadingIndicator } from './LoadingIndicator';
import { WavyProgressBar } from './WavyProgressBar';

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
    dragOffset,
    minimizeOffset,
    setMinimizeOffset,
  } = usePlayer();
  const [imgSrc, setImgSrc] = useState(() => currentSong?.thumbnail ? getBestThumbnail(currentSong.thumbnail) : '');
  const [prevImgSrc, setPrevImgSrc] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [entering, setEntering] = useState(true);
  const dragRef = useRef({ moved: false });

  useEffect(() => {
    if (dragOffset > 0 || minimizeOffset > 0) {
      setEntering(false);
    }
  }, [dragOffset, minimizeOffset]);

  useEffect(() => {
    if (!dragOffset && !minimizeOffset && !closing) {
      requestAnimationFrame(() => setEntering(false));
    }
  }, []);

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

  const handleSeek = (fraction) => {
    seekTo(fraction * duration);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleHeaderPointerDown = (e) => {
    const startY = e.clientY;
    let offset = 0;
    dragRef.current.moved = false;
    let lastY = e.clientY;
    let lastTime = Date.now();
    let velocity = 0;

    const onMove = (ev) => {
      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 0) {
        velocity = (ev.clientY - lastY) / dt;
        lastY = ev.clientY;
        lastTime = now;
      }
      const delta = ev.clientY - startY;
      if (delta > 5) dragRef.current.moved = true;
      offset = Math.max(0, delta);
      setMinimizeOffset(offset);
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      setMinimizeOffset(0);
      if ((dragRef.current.moved && offset > 80) || velocity > 0.3) {
        onMinimize();
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  if (!currentSong) return null;

  const expanding = dragOffset > 0;
  const minimizing = minimizeOffset > 0;
  const anyDrag = expanding || minimizing;

  const expandTransform = minimizing
    ? `translateY(${minimizeOffset}px)`
    : expanding
      ? `translateY(calc(100% - ${dragOffset}px))`
      : (entering || closing)
        ? 'translateY(100%)'
        : 'translateY(0%)';

  return (
    <div
      className="h-full flex flex-col bg-surface-dim text-on-surface"
      style={{
        transform: expandTransform,
        transition: anyDrag ? 'none' : 'transform 0.35s cubic-bezier(0.05, 0.7, 0.1, 1)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-end px-6 py-4 touch-none select-none"
        onPointerDown={handleHeaderPointerDown}
      >
        <button
          onClick={onMinimize}
          className="p-2 hover:bg-surface-container rounded-full transition-colors"
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
              <h2 className="text-3xl font-bold text-on-surface truncate">{currentSong.title}</h2>
              <p className="text-lg text-on-surface mt-2">{currentSong.channelTitle}</p>
              {currentSong.album && (
                <p className="text-base text-outline mt-1">{currentSong.album}</p>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Progress */}
              <div>
                <WavyProgressBar
                  progress={duration > 0 ? progress / duration : 0}
                  height={6}
                  onSeek={handleSeek}
                />
                <div className="flex justify-between text-xs text-on-surface-variant mt-1.5">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={toggleShuffle} className={`p-2.5 rounded-full transition-colors ${shuffle ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`} title="Shuffle">
                    <Shuffle size={22} />
                  </button>
                  <button onClick={playPrevious} className="p-2.5 hover:bg-surface-container rounded-full transition-colors">
                    <SkipBack size={24} />
                  </button>
                  <button onClick={togglePlay} className="p-4 bg-white text-black rounded-full hover:scale-105 transition-transform">
                    {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                  </button>
                  <button onClick={playNext} className="p-2.5 hover:bg-surface-container rounded-full transition-colors">
                    <SkipForward size={24} />
                  </button>
                  <button onClick={toggleRepeat} className={`p-2.5 rounded-full transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`} title="Repeat">
                    {repeat === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="p-2.5 text-on-surface-variant hover:text-on-surface rounded-full transition-colors disabled:opacity-50"
                    title={downloading ? 'Downloading...' : 'Download MP3'}
                  >
                    <Download size={20} />
                  </button>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 w-32">
                  <Volume2 size={18} className="text-on-surface-variant" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="w-full h-1 bg-surface-container-high rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {downloading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-scrim/60 backdrop-blur-sm">
          <div className="bg-surface-container rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl animate-scaleIn">
            <LoadingIndicator size="md" />
            <p className="text-on-surface text-lg font-medium">Please wait...</p>
            <p className="text-on-surface-variant text-sm truncate max-w-64">{currentSong?.title}</p>
          </div>
        </div>
      )}
    </div>
  );
};
