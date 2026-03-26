import React, { useState } from 'react';
import { Player } from '../types';
import Avatar from './Avatar';
import ImageUploader from './ImageUploader';
import { Plus, X, Check, UserCheck, ShieldAlert, Image as ImageIcon, Trash2 } from 'lucide-react';

interface PlayerManagerProps {
  players: Player[];
  onAddPlayer: (player: Player) => void;
  onRemovePlayer: (id: string) => void;
  onUpdatePlayer: (player: Player) => void;
}

const PlayerManager: React.FC<PlayerManagerProps> = ({ players, onAddPlayer, onRemovePlayer, onUpdatePlayer }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<'Admin' | 'Admin Editor' | 'Member'>('Member');

  const [statusInput, setStatusInput] = useState<'Active' | 'Inactive'>('Active');

  const pendingPlayers = players.filter(p => !p.isApproved && p.role === 'Pending');
  const activePlayers = players.filter(p => p.isApproved || p.role !== 'Pending');

  const startAdding = () => {
      setIsAdding(true);
      setEditingId(null);
      setNameInput('');
      setAvatarInput('');
      setEmailInput('');
      setRoleInput('Member');
      setStatusInput('Active');
  };

  const startEditing = (player: Player) => {
      setIsAdding(false);
      setEditingId(player.id);
      setNameInput(player.name);
      setAvatarInput(player.avatarUrl);
      setEmailInput(player.email || '');
      setRoleInput((player.role === 'Admin' || player.role === 'Admin Editor' || player.role === 'Member') ? player.role : 'Member');
      setStatusInput(player.status || 'Active');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const avatarUrl = avatarInput || `https://ui-avatars.com/api/?name=${encodeURIComponent(nameInput)}&background=random`;

    if (isAdding) {
        const newPlayer: Player = {
            id: `player-${Date.now()}`,
            name: nameInput,
            avatarUrl,
            status: statusInput,
            email: emailInput,
            role: roleInput,
            isApproved: true,
            password: 'password' // Default
        };
        onAddPlayer(newPlayer);
        setIsAdding(false);
    } else if (editingId) {
        const player = players.find(p => p.id === editingId);
        if (player) {
            onUpdatePlayer({
                ...player,
                name: nameInput,
                avatarUrl,
                status: statusInput,
                email: emailInput,
                role: roleInput
            });
        }
        setEditingId(null);
    }
    
    setNameInput('');
    setAvatarInput('');
    setEmailInput('');
    setRoleInput('Member');
    setStatusInput('Active');
  };

  const toggleStatus = (player: Player) => {
      onUpdatePlayer({
          ...player,
          status: player.status === 'Inactive' ? 'Active' : 'Inactive'
      });
  };

  const approvePlayer = (player: Player) => {
      onUpdatePlayer({
          ...player,
          isApproved: true,
          role: 'Member' // Default to Member upon approval
      });
  };

  const rejectPlayer = (id: string) => {
      if (confirm('Reject and remove this request?')) {
          onRemovePlayer(id);
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
       
       {/* Pending Approvals Section */}
       {pendingPlayers.length > 0 && (
           <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center gap-2 mb-4">
                   <ShieldAlert className="w-6 h-6 text-yellow-600" />
                   <h2 className="text-xl font-bold text-yellow-800">Pending Access Requests</h2>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {pendingPlayers.map(player => (
                       <div key={player.id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-100 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               <Avatar src={player.avatarUrl} alt={player.name} size="sm" />
                               <div>
                                   <p className="font-bold text-gray-800">{player.name}</p>
                                   <p className="text-xs text-gray-500">{player.email}</p>
                               </div>
                           </div>
                           <div className="flex gap-2">
                               <button 
                                   onClick={() => approvePlayer(player)}
                                   className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                   title="Approve"
                               >
                                   <Check className="w-4 h-4" />
                               </button>
                               <button 
                                   onClick={() => rejectPlayer(player.id)}
                                   className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                   title="Reject"
                               >
                                   <X className="w-4 h-4" />
                               </button>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       )}

       <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Team Roster</h2>
          <button 
            onClick={startAdding}
            className="flex items-center gap-2 bg-bowls-darkGreen text-white px-4 py-2 rounded-lg hover:bg-bowls-green hover:text-bowls-darkGreen transition-colors font-semibold shadow"
          >
            <Plus className="w-4 h-4" /> Add Player
          </button>
       </div>

       {(isAdding || editingId) && (
         <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{isAdding ? 'New Player Details' : 'Edit Player'}</h3>
                <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-4">
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                          <input 
                            type="text" 
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent"
                            placeholder="e.g. John Doe"
                            autoFocus
                          />
                       </div>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                          <input 
                            type="email" 
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent"
                            placeholder="user@example.com"
                          />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                              <select
                                value={roleInput}
                                onChange={(e) => setRoleInput(e.target.value as 'Admin' | 'Admin Editor' | 'Member')}
                                className="w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent"
                              >
                                  <option value="Member">Member</option>
                                  <option value="Admin Editor">Admin Editor</option>
                                  <option value="Admin">Admin</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                              <select
                                value={statusInput}
                                onChange={(e) => setStatusInput(e.target.value as 'Active' | 'Inactive')}
                                className="w-full rounded-lg border-gray-300 border p-2 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent"
                              >
                                  <option value="Active">Active Member</option>
                                  <option value="Inactive">Unavailable / Inactive</option>
                              </select>
                           </div>
                       </div>
                   </div>

                   <div className="space-y-2">
                       <label className="block text-sm font-medium text-gray-700 mb-1">Profile Photo</label>
                       
                       {avatarInput && !avatarInput.includes('ui-avatars.com') ? (
                           <div className="flex flex-col items-center gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                               <div className="relative group">
                                   <img 
                                       src={avatarInput} 
                                       alt="Preview" 
                                       className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-md bg-white" 
                                   />
                                   <div className="absolute inset-0 rounded-full bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                       <button
                                           type="button"
                                           onClick={() => setAvatarInput('')}
                                           className="bg-white text-red-600 p-2 rounded-full hover:bg-red-50 shadow-sm"
                                           title="Remove Photo"
                                       >
                                           <Trash2 className="w-5 h-5" />
                                       </button>
                                   </div>
                               </div>
                               <div className="text-center">
                                   <p className="text-xs font-bold text-gray-500 uppercase">Current Photo</p>
                                   <button 
                                       type="button"
                                       onClick={() => setAvatarInput('')}
                                       className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1"
                                   >
                                       Change / Upload New
                                   </button>
                               </div>
                           </div>
                       ) : (
                           <div className="space-y-3">
                               <ImageUploader 
                                   onImageCropped={(base64) => setAvatarInput(base64)}
                                   onCancel={() => {}}
                               />
                               <div className="relative">
                                   <div className="absolute inset-0 flex items-center">
                                       <div className="w-full border-t border-gray-200"></div>
                                   </div>
                                   <div className="relative flex justify-center text-xs uppercase">
                                       <span className="bg-white px-2 text-gray-500 font-bold">Or paste URL</span>
                                   </div>
                               </div>
                               <input 
                                   type="text" 
                                   value={avatarInput}
                                   onChange={(e) => setAvatarInput(e.target.value)}
                                   className="w-full rounded-lg border-gray-300 border p-2 text-xs text-gray-600"
                                   placeholder="https://example.com/photo.jpg"
                               />
                           </div>
                       )}
                   </div>
               </div>

               <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-4">
                  <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button type="submit" className="px-6 py-2 text-sm font-bold bg-bowls-darkGreen text-white rounded-lg hover:bg-opacity-90 shadow-md">
                      {isAdding ? 'Save Player' : 'Update Player'}
                  </button>
               </div>
            </form>
         </div>
       )}

       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {activePlayers.map((player) => (
             <div 
                key={player.id} 
                className={`p-4 rounded-xl border shadow-sm flex items-center gap-4 hover:shadow-md transition-all group relative ${
                    player.status === 'Inactive' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                }`}
             >
                <div className={`relative ${player.status === 'Inactive' ? 'grayscale opacity-75' : ''}`}>
                    <Avatar src={player.avatarUrl} alt={player.name} size="md" />
                    {player.role === 'Admin' && (
                        <div className="absolute -top-1 -right-1 bg-bowls-darkGreen text-white rounded-full p-0.5 border border-white" title="Admin">
                            <ShieldAlert className="w-3 h-3" />
                        </div>
                    )}
                    {player.role === 'Admin Editor' && (
                        <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5 border border-white" title="Admin Editor">
                            <ShieldAlert className="w-3 h-3" />
                        </div>
                    )}
                </div>
                
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => startEditing(player)}>
                   <h3 className={`font-bold truncate ${player.status === 'Inactive' ? 'text-red-800 line-through' : 'text-gray-800'}`}>
                       {player.name}
                   </h3>
                   <div className="flex flex-col">
                       <span className={`text-xs ${player.status === 'Inactive' ? 'text-red-600 font-bold' : 'text-green-600 font-medium'}`}>
                           {player.status === 'Inactive' ? 'Unavailable' : 'Active Member'}
                       </span>
                       <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{player.role || 'Member'}</span>
                   </div>
                </div>

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleStatus(player); }}
                        className={`p-1 rounded hover:bg-gray-100 ${player.status === 'Inactive' ? 'text-green-600' : 'text-orange-500'}`}
                        title={player.status === 'Inactive' ? "Mark Active" : "Mark Unavailable"}
                    >
                        {player.status === 'Inactive' ? <Plus className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('Delete player?')) onRemovePlayer(player.id) }}
                        className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100"
                        title="Delete"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};

export default PlayerManager;
