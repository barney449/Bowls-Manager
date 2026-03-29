import React, { useState } from 'react';
import { Match, Player, DisciplineType, Availability, DisciplineInstance } from '../types';
import { Edit2, Trash2, Save, X, Check, Upload, Download, RefreshCw } from 'lucide-react';

interface DatabaseViewProps {
  matches: Match[];
  players: Player[];
  onUpdateMatch?: (match: Match) => void;
  onDeleteMatch?: (matchId: string) => void;
  onImportMatches?: (matches: Match[]) => void;
  onAddPlayer?: (player: Player) => void;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ 
  matches, 
  players, 
  onUpdateMatch, 
  onDeleteMatch, 
  onImportMatches, 
  onAddPlayer
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [editValues, setEditValues] = useState<{
      date: string;
      competition: string;
      opponent: string;
      venue: string;
      isHome: boolean;
      type: DisciplineType;
      assignments: { positionName: string; playerId: string | null; availability: Availability }[];
      pointsFor: string;
      pointsAgainst: string;
  }>({
      date: '',
      competition: '',
      opponent: '',
      venue: '',
      isHome: true,
      type: 'Singles',
      assignments: [],
      pointsFor: '',
      pointsAgainst: ''
  });

  const getPlayerName = (id: string | null) => {
    if (!id) return '';
    return players.find(p => p.id === id)?.name || 'Unknown';
  };

