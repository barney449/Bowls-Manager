import React from 'react';
import { Match, Scorecard, Player } from '../types';
import { Calendar, Trophy, AlertTriangle, Shield, Clock, ChevronRight, UserCheck, UserX, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  matches: Match[];
  scorecards: Scorecard[];
  players: Player[];
  currentUser: Player | null;
  onSelectTab: (tabId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ matches, scorecards, players, currentUser, onSelectTab }) => {
  const [viewMode, setViewMode] = React.useState<'personal' | 'club'>('personal');
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Use local YYYY-MM-DD for comparison
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Helper to parse YYYY-MM-DD into a local Date object for display
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper to get player name from ID
  const getPlayerName = (id: string | null) => {
    if (!id) return 'TBA';
    return players.find(p => p.id === id)?.name || 'Unknown';
  };

  // 1. Filter Matches
  const allMatches = matches
    .filter(m => m.isConfirmed && m.date >= todayStr)
    .map(m => {
      const userAssignment = currentUser 
        ? m.disciplines.flatMap(d => d.assignments).find(a => a.playerId === currentUser.id)
        : null;
      
      let statusLabel = '';
      let statusColor = 'bg-yellow-400 text-bowls-darkGreen';
      let isUnavailable = false;

      if (userAssignment) {
        switch (userAssignment.availability) {
          case 'Unset':
            statusLabel = 'Selected - Ready for you to confirm';
            statusColor = 'bg-white text-bowls-darkGreen border border-white/20';
            break;
          case 'Yes':
            statusLabel = 'Playing - Available';
            statusColor = 'bg-green-400 text-bowls-darkGreen';
            break;
          case 'No':
            statusLabel = 'No - Unavailable';
            statusColor = 'bg-red-500 text-white';
            isUnavailable = true;
            break;
          case 'Ongoing':
            statusLabel = 'Playing - Making own way there';
            statusColor = 'bg-blue-400 text-bowls-darkGreen';
            break;
        }
      }

      const otherPlayers = m.disciplines
        .flatMap(d => d.assignments)
        .filter(a => a.playerId && a.playerId !== currentUser?.id)
        .map(a => getPlayerName(a.playerId))
        .slice(0, 3);

      return {
        id: m.id,
        date: m.date,
        time: m.time,
        competition: m.competition,
        opponent: m.opponent,
        venue: m.venue,
        isHome: m.isHome,
        type: 'Match' as const,
        isPlaying: !!userAssignment,
        statusLabel,
        statusColor,
        isUnavailable,
        tab: m.id,
        otherPlayers
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const myMatches = allMatches.filter(m => m.isPlaying);
  const otherMatches = allMatches.filter(m => !m.isPlaying);

  // 2. Filter Club Champs
  const allClubChamps = scorecards
    .filter(sc => !sc.isNew)
    .map(sc => {
      const userAssignment = currentUser 
        ? [...sc.teamA.assignments, ...sc.teamB.assignments].find(a => a.playerId === currentUser.id)
        : null;
      
      const isUserInTeamA = currentUser ? sc.teamA.assignments.some(a => a.playerId === currentUser.id) : false;
      const isUserInTeamB = currentUser ? sc.teamB.assignments.some(a => a.playerId === currentUser.id) : false;
      
      let opponentName = 'Opponent';
      if (isUserInTeamA) {
        opponentName = sc.teamB.assignments.map(a => getPlayerName(a.playerId)).join(' / ');
      } else if (isUserInTeamB) {
        opponentName = sc.teamA.assignments.map(a => getPlayerName(a.playerId)).join(' / ');
      } else {
        opponentName = `${sc.teamA.assignments.map(a => getPlayerName(a.playerId)).join('/')} vs ${sc.teamB.assignments.map(a => getPlayerName(a.playerId)).join('/')}`;
      }

      const teamAPlayers = sc.teamA.assignments.map(a => getPlayerName(a.playerId)).join(' / ');
      const teamBPlayers = sc.teamB.assignments.map(a => getPlayerName(a.playerId)).join(' / ');

      let statusLabel = '';
      let statusColor = 'bg-yellow-400 text-bowls-darkGreen';
      let isUnavailable = false;
      
      const playDate = sc.agreedPlayDate || sc.playByDate;
      const isOverdue = playDate && playDate < todayStr;

      if (userAssignment?.availability === 'No') {
        statusLabel = 'No - Unavailable';
        statusColor = 'bg-red-500 text-white';
        isUnavailable = true;
      } else if (isOverdue) {
        statusLabel = 'Overdue - Play ASAP';
        statusColor = 'bg-red-600 text-white animate-pulse';
        isUnavailable = true;
      } else if (sc.agreedPlayDate) {
        statusLabel = 'Game On';
        statusColor = 'bg-green-400 text-bowls-darkGreen';
      } else {
        statusLabel = 'Game to Be Played By This Date';
        statusColor = 'bg-yellow-400 text-bowls-darkGreen';
      }

      return {
        id: sc.id,
        date: sc.agreedPlayDate || sc.playByDate,
        time: sc.startTime || 'TBA',
        competition: `Club Champs - ${sc.selectedType}`,
        opponent: opponentName,
        venue: sc.isHome ? 'Home' : 'Away',
        isHome: sc.isHome,
        type: 'Scorecard' as const,
        isPlaying: !!userAssignment,
        statusLabel,
        statusColor,
        isUnavailable,
        tab: 'ClubChamps',
        teamAPlayers,
        teamBPlayers,
        hasAgreedDate: !!sc.agreedPlayDate,
        playByDate: sc.playByDate,
        isUserInTeamA,
        isUserInTeamB
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const myClubChamps = allClubChamps.filter(sc => sc.isPlaying);
  const clubScheduleChamps = allClubChamps.filter(sc => sc.hasAgreedDate); // Only show confirmed games in club view

  // 3. Club Champs Warnings (Deadlines)
  const clubChampsWarnings = scorecards.filter(sc => {
    if (!sc.playByDate) return false;
    const playDate = new Date(sc.playByDate);
    const diffTime = playDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Show if overdue or within 15 days
    return diffDays <= 15;
  }).sort((a, b) => new Date(a.playByDate).getTime() - new Date(b.playByDate).getTime());

  // 3. Matches with Unavailable Players (Admin/Editor only)
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Admin Editor';
  const matchesWithAlerts = matches.filter(m => {
    return m.disciplines.some(d => d.assignments.some(a => a.availability === 'No'));
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Header + Alerts */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/20 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="min-w-fit">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            Hello, <span className="text-bowls-darkGreen">{currentUser?.name}</span>!
          </h1>
          <p className="text-gray-400 text-sm font-medium">
            Here's what's happening at the club today.
          </p>
        </div>

        {/* Integrated Alerts - More Compact */}
        <div className="flex flex-wrap gap-3 w-full lg:w-auto lg:justify-end">
          {clubChampsWarnings.slice(0, 2).map(sc => {
            const playDate = new Date(sc.playByDate);
            const diffTime = playDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isOverdue = diffDays < 0;

            return (
              <div 
                key={sc.id}
                className={`flex-1 lg:flex-none lg:w-48 p-3 rounded-xl border-l-4 shadow-sm flex items-center gap-2 ${
                  isOverdue ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-gray-900 text-[10px] truncate leading-tight">
                    {sc.competition}
                  </h4>
                  <p className={`text-[9px] font-black uppercase tracking-wider ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                    {isOverdue ? `Overdue` : `Due in ${diffDays}d`}
                  </p>
                </div>
              </div>
            );
          })}

          {isAdmin && matchesWithAlerts.slice(0, 1).map(match => (
            <div 
              key={match.id}
              className="flex-1 lg:flex-none lg:w-48 p-3 rounded-xl bg-red-50 border-l-4 border-red-500 shadow-sm flex items-center gap-2"
            >
              <div className="p-1.5 rounded-lg bg-red-100 text-red-600 shrink-0">
                <UserX className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 text-[10px] truncate leading-tight">
                  Selection Conflict
                </h4>
                <p className="text-[9px] text-red-600 font-black uppercase tracking-wider">
                  {match.opponent}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unified Schedule View */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 w-fit mx-auto">
          <button 
            onClick={() => setViewMode('personal')}
            className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${
              viewMode === 'personal' 
                ? 'bg-bowls-darkGreen text-white shadow-lg scale-105' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-white/40'
            }`}
          >
            <Shield className="w-4 h-4" />
            My Schedule
          </button>
          
          <div className="w-px h-4 bg-gray-300 mx-1" />

          <button 
            onClick={() => setViewMode('club')}
            className={`px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 ${
              viewMode === 'club' 
                ? 'bg-bowls-darkGreen text-white shadow-lg scale-105' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-white/40'
            }`}
          >
            <Users className="w-4 h-4" />
            Club Schedule
          </button>
        </div>

        {/* Section Headers */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 opacity-80">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-bowls-darkGreen" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              {viewMode === 'personal' ? 'My Matches' : 'All Club Matches'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-bowls-darkGreen" />
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              {viewMode === 'personal' ? 'My Club Champs' : 'All Club Champs'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Matches */}
          <div className="space-y-4">
            {(viewMode === 'personal' ? myMatches : allMatches).length > 0 ? (
              (viewMode === 'personal' ? myMatches : allMatches).map(item => (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  key={item.id}
                  onClick={() => onSelectTab(item.tab)}
                  className={`w-full p-6 rounded-3xl shadow-xl relative overflow-hidden group text-left transition-all text-white ${
                    item.isUnavailable 
                      ? 'bg-red-600 shadow-red-600/20 hover:shadow-red-600/40' 
                      : 'bg-bowls-darkGreen shadow-bowls-darkGreen/20 hover:shadow-bowls-darkGreen/40'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    {item.isUnavailable ? <UserX className="w-20 h-20" /> : <Shield className="w-20 h-20" />}
                  </div>

                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {parseLocalDate(item.date).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      {item.isPlaying ? (
                        <span className={`${item.statusColor} text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1`}>
                          {item.isUnavailable ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                          {item.statusLabel}
                        </span>
                      ) : (
                        <span className="bg-white/10 text-white/60 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                          Other Members
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-black mb-1 leading-tight group-hover:text-yellow-300 transition-colors">
                      {item.competition} vs {item.opponent}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-xs font-bold text-white/90">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {item.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" /> {item.venue} ({item.isHome ? 'Home' : 'Away'})
                      </span>
                    </div>

                    {!item.isPlaying && item.otherPlayers.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-wider mb-2">Selected Players</p>
                        <div className="flex flex-wrap gap-1">
                          {item.otherPlayers.map((name, i) => (
                            <span key={i} className="bg-white/10 text-white/90 text-[9px] font-bold px-2 py-0.5 rounded-md border border-white/10">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.button>
              ))
            ) : (
              <div className="bg-white/40 backdrop-blur-md border-2 border-dashed border-white/60 rounded-3xl p-12 text-center">
                <p className="text-gray-400 font-bold italic">
                  {viewMode === 'personal' ? 'You have no upcoming matches scheduled.' : 'No upcoming club matches found.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Club Champs */}
          <div className="space-y-4">
            {(viewMode === 'personal' ? myClubChamps : clubScheduleChamps).length > 0 ? (
              (viewMode === 'personal' ? myClubChamps : clubScheduleChamps).map(sc => (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  key={sc.id}
                  onClick={() => onSelectTab('ClubChamps')}
                  className={`w-full p-6 rounded-3xl shadow-xl relative overflow-hidden group text-left transition-all text-white ${
                    sc.isUnavailable 
                      ? 'bg-red-600 shadow-red-600/20 hover:shadow-red-600/40' 
                      : 'bg-bowls-darkGreen shadow-bowls-darkGreen/20 hover:shadow-bowls-darkGreen/40'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    {sc.isUnavailable ? <UserX className="w-20 h-20" /> : <Trophy className="w-20 h-20" />}
                  </div>

                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                          Play By: {parseLocalDate(sc.playByDate).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })}
                        </div>
                        <span className={`${sc.statusColor} text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm`}>
                          {sc.statusLabel}
                        </span>
                      </div>
                      {sc.isPlaying && (
                        <span className="bg-yellow-400 text-bowls-darkGreen text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                          Playing
                        </span>
                      )}
                    </div>

                    {sc.hasAgreedDate && (
                      <div className="mb-4 text-center">
                        <div className="inline-block bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/20 shadow-inner">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-yellow-300 mb-1">Agreed Match Time</p>
                          <div className="flex items-center justify-center gap-3">
                            <div className="flex flex-col items-center">
                              <span className="text-2xl font-black leading-none">{parseLocalDate(sc.date).getDate()}</span>
                              <span className="text-[8px] font-bold uppercase">{parseLocalDate(sc.date).toLocaleDateString('en-NZ', { month: 'short' })}</span>
                            </div>
                            <div className="w-px h-6 bg-white/20" />
                            <div className="flex flex-col items-center">
                              <span className="text-2xl font-black leading-none">{sc.time}</span>
                              <span className="text-[8px] font-bold uppercase">{parseLocalDate(sc.date).toLocaleDateString('en-NZ', { weekday: 'short' })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-2 mb-3">
                      <Trophy className="w-4 h-4 shrink-0 mt-0.5 text-yellow-300" />
                      <h3 className="text-lg font-black leading-tight group-hover:text-yellow-300 transition-colors">
                        {sc.competition}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      <div className="px-3 py-2 rounded-xl border bg-white/5 border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 w-full">
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-black uppercase tracking-wider opacity-60">
                              {sc.isPlaying ? (sc.isUserInTeamA ? 'Your Team' : 'Opponent') : 'Team A'}
                            </p>
                            <p className="text-xs font-bold truncate">{sc.teamAPlayers}</p>
                          </div>
                          <div className="text-[10px] font-black text-white/40 px-2 italic">vs</div>
                          <div className="flex-1 min-w-0 text-right">
                            <p className="text-[8px] font-black uppercase tracking-wider opacity-60">
                              {sc.isPlaying ? (sc.isUserInTeamB ? 'Your Team' : 'Opponent') : 'Team B'}
                            </p>
                            <p className="text-xs font-bold truncate">{sc.teamBPlayers}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))
            ) : (
              <div className="bg-white/40 backdrop-blur-md border-2 border-dashed border-white/60 rounded-3xl p-12 text-center">
                <p className="text-gray-400 font-bold italic">
                  {viewMode === 'personal' ? 'No upcoming Club Champs games scheduled for you.' : 'No confirmed Club Champs games scheduled.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
