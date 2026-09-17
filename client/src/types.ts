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
}

export interface TypingUser {
  userId: string;
  username: string;
}

export interface ConversationOtherUser {
  id: string;
  firstName: string;
  lastName: string;
  image?: string;
}

// A direct-message thread as returned by GET /api/conversations.
// otherUser is null when that participant's account no longer exists —
// the sidebar shows those as "Unknown user".
export interface ConversationSummary {
  roomId: string;
  otherUser: ConversationOtherUser | null;
}
