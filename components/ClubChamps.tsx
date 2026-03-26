import React, { useState, useEffect } from 'react';
import { Player, DisciplineType, DisciplineInstance, Availability, Match, ViewMode, Scorecard } from '../types';
import DisciplineCard from './DisciplineCard';
import MatchChatPanel from './MatchChatPanel';
import { Trophy, Plus, Save, Calendar, Trash2, AlertTriangle } from 'lucide-react';

interface ClubChampsProps {
  players: Player[];
  onCommitResults: (match: Match) => void;
  viewMode: ViewMode;
  currentUser: Player | null;
  scorecards: Scorecard[];
  setScorecards: React.Dispatch<React.SetStateAction<Scorecard[]>>;
}



const ClubChamps: React.FC<ClubChampsProps> = ({ players, onCommitResults, viewMode, currentUser, scorecards, setScorecards }) => {
  const getPositionsForType = (type: DisciplineType): string[] => {
    switch (type) {
        case 'Singles': return ['Skip'];
        case 'Pairs': return ['Lead', 'Skip'];
        case 'Triples': return ['Lead', '2nd', 'Skip'];
        case 'Fours': return ['Lead', '2nd', '3rd', 'Skip'];
        default: return [];
    }
  };

  const createEmptySide = (type: DisciplineType, idSuffix: string): DisciplineInstance => {
    const positions = getPositionsForType(type);
    return {
        id: `cc-${Date.now()}-${idSuffix}-${Math.random()}`,
        type,
        assignments: positions.map(pos => ({
            positionName: pos,
            playerId: null,
            availability: 'Yes' as Availability
        })),
        pointsFor: '',
        pointsAgainst: ''
    };
  };

  const createNewScorecard = (): Scorecard => {
      const type = 'Singles';
      return {
          id: `sc-${Date.now()}-${Math.random()}`,
          competition: 'Club Champs',
          selectedType: type,
          playByDate: '',
          isHome: true, // Default to Home
          teamA: createEmptySide(type, 'A'),
          teamB: createEmptySide(type, 'B')
      };
  };

  // Initialize with one scorecard if empty
  useEffect(() => {
      if (scorecards.length === 0) {
          setScorecards([createNewScorecard()]);
      }
  }, []);

  const updateScorecard = (id: string, updates: Partial<Scorecard>) => {
      setScorecards(prev => prev.map(sc => {
          if (sc.id !== id) return sc;
          
          // If type is changing, we need to reset teams
          if (updates.selectedType && updates.selectedType !== sc.selectedType) {
              return {
                  ...sc,
                  ...updates,
                  teamA: createEmptySide(updates.selectedType, 'A'),
                  teamB: createEmptySide(updates.selectedType, 'B')
              };
          }

          return { ...sc, ...updates };
      }));
  };

  const handleAddScorecard = () => {
      setScorecards(prev => [...prev, createNewScorecard()]);
  };

  const handleRemoveScorecard = (id: string) => {
      setScorecards(prev => prev.filter(sc => sc.id !== id));
  };

  const handleCommitScorecard = (scorecard: Scorecard) => {
      // Validate
      if (!scorecard.competition) {
          alert('Please enter a Competition name.');
          return;
      }
      
      // Construct Match objects for both teams
      
      // Team A Match Entry
      const matchToCommitA: Match = {
          id: `${scorecard.id}-A`,
          date: scorecard.playedOnDate || new Date().toISOString().split('T')[0], // Use playedOnDate if available
          time: scorecard.playedOnTime || '', 
          venue: scorecard.isHome ? 'Home' : 'Away',
          isHome: scorecard.isHome,
          competition: `${scorecard.competition} - ${scorecard.selectedType}`,
          opponent: `vs ${scorecard.teamB.assignments.map(a => a.playerId ? players.find(p => p.id === a.playerId)?.name : 'Unknown').join(', ')}`,
          disciplines: [{
              ...scorecard.teamA,
              pointsFor: scorecard.teamA.pointsFor,
              pointsAgainst: scorecard.teamB.pointsFor
          }]
      };

      // Team B Match Entry (Opposite perspective)
      const matchToCommitB: Match = {
          id: `${scorecard.id}-B`,
          date: scorecard.playedOnDate || new Date().toISOString().split('T')[0],
          time: scorecard.playedOnTime || '',
          venue: !scorecard.isHome ? 'Home' : 'Away', // Opposite venue
          isHome: !scorecard.isHome,
          competition: `${scorecard.competition} - ${scorecard.selectedType}`,
          opponent: `vs ${scorecard.teamA.assignments.map(a => a.playerId ? players.find(p => p.id === a.playerId)?.name : 'Unknown').join(', ')}`,
          disciplines: [{
              ...scorecard.teamB,
              pointsFor: scorecard.teamB.pointsFor,
              pointsAgainst: scorecard.teamA.pointsFor
          }]
      };

      // Commit both matches
      onCommitResults(matchToCommitA);
      onCommitResults(matchToCommitB);
      
      // Remove the scorecard after committing
      setScorecards(prev => prev.filter(sc => sc.id !== scorecard.id));
  };

  // Sort scorecards:
  // 1. Current user's scorecards first (sorted by date)
  // 2. Other scorecards (sorted by date)
  const sortedScorecards = [...scorecards].sort((a, b) => {
      // Helper to check if current user is in a scorecard
      const isUserInScorecard = (sc: Scorecard) => {
          if (!currentUser) return false;
          const inTeamA = sc.teamA.assignments.some(assignment => assignment.playerId === currentUser.id);
          const inTeamB = sc.teamB.assignments.some(assignment => assignment.playerId === currentUser.id);
          return inTeamA || inTeamB;
      };

      const userInA = isUserInScorecard(a);
      const userInB = isUserInScorecard(b);

      // Priority 1: Current User involvement
      if (userInA && !userInB) return -1;
      if (!userInA && userInB) return 1;

      // Priority 2: Date (Oldest first)
      if (!a.playByDate && !b.playByDate) return 0;
      if (!a.playByDate) return 1;
      if (!b.playByDate) return -1;
      return a.playByDate.localeCompare(b.playByDate);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20">
        
        {sortedScorecards.map((sc, index) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isOverdue = sc.playByDate && sc.playByDate < todayStr;

            return (
            <div key={sc.id} className={`bg-white rounded-xl shadow-lg border relative ${isOverdue ? 'border-red-300' : 'border-gray-200'}`}>
                {/* Header / Controls */}
                <div className={`p-4 border-b flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isOverdue ? 'bg-red-100' : 'bg-yellow-100'}`}>
                            {isOverdue ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <Trophy className="w-5 h-5 text-yellow-600" />}
                        </div>
                        <div>
                            <h3 className={`font-bold ${isOverdue ? 'text-red-800' : 'text-gray-800'}`}>Scorecard #{index + 1}</h3>
                            <p className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                {isOverdue ? 'OVERDUE GAME' : 'Club Championships'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {viewMode !== 'Member' && (
                        <button 
                            onClick={() => handleRemoveScorecard(sc.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors text-sm font-medium"
                            title="Remove Scorecard"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove</span>
                        </button>
                        )}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Overdue Warning Banner */}
                    {isOverdue && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-center gap-3 animate-pulse">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <div>
                                <p className="font-bold text-red-700">Action Required: Game Overdue</p>
                                <p className="text-xs text-red-600">
                                    This game was scheduled to be played by <span className="font-bold">{new Date(sc.playByDate).toLocaleDateString()}</span>. Please play this game as soon as possible or update the date.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Match Details Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Competition</label>
                            <input 
                                type="text" 
                                value={sc.competition}
                                onChange={(e) => updateScorecard(sc.id, { competition: e.target.value })}
                                disabled={viewMode === 'Member'}
                                className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                                placeholder="Club Champs"
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Format</label>
                            <select 
                                value={sc.selectedType}
                                onChange={(e) => updateScorecard(sc.id, { selectedType: e.target.value as DisciplineType })}
                                disabled={viewMode === 'Member'}
                                className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent shadow-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                {(['Singles', 'Pairs', 'Triples', 'Fours'] as DisciplineType[]).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-xs font-bold uppercase tracking-wider ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>Play By</label>
                            <div className="relative">
                                <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-gray-400'}`} />
                                <input 
                                    type="date" 
                                    value={sc.playByDate}
                                    onChange={(e) => updateScorecard(sc.id, { playByDate: e.target.value })}
                                    disabled={viewMode === 'Member'}
                                    className={`w-full rounded-lg border p-2.5 pl-10 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent shadow-sm disabled:bg-gray-100 disabled:text-gray-500 ${isOverdue ? 'border-red-300 bg-red-50 text-red-900' : 'border-gray-300'}`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Location</label>
                            <select 
                                value={sc.isHome ? 'Home' : 'Away'}
                                onChange={(e) => updateScorecard(sc.id, { isHome: e.target.value === 'Home' })}
                                disabled={viewMode === 'Member'}
                                className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent shadow-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                <option value="Home">Home</option>
                                <option value="Away">Away</option>
                            </select>
                        </div>
                    </div>

                    {/* VS Section */}
                    <div className="flex flex-col md:flex-row gap-0 items-stretch border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {/* Team A */}
                        <div className="flex-1 bg-blue-50/30">
                            <div className="bg-blue-100/50 p-2 text-center font-bold text-blue-800 text-xs tracking-wider border-b border-blue-100 flex justify-center items-center gap-2">
                                <span>TEAM A</span>
                                <input
                                    type="text"
                                    value={sc.teamA.pointsFor}
                                    onChange={(e) => updateScorecard(sc.id, { teamA: { ...sc.teamA, pointsFor: e.target.value } })}
                                    disabled={viewMode === 'Member'}
                                    className="w-16 text-center font-bold text-sm bg-white border border-blue-200 rounded focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                                    placeholder="Score"
                                />
                            </div>
                            <div className="p-4">
                                <DisciplineCard 
                                    data={sc.teamA} 
                                    players={players} 
                                    viewMode={viewMode} 
                                    onUpdate={(updated) => updateScorecard(sc.id, { teamA: updated })} 
                                    onRemove={() => {}} 
                                    hideHeader={true}
                                    compact={true}
                                    hideScoreInput={true} // New prop to hide internal score input
                                    hideAvailability={true}
                                    matchDate={sc.playByDate}
                                />
                            </div>
                        </div>

                        {/* VS Divider */}
                        <div className="flex items-center justify-center bg-gray-50 border-y md:border-y-0 md:border-x border-gray-200 p-2 md:w-12">
                            <span className="font-black text-gray-300 text-xl">VS</span>
                        </div>

                        {/* Team B */}
                        <div className="flex-1 bg-red-50/30">
                            <div className="bg-red-100/50 p-2 text-center font-bold text-red-800 text-xs tracking-wider border-b border-red-100 flex justify-center items-center gap-2">
                                <span>TEAM B</span>
                                <input
                                    type="text"
                                    value={sc.teamB.pointsFor}
                                    onChange={(e) => updateScorecard(sc.id, { teamB: { ...sc.teamB, pointsFor: e.target.value } })}
                                    disabled={viewMode === 'Member'}
                                    className="w-16 text-center font-bold text-sm bg-white border border-red-200 rounded focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                                    placeholder="Score"
                                />
                            </div>
                            <div className="p-4">
                                <DisciplineCard 
                                    data={sc.teamB} 
                                    players={players} 
                                    viewMode={viewMode} 
                                    onUpdate={(updated) => updateScorecard(sc.id, { teamB: updated })} 
                                    onRemove={() => {}} 
                                    hideHeader={true}
                                    compact={true}
                                    hideScoreInput={true} // New prop to hide internal score input
                                    hideAvailability={true}
                                    matchDate={sc.playByDate}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Match Communication & Action Footer */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        {/* Match Communication Panel - Bottom Left */}
                        <div className="md:col-span-2 w-full">
                            <MatchChatPanel 
                                scorecard={sc} 
                                currentUser={currentUser} 
                                players={players} 
                            />
                        </div>

                        {/* Agreed Play Date, Time and Action Footer - Right Side */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Agreed Play Date</label>
                                    <input 
                                        type="date" 
                                        value={sc.playedOnDate || ''}
                                        onChange={(e) => updateScorecard(sc.id, { playedOnDate: e.target.value })}
                                        disabled={viewMode === 'Member'}
                                        className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Time</label>
                                    <input 
                                        type="time" 
                                        value={sc.playedOnTime || ''}
                                        onChange={(e) => updateScorecard(sc.id, { playedOnTime: e.target.value })}
                                        disabled={viewMode === 'Member'}
                                        className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                                    />
                                </div>
                            </div>

                            {viewMode === 'Admin' && (
                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => handleCommitScorecard(sc)}
                                    className="flex items-center gap-2 px-6 py-3 bg-bowls-darkGreen text-white rounded-lg font-bold shadow-md hover:bg-bowls-green transition-all transform hover:scale-105 w-full justify-center"
                                >
                                    <Save className="w-4 h-4" />
                                    Enter Results to Database
                                </button>
                            </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )})}

        {/* Add Scorecard Button */}
        {viewMode !== 'Member' && (
        <div className="flex justify-center pt-4">
            <button
                onClick={handleAddScorecard}
                className="flex items-center gap-2 px-6 py-3 bg-white text-bowls-darkGreen border-2 border-dashed border-bowls-darkGreen/30 rounded-xl font-bold hover:bg-bowls-green/5 hover:border-bowls-darkGreen transition-all"
            >
                <Plus className="w-5 h-5" />
                Add Another Scorecard
            </button>
        </div>
        )}
    </div>
  );
};

export default ClubChamps;
