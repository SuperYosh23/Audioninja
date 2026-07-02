import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { historyUtils } from '../utils/storage';

const PlayerContext = createContext();

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const PlayerProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [repeat, setRepeat] = useState('off');
  const [shuffle, setShuffle] = useState(false);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [minimizeOffset, setMinimizeOffset] = useState(0);

  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const playNextRef = useRef(null);
  const volumeRef = useRef(volume);
  const originalQueueRef = useRef([]);
  const shuffledIndicesRef = useRef([]);
  const [playerInitKey, setPlayerInitKey] = useState(0);

  volumeRef.current = volume;

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setPlayerReady(true);
      };
    } else {
      setPlayerReady(true);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (playerReady && !playerRef.current) {
      try {
        playerRef.current = new window.YT.Player('hidden-player', {
          height: '1',
          width: '1',
          videoId: '',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
          },
          events: {
            onReady: () => {
              console.log('[Player] YT.Player ready');
              if (playerRef.current) {
                playerRef.current.setVolume(volumeRef.current * 100);
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                playNextRef.current?.();
              }
              if (event.data === window.YT.PlayerState.PLAYING) {
                const dur = playerRef.current?.getDuration?.();
                if (dur > 0) setDuration(dur);
              }
              if (event.data === window.YT.PlayerState.UNSTARTED) {
                const err = playerRef.current?.getPlayerError?.();
                if (err) console.error('[Player] Error:', err);
              }
            },
            onError: (event) => {
              console.error('[Player] onError:', event.data);
            },
          },
        });
      } catch (err) {
        console.error('[Player] Failed to create YT.Player:', err);
        if (playerInitKey < 3) {
          setTimeout(() => setPlayerInitKey(k => k + 1), 2000);
        }
      }
    }

    return () => {
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (err) {
          console.error('[Player] destroy failed:', err);
        }
        playerRef.current = null;
      }
    };
  }, [playerReady, playerInitKey]);

  useEffect(() => {
    if (isPlaying && playerRef.current && playerReady) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          setProgress(playerRef.current.getCurrentTime());
        }
        if (playerRef.current?.getDuration) {
          const dur = playerRef.current.getDuration();
          if (dur > 0) setDuration(dur);
        }
      }, 10);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playerReady]);

  useEffect(() => {
    if (currentSong) {
      historyUtils.addToHistory(currentSong);
    }
  }, [currentSong]);

  const playSong = (song, newQueue = null) => {
    if (newQueue) {
      originalQueueRef.current = [...newQueue];
      if (shuffle) {
        shuffledIndicesRef.current = shuffleArray(newQueue.map((_, i) => i));
        const shuffledQueue = shuffledIndicesRef.current.map(i => newQueue[i]);
        setQueue(shuffledQueue);
        const idx = shuffledQueue.findIndex(s => s.videoId === song.videoId);
        setCurrentIndex(idx >= 0 ? idx : 0);
      } else {
        setQueue(newQueue);
        const index = newQueue.findIndex(s => s.videoId === song.videoId);
        setCurrentIndex(index >= 0 ? index : 0);
      }
    }
    setCurrentSong(song);
    setIsPlaying(true);
    setProgress(0);

    if (playerRef.current && playerReady) {
      try {
        playerRef.current.loadVideoById(song.videoId);
        playerRef.current.setVolume(volume * 100);
      } catch (err) {
        console.error('[Player] loadVideoById failed:', err);
      }
    } else {
      console.warn('[Player] Not ready yet, cannot play');
    }
  };

  const togglePlay = () => {
    if (!playerRef.current || !playerReady) return;

    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[Player] togglePlay failed:', err);
    }
  };

  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    if (repeat === 'one') {
      setProgress(0);
      if (playerRef.current && playerReady) {
        try {
          playerRef.current.seekTo(0, true);
          playerRef.current.playVideo();
        } catch (err) {
          console.error('[Player] seekTo/playVideo failed:', err);
        }
      }
      return;
    }

    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentSong(queue[nextIndex]);
      setProgress(0);

      if (playerRef.current && playerReady) {
        try {
          playerRef.current.loadVideoById(queue[nextIndex].videoId);
        } catch (err) {
          console.error('[Player] loadVideoById failed:', err);
        }
      }
    } else if (repeat === 'all') {
      setCurrentIndex(0);
      setCurrentSong(queue[0]);
      setProgress(0);

      if (playerRef.current && playerReady) {
        try {
          playerRef.current.loadVideoById(queue[0].videoId);
        } catch (err) {
          console.error('[Player] loadVideoById failed:', err);
        }
      }
    }
  }, [queue, currentIndex, repeat, playerReady]);

  playNextRef.current = playNext;

  const playPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setCurrentSong(queue[prevIndex]);
      setProgress(0);

      if (playerRef.current && playerReady) {
        try {
          playerRef.current.loadVideoById(queue[prevIndex].videoId);
        } catch (err) {
          console.error('[Player] loadVideoById failed:', err);
        }
      }
    }
  };

  const setQueueSongs = (songs, startIndex = 0) => {
    originalQueueRef.current = [...songs];
    let videoId;
    if (shuffle) {
      shuffledIndicesRef.current = shuffleArray(songs.map((_, i) => i));
      const shuffled = shuffledIndicesRef.current.map(i => songs[i]);
      setQueue(shuffled);
      setCurrentIndex(0);
      setCurrentSong(shuffled[0]);
      videoId = shuffled[0].videoId;
    } else {
      setQueue(songs);
      setCurrentIndex(startIndex);
      setCurrentSong(songs[startIndex]);
      videoId = songs[startIndex].videoId;
    }
    setIsPlaying(true);
    setProgress(0);

    if (playerRef.current && playerReady) {
      try {
        playerRef.current.loadVideoById(videoId);
      } catch (err) {
        console.error('[Player] loadVideoById failed:', err);
      }
    }
  };

  const addToQueue = (song) => {
    const newQueue = [...queue, song];
    originalQueueRef.current = [...originalQueueRef.current, song];
    setQueue(newQueue);
  };

  const removeFromQueue = (index) => {
    const newQueue = queue.filter((_, i) => i !== index);
    originalQueueRef.current = originalQueueRef.current.filter((_, i) => {
      if (!shuffle) return i !== index;
      const shuffledIdx = shuffledIndicesRef.current[index];
      return shuffledIndicesRef.current[i] !== shuffledIdx;
    });
    setQueue(newQueue);
    if (index === currentIndex) {
      if (newQueue.length > 0) {
        const newIndex = Math.min(index, newQueue.length - 1);
        setCurrentIndex(newIndex);
        setCurrentSong(newQueue[newIndex]);
      } else {
        setCurrentSong(null);
        setIsPlaying(false);
        if (playerRef.current) {
          try { playerRef.current.stopVideo(); } catch (err) { console.error('[Player] stopVideo failed:', err); }
        }
      }
    } else if (index < currentIndex) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const clearQueue = () => {
    originalQueueRef.current = [];
    shuffledIndicesRef.current = [];
    setQueue([]);
    setCurrentIndex(0);
    setCurrentSong(null);
    setIsPlaying(false);
    setProgress(0);
    if (playerRef.current) {
      try { playerRef.current.stopVideo(); } catch (err) { console.error('[Player] stopVideo failed:', err); }
    }
  };

  const seekTo = (time) => {
    setProgress(time);
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.seekTo(time, true);
      } catch (err) {
        console.error('[Player] seekTo failed:', err);
      }
    }
  };

  const changeVolume = (newVolume) => {
    setVolume(newVolume);
    if (playerRef.current && playerReady) {
      try {
        playerRef.current.setVolume(newVolume * 100);
      } catch (err) {
        console.error('[Player] setVolume failed:', err);
      }
    }
  };

  const toggleRepeat = () => {
    setRepeat(prev => prev === 'off' ? 'one' : prev === 'one' ? 'all' : 'off');
  };

  const toggleShuffle = () => {
    setShuffle(prev => {
      if (!prev) {
        shuffledIndicesRef.current = shuffleArray(originalQueueRef.current.map((_, i) => i));
        const shuffled = shuffledIndicesRef.current.map(i => originalQueueRef.current[i]);
        const currentVid = currentSong?.videoId;
        const foundIdx = shuffled.findIndex(s => s.videoId === currentVid);
        setQueue(shuffled);
        setCurrentIndex(foundIdx >= 0 ? foundIdx : 0);
      } else {
        setQueue([...originalQueueRef.current]);
        const currentVid = currentSong?.videoId;
        const foundIdx = originalQueueRef.current.findIndex(s => s.videoId === currentVid);
        setCurrentIndex(foundIdx >= 0 ? foundIdx : 0);
      }
      return !prev;
    });
  };

  const value = {
    currentSong,
    queue,
    currentIndex,
    isPlaying,
    volume,
    progress,
    duration,
    repeat,
    shuffle,
    playerRef,
    playerReady,
    playSong,
    togglePlay,
    playNext,
    playPrevious,
    setQueueSongs,
    addToQueue,
    removeFromQueue,
    clearQueue,
    seekTo,
    changeVolume,
    setProgress,
    setDuration,
    setIsPlaying,
    toggleRepeat,
    setRepeat,
    toggleShuffle,
    setShuffle,
    playerExpanded,
    setPlayerExpanded,
    dragOffset,
    setDragOffset,
    isDragging,
    setIsDragging,
    minimizeOffset,
    setMinimizeOffset,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <div
        id="hidden-player"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />
    </PlayerContext.Provider>
  );
};
