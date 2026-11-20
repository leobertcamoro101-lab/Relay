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
  replyTo?: string; // id of the message being replied to (same room)
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
  // undefined = leave the attachment alone, null = remove it,
  // object = replace it with a newly uploaded file.
  attachment?: Attachment | null;
}

export interface ToggleReactionIn {
  type: 'TOGGLE_REACTION';
  id: string;
  emoji: string; // must be one of REACTION_EMOJIS
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
  | ToggleReactionIn
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

// Snapshot of the quoted message, stored with the reply (see util/reply.ts).
export interface ReplyPreview {
  id: string;
  username: string;
  text: string;
  attachmentName?: string;
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
  reactions?: Record<string, string[]>;
  replyTo?: ReplyPreview;
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
  attachment: Attachment | null; // the attachment after the edit (null = none)
}

export interface ReactionsUpdatedMessage {
  type: 'REACTIONS_UPDATED';
  id: string;
  reactions: Record<string, string[]>; // full set after the toggle, empties removed
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
  | ReactionsUpdatedMessage
  | MessageDeletedMessage;  // NEW;
