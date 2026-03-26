import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  UserCircle, 
  Plus, 
  Search, 
  Trash2, 
  Edit2,
  Mail,
  Shield,
  User,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Players: React.FC = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState<'admin' | 'player'>('player');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers();
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

  const fetchPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    
    if (error) console.error('Error fetching players:', error);
    else setPlayers(data || []);
    setLoading(false);
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Note: In a real app, you'd use Supabase Auth to invite users.
    // For this demo, we'll just show the UI for it.
    setError("Invite functionality requires Supabase Auth Admin API or Edge Functions. For now, users should sign up themselves.");
  };

  const handleDeletePlayer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this player profile?')) return;

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) {
      setError(error.message);
    } else {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0C0A09] tracking-tight">Players</h1>
          <p className="text-[#57534E] mt-1">Manage player profiles and permissions.</p>
        </div>
        
        {userRole === 'admin' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center px-6 py-3 bg-[#0C0A09] text-white rounded-xl font-bold hover:bg-[#1C1917] transition-all shadow-lg shadow-black/5 active:scale-[0.98]"
          >
            <Plus size={20} className="mr-2" /> Invite New Player
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E]" size={18} />
        <input 
          type="text" 
          placeholder="Search players..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm shadow-sm"
        />
      </div>

      {/* Players Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C0A09]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAFAF9] border-b border-[#E7E5E4]">
                  <th className="px-6 py-4 text-xs font-bold text-[#78716C] uppercase tracking-wider">Player</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#78716C] uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#78716C] uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#78716C] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4]">
                {players.length > 0 ? (
                  players.map((player, index) => (
                    <motion.tr
                      key={player.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-[#FAFAF9] transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-[#F5F5F4] flex items-center justify-center text-[#0C0A09] font-bold border border-[#E7E5E4] shadow-sm">
                            {player.full_name?.[0]?.toUpperCase() || player.email[0].toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-bold text-[#0C0A09]">{player.full_name || 'Unnamed Player'}</p>
                            <p className="text-xs text-[#78716C] flex items-center mt-0.5">
                              <Mail size={12} className="mr-1" /> {player.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          player.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          <Shield size={10} className="mr-1" /> {player.role}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#57534E]">
                        {new Date(player.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {userRole === 'admin' && (
                          <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 hover:bg-[#F5F5F4] rounded-lg text-[#57534E] hover:text-[#0C0A09]">
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeletePlayer(player.id)}
                              className="p-2 hover:bg-red-50 rounded-lg text-[#57534E] hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-[#78716C]">
                      No players found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
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
                <h2 className="text-xl font-bold">Invite New Player</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddPlayer} className="p-6 space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-start">
                    <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" /> {error}
                  </div>
                )}
                {success && (
                  <div className="p-4 bg-emerald-50 text-emerald-600 text-sm rounded-xl flex items-center">
                    <CheckCircle2 size={16} className="mr-2" /> {success}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#0C0A09] transition-colors" size={18} />
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A29E] group-focus-within:text-[#0C0A09] transition-colors" size={18} />
                    <input
                      type="email"
                      value={newPlayerEmail}
                      onChange={(e) => setNewPlayerEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#78716C] uppercase tracking-wider ml-1">Role</label>
                  <select
                    value={newPlayerRole}
                    onChange={(e) => setNewPlayerRole(e.target.value as 'admin' | 'player')}
                    className="w-full px-4 py-3 bg-[#FAFAF9] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0C0A09]/10 focus:border-[#0C0A09] transition-all text-sm appearance-none"
                  >
                    <option value="player">Player (Standard Access)</option>
                    <option value="admin">Admin (Full Control)</option>
                  </select>
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
                    Send Invitation
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
