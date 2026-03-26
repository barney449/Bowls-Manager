import React, { useState } from 'react';
import { Match, Player, ViewMode, DisciplineType, PositionAssignment, DisciplineInstance } from '../types';
import DisciplineCard from './DisciplineCard';
import { Calendar, Clock, MapPin, Trophy, Shield, Users, ArrowRight, Sparkles, Send, Loader2, Trash2, Mail, Check } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface MatchEditorProps {
  match: Match;
  players: Player[];
  databaseMatches: Match[];
  viewMode: ViewMode;
  currentUser?: Player | null;
  onMatchUpdate: (match: Match) => void;
  onCommitResults: (match: Match) => void;
  onViewResults: () => void;
  isLatestMatch?: boolean;
  isRedMatch?: boolean;
}

const MatchEditor: React.FC<MatchEditorProps> = ({ match, players, databaseMatches, viewMode, currentUser, onMatchUpdate, onCommitResults, onViewResults, isLatestMatch = true, isRedMatch = false }) => {
  const [chatInput, setChatInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  
  const handleMetaChange = (field: keyof Match, value: any) => {
    onMatchUpdate({ ...match, [field]: value });
  };

  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailData, setEmailData] = useState<{
      recipients: string[];
      subject: string;
      body: string;
  } | null>(null);

  const handleSendEmail = () => {
      // 1. Collect all selected players
      const selectedEmails = new Set<string>();
      let playerCount = 0;

      match.disciplines.forEach(d => {
          d.assignments.forEach(a => {
              if (a.playerId) {
                  playerCount++;
                  const player = players.find(p => p.id === a.playerId);
                  if (player?.email) {
                      selectedEmails.add(player.email);
                  }
              }
          });
      });

      if (playerCount === 0) {
          alert('No players selected for this match.');
          return;
      }

      // 2. Construct Email Content
      const subject = `Match: ${match.competition} vs ${match.opponent} - ${new Date(match.date).toLocaleDateString()}`;
      
      let body = `Hi Team,\n\nHere are the details for the upcoming match:\n\n`;
      body += `Competition: ${match.competition}\n`;
      body += `Opponent: ${match.opponent}\n`;
      body += `Date: ${new Date(match.date).toLocaleDateString()}\n`;
      body += `Time: ${match.time}\n`;
      body += `Venue: ${match.venue} (${match.isHome ? 'Home' : 'Away'})\n\n`;
      body += `TEAMS:\n`;

      match.disciplines.forEach(d => {
          body += `\n${d.type.toUpperCase()}:\n`;
          d.assignments.forEach(a => {
              const playerName = players.find(p => p.id === a.playerId)?.name || 'TBD';
              body += `- ${a.positionName}: ${playerName}\n`;
          });
      });

      body += `\nPlease confirm your availability by logging into your BowlsManager App\n\nRegards\nBowlsManager`;

      setEmailData({
          recipients: Array.from(selectedEmails),
          subject,
          body
      });
      setShowEmailPreview(true);
  };

  const confirmSendEmail = () => {
      if (!emailData) return;

      // Construct Gmail Compose URL
      // We send 'To' the club email (so there is a valid primary recipient) and BCC all players
      const clubEmail = 'oxfordclubbowlsmanagement@gmail.com';
      const recipients = emailData.recipients.join(',');
      
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${clubEmail}&su=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}&bcc=${recipients}`;
      
      // Open Gmail in new tab
      window.open(gmailUrl, '_blank');

      // Update State
      const now = new Date().toISOString();
      onMatchUpdate({ ...match, lastEmailSent: now });
      setShowEmailPreview(false);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    setIsThinking(true);
    setChatResponse(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        // Prepare context from databaseMatches
        const context = JSON.stringify(databaseMatches.map(m => ({
            date: m.date,
            competition: m.competition,
            opponent: m.opponent,
            venue: m.venue,
            isHome: m.isHome,
            results: m.disciplines.map(d => ({
                type: d.type,
                players: d.assignments.map(a => ({
                    position: a.positionName,
                    name: players.find(p => p.id === a.playerId)?.name || 'Unknown'
                })),
                scoreFor: d.pointsFor,
                scoreAgainst: d.pointsAgainst
            }))
        })));

        const prompt = `
        You are an AI assistant for a Bowls club.
        Here is the database of past match results in JSON format:
        ${context}

        User Question: ${chatInput}

        Instructions:
        1. Answer the question using ONLY the information in the database provided above.
        2. If the answer cannot be found in the database, state that you don't have that information.
        3. Do not make up information.
        4. Provide a concise, professional, and helpful answer.
        5. Do not show intermediate calculation steps (e.g., "15 + 10 = 25") unless the user explicitly asks for the math. Just provide the final insights and totals.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        
        setChatResponse(response.text);
    } catch (error) {
        console.error("AI Error", error);
        setChatResponse("Sorry, I encountered an error processing your request.");
    } finally {
        setIsThinking(false);
    }
  };

  const updateDiscipline = (id: string, updatedInstance: DisciplineInstance) => {
    const updatedDisciplines = match.disciplines.map(d => d.id === id ? updatedInstance : d);
    onMatchUpdate({ ...match, disciplines: updatedDisciplines });
  };

  const removeDiscipline = (id: string) => {
    if (confirm('Are you sure you want to remove this team?')) {
        const disciplineToRemove = match.disciplines.find(d => d.id === id);
        const updatedDisciplines = match.disciplines.filter(d => d.id !== id);
        
        let updatedS1 = match.selector1Picks || [];
        let updatedS2 = match.selector2Picks || [];

        if (disciplineToRemove) {
            const type = disciplineToRemove.type;
            
            // Remove one of the same type from S1
            const s1OfType = updatedS1.filter(d => d.type === type);
            if (s1OfType.length > 0) {
                const idToRemove = s1OfType[s1OfType.length - 1].id;
                updatedS1 = updatedS1.filter(d => d.id !== idToRemove);
            }

            // Remove one of the same type from S2
            const s2OfType = updatedS2.filter(d => d.type === type);
            if (s2OfType.length > 0) {
                const idToRemove = s2OfType[s2OfType.length - 1].id;
                updatedS2 = updatedS2.filter(d => d.id !== idToRemove);
            }
        }

        onMatchUpdate({ 
            ...match, 
            disciplines: updatedDisciplines,
            selector1Picks: updatedS1,
            selector2Picks: updatedS2
        });
    }
  };

  const createEmptyDiscipline = (type: DisciplineType): DisciplineInstance => {
      let assignments: PositionAssignment[] = [];
      
      if (type === 'Singles') {
          assignments = [{ positionName: 'Marker/Player', playerId: null, availability: 'Unset' }];
      } else if (type === 'Pairs') {
          assignments = [
              { positionName: 'Lead', playerId: null, availability: 'Unset' },
              { positionName: 'Skip', playerId: null, availability: 'Unset' }
          ];
      } else if (type === 'Triples') {
          assignments = [
              { positionName: 'Lead', playerId: null, availability: 'Unset' },
              { positionName: '2nd', playerId: null, availability: 'Unset' },
              { positionName: 'Skip', playerId: null, availability: 'Unset' }
          ];
      } else if (type === 'Fours') {
          assignments = [
              { positionName: 'Lead', playerId: null, availability: 'Unset' },
              { positionName: '2nd', playerId: null, availability: 'Unset' },
              { positionName: '3rd', playerId: null, availability: 'Unset' },
              { positionName: 'Skip', playerId: null, availability: 'Unset' }
          ];
      }

      return {
          id: `disc-${Date.now()}-${Math.random()}`,
          type,
          assignments,
          pointsFor: '',
          pointsAgainst: ''
      };
  };

  const getDisciplineCount = (type: DisciplineType) => {
      return match.disciplines.filter(d => d.type === type).length;
  };

  const setDisciplineCount = (type: DisciplineType, count: number) => {
      const current = match.disciplines.filter(d => d.type === type);
      const difference = count - current.length;

      if (difference > 0) {
          // Add new instances
          const newInstances = Array.from({ length: difference }).map(() => createEmptyDiscipline(type));
          const newSelector1Instances = Array.from({ length: difference }).map(() => createEmptyDiscipline(type));
          const newSelector2Instances = Array.from({ length: difference }).map(() => createEmptyDiscipline(type));
          
          onMatchUpdate({
              ...match,
              disciplines: [...match.disciplines, ...newInstances],
              selector1Picks: [...(match.selector1Picks || []), ...newSelector1Instances],
              selector2Picks: [...(match.selector2Picks || []), ...newSelector2Instances],
          });
      } else if (difference < 0) {
          // Remove instances (from the end of the list for that type)
          const toRemove = current.slice(count);
          const toRemoveIds = new Set(toRemove.map(d => d.id));
          
          // We also need to remove the corresponding items from selector picks.
          // Since we don't have a direct ID mapping, we'll just remove from the end of that type's list.
          const currentS1 = (match.selector1Picks || []).filter(d => d.type === type);
          const toRemoveS1 = currentS1.slice(count);
          const toRemoveIdsS1 = new Set(toRemoveS1.map(d => d.id));

          const currentS2 = (match.selector2Picks || []).filter(d => d.type === type);
          const toRemoveS2 = currentS2.slice(count);
          const toRemoveIdsS2 = new Set(toRemoveS2.map(d => d.id));

          onMatchUpdate({
              ...match,
              disciplines: match.disciplines.filter(d => !toRemoveIds.has(d.id)),
              selector1Picks: (match.selector1Picks || []).filter(d => !toRemoveIdsS1.has(d.id)),
              selector2Picks: (match.selector2Picks || []).filter(d => !toRemoveIdsS2.has(d.id)),
          });
      }
  };

  const handleSaveToDatabase = () => {
      onCommitResults(match);
      onViewResults();
  };

  const isMorningMatch = () => {
      if (!match.time) return true;
      const hour = parseInt(match.time.split(':')[0], 10);
      return hour < 12;
  };

  const getPlayerStatus = (p: Player, period: 'Morning' | 'Afternoon') => {
      const isUnavailable = p.unavailablePeriods?.some(up => 
          up.startDate <= match.date && up.endDate >= match.date && (up.type === period || up.type === 'All Day')
      );
      
      const isMatchPeriod = (period === 'Morning' && isMorningMatch()) || (period === 'Afternoon' && !isMorningMatch());
      let isPicked = false;

      if (isMatchPeriod) {
          const isSelector1 = currentUser?.id === match.selector1Id;
          const isSelector2 = currentUser?.id === match.selector2Id;
          const inFinal = match.disciplines.some(d => d.assignments.some(a => a.playerId === p.id));

          if (isSelector1) {
              const inS1 = (match.selector1Picks || []).some(d => d.assignments.some(a => a.playerId === p.id));
              isPicked = inS1 || inFinal;
          } else if (isSelector2) {
              const inS2 = (match.selector2Picks || []).some(d => d.assignments.some(a => a.playerId === p.id));
              isPicked = inS2 || inFinal;
          }
      }

      return {
          player: p,
          isUnavailable,
          isPicked
      };
  };

  const morningPlayers = players.filter(p => p.status !== 'Inactive').map(p => getPlayerStatus(p, 'Morning'));
  const afternoonPlayers = players.filter(p => p.status !== 'Inactive').map(p => getPlayerStatus(p, 'Afternoon'));

  const showDraftTools = viewMode !== 'Member' && (!match.isConfirmed || isRedMatch);

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      
      {/* Dashboard Header / Match Logistics */}
      <div className={`grid grid-cols-1 ${showDraftTools ? 'lg:grid-cols-5' : 'lg:grid-cols-2'} gap-6`}>
          {/* Match Details */}
          <div className={`${showDraftTools ? 'lg:col-span-2' : 'lg:col-span-1'} ${isRedMatch ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'} rounded-2xl shadow-sm border p-6 relative overflow-hidden`}>
             <div className="absolute top-0 left-0 w-2 h-full bg-bowls-darkGreen"></div>
             
             <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Shield className="w-6 h-6 text-bowls-darkGreen" />
                    Match Details
                </h2>
                {viewMode === 'Admin' && (
                    <button 
                        onClick={handleSaveToDatabase}
                        className="flex items-center gap-2 text-sm font-bold bg-bowls-darkGreen text-white hover:bg-bowls-green hover:text-bowls-darkGreen px-4 py-2 rounded-lg transition-colors shadow-md"
                    >
                        Enter Results to Database <ArrowRight className="w-4 h-4" />
                    </button>
                )}
             </div>

             <div className="flex flex-col gap-4">
                 {/* Competition */}
                 <div className="form-group">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <Trophy className="w-3 h-3" /> Competition
                    </label>
                    {viewMode !== 'Member' ? (
                        <input 
                            type="text" 
                            value={match.competition}
                            onChange={(e) => handleMetaChange('competition', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-bowls-darkGreen focus:border-bowls-darkGreen block p-2"
                        />
                    ) : (
                        <div className="font-semibold text-lg">{match.competition}</div>
                    )}
                 </div>

                 {/* Opponent */}
                 <div className="form-group">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <Users className="w-3 h-3" /> Opponent
                    </label>
                    {viewMode !== 'Member' ? (
                        <input 
                            type="text" 
                            value={match.opponent}
                            onChange={(e) => handleMetaChange('opponent', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-bowls-darkGreen focus:border-bowls-darkGreen block p-2"
                        />
                    ) : (
                        <div className="font-semibold text-lg">{match.opponent}</div>
                    )}
                 </div>

                 {/* Date & Time */}
                 <div className="form-group">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3" /> Date & Time
                    </label>
                    <div className="flex gap-2 items-start">
                        {viewMode !== 'Member' ? (
                            <>
                            <div className="flex-1">
                                <input 
                                    type="date" 
                                    value={match.date}
                                    onChange={(e) => handleMetaChange('date', e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2"
                                />
                                {match.date && (
                                    <div className="text-xs text-gray-500 mt-1 font-medium">
                                        {new Date(match.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                )}
                            </div>
                            <input 
                                type="time" 
                                value={match.time}
                                onChange={(e) => handleMetaChange('time', e.target.value)}
                                className="w-36 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2"
                            />
                            </>
                        ) : (
                            <div className="font-semibold text-lg">
                                {new Date(match.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} <span className="text-gray-400 text-sm">at</span> {match.time}
                            </div>
                        )}
                    </div>
                 </div>

                 {/* Venue */}
                 <div className="form-group">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" /> Venue
                    </label>
                    {viewMode !== 'Member' ? (
                        <input 
                            type="text" 
                            value={match.venue}
                            onChange={(e) => handleMetaChange('venue', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-bowls-darkGreen focus:border-bowls-darkGreen block p-2"
                            placeholder="e.g. West Melton Bowling Club"
                        />
                    ) : (
                        <div className="font-semibold text-lg">{match.venue}</div>
                    )}
                 </div>

                 {/* Location (Home/Away) */}
                 <div className="form-group">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                        <MapPin className="w-3 h-3" /> Location
                    </label>
                    {viewMode !== 'Member' ? (
                        <div className="flex bg-gray-100 rounded-lg p-1 w-max">
                            <button 
                                onClick={() => handleMetaChange('isHome', true)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${match.isHome ? 'bg-white shadow-[0_0_10px_rgba(21,128,61,0.25)] text-bowls-darkGreen ring-1 ring-bowls-green/50' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Home
                            </button>
                            <button 
                                onClick={() => handleMetaChange('isHome', false)}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${!match.isHome ? 'bg-white shadow-[0_0_10px_rgba(21,128,61,0.25)] text-bowls-darkGreen ring-1 ring-bowls-green/50' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Away
                            </button>
                        </div>
                    ) : (
                        <div className="flex bg-gray-100 rounded-lg p-1 w-max">
                            {match.isHome ? (
                                <div className="px-4 py-1.5 rounded-md text-xs font-bold bg-white shadow-[0_0_10px_rgba(21,128,61,0.25)] text-bowls-darkGreen ring-1 ring-bowls-green/50">
                                    Home
                                </div>
                            ) : (
                                <div className="px-4 py-1.5 rounded-md text-xs font-bold bg-white shadow-[0_0_10px_rgba(21,128,61,0.25)] text-bowls-darkGreen ring-1 ring-bowls-green/50">
                                    Away
                                </div>
                            )}
                        </div>
                    )}
                 </div>

                 {/* Team Communication (Admin Only) */}
                 {viewMode !== 'Member' && (
                     <div className="form-group">
                        <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                            <Mail className="w-3 h-3" /> Team Communication
                        </label>
                        <div className="flex items-center gap-3 h-[34px]"> {/* Match height of other inputs roughly */}
                            <button
                                onClick={handleSendEmail}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap ${
                                    match.lastEmailSent 
                                    ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                }`}
                            >
                                <Mail className="w-3 h-3" />
                                {match.lastEmailSent ? 'Resend Email' : 'Finalize & Email Team'}
                            </button>
                            
                            {match.lastEmailSent ? (
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1 leading-tight">
                                    <Check className="w-3 h-3 flex-shrink-0" /> 
                                    <span>Sent {new Date(match.lastEmailSent).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </p>
                            ) : (
                                <p className="text-xs text-gray-400 italic">Draft</p>
                            )}
                        </div>
                     </div>
                 )}
             </div>
          </div>

          {showDraftTools && (
              <>
                  {/* Available Players Summary */}
                  <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col h-full max-h-[400px]">
                      <h3 className="font-bold text-gray-800 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-bowls-darkGreen" /> Available Players
                      </h3>
                      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                          {[
                              { id: 'morning', title: 'Morning', data: morningPlayers, isMorning: true },
                              { id: 'afternoon', title: 'Afternoon', data: afternoonPlayers, isMorning: false }
                          ]
                          .sort((a, b) => isMorningMatch() ? (a.isMorning ? -1 : 1) : (a.isMorning ? 1 : -1))
                          .map(section => (
                              <div key={section.id}>
                                  <h4 className="text-xs font-bold text-gray-500 mb-2 border-b pb-1">{section.title} ({section.data.filter(p => !p.isUnavailable).length})</h4>
                                  <div className="flex flex-wrap gap-1">
                                      {section.data.map(p => (
                                          <span key={p.player.id} className={`text-[10px] px-2 py-1 rounded-full border ${
                                  p.isUnavailable ? 'bg-red-600 text-white border-red-700 font-bold' : 
                                  p.isPicked ? 'bg-yellow-400 text-yellow-900 border-yellow-500 font-bold' : 
                                  section.isMorning ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                          }`}>
                                              {p.player.name}
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Quick Stats / Side Selector */}
                  <div className="lg:col-span-1 flex flex-col gap-4">
                      <div className="bg-bowls-darkGreen rounded-2xl shadow-sm p-4 text-white">
                          <h3 className="font-bold opacity-80 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                              <Users className="w-4 h-4" /> Required Sides
                          </h3>
                          
                          {isLatestMatch ? (
                              <div className="grid grid-cols-2 gap-3">
                                  {(['Singles', 'Pairs', 'Triples', 'Fours'] as DisciplineType[]).map(type => (
                                      <div key={type} className="flex items-center justify-between bg-white/10 rounded px-2 py-1.5 border border-white/10">
                                          <label className="text-xs font-medium">{type}</label>
                                          <select 
                                              value={getDisciplineCount(type)}
                                              onChange={(e) => setDisciplineCount(type, parseInt(e.target.value))}
                                              className="bg-transparent border-none text-white text-xs font-bold focus:ring-0 p-0 w-8 text-right cursor-pointer"
                                          >
                                              {[0, 1, 2, 3, 4, 5].map(n => (
                                                  <option key={n} value={n} className="text-gray-900">{n}</option>
                                              ))}
                                          </select>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="grid grid-cols-2 gap-3">
                                  <div className="flex justify-between items-center text-xs border-b border-white/20 pb-1">
                                      <span>Singles</span>
                                      <span className="font-mono bg-white/20 px-1.5 rounded">{getDisciplineCount('Singles')}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs border-b border-white/20 pb-1">
                                      <span>Pairs</span>
                                      <span className="font-mono bg-white/20 px-1.5 rounded">{getDisciplineCount('Pairs')}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs border-b border-white/20 pb-1">
                                      <span>Triples</span>
                                      <span className="font-mono bg-white/20 px-1.5 rounded">{getDisciplineCount('Triples')}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs pb-1">
                                      <span>Fours</span>
                                      <span className="font-mono bg-white/20 px-1.5 rounded">{getDisciplineCount('Fours')}</span>
                                  </div>
                              </div>
                          )}
                      </div>

                      {/* Chat Prompt - Admin Only */}
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col gap-2 flex-1">
                              <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 text-bowls-darkGreen text-xs font-bold uppercase tracking-wider">
                                      <Sparkles className="w-3 h-3" /> AI Assistant
                                  </div>
                                  {(chatInput || chatResponse) && (
                                      <button 
                                          onClick={() => {
                                              setChatInput('');
                                              setChatResponse(null);
                                          }}
                                          className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                          title="Clear Chat"
                                      >
                                          <Trash2 className="w-3 h-3" /> Clear
                                      </button>
                                  )}
                              </div>
                              <div className="relative flex-1">
                                  <textarea 
                                      placeholder="Ask a question about past match results..." 
                                      className="w-full h-full min-h-[80px] text-sm border-gray-200 rounded-lg bg-gray-50 focus:ring-bowls-darkGreen focus:border-bowls-darkGreen resize-none p-3 pr-10"
                                      spellCheck="false"
                                      data-gramm="false"
                                      data-enable-grammarly="false"
                                      value={chatInput}
                                      onChange={(e) => setChatInput(e.target.value)}
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleChatSubmit();
                                          }
                                      }}
                                  />
                                  <button 
                                      onClick={handleChatSubmit}
                                      disabled={isThinking || !chatInput.trim()}
                                      className="absolute bottom-2 right-2 p-1.5 bg-bowls-darkGreen text-white rounded-md hover:bg-bowls-green transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                      {isThinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                  </button>
                              </div>
                              {chatResponse && (
                                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-100 max-h-40 overflow-y-auto">
                                      <p className="whitespace-pre-wrap">{chatResponse}</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </>
              )}
          </div>

      {!showDraftTools && (
          <div className="space-y-4">
              <h3 className="font-bold text-gray-700 uppercase tracking-wider text-sm ml-1">Team Sheet</h3>
              {match.disciplines.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
                      <p>No teams selected yet.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {match.disciplines.map((discipline) => (
                          <DisciplineCard 
                              key={discipline.id}
                              data={discipline}
                              players={players}
                              viewMode={viewMode}
                              onUpdate={(updated) => updateDiscipline(discipline.id, updated)}
                              onRemove={() => removeDiscipline(discipline.id)}
                              matchDate={match.date}
                              matchTime={match.time}
                          />
                      ))}
                  </div>
              )}
          </div>
      )}

      {showDraftTools && (
          <div className="space-y-4">
              {/* Team Allocations Grid */}
              {match.disciplines.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-500">
                      <p>No teams selected yet.</p>
                      {isLatestMatch && <p className="text-sm mt-2">Use the "Required Sides" dropdowns above to add teams.</p>}
                  </div>
              ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Selector 1 */}
                      <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <div className="form-group flex items-center gap-2">
                              <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                                  Selector 1
                              </label>
                              <select 
                                  value={match.selector1Id || ''}
                                  onChange={(e) => handleMetaChange('selector1Id', e.target.value)}
                                  className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-bowls-darkGreen focus:border-bowls-darkGreen block p-2"
                              >
                                  <option value="">Select Admin...</option>
                                  {players.filter(p => p.role === 'Admin' || p.role === 'Admin Editor').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                          </div>
                      <div className="space-y-4">
                          {(match.selector1Picks || []).map((discipline) => (
                              <DisciplineCard 
                                  key={discipline.id}
                                  data={discipline}
                                  players={players}
                                  viewMode={viewMode}
                                  onUpdate={(updated) => {
                                      const newPicks = (match.selector1Picks || []).map(d => d.id === discipline.id ? updated : d);
                                      handleMetaChange('selector1Picks', newPicks);
                                  }}
                                  onRemove={() => {}}
                                  matchDate={match.date}
                                  matchTime={match.time}
                              />
                          ))}
                      </div>
                  </div>

                  {/* Selector 2 */}
                  <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                      <div className="form-group flex items-center gap-2">
                          <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                              Selector 2
                          </label>
                          <select 
                              value={match.selector2Id || ''}
                              onChange={(e) => handleMetaChange('selector2Id', e.target.value)}
                              className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-bowls-darkGreen focus:border-bowls-darkGreen block p-2"
                          >
                              <option value="">Select Admin...</option>
                              {players.filter(p => p.role === 'Admin' || p.role === 'Admin Editor').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>
                      <div className="space-y-4">
                          {(match.selector2Picks || []).map((discipline) => (
                              <DisciplineCard 
                                  key={discipline.id}
                                  data={discipline}
                                  players={players}
                                  viewMode={viewMode}
                                  onUpdate={(updated) => {
                                      const newPicks = (match.selector2Picks || []).map(d => d.id === discipline.id ? updated : d);
                                      handleMetaChange('selector2Picks', newPicks);
                                  }}
                                  onRemove={() => {}}
                                  matchDate={match.date}
                                  matchTime={match.time}
                              />
                          ))}
                      </div>
                  </div>

                  {/* Final Teams */}
                  <div className="space-y-4 bg-bowls-green/10 p-4 rounded-xl border border-bowls-green/30">
                      <div className="h-[62px] flex items-end">
                          <button 
                              onClick={() => {
                                  if (isRedMatch) {
                                      alert('Please replace the unavailable player(s) before re-confirming the team.');
                                      return;
                                  }
                                  const newValue = !match.isConfirmed;
                                  handleMetaChange('isConfirmed', newValue);
                                  if (newValue) {
                                      alert('Teams have been confirmed and are now visible to members!');
                                  } else {
                                      alert('Teams are no longer confirmed and are hidden from members.');
                                  }
                              }}
                              className={`w-full py-2 px-4 rounded-lg font-bold shadow-sm transition-colors ${match.isConfirmed ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-bowls-darkGreen text-white hover:bg-bowls-green'}`}
                          >
                              {isRedMatch ? 'Re-Confirm Team' : (match.isConfirmed ? 'Teams Confirmed ✓' : 'Confirm Teams')}
                          </button>
                      </div>
                      <div className="space-y-4">
                          {match.disciplines.map((discipline) => (
                              <DisciplineCard 
                                  key={discipline.id}
                                  data={discipline}
                                  players={players}
                                  viewMode={viewMode}
                                  onUpdate={(updated) => updateDiscipline(discipline.id, updated)}
                                  onRemove={() => removeDiscipline(discipline.id)}
                                  matchDate={match.date}
                                  matchTime={match.time}
                              />
                          ))}
                      </div>
                  </div>
              </div>
          )}
      </div>
      )}

      {/* Email Preview Modal */}
      {showEmailPreview && emailData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Mail className="w-5 h-5 text-bowls-darkGreen" />
                          Email Preview
                      </h3>
                      <button 
                          onClick={() => setShowEmailPreview(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                          <Trash2 className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4 overflow-y-auto flex-1">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">To (BCC):</label>
                          <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200 break-all">
                              {emailData.recipients.length} recipients selected
                          </div>
                      </div>
                      
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Subject:</label>
                          <div className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                              {emailData.subject}
                          </div>
                      </div>

                      <div className="space-y-1 flex-1">
                          <label className="text-xs font-bold text-gray-500 uppercase">Message:</label>
                          <div className="text-sm text-gray-800 bg-gray-50 p-4 rounded border border-gray-200 whitespace-pre-wrap font-mono h-64 overflow-y-auto">
                              {emailData.body}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      <button 
                          onClick={() => setShowEmailPreview(false)}
                          className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmSendEmail}
                          className="flex items-center gap-2 px-6 py-2 bg-bowls-darkGreen text-white text-sm font-bold rounded-lg hover:bg-bowls-green transition-colors shadow-md"
                      >
                          <Send className="w-4 h-4" />
                          Open Gmail
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default MatchEditor;