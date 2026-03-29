import { Player, Match, Scorecard } from '../types';

export const githubService = {
  async getData(): Promise<{
    players: Player[];
    matches: Match[];
    databaseMatches: Match[];
    scorecards: Scorecard[];
    appSettings: any;
  }> {
    const res = await fetch('/api/github/data');
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch data from GitHub');
    }
    return res.json();
  },

  async saveData(data: {
    players: Player[];
    matches: Match[];
    databaseMatches: Match[];
    scorecards: Scorecard[];
    appSettings: any;
  }): Promise<void> {
    const res = await fetch('/api/github/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save data to GitHub');
    }
  }
};
