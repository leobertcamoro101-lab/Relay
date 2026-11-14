export interface User {
  id: string;
  username: string;
}

// NEW — a file attached to a chat message. Produced by POST /api/upload
// (see routes/upload-routes.ts), which stores the file in Cloudinary and
// hands back its url; name/type/size are supplied by the client from the
// File object it already has, then re-validated for shape (not origin —
// see the note in index.ts's MESSAGE handler) before being persisted.
export interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

// ---- Messages the client sends to the server ----

export interface JoinMessage {
  type: 'JOIN';
  // username: string;
  token: string;
  room: string;
}

export interface ChatMessageIn {
  type: 'MESSAGE';
  text: string;
  attachment?: Attachment; // NEW
}

export interface TypingMessageIn {
  type: 'TYPING';
  isTyping: boolean;
}

export interface SwitchRoomMessageIn {
  type: 'SWITCH_ROOM';
  room: string;
}

export interface EditMessageIn {
  type: 'EDIT_MESSAGE';
  id: string;
  text: string;
}

export interface DeleteMessageIn {
  type: 'DELETE_MESSAGE';
  id: string;
}

export type ClientMessage =
  | JoinMessage
  | ChatMessageIn
  | TypingMessageIn
  | SwitchRoomMessageIn
  | EditMessageIn      // NEW
  | DeleteMessageIn;   // NEW

// ---- Messages the server sends back to clients ----

export interface WelcomeMessage {
  type: 'WELCOME';
  userId: string;
  username: string;
  room: string;
  users: User[];
  onlineCount: number;
  messages: ChatMessageOut[];   // NEW
}

export interface ChatMessageOut {
  type: 'MESSAGE';
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  edited?: boolean;   // NEW
  attachment?: Attachment; // NEW
}

export interface UserJoinedMessage {
  type: 'USER_JOINED';
  users: User[];
  onlineCount: number;
  username: string;
  timestamp: number;
}

export interface UserLeftMessage {
  type: 'USER_LEFT';
  users: User[];
  onlineCount: number;
  userId: string;
  username: string;
  timestamp: number;
}

export interface TypingMessageOut {
  type: 'TYPING';
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface RoomSwitchedMessage {
  type: 'ROOM_SWITCHED';
  room: string;
  users: User[];
  onlineCount: number;
  messages: ChatMessageOut[];   // NEW
}

export interface MessageEditedMessage {
  type: 'MESSAGE_EDITED';
  id: string;
  text: string;
}

export interface MessageDeletedMessage {
  type: 'MESSAGE_DELETED';
  id: string;
}

export type ServerMessage =
  | WelcomeMessage
  | ChatMessageOut
  | UserJoinedMessage
  | UserLeftMessage
  | TypingMessageOut
  | RoomSwitchedMessage
  | MessageEditedMessage    // NEW
  | MessageDeletedMessage;  // NEW;
