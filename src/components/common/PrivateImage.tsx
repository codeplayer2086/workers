import React, { useEffect, useState } from 'react';
import { getAuthToken } from '../../lib/api';
import { fetchAuthenticatedDataUrl } from '../../lib/private-file';

interface PrivateImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export function PrivateImage({ src, onError, ...props }: PrivateImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const [triedBearerFallback, setTriedBearerFallback] = useState(false);

  useEffect(() => {
    setResolvedSrc(src);
    setTriedBearerFallback(false);
  }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!triedBearerFallback && src.startsWith('/api/files/') && getAuthToken()) {
      setTriedBearerFallback(true);
      void fetchAuthenticatedDataUrl(src)
        .then((dataUrl) => setResolvedSrc(dataUrl))
        .catch(() => {
          onError?.(e);
        });
      return;
    }
    onError?.(e);
  };

  return <img {...props} src={resolvedSrc} onError={handleError} />;
}
