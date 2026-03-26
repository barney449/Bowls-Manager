import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Calendar, 
  Trophy, 
  TrendingUp, 
  ArrowRight,
  Clock,
  MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    teams: 0,
    players: 0,
    fixtures: 0,
    completedMatches: 0
  });
  const [recentFixtures, setRecentFixtures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [teamsRes, playersRes, fixturesRes] = await Promise.all([
          supabase.from('teams').select('*', { count: 'exact', head: true }),
          supabase.from('players').select('*', { count: 'exact', head: true }),
          supabase.from('fixtures').select('*', { count: 'exact', head: true })
        ]);

        const completedRes = await supabase
          .from('fixtures')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');

        const recentRes = await supabase
          .from('fixtures')
          .select(`
            *,
            home_team:teams!home_team_id(name),
            away_team:teams!away_team_id(name)
          `)
          .order('match_date', { ascending: false })
          .limit(5);

        setStats({
          teams: teamsRes.count || 0,
          players: playersRes.count || 0,
          fixtures: fixturesRes.count || 0,
          completedMatches: completedRes.count || 0
        });
        setRecentFixtures(recentRes.data || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    { name: 'Total Teams', value: stats.teams, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { name: 'Active Players', value: stats.players, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { name: 'Upcoming Fixtures', value: stats.fixtures - stats.completedMatches, icon: Calendar, color: 'bg-amber-50 text-amber-600' },
    { name: 'Completed Matches', value: stats.completedMatches, icon: Trophy, color: 'bg-purple-50 text-purple-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C0A09]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#0C0A09] tracking-tight">Dashboard Overview</h1>
        <p className="text-[#57534E] mt-1">Welcome back! Here's what's happening with your bowls teams.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
              <span className="text-2xl font-bold text-[#0C0A09]">{stat.value}</span>
            </div>
            <p className="mt-4 text-sm font-medium text-[#57534E]">{stat.name}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Fixtures */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#E7E5E4] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0C0A09]">Recent & Upcoming Fixtures</h2>
            <button className="text-sm font-semibold text-[#0C0A09] hover:underline flex items-center">
              View all <ArrowRight size={16} className="ml-1" />
            </button>
          </div>
          <div className="divide-y divide-[#E7E5E4]">
            {recentFixtures.length > 0 ? (
              recentFixtures.map((fixture) => (
                <div key={fixture.id} className="p-6 hover:bg-[#FAFAF9] transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-8">
                      <div className="text-center min-w-[120px]">
                        <p className="text-sm font-bold text-[#0C0A09] truncate">{fixture.home_team.name}</p>
                        <span className="text-[10px] uppercase tracking-wider text-[#78716C] font-bold">Home</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-[#A8A29E]">VS</span>
                        {fixture.status === 'completed' && (
                          <div className="mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">
                            Final
                          </div>
                        )}
                      </div>
                      <div className="text-center min-w-[120px]">
                        <p className="text-sm font-bold text-[#0C0A09] truncate">{fixture.away_team.name}</p>
                        <span className="text-[10px] uppercase tracking-wider text-[#78716C] font-bold">Away</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-[#57534E]">
                      <div className="flex items-center">
                        <Clock size={16} className="mr-2 text-[#A8A29E]" />
                        <span>{new Date(fixture.match_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin size={16} className="mr-2 text-[#A8A29E]" />
                        <span>{fixture.venue || 'TBD'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-[#78716C]">
                No fixtures found. Start by adding a new fixture.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions / Leaderboard Preview */}
        <div className="space-y-8">
          <div className="bg-[#0C0A09] rounded-2xl p-6 text-white shadow-xl shadow-black/10">
            <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center">
                Add New Match
              </button>
              <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center">
                Register Player
              </button>
              <button className="w-full py-3 bg-white text-[#0C0A09] hover:bg-[#E7E5E4] rounded-xl text-sm font-bold transition-colors flex items-center justify-center">
                Create Team
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E7E5E4] p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-[#0C0A09]">League Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#57534E]">Season Progress</span>
                <span className="font-bold text-[#0C0A09]">65%</span>
              </div>
              <div className="w-full bg-[#F5F5F4] rounded-full h-2">
                <div className="bg-[#0C0A09] h-2 rounded-full w-[65%]"></div>
              </div>
              <p className="text-xs text-[#78716C] leading-relaxed">
                The current season is halfway through. Make sure all scores are reported promptly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
