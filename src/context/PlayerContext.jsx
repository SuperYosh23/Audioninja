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

  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const playNextRef = useRef(null);
  const volumeRef = useRef(volume);
  const originalQueueRef = useRef([]);
  const shuffledIndicesRef = useRef([]);

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
      playerRef.current = new window.YT.Player('hidden-player', {
        height: '1',
        width: '1',
        videoId: '',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: () => {
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
          },
        },
      });
    }
  }, [playerReady]);

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
      }, 1000);
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
      playerRef.current.loadVideoById(song.videoId);
      playerRef.current.setVolume(volume * 100);
    }
  };

  const togglePlay = () => {
    if (!playerRef.current || !playerReady) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const playNext = useCallback(() => {
    if (queue.length === 0) return;

    if (repeat === 'one') {
      setProgress(0);
      if (playerRef.current && playerReady) {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
      return;
    }

    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentSong(queue[nextIndex]);
      setProgress(0);

      if (playerRef.current && playerReady) {
        playerRef.current.loadVideoById(queue[nextIndex].videoId);
      }
    } else if (repeat === 'all') {
      setCurrentIndex(0);
      setCurrentSong(queue[0]);
      setProgress(0);

      if (playerRef.current && playerReady) {
        playerRef.current.loadVideoById(queue[0].videoId);
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
        playerRef.current.loadVideoById(queue[prevIndex].videoId);
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
      playerRef.current.loadVideoById(videoId);
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
          playerRef.current.stopVideo();
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
      playerRef.current.stopVideo();
    }
  };

  const seekTo = (time) => {
    setProgress(time);
    if (playerRef.current && playerReady) {
      playerRef.current.seekTo(time, true);
    }
  };

  const changeVolume = (newVolume) => {
    setVolume(newVolume);
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(newVolume * 100);
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
    toggleShuffle,
    playerExpanded,
    setPlayerExpanded,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <div
        id="hidden-player"
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />
    </PlayerContext.Provider>
  );
};
