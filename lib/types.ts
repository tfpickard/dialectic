export type MessageAuthor = "alpha" | "beta" | "user";

export interface Message {
  id: string;
  author: MessageAuthor;
  content: string;
  timestamp: number;
}

export interface DebateRoom {
  room_id: string;
  messages: Message[];
  alpha_context?: string;
  beta_context?: string;
  created_at: number;
  updated_at: number;
}

export interface DebateStepRequest {
  room_id: string;
  user_prompt?: string;
}

export interface DebateStepResponse {
  newMessages: Message[];
  stalemate_detected?: boolean;
}

export interface DebateHistoryResponse {
  messages: Message[];
  room_id: string;
}

// WebSocket message types
export type WSClientMessage =
  | { type: "init"; roomId: string }
  | { type: "user_prompt"; roomId: string; content: string }
  | { type: "pause"; roomId: string }
  | { type: "resume"; roomId: string };

export type WSServerMessage =
  | { type: "history"; messages: Message[] }
  | { type: "new_messages"; messages: Message[] }
  | { type: "error"; message: string }
  | { type: "status"; isRunning: boolean };
