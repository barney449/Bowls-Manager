import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, 
  Medal, 
  TrendingUp, 
  TrendingDown,
  Minus
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    // In a real app, you'd have a view or a complex query to calculate points.
    // For now, we'll simulate it by fetching teams and calculating from results.
    const { data: teams } = await supabase.from('teams').select('*');
    const { data: results } = await supabase.from('results').select(`
      *,
      fixture:fixtures!fixture_id(home_team_id, away_team_id)
    `);

    if (teams && results) {
      const board = teams.map(team => {
        let played = 0;
        let won = 0;
        let drawn = 0;
        let lost = 0;
        let pointsFor = 0;
        let pointsAgainst = 0;

        results.forEach(res => {
          const isHome = res.fixture.home_team_id === team.id;
          const isAway = res.fixture.away_team_id === team.id;

          if (isHome || isAway) {
            played++;
            if (isHome) {
              pointsFor += res.home_score;
              pointsAgainst += res.away_score;
              if (res.home_score > res.away_score) won++;
              else if (res.home_score < res.away_score) lost++;
              else drawn++;
            } else {
              pointsFor += res.away_score;
              pointsAgainst += res.home_score;
              if (res.away_score > res.home_score) won++;
              else if (res.away_score < res.home_score) lost++;
              else drawn++;
            }
          }
        });

        return {
          ...team,
          played,
          won,
          drawn,
          lost,
          pointsFor,
          pointsAgainst,
          diff: pointsFor - pointsAgainst,
          points: (won * 3) + (drawn * 1)
        };
      });

      setLeaderboard(board.sort((a, b) => b.points - a.points || b.diff - a.diff));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#0C0A09] tracking-tight">Leaderboard</h1>
        <p className="text-[#57534E] mt-1">Current league standings and performance stats.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C0A09]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                  <th className="px-6 py-5 text-xs font-bold text-[#78716C] uppercase tracking-wider w-16 text-center">Pos</th>
                  <th className="px-6 py-5 text-xs font-bold text-[#78716C] uppercase tracking-wider">Team</th>
                  <th className="px-4 py-5 text-xs font-bold text-[#78716C] uppercase tracking-wider text-center">P</th>
                  <th className="px-4 py-5 text-xs font-bold text-[#78716C] uppercase tracking-wider text-center">W</th>
                  <th className="px-4 py-5 text-xs font-bold text-[#78716C] uppercase tracking-wider text-center">D</th>
                  <th className="px-4 py-5 text-xs font-bold text-[#78716C] uppercase tracking-wider text-center">L</th>
                  <th className="px-4 py-5 text-xs font-bold text-[#78716C] uppercase tracking-wider text-center">Diff</th>
                  <th className="px-6 py-5 text-xs font-bold text-[#78716C] uppercase tracking-wider text-center bg-[#F5F5F4]">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {leaderboard.length > 0 ? (
                  leaderboard.map((team, index) => (
                    <motion.tr
                      key={team.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-[#FAFAF9] transition-colors group"
                    >
                      <td className="px-6 py-5 text-center">
                        {index < 3 ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                            index === 0 ? 'bg-amber-100 text-amber-600' : 
                            index === 1 ? 'bg-slate-100 text-slate-600' : 
                            'bg-orange-100 text-orange-600'
                          }`}>
                            <Medal size={18} />
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-[#A8A29E]">{index + 1}</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-lg bg-[#F5F5F4] flex items-center justify-center text-[#0C0A09] font-bold text-xs mr-3">
                            {team.name[0]}
                          </div>
                          <span className="text-sm font-bold text-[#0C0A09]">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center text-sm font-medium text-[#57534E]">{team.played}</td>
                      <td className="px-4 py-5 text-center text-sm font-medium text-emerald-600">{team.won}</td>
                      <td className="px-4 py-5 text-center text-sm font-medium text-[#A8A29E]">{team.drawn}</td>
                      <td className="px-4 py-5 text-center text-sm font-medium text-red-500">{team.lost}</td>
                      <td className="px-4 py-5 text-center text-sm font-medium">
                        <div className="flex items-center justify-center">
                          {team.diff > 0 ? (
                            <TrendingUp size={14} className="mr-1 text-emerald-500" />
                          ) : team.diff < 0 ? (
                            <TrendingDown size={14} className="mr-1 text-red-500" />
                          ) : (
                            <Minus size={14} className="mr-1 text-[#A8A29E]" />
                          )}
                          <span className={team.diff > 0 ? 'text-emerald-600' : team.diff < 0 ? 'text-red-600' : 'text-[#57534E]'}>
                            {team.diff > 0 ? `+${team.diff}` : team.diff}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center bg-[#F5F5F4]/50 group-hover:bg-[#F5F5F4] transition-colors">
                        <span className="text-base font-black text-[#0C0A09]">{team.points}</span>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <Trophy size={48} className="mx-auto text-[#A8A29E] mb-4" />
                      <h3 className="text-lg font-bold text-[#0C0A09]">No standings yet</h3>
                      <p className="text-[#57534E] mt-1">Complete matches to see the leaderboard update.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 p-6 bg-[#F5F5F4] rounded-2xl border border-[#E7E5E4]">
        <div className="flex items-center text-xs font-bold text-[#78716C] uppercase tracking-wider">
          <div className="w-3 h-3 bg-emerald-500 rounded-full mr-2"></div>
          Win: 3 Pts
        </div>
        <div className="flex items-center text-xs font-bold text-[#78716C] uppercase tracking-wider">
          <div className="w-3 h-3 bg-[#A8A29E] rounded-full mr-2"></div>
          Draw: 1 Pt
        </div>
        <div className="flex items-center text-xs font-bold text-[#78716C] uppercase tracking-wider">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
          Loss: 0 Pts
        </div>
      </div>
    </div>
  );
};
