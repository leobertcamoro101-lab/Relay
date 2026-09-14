export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface User {
  id: string;
  username: string;
}

export interface ChatMessage {
  type?: 'MESSAGE' | 'SYSTEM';
  id?: string;
  userId?: string;
  username?: string;
  text: string;
  timestamp?: number;
  isMine?: boolean;
  edited?: boolean;   // NEW
}

export interface TypingUser {
  userId: string;
  username: string;
}
