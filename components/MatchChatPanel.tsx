import React, { useState, useEffect, useRef } from 'react';
import { Player, ChatMessage, Scorecard } from '../types';
import { Send, User, ShieldCheck } from 'lucide-react';

interface MatchChatPanelProps {
  scorecard: Scorecard;
  currentUser: Player | null;
  players: Player[];
}

const MatchChatPanel: React.FC<MatchChatPanelProps> = ({ scorecard, currentUser, players }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canUserComment = () => {
    if (!currentUser) return false;
    // Allow Admins and Admin Editors to comment
    if (currentUser.role === 'Admin' || currentUser.role === 'Admin Editor') return true;
    
    const inTeamA = scorecard.teamA.assignments.some(a => a.playerId === currentUser.id);
    const inTeamB = scorecard.teamB.assignments.some(a => a.playerId === currentUser.id);
    return inTeamA || inTeamB;
  };

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      console.log('Connected to chat server');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'INIT_CHAT') {
        const scorecardMessages = data.messages.filter((m: ChatMessage) => m.scorecardId === scorecard.id);
        setMessages(scorecardMessages);
      } else if (data.type === 'MESSAGE_RECEIVED') {
        if (data.message.scorecardId === scorecard.id) {
          setMessages(prev => [...prev, data.message]);
        }
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [scorecard.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const checkAvailabilityForDate = (text: string) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    let targetDate: Date | null = null;

    const lowerText = text.toLowerCase();
    
    // Check for day of week (e.g., "Thursday")
    for (let i = 0; i < days.length; i++) {
        if (lowerText.includes(days[i])) {
            const today = new Date();
            const currentDay = today.getDay();
            let daysToAdd = (i - currentDay + 7) % 7;
            if (daysToAdd === 0) daysToAdd = 7; // Assume next week if today
            targetDate = new Date(today);
            targetDate.setDate(today.getDate() + daysToAdd);
            break;
        }
    }

    // Check for month name + day
    if (!targetDate) {
        for (let i = 0; i < months.length; i++) {
            if (lowerText.includes(months[i])) {
                const dayMatch = lowerText.match(/\d+/);
                if (dayMatch) {
                    const day = parseInt(dayMatch[0]);
                    const year = new Date().getFullYear();
                    targetDate = new Date(year, i, day);
                    if (targetDate < new Date()) {
                        targetDate.setFullYear(year + 1);
                    }
                    break;
                }
            }
        }
    }

    // Check for YYYY-MM-DD or DD/MM/YYYY
    if (!targetDate) {
        const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            targetDate = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        } else {
            const slashMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (slashMatch) {
                targetDate = new Date(parseInt(slashMatch[3]), parseInt(slashMatch[2]) - 1, parseInt(slashMatch[1]));
            }
        }
    }

    if (!targetDate || isNaN(targetDate.getTime())) return null;
    return targetDate;
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !currentUser || !socket || !canUserComment()) return;

    const targetDate = checkAvailabilityForDate(inputText);
    let dateStr = null;
    if (targetDate) {
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const day = String(targetDate.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    const newMessage = {
      scorecardId: scorecard.id,
      playerId: currentUser.id,
      playerName: currentUser.name,
      playerAvatar: currentUser.avatarUrl,
      text: inputText,
      interpretedDate: dateStr
    };

    socket.send(JSON.stringify({
      type: 'NEW_MESSAGE',
      payload: newMessage
    }));

    if (dateStr) {
        // Get all players in the match
        const matchPlayerIds = [
            ...scorecard.teamA.assignments.map(a => a.playerId),
            ...scorecard.teamB.assignments.map(a => a.playerId)
        ].filter(id => id !== null) as string[];

        const unavailablePlayers = players.filter(p => {
            if (!matchPlayerIds.includes(p.id)) return false;
            if (!p.unavailablePeriods) return false;
            return p.unavailablePeriods.some(period => {
                return dateStr >= period.startDate && dateStr <= period.endDate;
            });
        });

        if (unavailablePlayers.length > 0) {
            setTimeout(() => {
                socket.send(JSON.stringify({
                    type: 'NEW_MESSAGE',
                    payload: {
                        scorecardId: scorecard.id,
                        playerId: 'bowls-manager-system',
                        playerName: 'Bowls Manager',
                        playerAvatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                        text: `One or more players are unavailable on ${targetDate?.toLocaleDateString()}`,
                        isSystem: true
                    }
                }));
            }, 500);
        } else {
            setTimeout(() => {
                socket.send(JSON.stringify({
                    type: 'NEW_MESSAGE',
                    payload: {
                        scorecardId: scorecard.id,
                        playerId: 'bowls-manager-system',
                        playerName: 'Bowls Manager',
                        playerAvatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                        text: `All players appear to be available on ${targetDate?.toLocaleDateString()}`,
                        isSystem: true
                    }
                }));
            }, 500);
        }
    }

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (isoStr: string) => {
    const date = new Date(isoStr);
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    const h = date.getHours().toString().padStart(2, '0');
    const min = date.getMinutes().toString().padStart(2, '0');
    return `${d}/${m}/${y} ${h}:${min}`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50 rounded-lg overflow-hidden border border-gray-200 shadow-inner">
      {/* Chat Header */}
      <div className="px-3 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Match Chat</span>
        <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] text-gray-400 font-bold uppercase">Live</span>
        </div>
      </div>

      {/* Messages Window */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-4 min-h-[250px] max-h-[350px] scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 opacity-40">
            <User className="w-10 h-10" />
            <p className="text-[10px] font-bold uppercase tracking-wider">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.isSystem ? 'items-center' : 'items-start'}`}
            >
              {msg.isSystem ? (
                <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-100 flex items-center gap-2 max-w-[90%] shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-bowls-darkGreen flex-shrink-0" />
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-600 font-medium italic">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2.5 max-w-[95%] group">
                  <img 
                    src={msg.playerAvatar} 
                    alt={msg.playerName} 
                    className="w-7 h-7 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-gray-700">{msg.playerName}</span>
                      <span className="text-[9px] text-gray-400 font-medium">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <div className={`bg-white px-3 py-2 rounded-tr-xl rounded-br-xl rounded-bl-xl border shadow-sm transition-all ${msg.authorId === currentUser?.id ? 'border-blue-100 bg-blue-50/30' : 'border-gray-100'}`}>
                      <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-white border-t border-gray-200">
        {!canUserComment() ? (
            <div className="text-[10px] text-center text-gray-400 italic py-2">
                Only match participants and admins can comment
            </div>
        ) : (
            <div className="flex flex-col gap-2">
                <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send)"
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent outline-none transition-all resize-none shadow-inner"
                />
                <div className="flex justify-between items-center">
                    <span className="text-[9px] text-gray-400 font-medium italic">Shift+Enter for new line</span>
                    <button 
                        onClick={handleSendMessage}
                        disabled={!inputText.trim() || !currentUser}
                        className="bg-bowls-darkGreen text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-bowls-green disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                    >
                        Send
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default MatchChatPanel;
