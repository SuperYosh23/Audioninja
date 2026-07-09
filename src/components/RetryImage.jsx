import { useState, useEffect, useRef, useCallback } from 'react';

export const RetryImage = ({ src, alt, className, fallbackSrc, onError, ...props }) => {
  const [retryCount, setRetryCount] = useState(0);
  const [onFallback, setOnFallback] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  const currentSrc = onFallback ? fallbackSrc : src;

  useEffect(() => {
    mountedRef.current = true;
    setRetryCount(0);
    setOnFallback(false);
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [src, fallbackSrc]);

  const handleError = useCallback(() => {
    if (!mountedRef.current) return;
    const maxRetries = 10;
    if (retryCount < maxRetries) {
      const delay = 2000 + retryCount * 1000;
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) setRetryCount(c => c + 1);
      }, delay);
    } else if (!onFallback && fallbackSrc) {
      setOnFallback(true);
      setRetryCount(0);
    } else {
      onError?.();
    }
  }, [retryCount, onError, onFallback, fallbackSrc]);

  if (!currentSrc) return <div className={className} />;

  const cacheBust = retryCount > 0 && !currentSrc.startsWith('data:') ? `?rb=${retryCount}_${Date.now()}` : '';
  const actualSrc = retryCount > 0 && !currentSrc.startsWith('data:') ? `${currentSrc}${cacheBust}` : currentSrc;

  return (
    <img
      key={onFallback ? `fb-${retryCount}` : retryCount}
      src={actualSrc}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
};
