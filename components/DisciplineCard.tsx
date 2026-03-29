import React from 'react';
import { DisciplineInstance, Player, Availability, ViewMode } from '../types';
import Avatar from './Avatar';
import { CheckCircle2, XCircle, Car, AlertCircle, Trash2 } from 'lucide-react';

interface DisciplineCardProps {
  data: DisciplineInstance;
  players: Player[];
  viewMode: ViewMode;
  onUpdate: (updatedData: DisciplineInstance) => void;
  onRemove: () => void;
  hideHeader?: boolean;
  compact?: boolean;
  hideScoreInput?: boolean;
  hideAvailability?: boolean;
  matchDate?: string;
  matchTime?: string;
  isReadOnly?: boolean;
  isEditing?: boolean;
}

const DisciplineCard: React.FC<DisciplineCardProps> = ({ 
  data, 
  players, 
  viewMode, 
  onUpdate, 
  onRemove,
  hideHeader = false,
  compact = false,
  hideScoreInput = false,
  hideAvailability = false,
  matchDate,
  matchTime,
  isReadOnly = false,
  isEditing = false
}) => {
  
  const checkPlayerAvailability = (playerId: string | null): string | null => {
      if (!playerId || !matchDate) return null;
      
      const player = players.find(p => p.id === playerId);
      if (!player || !player.unavailablePeriods) return null;

      const mDate = new Date(matchDate);
      mDate.setHours(0, 0, 0, 0);

      const isMorning = () => {
          if (!matchTime) return true;
          const hour = parseInt(matchTime.split(':')[0], 10);
          return hour < 12;
      };
      const matchPeriod = isMorning() ? 'Morning' : 'Afternoon';

      for (const period of player.unavailablePeriods) {
          const start = new Date(period.startDate);
          start.setHours(0, 0, 0, 0);
          
          const end = new Date(period.endDate);
          end.setHours(0, 0, 0, 0);

          if (mDate >= start && mDate <= end) {
              if (period.type === 'All Day' || period.type === matchPeriod) {
                  return `Unavailable: ${period.type} (${start.toLocaleDateString()} - ${end.toLocaleDateString()})`;
              }
          }
      }
      return null;
  };

  const handlePlayerChange = (index: number, playerId: string) => {
    if (playerId) {
        const selectedPlayer = players.find(p => p.id === playerId);
        if (selectedPlayer?.status === 'Inactive') {
            alert('This Player is unavailable for Selection');
        }
    }
    const newAssignments = [...data.assignments];
    // Update player AND reset availability to 'Unset' (Select)
    newAssignments[index] = { 
        ...newAssignments[index], 
        playerId: playerId === '' ? null : playerId,
        availability: 'Unset' 
    };
    onUpdate({ ...data, assignments: newAssignments });
  };

  const handleAvailabilityChange = (index: number, availability: Availability) => {
    const newAssignments = [...data.assignments];
    newAssignments[index] = { ...newAssignments[index], availability };
    onUpdate({ ...data, assignments: newAssignments });
  };

  const handleScoreChange = (field: 'pointsFor' | 'pointsAgainst', value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const getAvailabilityColor = (status: Availability) => {
    switch (status) {
      case 'Yes': return 'text-green-600 bg-green-50 border-green-200';
      case 'No': return 'text-red-600 bg-red-50 border-red-200';
      case 'Ongoing': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getAvailabilityIcon = (status: Availability) => {
    switch (status) {
      case 'Yes': return <CheckCircle2 className="w-4 h-4 mr-1" />;
      case 'No': return <XCircle className="w-4 h-4 mr-1" />;
      case 'Ongoing': return <Car className="w-4 h-4 mr-1" />;
      default: return <AlertCircle className="w-4 h-4 mr-1" />;
    }
  };

  const getNameStyles = (status: Availability) => {
    const base = "w-full text-sm font-bold rounded-md px-2 py-1.5 border transition-colors focus:ring-0 outline-none";
    switch (status) {
      case 'Yes': return `${base} bg-green-100 text-green-900 border-green-200`;
      case 'No': return `${base} bg-red-100 text-red-900 border-red-200 opacity-75`;
      case 'Ongoing': return `${base} bg-blue-100 text-blue-900 border-blue-200`;
      default: return `${base} bg-gray-50 text-gray-800 border-transparent`;
    }
  };

  // Color coding for headers
  const getTypeStyles = () => {
    switch(data.type) {
      case 'Singles': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Pairs': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Triples': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Fours': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Logic for the whole card background in Admin view
  const getCardBackgroundStyles = () => {
    if (isEditing) return 'bg-transparent border-orange-200/50';
    if (viewMode === 'Member') return 'bg-white border-gray-200';

    const assignments = data.assignments;
    const hasUnavailable = assignments.some(a => a.availability === 'No');
    const hasUnset = assignments.some(a => a.availability === 'Unset');
    
    // Priority 1: If any player is unavailable -> Red
    if (hasUnavailable) return 'bg-red-50 border-red-200';
    
    // Priority 2: If any player hasn't set availability (Unset) -> Yellow
    if (hasUnset) return 'bg-yellow-50 border-yellow-200';
    
    // Priority 3: If everyone is set (Yes or Ongoing) -> Green
    return 'bg-green-50 border-green-200';
  };

  const cardBackgroundClass = getCardBackgroundStyles();

  return (
    <div className={`${cardBackgroundClass} rounded-xl shadow-sm border h-full flex flex-col hover:shadow-md transition-shadow relative`}>
      {/* Header */}
      {!hideHeader && (
      <div className={`px-4 py-3 border-b flex justify-between items-center rounded-t-xl ${getTypeStyles()}`}>
        <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
           {data.type}
        </h3>
        <div className="flex items-center gap-3">
            {viewMode === 'Admin' && !isReadOnly && !hideScoreInput && (
            <div className="flex gap-1 items-center bg-white/50 p-1 rounded">
                <input
                    type="text"
                    value={data.pointsFor}
                    onChange={(e) => handleScoreChange('pointsFor', e.target.value)}
                    className="w-16 text-center font-bold text-sm bg-white border border-gray-300 rounded focus:ring-1 focus:ring-green-600 outline-none"
                    placeholder="For"
                />
                <span className="text-xs font-bold">:</span>
                <input
                    type="text"
                    value={data.pointsAgainst}
                    onChange={(e) => handleScoreChange('pointsAgainst', e.target.value)}
                    className="w-16 text-center font-bold text-sm bg-white border border-gray-300 rounded focus:ring-1 focus:ring-red-400 outline-none"
                    placeholder="Ag"
                />
            </div>
            )}
            {viewMode !== 'Member' && !isReadOnly && (
                <button 
                    onClick={onRemove}
                    className="text-gray-500 hover:text-red-600 transition-colors p-1 opacity-50 hover:opacity-100"
                    title="Remove Side"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>
      )}

      {/* Players Grid */}
      <div className={`p-3 flex-1 flex flex-col gap-3 ${compact ? 'gap-1 p-1' : ''}`}>
        {data.assignments.map((assignment, idx) => {
          const selectedPlayer = players.find(p => p.id === assignment.playerId);
          const nameClasses = getNameStyles(assignment.availability);
          const isPlayerInactive = selectedPlayer?.status === 'Inactive';
          const unavailabilityWarning = assignment.playerId ? checkPlayerAvailability(assignment.playerId) : null;

          return (
            <div key={idx} className={`flex items-start gap-3 p-2 rounded-lg border transition-colors duration-300 ${isPlayerInactive ? 'bg-red-50 border-red-200 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#fee2e2_5px,#fee2e2_10px)]' : isEditing ? 'bg-orange-50/50 border-orange-100' : 'bg-white border-gray-100'} ${compact ? 'py-1 px-2 border-0 bg-transparent' : ''}`}>
               {!compact && (
               <div className="mt-1">
                 <Avatar src={selectedPlayer?.avatarUrl} alt={selectedPlayer?.name || 'Unassigned'} size="sm" />
               </div>
               )}
               
               <div className="flex-1 min-w-0">
                  <div className="text-[10px] uppercase font-bold text-gray-400 leading-none mb-1 ml-1">
                      {assignment.positionName}
                  </div>
                  
                  <div className="mb-1 flex items-center gap-2">
                    {/* Points Input for Compact Mode (Club Champs) */}
                    {compact && viewMode === 'Admin' && !hideScoreInput && (
                        <div className="w-12">
                             {/* Only show points input for the Skip (last player) or if it's Singles */}
                             {/* Actually, Club Champs usually has one score for the team. 
                                 We'll put it on the first player or separate. 
                                 User asked for "points tab above the Players name".
                                 Let's put it on the top of the card in ClubChamps.tsx instead?
                                 No, user said "on that scorecard have a CTA button... only have for points tab above the Players name"
                                 Let's add points input here if compact mode.
                             */}
                             {idx === 0 && (
                                 <input
                                    type="text"
                                    value={data.pointsFor}
                                    onChange={(e) => handleScoreChange('pointsFor', e.target.value)}
                                    className="w-full text-center font-bold text-xs bg-white border border-gray-300 rounded focus:ring-1 focus:ring-green-600 outline-none mb-1"
                                    placeholder="Score"
                                 />
                             )}
                        </div>
                    )}

                    <div className="flex-1">
                    {viewMode !== 'Member' && !isReadOnly ? (
                        <select
                        className={`${nameClasses} cursor-pointer w-full`}
                        value={assignment.playerId || ''}
                        onChange={(e) => handlePlayerChange(idx, e.target.value)}
                        >
                        <option value="">Select Player...</option>
                        {players.map(p => {
                            const isUnavailable = !!checkPlayerAvailability(p.id);
                            return (
                                <option key={p.id} value={p.id} disabled={isUnavailable}>
                                    {p.name} {isUnavailable ? '(Unavailable)' : ''}
                                </option>
                            );
                        })}
                        </select>
                    ) : (
                        <div className={`${nameClasses} flex items-center`}>
                            {selectedPlayer ? selectedPlayer.name : <span className="opacity-50 italic font-normal">TBD</span>}
                        </div>
                    )}
                    </div>
                  </div>

                  {/* Removed availability warning from here as requested - now handled by Bowls Manager in Chat */}

                  {/* Availability Dropdown (Members Only) - Moved below name */}
                  {viewMode === 'Member' && !hideAvailability && (
                    <select
                        value={assignment.availability}
                        onChange={(e) => handleAvailabilityChange(idx, e.target.value as Availability)}
                        className={`text-xs font-semibold py-1 px-2 rounded-md border border-gray-200 focus:ring-0 cursor-pointer w-full mt-1 ${
                            assignment.availability === 'Yes' ? 'text-green-700 bg-green-50 border-green-200' : 
                            assignment.availability === 'No' ? 'text-red-700 bg-red-50 border-red-200' :
                            assignment.availability === 'Ongoing' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-gray-500 bg-gray-50'
                        }`}
                      >
                        <option value="Unset">Select</option>
                        <option value="Yes">Available (Yes)</option>
                        <option value="No">Unavailable (No)</option>
                        <option value="Ongoing">Making own way there</option>
                      </select>
                  )}
               </div>

               {/* Availability Icon (Admin Only) - Keep on right */}
               {viewMode !== 'Member' && (
                   <div className="self-center">
                        <div title={assignment.availability === 'Ongoing' ? 'Making own way there' : assignment.availability} className={`w-6 h-6 flex items-center justify-center rounded-full ${getAvailabilityColor(assignment.availability).replace('border', '')}`}>
                           {getAvailabilityIcon(assignment.availability)}
                        </div>
                   </div>
               )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DisciplineCard;
