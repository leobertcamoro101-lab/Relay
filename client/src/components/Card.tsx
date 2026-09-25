import { type CSSProperties, type ReactNode } from 'react';

interface CardProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

function Card({ className, style, children }: CardProps) {
  return (
    <div
      className={`relative bg-relay-surface border border-relay-border shadow-sm rounded-2xl p-6 sm:p-8 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export default Card;
