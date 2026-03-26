import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Teams: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
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
    setLoading(true);
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name');
    
    if (error) console.error('Error fetching teams:', error);
    else setTeams(data || []);
    setLoading(false);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const { data, error } = await supabase
      .from('teams')
      .insert([{ name: newTeamName, description: newTeamDesc }])
      .select();

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Team created successfully!');
      setTeams([...teams, ...data]);
      setNewTeamName('');
      setNewTeamDesc('');
      setTimeout(() => setShowAddModal(false), 1500);
    }
  };

  const handleDeleteTeam = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;

    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      setError(error.message);
    } else {
      setTeams(teams.filter(t => t.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0C0A09] tracking-tight">Teams</h1>
          <p className="text-[#57534E] mt-1">Manage and organize your bowls teams.</p>
        </div>
        
        {userRole === 'admin' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center px-6 py-3 bg-[#0C0A09] text-white rounded-xl font-bold hover:bg-[#1C1917] transition-all shadow-lg shadow-black/5 active:scale-[0.98]"
          >
            <Plus size={20} className="mr-2" /> Create New Team
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E]" size={18} />
        <input 
          type="text" 
          placeholder="Search teams..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm shadow-sm"
        />
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C0A09]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.length > 0 ? (
            teams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-6 rounded-2xl border border-[#E7E5E4] shadow-sm hover:shadow-md transition-all group relative"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-[#F5F5F4] rounded-xl text-[#0C0A09]">
                    <Users size={24} />
                  </div>
                  {userRole === 'admin' && (
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-[#F5F5F4] rounded-lg text-[#57534E] hover:text-[#0C0A09]">
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-[#57534E] hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <h3 className="text-lg font-bold text-[#0C0A09]">{team.name}</h3>
                  <p className="text-sm text-[#57534E] mt-1 line-clamp-2">
                    {team.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-[#E7E5E4] flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-[#F5F5F4] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#78716C]">
                        P{i}
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full bg-[#0C0A09] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                      +5
                    </div>
                  </div>
                  <button className="text-sm font-semibold text-[#0C0A09] hover:underline">
                    View Details
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-[#E7E5E4]">
              <Users size={48} className="mx-auto text-[#A8A29E] mb-4" />
              <h3 className="text-lg font-bold text-[#0C0A09]">No teams found</h3>
              <p className="text-[#57534E] mt-1">Start by creating your first bowls team.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Team Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-[#0C0A09] text-white flex items-center justify-between">
                <h2 className="text-xl font-bold">Create New Team</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddTeam} className="p-6 space-y-4">
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

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Team Name</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm"
                    placeholder="e.g. The Lawn Rangers"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Description</label>
                  <textarea
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    className="w-full px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm min-h-[100px]"
                    placeholder="Tell us about this team..."
                  />
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
                    Create Team
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