  // Flatten matches into individual team games
  const flattenedGames = matches.flatMap(match => {
      return match.disciplines.map(discipline => ({
          matchId: match.id,
          date: match.date,
          competition: match.competition,
          opponent: match.opponent,
          venue: match.venue,
          isHome: match.isHome,
          discipline
      }));
  }).sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      // Handle invalid dates by pushing them to the bottom
      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return dateB - dateA;
  });

  const getTypeBadgeColor = (type: DisciplineType) => {
    switch(type) {
        case 'Singles': return 'bg-purple-100 text-purple-800';
        case 'Pairs': return 'bg-blue-100 text-blue-800';
        case 'Triples': return 'bg-orange-100 text-orange-800';
        case 'Fours': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPositionsForType = (type: DisciplineType): string[] => {
    switch (type) {
        case 'Singles': return ['Skip'];
        case 'Pairs': return ['Lead', 'Skip'];
        case 'Triples': return ['Lead', '2nd', 'Skip'];
        case 'Fours': return ['Lead', '2nd', '3rd', 'Skip'];
        default: return [];
    }
  };

  const handleTypeChange = (newType: DisciplineType) => {
      setEditValues(prev => {
          const newPositions = getPositionsForType(newType);
          const currentPlayers = prev.assignments.map(a => a.playerId).filter(p => p !== null);
          
          const newAssignments = newPositions.map((pos, index) => ({
              positionName: pos,
              playerId: currentPlayers[index] || null,
              availability: 'Yes' as Availability
          }));

          return {
              ...prev,
              type: newType,
              assignments: newAssignments
          };
      });
  };

  const startEditing = (game: { matchId: string, date: string, competition: string, opponent: string, venue: string, isHome: boolean, discipline: any }) => {
      setEditingId(`${game.matchId}-${game.discipline.id}`);
      setEditValues({
          date: game.date,
          competition: game.competition,
          opponent: game.opponent,
          venue: game.venue || '', // Ensure it's not undefined
          isHome: game.isHome,
          type: game.discipline.type,
          assignments: game.discipline.assignments.map((a: any) => ({ 
              positionName: a.positionName, 
              playerId: a.playerId,
              availability: a.availability || 'Yes'
          })),
          pointsFor: game.discipline.pointsFor,
          pointsAgainst: game.discipline.pointsAgainst
      });
  };

  const cancelEditing = () => {
      setEditingId(null);
  };

  const saveEditing = (matchId: string, disciplineId: string) => {
      if (onUpdateMatch) {
          const matchToUpdate = matches.find(m => m.id === matchId);
          if (matchToUpdate) {
              const updatedMatch = {
                  ...matchToUpdate,
                  date: editValues.date,
                  competition: editValues.competition,
                  opponent: editValues.opponent,
                  venue: editValues.venue,
                  isHome: editValues.isHome,
                  disciplines: matchToUpdate.disciplines.map(d => {
                      if (d.id === disciplineId) {
                          return {
                              ...d,
                              type: editValues.type,
                              assignments: editValues.assignments,
                              pointsFor: editValues.pointsFor,
                              pointsAgainst: editValues.pointsAgainst
                          };
                      }
                      return d;
                  })
              };
              onUpdateMatch(updatedMatch);
          }
      }
      setEditingId(null);
  };

  const handleDelete = (matchId: string, disciplineId: string) => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      const remainingDisciplines = match.disciplines.filter(d => d.id !== disciplineId);

      if (remainingDisciplines.length === 0) {
          if (onDeleteMatch) onDeleteMatch(matchId);
          // Clear from selection if it was selected
          const newSelection = new Set(selectedMatchIds);
          newSelection.delete(matchId);
          setSelectedMatchIds(newSelection);
      } else {
          if (onUpdateMatch) {
              onUpdateMatch({
                  ...match,
                  disciplines: remainingDisciplines
              });
          }
      }
      
      // If we were editing this item, stop editing
      if (editingId === `${matchId}-${disciplineId}`) {
          setEditingId(null);
      }
  };

  const handleAssignmentChange = (index: number, playerId: string) => {
      const newAssignments = [...editValues.assignments];
      newAssignments[index] = { ...newAssignments[index], playerId: playerId === '' ? null : playerId };
      setEditValues({ ...editValues, assignments: newAssignments });
  };

  const toggleSelection = (matchId: string) => {
      const newSelection = new Set(selectedMatchIds);
      if (newSelection.has(matchId)) {
          newSelection.delete(matchId);
      } else {
          newSelection.add(matchId);
      }
      setSelectedMatchIds(newSelection);
  };

  const toggleSelectAll = () => {
      if (selectedMatchIds.size === matches.length) {
          setSelectedMatchIds(new Set());
      } else {
          setSelectedMatchIds(new Set(matches.map(m => m.id)));
      }
  };

  const handleBulkDelete = () => {
      if (selectedMatchIds.size === 0) return;
      setIsDeleting(true);
  };

  const confirmBulkDelete = () => {
      selectedMatchIds.forEach(id => {
          if (onDeleteMatch) onDeleteMatch(id);
      });
      setSelectedMatchIds(new Set());
      setIsDeleting(false);
  };

  const handleImport = () => {
      if (!importText.trim()) return;

      const lines = importText.split('\n').filter(line => line.trim() !== '');
      const newMatches: Match[] = [];
      const newPlayersToAdd: Player[] = [];
      const addedPlayerNamesInBatch = new Set<string>();

      lines.forEach(line => {
          const parts = line.split('\t').map(s => s.trim()).filter(s => s !== '');
          // Need at least Date (1) + Venue/Opp/Loc/Comp (3) = 4 parts.
          if (parts.length < 4) return;

          // 1. Parse Date
          let dateStr = parts[0];
          dateStr = dateStr.replace(/:$/, '').trim();
          let parsedDate = new Date(dateStr);
          if (isNaN(parsedDate.getTime())) {
              const dateParts = dateStr.split('-');
              if (dateParts.length === 3) {
                  parsedDate = new Date(`${dateParts[1]} ${dateParts[0]} ${dateParts[2]}`);
              }
          }

          if (isNaN(parsedDate.getTime())) {
              console.warn(`Skipping row with invalid date: ${dateStr}`);
              return;
          }
          const formattedDate = parsedDate.toISOString().split('T')[0];

          // 2. Parse Metadata (Last 3 columns)
          // Format: Date | ...Players/Scores... | Venue/Opponent | Home/Away | Competition
          
          const competition = parts[parts.length - 1];
          const homeAwayStr = parts[parts.length - 2];
          const isHome = homeAwayStr.toLowerCase() === 'home';
          
          let venue = isHome ? 'Home' : 'Away';
          let opponent = 'Unknown';
          let middleEndIndex = parts.length - 3;

          const col3 = parts[parts.length - 3]; // Potential Combined or Opponent
          const col4 = parts[parts.length - 4]; // Potential Venue (if Separate)

          // Check for "Combined" format first (contains " vs ")
          if (col3.toLowerCase().includes(' vs ')) {
              const splitParts = col3.split(/ vs /i);
              let rawVenue = splitParts[0].trim();
              opponent = splitParts[1].trim();
              
              if (rawVenue.toLowerCase().startsWith('at ')) {
                  venue = rawVenue.substring(3).trim();
              } else {
                  venue = rawVenue;
              }
              middleEndIndex = parts.length - 3;
          } 
          // Check for "Separate" format (Col4 is Venue, Col3 is Opponent)
          // We check if Col4 is NOT a number (score) and NOT a W/L indicator
          else if (col4 && isNaN(parseInt(col4)) && !/^[wld]$/i.test(col4)) {
              venue = col4;
              // Clean "At " from Venue if present
              if (venue.toLowerCase().startsWith('at ')) {
                  venue = venue.substring(3).trim();
              }
              
              opponent = col3;
              // Clean "vs " from Opponent if present
              if (opponent.toLowerCase().startsWith('vs ')) {
                  opponent = opponent.substring(3).trim();
              }
              
              middleEndIndex = parts.length - 4;
          } 
          // Fallback: Col3 is just Opponent, Venue is Home/Away
          else {
              opponent = col3;
              if (opponent.toLowerCase().startsWith('at ')) {
                  // Edge case: "At Venue" in Opponent slot
                  venue = opponent.substring(3).trim();
                  opponent = 'Unknown';
              }
              middleEndIndex = parts.length - 3;
          }

          // 3. Parse Players and Scores (Middle columns)
          const middle = parts.slice(1, middleEndIndex);
          
          let currentPlayers: string[] = [];
          const disciplines: DisciplineInstance[] = [];
          
          for (let i = 0; i < middle.length; i++) {
              const part = middle[i];
              // Check if it's a score (number)
              // We look ahead to see if the NEXT part is also a number
              if (!isNaN(parseInt(part)) && i + 1 < middle.length && !isNaN(parseInt(middle[i+1]))) {
                  const scoreFor = part;
                  const scoreAgainst = middle[i+1];
                  i++; // Skip scoreAgainst
                  
                  // Determine type based on player count
                  let type: DisciplineType = 'Singles';
                  if (currentPlayers.length === 2) type = 'Pairs';
                  if (currentPlayers.length === 3) type = 'Triples';
                  if (currentPlayers.length === 4) type = 'Fours';
                  
                  const positions = getPositionsForType(type);
                  
                  disciplines.push({
                      id: `imp-${Date.now()}-${Math.random()}`,
                      type,
                      assignments: positions.map((posName, idx) => {
                          const playerName = currentPlayers[idx];
                          const normalizedName = (playerName || '').trim();
                          const lowerName = normalizedName.toLowerCase();
                          
                          let player = players.find(p => p.name.toLowerCase() === lowerName);
                          
                          // Check if we already added this player in this batch
                          if (!player && addedPlayerNamesInBatch.has(lowerName)) {
                              player = newPlayersToAdd.find(p => p.name.toLowerCase() === lowerName);
                          }

                          // If still not found, create new player
                          if (!player && normalizedName && onAddPlayer) {
                              const newPlayer: Player = {
                                  id: `imp-pl-${Date.now()}-${Math.random()}-${idx}`,
                                  name: normalizedName,
                                  email: '',
                                  role: 'Active Member',
                                  status: 'Active',
                                  avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedName)}&background=random`,
                                  isApproved: true
                              };
                              newPlayersToAdd.push(newPlayer);
                              addedPlayerNamesInBatch.add(lowerName);
                              player = newPlayer;
                          }

                          return {
                              positionName: posName,
                              playerId: player ? player.id : null,
                              availability: 'Yes' as Availability
                          };
                      }),
                      pointsFor: scoreFor,
                      pointsAgainst: scoreAgainst
                  });
                  
                  currentPlayers = [];
              } else {
                  currentPlayers.push(part);
              }
          }
          
          if (disciplines.length > 0) {
              // Create a separate match for EACH discipline found
              disciplines.forEach((disc, index) => {
                  newMatches.push({
                      id: `imp-match-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                      date: formattedDate,
                      time: '',
                      venue,
                      isHome,
                      competition,
                      opponent: opponent,
                      disciplines: [disc]
                  });
              });
          }
      });

      // Add new players
      if (onAddPlayer && newPlayersToAdd.length > 0) {
          newPlayersToAdd.forEach(p => onAddPlayer(p));
      }

      if (onImportMatches && newMatches.length > 0) {
          onImportMatches(newMatches);
          setImportStatus({ 
              message: `Successfully imported ${newMatches.length} matches and created ${newPlayersToAdd.length} new players.`, 
              type: 'success' 
          });
          setTimeout(() => {
              setShowImport(false);
              setImportText('');
              setImportStatus(null);
          }, 3000);
      } else {
          setImportStatus({ 
              message: 'Failed to parse matches. Please check the format.', 
              type: 'error' 
          });
      }
  };

  return (
    <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800">Results Ledger</h2>
            <div className="flex items-center gap-4">
                <div className="text-sm text-gray-500">
                    Total Games Recorded: <span className="font-bold text-gray-900">{flattenedGames.length}</span>
                </div>
                {selectedMatchIds.size > 0 && onDeleteMatch && (
                    <div className="flex items-center gap-2">
                        {isDeleting ? (
                            <div className="flex items-center gap-2 bg-red-50 p-1 rounded-md border border-red-200 animate-in fade-in zoom-in-95">
                                <span className="text-xs font-bold text-red-700 px-2">Confirm Delete?</span>
                                <button 
                                    onClick={confirmBulkDelete}
                                    className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700 transition-colors"
                                >
                                    Yes, Delete
                                </button>
                                <button 
                                    onClick={() => setIsDeleting(false)}
                                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-bold hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700 transition-colors bg-red-50 px-3 py-1 rounded-md"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Selected ({selectedMatchIds.size})
                            </button>
                        )}
                    </div>
                )}
                {onImportMatches && (
                    <button 
                        onClick={() => setShowImport(!showImport)}
                        className="flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-700 transition-colors"
                    >
                        <Upload className="w-4 h-4" /> Import Data
                    </button>
                )}
            </div>
        </div>

        {showImport && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Bulk Import Matches</h3>
                    <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-xs text-gray-500">
                    Paste tab-separated data here (e.g. from Excel). Format: Date | Players... | Score For | Score Against | ... | Venue | Home/Away | Competition
                </p>
                <textarea 
                    className="w-full h-40 p-3 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="Paste data here..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                />
                <div className="flex justify-between items-center">
                    {importStatus && (
                        <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${importStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} animate-in fade-in zoom-in-95`}>
                            {importStatus.message}
                        </div>
                    )}
                    <div className="flex gap-2 ml-auto">
                        <button 
                            onClick={() => setImportText('')}
                            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={handleImport}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-md"
                            disabled={!importText.trim()}
                        >
                            Process Import
                        </button>
                    </div>
                </div>
            </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
                <tr>
                <th scope="col" className="px-4 py-3 text-center w-10">
                    <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                        checked={selectedMatchIds.size > 0 && selectedMatchIds.size === matches.length}
                        onChange={toggleSelectAll}
                    />
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-32">Date</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-40">Comp</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-40">Opponent</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-40">Venue</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-24">Location</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider w-24">Type</th>
                <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Team Lineup</th>
                <th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-20 bg-green-50 text-green-800">For</th>
                <th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-20 bg-red-50 text-red-800">Ag</th>
                <th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-16">Diff</th>
                <th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-16">W/L</th>
                <th scope="col" className="px-4 py-3 text-center font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {flattenedGames.map((game, idx) => {
                    const pf = parseInt(game.discipline.pointsFor) || 0;
                    const pa = parseInt(game.discipline.pointsAgainst) || 0;
                    const diff = pf - pa;
                    const uniqueId = `${game.matchId}-${game.discipline.id}`;
                    const isEditing = editingId === uniqueId;

                    return (
                    <tr key={uniqueId} className={`hover:bg-gray-50 transition-colors group ${selectedMatchIds.has(game.matchId) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3 text-center">
                            <input 
                                type="checkbox" 
                                className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                                checked={selectedMatchIds.has(game.matchId)}
                                onChange={() => toggleSelection(game.matchId)}
                            />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">
                            {isEditing ? (
                                <input 
                                    type="date" 
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-green-600 outline-none"
                                    value={editValues.date}
                                    onChange={(e) => setEditValues({...editValues, date: e.target.value})}
                                />
                            ) : (
                                new Date(game.date).toLocaleDateString()
                            )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 truncate max-w-[150px]" title={game.competition}>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-green-600 outline-none"
                                    value={editValues.competition}
                                    onChange={(e) => setEditValues({...editValues, competition: e.target.value})}
                                />
                            ) : (
                                game.competition
                            )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 truncate max-w-[150px]" title={game.opponent}>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-green-600 outline-none"
                                    value={editValues.opponent}
                                    onChange={(e) => setEditValues({...editValues, opponent: e.target.value})}
                                />
                            ) : (
                                game.opponent
                            )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500 truncate max-w-[150px]" title={game.venue}>
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-green-600 outline-none"
                                    value={editValues.venue}
                                    onChange={(e) => setEditValues({...editValues, venue: e.target.value})}
                                />
                            ) : (
                                game.venue
                            )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {isEditing ? (
                                <select
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-green-600 outline-none"
                                    value={editValues.isHome ? 'Home' : 'Away'}
                                    onChange={(e) => setEditValues({...editValues, isHome: e.target.value === 'Home'})}
                                >
                                    <option value="Home">Home</option>
                                    <option value="Away">Away</option>
                                </select>
                            ) : (
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${game.isHome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {game.isHome ? 'Home' : 'Away'}
                                </span>
                            )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                                <select
                                    className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-1 focus:ring-green-600 outline-none"
                                    value={editValues.type}
                                    onChange={(e) => handleTypeChange(e.target.value as DisciplineType)}
                                >
                                    <option value="Singles">Singles</option>
                                    <option value="Pairs">Pairs</option>
                                    <option value="Triples">Triples</option>
                                    <option value="Fours">Fours</option>
                                </select>
                            ) : (
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeBadgeColor(game.discipline.type)}`}>
                                    {game.discipline.type}
                                </span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                                {isEditing ? (
                                    editValues.assignments.map((assignment, i) => (
                                        <div key={i} className="flex items-center text-xs bg-gray-100 rounded px-1 py-1 border border-gray-200 mb-1">
                                            <span className="text-gray-400 font-bold mr-1 uppercase text-[10px]">{assignment.positionName.charAt(0)}:</span>
                                            <select
                                                className="bg-transparent border-none text-gray-800 font-medium text-xs focus:ring-0 p-0 w-24"
                                                value={assignment.playerId || ''}
                                                onChange={(e) => handleAssignmentChange(i, e.target.value)}
                                            >
                                                <option value="">TBD</option>
                                                {players.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))
                                ) : (
                                    game.discipline.assignments.map((assignment, i) => (
                                        <div key={i} className="flex items-center text-xs bg-gray-100 rounded px-2 py-1 border border-gray-200">
                                            <span className="text-gray-400 font-bold mr-1 uppercase">{assignment.positionName.charAt(0)}:</span>
                                            <span className="font-medium text-gray-800">{getPlayerName(assignment.playerId)}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </td>
                        
                        {/* Editable Score Cells */}
                        <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-green-700 bg-green-50/30">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    className="w-12 text-center border border-green-300 rounded focus:ring-1 focus:ring-green-500 outline-none text-sm py-1"
                                    value={editValues.pointsFor}
                                    onChange={(e) => setEditValues({...editValues, pointsFor: e.target.value})}
                                />
                            ) : (
                                game.discipline.pointsFor
                            )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center font-bold text-red-700 bg-red-50/30">
                            {isEditing ? (
                                <input 
                                    type="text" 
                                    className="w-12 text-center border border-red-300 rounded focus:ring-1 focus:ring-red-500 outline-none text-sm py-1"
                                    value={editValues.pointsAgainst}
                                    onChange={(e) => setEditValues({...editValues, pointsAgainst: e.target.value})}
                                />
                            ) : (
                                game.discipline.pointsAgainst
                            )}
                        </td>
                        
                        <td className={`px-4 py-3 whitespace-nowrap text-center font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {isEditing ? '-' : (diff > 0 ? `+${diff}` : diff)}
                        </td>
                        <td className={`px-4 py-3 whitespace-nowrap text-center font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {isEditing ? '-' : (diff > 0 ? 'W' : diff < 0 ? 'L' : 'D')}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isEditing ? (
                                    <>
                                        <button onClick={() => saveEditing(game.matchId, game.discipline.id)} className="text-green-600 hover:bg-green-100 p-1 rounded" title="Save">
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={cancelEditing} className="text-gray-500 hover:bg-gray-100 p-1 rounded" title="Cancel">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => startEditing(game)}
                                            className="text-blue-600 hover:bg-blue-100 p-1 rounded" 
                                            title="Edit Record"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(game.matchId, game.discipline.id)}
                                            className="text-red-600 hover:bg-red-100 p-1 rounded" 
                                            title="Delete Result Line"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                    );
                })}
                {flattenedGames.length === 0 && (
                    <tr>
                        <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                            No games found. Enter results in the Team Sheet to see them here.
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
        </div>
    </div>
  );
};

export default DatabaseView;
