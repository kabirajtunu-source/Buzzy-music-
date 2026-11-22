import React, {useState} from 'react';
import {Disc3} from 'lucide-react';

interface MediaArtworkProps {
  src?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}

export const MediaArtwork: React.FC<MediaArtworkProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  rounded = 'rounded-xl',
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#231942] via-[#151221] to-[#0B0A10] text-violet-300/70 ${rounded} ${className}`}
        aria-label={alt}
      >
        <Disc3 className="w-1/3 h-1/3 max-w-10 max-h-10" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${rounded} ${className}`}
    />
  );
};
