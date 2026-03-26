import { supabase } from './supabaseClient';
import { Player, Match, Scorecard } from '../types';

// Helper to handle errors silently
const handleError = (error: any, context: string) => {
  if (error) {
    console.error(`Supabase Error [${context}]:`, error.message || error);
  }
};

export const supabaseService = {
  // Players
  async getPlayers(): Promise<Player[]> {
    const { data, error } = await supabase.from('players').select('*');
    handleError(error, 'getPlayers');
    return data || [];
  },

  async upsertPlayer(player: Player) {
    const { error } = await supabase.from('players').upsert(player);
    handleError(error, 'upsertPlayer');
  },

  async deletePlayer(id: string) {
    const { error } = await supabase.from('players').delete().eq('id', id);
    handleError(error, 'deletePlayer');
  },

  // Matches
  async getMatches(): Promise<Match[]> {
    const { data, error } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
    handleError(error, 'getMatches');
    return data || [];
  },

  async upsertMatch(match: Match) {
    const { error } = await supabase.from('matches').upsert(match);
    handleError(error, 'upsertMatch');
  },

  async deleteMatch(id: string) {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    handleError(error, 'deleteMatch');
  },

  // Database Matches
  async getDatabaseMatches(): Promise<Match[]> {
    const { data, error } = await supabase.from('database_matches').select('*').order('created_at', { ascending: false });
    handleError(error, 'getDatabaseMatches');
    return data || [];
  },

  async upsertDatabaseMatch(match: Match) {
    const { error } = await supabase.from('database_matches').upsert(match);
    handleError(error, 'upsertDatabaseMatch');
  },

  // Club Champs
  async getClubChamps(): Promise<Scorecard[]> {
    const { data, error } = await supabase.from('club_champs').select('*');
    handleError(error, 'getClubChamps');
    return data || [];
  },

  async upsertClubChamp(scorecard: Scorecard) {
    const { error } = await supabase.from('club_champs').upsert(scorecard);
    handleError(error, 'upsertClubChamp');
  },

  async deleteClubChamp(id: string) {
    const { error } = await supabase.from('club_champs').delete().eq('id', id);
    handleError(error, 'deleteClubChamp');
  },

  // App Settings
  async getAppSettings() {
    const { data, error } = await supabase.from('app_settings').select('*').single();
    handleError(error, 'getAppSettings');
    return data;
  },

  async upsertAppSettings(settings: any) {
    const { error } = await supabase.from('app_settings').upsert({ id: 'default', ...settings });
    handleError(error, 'upsertAppSettings');
  },

  async checkConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('players').select('id').limit(1);
      if (error) {
        if (error.message.includes('Could not find the table')) {
          return { success: false, error: 'TABLES_MISSING' };
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
};
