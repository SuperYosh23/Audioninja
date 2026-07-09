import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, ChevronDown, Volume2, VolumeX, Download, ListMusic, MicVocal } from 'lucide-react';
import { LoadingIndicator } from './LoadingIndicator';
import { WavyProgressBar } from './WavyProgressBar';
import { QueuePanel } from './QueuePanel';
import { RetryImage } from './RetryImage';
import { Ripple } from './Ripple';
import { apiService } from '../services/apiService';

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

function useActiveLyricLine(lyrics, progressMs) {
  return useMemo(() => {
    if (!lyrics?.lyrics || !Array.isArray(lyrics.lyrics)) return -1;
    const lines = lyrics.lyrics;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (progressMs >= line.start_time && progressMs < line.end_time) {
        return i;
      }
    }
    const lastIdx = lines.length - 1;
    if (lastIdx >= 0 && progressMs >= lines[lastIdx].end_time) return -2;
    return -1;
  }, [lyrics, progressMs]);
}

export const ExpandedPlayer = ({ closing, onMinimize }) => {
  const {
    currentSong,
    isPlaying,
    isLoading,
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
    showQueue,
    setShowQueue,
    showLyrics,
    setShowLyrics,
    hasLyrics,
    setHasLyrics,
  } = usePlayer();
  const [imgSrc, setImgSrc] = useState(() => currentSong?.thumbnail ? getBestThumbnail(currentSong.thumbnail) : '');
  const [prevImgSrc, setPrevImgSrc] = useState(null);
  const [deezerFallback, setDeezerFallback] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [entering, setEntering] = useState(true);
  const [lyrics, setLyrics] = useState(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState(false);
  const dragRef = useRef({ moved: false });
  const lyricsContainerRef = useRef(null);
  const activeLineRef = useRef(null);
  const progressMs = progress * 1000;
  const activeLine = useActiveLyricLine(lyrics, progressMs);

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

  useEffect(() => {
    if (!currentSong) { setDeezerFallback(null); return; }
    const title = currentSong.album || currentSong.title;
    const artist = currentSong.channelTitle || '';
    apiService.getAlbumArt(title, artist).then(url => {
      if (url) setDeezerFallback(url);
    });
  }, [currentSong]);

  useEffect(() => {
    const videoId = currentSong?.videoId;
    if (!videoId) return;
    let cancelled = false;
    setLyrics(null);
    setLyricsLoading(false);
    setLyricsError(false);
    if (!showLyrics) return;
    setLyricsLoading(true);
    apiService.getLyrics(videoId).then(data => {
      if (cancelled) return;
      if (data?.error) {
        setLyricsError(true);
      } else {
        setLyrics(data);
      }
    }).catch(() => {
      if (!cancelled) setLyricsError(true);
    }).finally(() => {
      if (!cancelled) setLyricsLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentSong?.videoId]);

  const checkLyricsAvailability = useCallback(async () => {
    if (!currentSong?.videoId) { setHasLyrics(null); return; }
    setHasLyrics(null);
    try {
      const avail = await apiService.checkLyrics(currentSong.videoId);
      setHasLyrics(avail);
    } catch {
      setHasLyrics(false);
    }
  }, [currentSong?.videoId]);

  useEffect(() => {
    checkLyricsAvailability();
  }, [checkLyricsAvailability]);

  useEffect(() => {
    if (showLyrics && activeLine >= 0 && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLine, showLyrics]);

  const renderLyricsContent = () => {
    if (lyricsLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingIndicator size="md" />
        </div>
      );
    }
    if (lyricsError) {
      return (
        <div className="flex items-center justify-center h-full text-on-surface-variant text-center">
          <div>
            <MicVocal size={40} className="mx-auto mb-3 opacity-50" />
            <p>No lyrics available</p>
          </div>
        </div>
      );
    }
    if (hasTimedLyrics) {
      return (
        <div className="flex flex-col items-center justify-center min-h-full py-8">
          {lyrics.lyrics.map((line, i) => {
            const isPast = activeLine > i;
            const isActive = activeLine === i;
            const isFuture = activeLine >= 0 && activeLine < i;
            const isEnded = activeLine === -2;

            let opacity = '0.3';
            let scale = 'scale-100';
            let color = 'text-on-surface';
            if (isPast) {
              opacity = '0.25';
              color = 'text-on-surface-variant';
            }
            if (isActive) {
              opacity = '1';
              scale = 'scale-105';
              color = 'text-on-surface';
            }
            if (isFuture && !isEnded) {
              opacity = '0.5';
              color = 'text-on-surface-variant';
            }
            if (isEnded) {
              opacity = '0.25';
              color = 'text-on-surface-variant';
            }

            return (
              <div
                key={line.id ?? i}
                ref={isActive ? activeLineRef : null}
                className={`transition-all duration-300 ease-out py-2 text-center ${scale}`}
                style={{ opacity }}
              >
                <span className={`${isActive ? 'text-2xl font-bold' : 'text-lg'} leading-relaxed ${color}`}>
                  {line.text || <span className="select-none">&zwnj;</span>}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    if (lyrics?.lyrics) {
      return (
        <div className="flex flex-col items-center justify-center min-h-full py-8">
          <pre className="text-base text-on-surface-variant leading-relaxed whitespace-pre-wrap font-sans text-center">
            {lyrics.lyrics}
          </pre>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full text-on-surface-variant text-center">
        <p>No lyrics available</p>
      </div>
    );
  };

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

  const handleToggleLyrics = async () => {
    if (showLyrics) {
      setShowLyrics(false);
      return;
    }
    if (lyrics) {
      setShowLyrics(true);
      return;
    }
    if (!currentSong?.videoId) return;
    setLyricsLoading(true);
    setLyricsError(false);
    try {
      const data = await apiService.getLyrics(currentSong.videoId);
      if (data?.error) {
        setLyricsError(true);
      } else {
        setLyrics(data);
        setShowLyrics(true);
      }
    } catch {
      setLyricsError(true);
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleSeek = (fraction) => {
    seekTo(Math.min(fraction * duration, Math.max(0, duration - 0.5)));
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

  const hasTimedLyrics = lyrics?.hasTimestamps && Array.isArray(lyrics.lyrics);

  if (!currentSong && !isLoading) return null;

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
        {!currentSong && isLoading ? (
          <div className="flex flex-col items-center gap-4 animate-fadeIn">
            <LoadingIndicator size="lg" />
            <p className="text-on-surface-variant text-lg">Loading...</p>
          </div>
        ) : showLyrics ? (
          <div key="lyrics" className="flex gap-12 w-full max-w-5xl h-full items-stretch animate-fadeInUp">
            {/* Synced lyrics panel */}
            <div className="flex-1 flex flex-col justify-center min-w-0">
              <div
                ref={lyricsContainerRef}
                className="h-full max-h-[65vh] overflow-y-auto scroll-smooth px-4"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {renderLyricsContent()}
              </div>
            </div>

            {/* Compact side panel */}
            <div className="flex flex-col justify-center gap-6 w-64 shrink-0">
              <div className="relative w-full aspect-square">
                <RetryImage
                  src={imgSrc}
                  alt={currentSong.title}
                  className="w-full h-full rounded-2xl object-cover shadow-lg"
                  fallbackSrc={deezerFallback}
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-surface/60 rounded-2xl flex items-center justify-center">
                    <LoadingIndicator size="md" />
                  </div>
                )}
              </div>
              <div className="space-y-1 text-center">
                <h3 className="text-base font-semibold text-on-surface truncate">{currentSong.title}</h3>
                <p className="text-sm text-on-surface-variant truncate">{currentSong.channelTitle}</p>
              </div>
              <div className="space-y-3">
                <WavyProgressBar
                  progress={duration > 0 ? progress / duration : 0}
                  height={4}
                  onSeek={handleSeek}
                />
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <button onClick={playPrevious} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <SkipBack size={20} />
                </button>
                <Ripple className="rounded-full">
                  <button onClick={togglePlay} className="p-3 bg-primary text-on-primary rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all">
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                  </button>
                </Ripple>
                <button onClick={playNext} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                  <SkipForward size={20} />
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <button onClick={toggleShuffle} className={`p-2 rounded-full transition-colors ${shuffle ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`} title="Shuffle">
                  <Shuffle size={16} />
                </button>
                <button onClick={toggleRepeat} className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`} title="Repeat">
                  {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
                </button>
                <button onClick={handleDownload} disabled={downloading} className="p-2 text-on-surface-variant hover:text-on-surface rounded-full transition-colors disabled:opacity-50" title="Download">
                  <Download size={16} />
                </button>
                <button onClick={() => setShowQueue(true)} className={`p-2 rounded-full transition-colors ${showQueue ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`} title="Queue">
                  <ListMusic size={16} />
                </button>
                {hasLyrics && (
                  <button
                    onClick={handleToggleLyrics}
                    className={`p-2 rounded-full transition-colors ${showLyrics ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    title={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
                  >
                    <MicVocal size={16} />
                  </button>
                )}
                <div className="relative group ml-1">
                  <button onClick={() => changeVolume(volume === 0 ? 1 : 0)} className="p-2 text-on-surface-variant hover:text-on-surface rounded-full transition-colors" title="Volume">
                    {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 flex-col items-center bg-surface-container-high rounded-xl px-3 pt-2 pb-2.5 shadow-lg gap-1 opacity-0 scale-75 origin-bottom transition-all duration-100 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={(e) => changeVolume(parseFloat(e.target.value))}
                      className="h-20 w-1 cursor-pointer accent-white [writing-mode:vertical-lr] [direction:rtl]"
                    />
                    {volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div key="normal" className="flex items-start gap-12 w-full max-w-4xl animate-fadeInUp">
            {/* Album art */}
             <div className="relative flex-shrink-0 w-72 h-72">
              {prevImgSrc && (
                <img
                  src={prevImgSrc}
                  alt=""
                  className="absolute inset-0 w-full h-full rounded-2xl object-cover shadow-2xl animate-fadeOut"
                />
              )}
              <RetryImage
                src={imgSrc}
                alt={currentSong.title}
                className={`w-full h-full rounded-2xl object-cover shadow-2xl ${prevImgSrc ? 'animate-fadeIn' : ''}`}
                onError={() => currentSong?.thumbnail && setImgSrc(currentSong.thumbnail)}
                fallbackSrc={deezerFallback}
              />
              {isLoading && (
                <div className="absolute inset-0 bg-surface/60 rounded-2xl flex items-center justify-center z-10">
                  <LoadingIndicator size="lg" />
                </div>
              )}
            </div>

            {/* Song info + controls */}
            <div className="flex-1 flex flex-col justify-between min-h-72">
              <div>
                <h2 className="text-3xl font-bold text-on-surface truncate">{currentSong.title}</h2>
                <p className="text-lg text-on-surface mt-2">{currentSong.channelTitle}</p>
                {currentSong.album && (
                  <p className="text-base text-outline mt-1">{currentSong.album}</p>
                )}
              </div>

              <div className="space-y-4">
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

                <div className="flex items-center gap-3">
                  <button onClick={toggleShuffle} className={`p-2.5 rounded-full transition-colors ${shuffle ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`} title="Shuffle">
                    <Shuffle size={22} />
                  </button>
                  <button onClick={playPrevious} className="p-2.5 hover:bg-surface-container rounded-full transition-colors">
                    <SkipBack size={24} />
                  </button>
                  <Ripple className="rounded-full">
                    <button onClick={togglePlay} className="p-4 bg-primary text-on-primary rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all">
                      {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                    </button>
                  </Ripple>
                  <button onClick={playNext} className="p-2.5 hover:bg-surface-container rounded-full transition-colors">
                    <SkipForward size={24} />
                  </button>
                  <button onClick={toggleRepeat} className={`p-2.5 rounded-full transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`} title="Repeat">
                    {repeat === 'one' ? <Repeat1 size={22} /> : <Repeat size={22} />}
                  </button>
                  <div className="w-px h-6 bg-outline-variant mx-1" />
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="p-2.5 text-on-surface-variant hover:text-on-surface rounded-full transition-colors disabled:opacity-50"
                    title="Download"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={() => setShowQueue(true)}
                    className={`p-2.5 rounded-full transition-colors ${showQueue ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    title="Queue"
                  >
                    <ListMusic size={20} />
                  </button>
                  {hasLyrics && (
                    <button
                      onClick={handleToggleLyrics}
                      className={`p-2.5 rounded-full transition-colors ${showLyrics ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                      title={showLyrics ? 'Hide lyrics' : 'Show lyrics'}
                    >
                      <MicVocal size={20} />
                    </button>
                  )}
                  <div className="relative group">
                    <button onClick={() => changeVolume(volume === 0 ? 1 : 0)} className="p-2.5 text-on-surface-variant hover:text-on-surface rounded-full transition-colors" title="Volume">
                      {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 flex-col items-center bg-surface-container-high rounded-xl px-3 pt-2 pb-2.5 shadow-lg gap-1 opacity-0 scale-75 origin-bottom transition-all duration-100 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) => changeVolume(parseFloat(e.target.value))}
                        className="h-20 w-1 cursor-pointer accent-white [writing-mode:vertical-lr] [direction:rtl]"
                      />
                      {volume === 0 ? <VolumeX size={12} /> : <Volume2 size={12} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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

      {showQueue && <QueuePanel onClose={() => setShowQueue(false)} />}
    </div>
  );
};
