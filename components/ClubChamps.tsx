import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Player, DisciplineType, DisciplineInstance, Availability, Match, ViewMode, Scorecard } from '../types';
import DisciplineCard from './DisciplineCard';
import ScorecardComments from './ScorecardComments';
import { Trophy, Plus, Save, Calendar, Trash2, AlertTriangle, Check } from 'lucide-react';

interface ClubChampsProps {
  players: Player[];
  scorecards: Scorecard[];
  setScorecards: React.Dispatch<React.SetStateAction<Scorecard[]>>;
  onCommitResults: (match: Match) => void;
  viewMode: ViewMode;
  currentUser: Player | null;
}

export interface ClubChampsHandle {
  addScorecard: () => void;
}

const TimePicker = ({ value, onChange, disabled, isEditing }: { value: string, onChange: (val: string) => void, disabled: boolean, isEditing?: boolean }) => {
    if (!value && disabled) {
        return <span className="text-sm italic text-gray-400 px-3 py-2">Not set</span>;
    }

    if (!value) {
        return (
            <button 
                onClick={() => onChange('10:00')}
                disabled={disabled}
                className="text-sm font-bold px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-green-600 hover:text-green-600 transition-all bg-white/50"
            >
                Set Start Time
            </button>
        );
    }

    const time = value;
    const [h24Str, m] = time.split(':');
    const h24 = parseInt(h24Str, 10);
    
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const h12Str = h12.toString().padStart(2, '0');

    const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

    const handleTimeChange = (newH12: string, newM: string, newPeriod: string) => {
        let h24Num = parseInt(newH12, 10) % 12;
        if (newPeriod === 'PM') h24Num += 12;
        const h24Result = h24Num.toString().padStart(2, '0');
        onChange(`${h24Result}:${newM}`);
    };

    return (
        <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 rounded-lg border-2 p-0.5 transition-all ${disabled ? 'border-transparent bg-transparent' : isEditing ? 'bg-orange-100 border-orange-400 shadow-sm' : 'bg-white border-gray-300 hover:border-green-600 shadow-sm'}`}>
                <select 
                    value={h12Str}
                    onChange={(e) => handleTimeChange(e.target.value, m, period)}
                    disabled={disabled}
                    className={`text-base font-bold px-2 py-1.5 bg-transparent outline-none cursor-pointer disabled:cursor-default appearance-none text-center min-w-[45px] transition-colors duration-300 ${isEditing ? 'text-orange-900' : 'text-gray-800'}`}
                >
                    {hours12.map(hour => <option key={hour} value={hour}>{hour}</option>)}
                </select>
                <span className={`font-bold transition-colors duration-300 ${isEditing ? 'text-orange-400' : 'text-gray-400'}`}>:</span>
                <select 
                    value={m}
                    onChange={(e) => handleTimeChange(h12Str, e.target.value, period)}
                    disabled={disabled}
                    className={`text-base font-bold px-2 py-1.5 bg-transparent outline-none cursor-pointer disabled:cursor-default appearance-none text-center min-w-[45px] transition-colors duration-300 ${isEditing ? 'text-orange-900' : 'text-gray-800'}`}
                >
                    {minutes.map(min => <option key={min} value={min}>{min}</option>)}
                </select>
                <select 
                    value={period}
                    onChange={(e) => handleTimeChange(h12Str, m, e.target.value)}
                    disabled={disabled}
                    className={`text-sm font-black px-2 py-1.5 rounded ml-1 outline-none cursor-pointer disabled:cursor-default appearance-none text-center min-w-[45px] transition-colors duration-300 ${isEditing ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-green-600'}`}
                >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>
            {!disabled && (
                <button 
                    onClick={() => onChange('')}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Clear Time"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

const ClubChamps = forwardRef<ClubChampsHandle, ClubChampsProps>(({ players, scorecards, setScorecards, onCommitResults, viewMode, currentUser }, ref) => {
  const handleAddScorecard = () => {
      setScorecards(prev => [...prev, createNewScorecard()]);
  };

  useImperativeHandle(ref, () => ({
    addScorecard: handleAddScorecard
  }));

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
          agreedPlayDate: '',
          startTime: '',
          isHome: true, // Default to Home
          teamA: createEmptySide(type, 'A'),
          teamB: createEmptySide(type, 'B'),
          isNew: true
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
          
          const isEditing = viewMode !== 'Member';

          // If type is changing, we need to reset teams
          if (updates.selectedType && updates.selectedType !== sc.selectedType) {
              return {
                  ...sc,
                  ...updates,
                  isEditing,
                  teamA: createEmptySide(updates.selectedType, 'A'),
                  teamB: createEmptySide(updates.selectedType, 'B')
              };
          }

          const finalIsEditing = sc.isEditing === false ? false : (isEditing ? true : sc.isEditing);
          return { ...sc, ...updates, isEditing: finalIsEditing };
      }));
  };

  const handleFinishEdit = (id: string) => {
      setScorecards(prev => prev.map(sc => 
          sc.id === id ? { ...sc, isNew: false, isEditing: false } : sc
      ));
  };

  const handleRemoveScorecard = (id: string) => {
      setScorecards(prev => prev.filter(sc => sc.id !== id));
  };

  const handleCommitScorecard = (scorecard: Scorecard) => {
      // Validate
      if (!scorecard.competition) {
          setValidationError({ id: scorecard.id, message: 'Please enter a Competition name.' });
          setTimeout(() => setValidationError(null), 3000);
          return;
      }
      
      // Construct Match objects for both teams
      
      // Team A Match Entry
      const matchToCommitA: Match = {
          id: `${scorecard.id}-A`,
          date: scorecard.agreedPlayDate || new Date().toISOString().split('T')[0], // Use agreed date if available
          time: scorecard.startTime || '', 
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

      // Team B Match Entry (Opposite perspective, but same location as requested)
      const matchToCommitB: Match = {
          id: `${scorecard.id}-B`,
          date: scorecard.agreedPlayDate || new Date().toISOString().split('T')[0],
          time: scorecard.startTime || '',
          venue: scorecard.isHome ? 'Home' : 'Away', // Same venue as Team A
          isHome: scorecard.isHome, // Same isHome as Team A
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

  const [confirmedScorecardId, setConfirmedScorecardId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<{ id: string; message: string } | null>(null);

  const isUserInScorecard = (sc: Scorecard) => {
      if (!currentUser) return false;
      const inTeamA = sc.teamA.assignments.some(assignment => assignment.playerId === currentUser.id);
      const inTeamB = sc.teamB.assignments.some(assignment => assignment.playerId === currentUser.id);
      return inTeamA || inTeamB;
  };

  // Sort scorecards:
  // 0. New or currently editing scorecards first
  // 1. Current user's scorecards first (sorted by date)
  // 2. Other scorecards (sorted by date)
  const sortedScorecards = [...scorecards].sort((a, b) => {
      // Priority 0: New or editing scorecards
      const aIsActiveEdit = a.isNew || a.isEditing;
      const bIsActiveEdit = b.isNew || b.isEditing;

      if (aIsActiveEdit && !bIsActiveEdit) return -1;
      if (!aIsActiveEdit && bIsActiveEdit) return 1;

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
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const isOverdue = sc.playByDate && sc.playByDate < todayStr;
            const isActiveEdit = sc.isNew || sc.isEditing;

            return (
            <div key={sc.id} className={`rounded-xl shadow-lg border relative transition-colors duration-300 ${isActiveEdit ? 'bg-orange-50 border-orange-300' : 'bg-white'} ${!isActiveEdit && isOverdue ? 'border-red-300' : !isActiveEdit ? 'border-gray-200' : ''}`}>
                {/* Header / Controls */}
                <div className={`p-4 border-b flex flex-col md:flex-row gap-4 justify-between items-start md:items-center transition-colors duration-300 ${isActiveEdit ? 'bg-orange-100 border-orange-200' : isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isActiveEdit ? 'bg-orange-200' : isOverdue ? 'bg-red-100' : 'bg-yellow-100'}`}>
                            {isActiveEdit ? <Plus className="w-5 h-5 text-orange-700" /> : isOverdue ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <Trophy className="w-5 h-5 text-yellow-600" />}
                        </div>
                        <div>
                            <h3 className={`font-bold ${isActiveEdit ? 'text-orange-900' : isOverdue ? 'text-red-800' : 'text-gray-800'}`}>Scorecard #{index + 1}</h3>
                            <p className={`text-xs ${isActiveEdit ? 'text-orange-700 font-bold' : isOverdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                                {isActiveEdit ? 'EDITING MODE' : isOverdue ? 'OVERDUE GAME' : 'Club Championships'}
                            </p>
                        </div>
                    </div>

                    {/* New Date/Time Pickers in Header */}
                    <div className={`flex flex-wrap items-center gap-8 p-3 rounded-xl border shadow-md transition-colors duration-300 ${isActiveEdit ? 'bg-orange-50 border-orange-300' : 'bg-white/90 border-gray-300'}`}>
                        <div className="flex items-center gap-3">
                            <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider whitespace-nowrap">Agreed Play Date</label>
                            <div className="flex items-center gap-2">
                                {(!sc.agreedPlayDate && !(viewMode !== 'Member' || isUserInScorecard(sc))) ? (
                                    <span className="text-sm italic text-gray-400 px-3 py-2">Not set</span>
                                ) : (
                                    <>
                                        <input 
                                            type="date" 
                                            value={sc.agreedPlayDate || ''}
                                            onChange={(e) => updateScorecard(sc.id, { agreedPlayDate: e.target.value })}
                                            disabled={!(viewMode !== 'Member' || isUserInScorecard(sc))}
                                            className="text-base font-bold p-2.5 rounded-lg border-2 border-gray-300 focus:ring-2 focus:ring-green-600 outline-none bg-white disabled:bg-transparent disabled:border-transparent min-w-[160px]"
                                        />
                                        {sc.agreedPlayDate && (viewMode !== 'Member' || isUserInScorecard(sc)) && (
                                            <button 
                                                onClick={() => updateScorecard(sc.id, { agreedPlayDate: '' })}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Clear Date"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-[11px] font-black text-gray-600 uppercase tracking-wider whitespace-nowrap">Start Time</label>
                            <div className="flex items-center gap-2">
                                <TimePicker 
                                    value={sc.startTime || ''}
                                    onChange={(val) => updateScorecard(sc.id, { startTime: val })}
                                    disabled={!(viewMode !== 'Member' || isUserInScorecard(sc))}
                                    isEditing={isActiveEdit}
                                />
                                {sc.agreedPlayDate && (viewMode !== 'Member' || isUserInScorecard(sc)) && (
                                    <button 
                                        onClick={() => {
                                            updateScorecard(sc.id, { isConfirmed: true });
                                            setConfirmedScorecardId(sc.id);
                                            setTimeout(() => setConfirmedScorecardId(null), 3000);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${sc.isConfirmed ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
                                    >
                                        {sc.isConfirmed ? <Check className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                        {sc.isConfirmed ? 'Play Date and Time Confirmed' : 'Confirm Play Date'}
                                    </button>
                                )}
                                {confirmedScorecardId === sc.id && (
                                    <span className="text-[10px] font-bold text-green-600 animate-in fade-in slide-in-from-left-2">
                                        Date and Time set
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {viewMode !== 'Member' && (
                        <>
                            {(sc.isNew || sc.isEditing) && (
                                <button 
                                    onClick={() => handleFinishEdit(sc.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-white bg-orange-600 hover:bg-orange-700 border border-orange-700 rounded-lg transition-all text-sm font-bold shadow-md animate-pulse hover:animate-none"
                                    title="Finish Editing"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Finished Edit</span>
                                </button>
                            )}
                            <button 
                                onClick={() => handleRemoveScorecard(sc.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors text-sm font-medium"
                                title="Remove Scorecard"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Remove</span>
                            </button>
                        </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 p-6 space-y-6">
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
                                    className={`w-full rounded-lg border p-2.5 focus:ring-2 focus:ring-green-600 focus:border-transparent shadow-sm disabled:bg-gray-100 disabled:text-gray-500 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-300'}`}
                                    placeholder="Club Champs"
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Competition Format</label>
                                <select 
                                    value={sc.selectedType}
                                    onChange={(e) => updateScorecard(sc.id, { selectedType: e.target.value as DisciplineType })}
                                    disabled={viewMode === 'Member'}
                                    className={`w-full rounded-lg border p-2.5 focus:ring-2 focus:ring-green-600 focus:border-transparent shadow-sm disabled:bg-gray-100 disabled:text-gray-500 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-300'}`}
                                >
                                    {(['Singles', 'Pairs', 'Triples', 'Fours'] as DisciplineType[]).map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className={`block text-xs font-bold uppercase tracking-wider ${isOverdue && !isActiveEdit ? 'text-red-600' : 'text-gray-500'}`}>Play By Date</label>
                                <div className="relative">
                                    <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isOverdue && !isActiveEdit ? 'text-red-400' : 'text-gray-400'}`} />
                                    <input 
                                        type="date" 
                                        value={sc.playByDate}
                                        onChange={(e) => updateScorecard(sc.id, { playByDate: e.target.value })}
                                        disabled={viewMode === 'Member'}
                                        className={`w-full rounded-lg border p-2.5 pl-10 focus:ring-2 focus:ring-green-600 focus:border-transparent shadow-sm disabled:bg-gray-100 disabled:text-gray-500 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-50 border-orange-200' : isOverdue ? 'border-red-300 bg-red-50 text-red-900' : 'border-gray-300'}`}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Location</label>
                                <select 
                                    value={sc.isHome ? 'Home' : 'Away'}
                                    onChange={(e) => updateScorecard(sc.id, { isHome: e.target.value === 'Home' })}
                                    disabled={viewMode === 'Member'}
                                    className={`w-full rounded-lg border p-2.5 focus:ring-2 focus:ring-green-600 focus:border-transparent shadow-sm disabled:bg-gray-100 disabled:text-gray-500 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-300'}`}
                                >
                                    <option value="Home">Home</option>
                                    <option value="Away">Away</option>
                                </select>
                            </div>
                        </div>

                        {/* VS Section */}
                        <div className={`flex flex-col md:flex-row gap-0 items-stretch border rounded-xl overflow-hidden shadow-sm transition-colors duration-300 ${isActiveEdit ? 'border-orange-200' : 'border-gray-200'}`}>
                            {/* Team A */}
                            <div className={`flex-1 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-100/30' : 'bg-blue-50/30'}`}>
                                <div className={`p-2 text-center font-bold text-xs tracking-wider border-b flex justify-center items-center gap-2 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-200/50 text-orange-800 border-orange-100' : 'bg-blue-100/50 text-blue-800 border-blue-100'}`}>
                                    <span>TEAM A</span>
                                    <input
                                        type="text"
                                        value={sc.teamA.pointsFor}
                                        onChange={(e) => updateScorecard(sc.id, { teamA: { ...sc.teamA, pointsFor: e.target.value } })}
                                        disabled={viewMode === 'Member'}
                                        className={`w-16 text-center font-bold text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-50 border-orange-200' : 'bg-white border-blue-200'}`}
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
                                        matchDate={sc.agreedPlayDate || sc.playByDate}
                                        matchTime={sc.startTime}
                                        isEditing={isActiveEdit}
                                    />
                                </div>
                            </div>

                            {/* VS Divider */}
                            <div className={`flex items-center justify-center border-y md:border-y-0 md:border-x p-2 md:w-12 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-100 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                                <span className={`font-black text-xl transition-colors duration-300 ${isActiveEdit ? 'text-orange-300' : 'text-gray-300'}`}>VS</span>
                            </div>

                            {/* Team B */}
                            <div className={`flex-1 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-100/30' : 'bg-red-50/30'}`}>
                                <div className={`p-2 text-center font-bold text-xs tracking-wider border-b flex justify-center items-center gap-2 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-200/50 text-orange-800 border-orange-100' : 'bg-red-100/50 text-red-800 border-red-100'}`}>
                                    <span>TEAM B</span>
                                    <input
                                        type="text"
                                        value={sc.teamB.pointsFor}
                                        onChange={(e) => updateScorecard(sc.id, { teamB: { ...sc.teamB, pointsFor: e.target.value } })}
                                        disabled={viewMode === 'Member'}
                                        className={`w-16 text-center font-bold text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-gray-100 transition-colors duration-300 ${isActiveEdit ? 'bg-orange-50 border-orange-200' : 'bg-white border-red-200'}`}
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
                                        matchDate={sc.agreedPlayDate || sc.playByDate}
                                        matchTime={sc.startTime}
                                        isEditing={isActiveEdit}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Action Footer */}
                        {viewMode === 'Admin' && (
                        <div className="flex justify-end items-center gap-4 pt-2">
                            {validationError && validationError.id === sc.id && (
                                <span className="text-xs font-bold text-red-600 animate-in fade-in slide-in-from-right-2">
                                    {validationError.message}
                                </span>
                            )}
                            <button
                                onClick={() => handleCommitScorecard(sc)}
                                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-bold shadow-md hover:bg-green-700 transition-all transform hover:scale-105"
                            >
                                <Save className="w-4 h-4" />
                                Enter Results to Database
                            </button>
                        </div>
                        )}
                    </div>

                    {/* Comment Panel */}
                    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-200">
                        <ScorecardComments 
                            scorecard={sc} 
                            currentUser={currentUser} 
                            players={players} 
                            onUpdateScorecard={(updates) => updateScorecard(sc.id, updates)}
                        />
                    </div>
                </div>
            </div>
        )})}
    </div>
  );
});

export default ClubChamps;
