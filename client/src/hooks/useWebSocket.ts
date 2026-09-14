// ============================================
// LESSON 1: WebSocket in React — custom hook
//
// The browser has a built-in WebSocket API:
//   const ws = new WebSocket('ws://localhost:8080');
//   ws.onopen    → connection established
//   ws.onmessage → received data from server
//   ws.onclose   → connection closed
//   ws.onerror   → connection error
//   ws.send()    → send data to server
//
// We wrap this in a custom hook to make it
// reusable and React-friendly.
// ============================================
import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage, ConnectionStatus, TypingUser, User } from "../types";

// const WS_URL = "ws://localhost:8080"; // commented because of deploy (change)
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";

interface ServerMessage {
  type:
    | "WELCOME"
    | "MESSAGE"
    | "USER_JOINED"
    | "USER_LEFT"
    | "TYPING"
    | "ROOM_SWITCHED"
    | "MESSAGE_EDITED"   // NEW
    | "MESSAGE_DELETED"; // NEW;
  userId?: string;
  username?: string;
  room?: string;
  users?: User[];
  messages?: ChatMessage[];   // NEW
  onlineCount?: number;
  isTyping?: boolean;
  timestamp?: number;
  [key: string]: unknown;
}

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState("general");
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  // ============================================
  // CONNECT: Open WebSocket connection
  // ============================================
  const [authError, setAuthError] = useState(false);
  const connect = useCallback((token: string, room: string) => {
  // Close existing connection if any
  if (wsRef.current) wsRef.current.close();

  setStatus("connecting");
  setMessages([]);

  // Create WebSocket connection
  const ws = new WebSocket(WS_URL);
  wsRef.current = ws;

  ws.onopen = () => {
    if (wsRef.current !== ws) return; // a newer connection already replaced this one
    setStatus("connected");
    ws.send(JSON.stringify({ type: "JOIN", token, room }));
  };

  ws.onmessage = (event: MessageEvent) => {
    if (wsRef.current !== ws) return;
    const data = JSON.parse(event.data) as ServerMessage;

    switch (data.type) {
      case "WELCOME":
        setCurrentUser({ id: data.userId!, username: data.username! });
        setCurrentRoom(data.room!);
        setUsers(data.users || []);
        setOnlineCount(data.onlineCount || 0);
        setMessages(data.messages || []);
        break;

      case "MESSAGE":
        setMessages((prev) => [...prev, data as unknown as ChatMessage]);
        break;

      case "USER_JOINED":
        setUsers(data.users || []);
        setOnlineCount(data.onlineCount || 0);
        setMessages((prev) => [
          ...prev,
          { type: "SYSTEM", text: `${data.username} joined the room`, timestamp: data.timestamp },
        ]);
        break;

      case "USER_LEFT":
        setUsers(data.users || []);
        setOnlineCount(data.onlineCount || 0);
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        setMessages((prev) => [
          ...prev,
          { type: "SYSTEM", text: `${data.username} left the room`, timestamp: data.timestamp },
        ]);
        break;

      case "TYPING":
        if (data.isTyping) {
          setTypingUsers((prev) => {
            if (prev.find((u) => u.userId === data.userId)) return prev;
            return [...prev, { userId: data.userId!, username: data.username! }];
          });
          clearTimeout(typingTimeouts.current[data.userId!]);
          typingTimeouts.current[data.userId!] = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
          }, 3000);
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        }
        break;

      case "ROOM_SWITCHED":
        setCurrentRoom(data.room!);
        setUsers(data.users || []);
        setOnlineCount(data.onlineCount || 0);
        setMessages(data.messages || []);
        setTypingUsers([]);
        break;

      case "MESSAGE_EDITED":
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.id ? { ...m, text: data.text as string, edited: true } : m
          )
        );
        break;

      case "MESSAGE_DELETED":
        setMessages((prev) => prev.filter((m) => m.id !== data.id));
        break;
    }
  };

  ws.onclose = (event) => {
    if (wsRef.current !== ws) return; // stale socket — a newer one is already active, ignore
    setStatus("disconnected");
    setCurrentUser(null);
    if (event.code === 4001) {
      setAuthError(true);
    }
  };

  ws.onerror = () => {
    if (wsRef.current !== ws) return;
    setStatus("disconnected");
  };
}, []);

  // ============================================
  // SEND MESSAGE
  // ============================================
  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "MESSAGE", text }));
    }
  }, []);

  // ============================================
  // SEND TYPING INDICATOR
  // ============================================
  const sendTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "TYPING", isTyping }));
    }
  }, []);

  // ============================================
  // SWITCH ROOM
  // ============================================
  const switchRoom = useCallback((room: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "SWITCH_ROOM", room }));
    }
  }, []);
  
  // ============================================
  // EDIT / DELETE MESSAGE
  // ============================================
  const editMessage = useCallback((id: string, text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "EDIT_MESSAGE", id, text }));
    }
  }, []);

  const deleteMessage = useCallback((id: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "DELETE_MESSAGE", id }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return {
    status,
    messages,
    users,
    onlineCount,
    currentUser,
    currentRoom,
    typingUsers,
    connect,
    sendMessage,
    sendTyping,
    switchRoom,
    authError,
    editMessage,     // NEW
    deleteMessage,   // NEW
  };
};
