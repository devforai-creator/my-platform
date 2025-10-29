// Database Types for CharacterChat Platform
// Auto-generated types based on Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CharacterVisibility = 'private' | 'draft' | 'public'

export type MessageRole = 'system' | 'user' | 'assistant'

export type Provider = 'google' | 'openai' | 'anthropic'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          provider: Provider
          key_name: string
          vault_secret_name: string
          model_preference: string | null
          is_active: boolean
          usage_notes: string | null
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider: Provider
          key_name: string
          vault_secret_name: string
          model_preference?: string | null
          is_active?: boolean
          usage_notes?: string | null
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: Provider
          key_name?: string
          vault_secret_name?: string
          model_preference?: string | null
          is_active?: boolean
          usage_notes?: string | null
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      characters: {
        Row: {
          id: string
          user_id: string
          name: string
          avatar_url: string | null
          description: string | null
          system_prompt: string
          greeting_message: string | null
          visibility: CharacterVisibility
          metadata: Json
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          avatar_url?: string | null
          description?: string | null
          system_prompt: string
          greeting_message?: string | null
          visibility?: CharacterVisibility
          metadata?: Json
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          avatar_url?: string | null
          description?: string | null
          system_prompt?: string
          greeting_message?: string | null
          visibility?: CharacterVisibility
          metadata?: Json
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          user_id: string
          character_id: string
          title: string | null
          max_context_messages: number
          model_config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          character_id: string
          title?: string | null
          max_context_messages?: number
          model_config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          character_id?: string
          title?: string | null
          max_context_messages?: number
          model_config?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sequence: number
          role: MessageRole
          content: string
          model_used: string | null
          prompt_tokens: number | null
          completion_tokens: number | null
          latency_ms: number | null
          error_code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          role: MessageRole
          content: string
          model_used?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          latency_ms?: number | null
          error_code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          role?: MessageRole
          content?: string
          model_used?: string | null
          prompt_tokens?: number | null
          completion_tokens?: number | null
          latency_ms?: number | null
          error_code?: string | null
          created_at?: string
        }
      }
      chat_summaries: {
        Row: {
          id: string
          chat_id: string
          level: number
          start_seq: number
          end_seq: number
          summary: string
          token_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          level: number
          start_seq: number
          end_seq: number
          summary: string
          token_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          level?: number
          start_seq?: number
          end_seq?: number
          summary?: string
          token_count?: number | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      character_visibility: CharacterVisibility
    }
  }
}

// Helper types for easier access
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type ApiKey = Database['public']['Tables']['api_keys']['Row']
export type ApiKeyInsert = Database['public']['Tables']['api_keys']['Insert']
export type ApiKeyUpdate = Database['public']['Tables']['api_keys']['Update']

export type Character = Database['public']['Tables']['characters']['Row']
export type CharacterInsert = Database['public']['Tables']['characters']['Insert']
export type CharacterUpdate = Database['public']['Tables']['characters']['Update']

export type Chat = Database['public']['Tables']['chats']['Row']
export type ChatInsert = Database['public']['Tables']['chats']['Insert']
export type ChatUpdate = Database['public']['Tables']['chats']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type ChatSummary = Database['public']['Tables']['chat_summaries']['Row']
export type ChatSummaryInsert = Database['public']['Tables']['chat_summaries']['Insert']
export type ChatSummaryUpdate = Database['public']['Tables']['chat_summaries']['Update']

// Extended types with relations
export type CharacterWithOwner = Character & {
  profiles: Profile
}

export type ChatWithCharacter = Chat & {
  characters: Character
}

export type ChatWithMessages = Chat & {
  messages: Message[]
}

export type MessageWithChat = Message & {
  chats: Chat
}
