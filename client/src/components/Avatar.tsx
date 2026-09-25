import { type CSSProperties } from 'react';

interface AvatarProps {
  className?: string;
  style?: CSSProperties;
  image?: string;
  alt?: string;
  name?: string;
  width?: string;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

function Avatar({ className, style, image, alt, name, width }: AvatarProps) {
  const sizeStyle = width ? { width, height: width } : undefined;

  if (!image) {
    return (
      <div
        className={`flex justify-center items-center w-full h-full ${className}`}
        style={style}
      >
        <div
          className="flex items-center justify-center rounded-full bg-relay-accent text-white font-bold w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
          style={sizeStyle}
        >
          {getInitials(name)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex justify-center items-center w-full h-full ${className}`}
      style={style}
    >
      <img
        src={image}
        alt={alt}
        className="block rounded-full object-cover w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
        style={sizeStyle}
      />
    </div>
  );
}

export default Avatar;
