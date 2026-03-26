export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'player'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'player'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'player'
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      players: {
        Row: {
          id: string
          profile_id: string
          team_id: string | null
          position: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          team_id?: string | null
          position?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          team_id?: string | null
          position?: string | null
          created_at?: string
        }
      }
      fixtures: {
        Row: {
          id: string
          home_team_id: string
          away_team_id: string
          match_date: string
          venue: string | null
          status: 'scheduled' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          home_team_id: string
          away_team_id: string
          match_date: string
          venue?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          home_team_id?: string
          away_team_id?: string
          match_date?: string
          venue?: string | null
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
        }
      }
      results: {
        Row: {
          id: string
          fixture_id: string
          home_score: number
          away_score: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          fixture_id: string
          home_score: number
          away_score: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          fixture_id?: string
          home_score?: number
          away_score?: number
          notes?: string | null
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
      [_ in never]: never
    }
  }
}
