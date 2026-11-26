export type Role = "user" | "assistant";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  content: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  attachments?: { name: string; size: number }[];
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
