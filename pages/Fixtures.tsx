import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, 
  Plus, 
  Search, 
  Trash2, 
  Edit2,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Fixtures: React.FC = () => {
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form state
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [venue, setVenue] = useState('');

  useEffect(() => {
    fetchFixtures();
    fetchTeams();
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setUserRole(data?.role || 'player');
    }
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('name');
    setTeams(data || []);
  };

  const fetchFixtures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('fixtures')
      .select(`
        *,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `)
      .order('match_date', { ascending: true });
    
    if (error) console.error('Error fetching fixtures:', error);
    else setFixtures(data || []);
    setLoading(false);
  };

  const handleAddFixture = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (homeTeamId === awayTeamId) {
      setError('Home and Away teams must be different.');
      return;
    }

    const { data, error } = await supabase
      .from('fixtures')
      .insert([{ 
        home_team_id: homeTeamId, 
        away_team_id: awayTeamId, 
        match_date: matchDate,
        venue: venue,
        status: 'scheduled'
      }])
      .select(`
        *,
        home_team:teams!home_team_id(name),
        away_team:teams!away_team_id(name)
      `);

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Fixture scheduled successfully!');
      setFixtures([...fixtures, ...data]);
      setHomeTeamId('');
      setAwayTeamId('');
      setMatchDate('');
      setVenue('');
      setTimeout(() => setShowAddModal(false), 1500);
    }
  };

  const handleDeleteFixture = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this fixture?')) return;

    const { error } = await supabase
      .from('fixtures')
      .delete()
      .eq('id', id);

    if (error) {
      setError(error.message);
    } else {
      setFixtures(fixtures.filter(f => f.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0C0A09] tracking-tight">Fixtures</h1>
          <p className="text-[#57534E] mt-1">Schedule and track upcoming bowls matches.</p>
        </div>
        
        {userRole === 'admin' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center px-6 py-3 bg-[#0C0A09] text-white rounded-xl font-bold hover:bg-[#1C1917] transition-all shadow-lg shadow-black/5 active:scale-[0.98]"
          >
            <Plus size={20} className="mr-2" /> Schedule Match
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E]" size={18} />
        <input 
          type="text" 
          placeholder="Search fixtures..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm shadow-sm"
        />
      </div>

      {/* Fixtures List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C0A09]"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {fixtures.length > 0 ? (
            fixtures.map((fixture, index) => (
              <motion.div
                key={fixture.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 flex items-center justify-center md:justify-start space-x-12">
                    <div className="text-center md:text-left min-w-[140px]">
                      <p className="text-lg font-bold text-[#0C0A09]">{fixture.home_team.name}</p>
                      <span className="text-[10px] uppercase tracking-wider text-[#78716C] font-bold">Home Team</span>
                    </div>
                    
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-[#F5F5F4] flex items-center justify-center text-xs font-bold text-[#A8A29E] border border-[#E7E5E4]">
                        VS
                      </div>
                      <span className={`mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        fixture.status === 'scheduled' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {fixture.status}
                      </span>
                    </div>

                    <div className="text-center md:text-right min-w-[140px]">
                      <p className="text-lg font-bold text-[#0C0A09]">{fixture.away_team.name}</p>
                      <span className="text-[10px] uppercase tracking-wider text-[#78716C] font-bold">Away Team</span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6 text-sm text-[#57534E] border-t md:border-t-0 md:border-l border-[#E7E5E4] pt-4 md:pt-0 md:pl-6">
                    <div className="flex items-center">
                      <Calendar size={18} className="mr-2 text-[#A8A29E]" />
                      <span>{new Date(fixture.match_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock size={18} className="mr-2 text-[#A8A29E]" />
                      <span>{new Date(fixture.match_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin size={18} className="mr-2 text-[#A8A29E]" />
                      <span>{fixture.venue || 'TBD'}</span>
                    </div>
                    
                    {userRole === 'admin' && (
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                        <button className="p-2 hover:bg-[#F5F5F4] rounded-lg text-[#57534E] hover:text-[#0C0A09]">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteFixture(fixture.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-[#57534E] hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-[#E7E5E4]">
              <Calendar size={48} className="mx-auto text-[#A8A29E] mb-4" />
              <h3 className="text-lg font-bold text-[#0C0A09]">No fixtures scheduled</h3>
              <p className="text-[#57534E] mt-1">Start by scheduling your first match.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Fixture Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-[#0C0A09] text-white flex items-center justify-between">
                <h2 className="text-xl font-bold">Schedule Match</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddFixture} className="p-6 space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center">
                    <AlertCircle size={16} className="mr-2" /> {error}
                  </div>
                )}
                {success && (
                  <div className="p-4 bg-emerald-50 text-emerald-600 text-sm rounded-xl flex items-center">
                    <CheckCircle2 size={16} className="mr-2" /> {success}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Home Team</label>
                    <select
                      value={homeTeamId}
                      onChange={(e) => setHomeTeamId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm appearance-none"
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Away Team</label>
                    <select
                      value={awayTeamId}
                      onChange={(e) => setAwayTeamId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm appearance-none"
                      required
                    >
                      <option value="">Select Team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Match Date & Time</label>
                  <input
                    type="datetime-local"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Venue</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#0C0A09] transition-colors" size={18} />
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm"
                      placeholder="e.g. Central Park Bowls Club"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 bg-white border border-[#E7E5E4] text-[#0C0A09] rounded-xl font-bold hover:bg-[#F5F5F4] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#0C0A09] text-white rounded-xl font-bold hover:bg-[#1C1917] transition-all shadow-lg shadow-black/10"
                  >
                    Schedule Match
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
