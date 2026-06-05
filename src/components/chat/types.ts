export type MessageSender = string; // 'me', 'bot', or any user id

export interface ChatUser {
  id: string;
  name: string;
  color: string;
  online?: boolean;
}

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface ChatMedia {
  type: MediaType;
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  text?: string;
  media?: ChatMedia;
  sender: MessageSender;
  timestamp: string;
  status?: 'sent' | 'read';
}

export interface QuickReply {
  id: string;
  emoji: string;
  label: string;
}
