import { type CSSProperties } from 'react';

interface AvatarProps {
  className?: string;
  style?: CSSProperties;
  image?: string;
  alt?: string;
  width?: string;
}

function Avatar({ className, style, image, alt, width }: AvatarProps) {
  return (
    <div
      className={`flex justify-center items-center w-full h-full ${className}`}
      style={style}
    >
      <img
        src={image}
        alt={alt}
        className="block rounded-full object-cover w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
        style={width ? { width, height: width } : undefined}
      />
    </div>
  );
}

export default Avatar;