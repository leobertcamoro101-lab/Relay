import { type CSSProperties, type ReactNode } from 'react';

interface CardProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

function Card({ className, style, children }: CardProps) {
  return (
    <div
      className={`relative bg-gray-800/50 border border-gray-700 rounded-2xl p-6 sm:p-8l ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default Card;