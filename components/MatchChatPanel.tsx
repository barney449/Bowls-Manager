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

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
      console.log('Connected to chat server');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'INIT_CHAT') {
        setMessages(data.messages.filter((m: ChatMessage) => m.scorecardId === scorecard.id));
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

  const checkAvailabilityForDate = (dateStr: string) => {
    // Try to parse the date. This is a simple parser for demo purposes.
    // Expecting formats like "April 10", "10 April", "2026-04-10", "10/04/2026"
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    let targetDate: Date | null = null;

    const lowerText = dateStr.toLowerCase();
    
    // Check for month name + day
    for (let i = 0; i < months.length; i++) {
        if (lowerText.includes(months[i])) {
            const dayMatch = lowerText.match(/\d+/);
            if (dayMatch) {
                const day = parseInt(dayMatch[0]);
                const year = new Date().getFullYear();
                targetDate = new Date(year, i, day);
                // If the date has already passed this year, assume next year
                if (targetDate < new Date()) {
                    targetDate.setFullYear(year + 1);
                }
                break;
            }
        }
    }

    // Check for YYYY-MM-DD or DD/MM/YYYY
    if (!targetDate) {
        const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            targetDate = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        } else {
            const slashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (slashMatch) {
                targetDate = new Date(parseInt(slashMatch[3]), parseInt(slashMatch[2]) - 1, parseInt(slashMatch[1]));
            }
        }
    }

    if (!targetDate || isNaN(targetDate.getTime())) return false;

    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    // Get all players in the match
    const matchPlayerIds = [
        ...scorecard.teamA.assignments.map(a => a.playerId),
        ...scorecard.teamB.assignments.map(a => a.playerId)
    ].filter(id => id !== null) as string[];

    const unavailablePlayers = players.filter(p => {
        if (!matchPlayerIds.includes(p.id)) return false;
        if (!p.unavailablePeriods) return false;
        
        return p.unavailablePeriods.some(period => {
            return targetDateStr >= period.startDate && targetDateStr <= period.endDate;
        });
    });

    return unavailablePlayers.length > 0;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUser || !socket) return;

    const newMessage = {
      scorecardId: scorecard.id,
      playerId: currentUser.id,
      playerName: currentUser.name,
      playerAvatar: currentUser.avatarUrl,
      text: inputText,
    };

    socket.send(JSON.stringify({
      type: 'NEW_MESSAGE',
      payload: newMessage
    }));

    // Check for date mentions
    const dateKeywords = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'play on', 'play at', 'available'];
    const lowerInput = inputText.toLowerCase();
    
    if (dateKeywords.some(k => lowerInput.includes(k))) {
        const isUnavailable = checkAvailabilityForDate(inputText);
        if (isUnavailable) {
            // Send system message
            setTimeout(() => {
                socket.send(JSON.stringify({
                    type: 'NEW_MESSAGE',
                    payload: {
                        scorecardId: scorecard.id,
                        playerId: 'bowls-manager-system',
                        playerName: 'Bowls Manager',
                        playerAvatar: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                        text: 'Player/Players are unable to play on the requested date.',
                        isSystem: true
                    }
                }));
            }, 500);
        }
    }

    setInputText('');
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
    <div className="flex flex-col h-full bg-gray-50/50 rounded-lg overflow-hidden border border-gray-200">
      {/* Chat Header */}
      <div className="px-3 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Match Communication</span>
        <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] text-gray-400 font-medium">Live</span>
        </div>
      </div>

      {/* Messages Window */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px] max-h-[200px] scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
            <User className="w-8 h-8 opacity-20" />
            <p className="text-[10px] font-medium">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.isSystem ? 'items-center' : 'items-start'}`}
            >
              {msg.isSystem ? (
                <div className="bg-gray-100 px-4 py-2 rounded-lg border border-gray-200 flex items-center gap-2 max-w-[90%]">
                  <ShieldCheck className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-600">{msg.playerName}</span>
                    <p className="text-xs text-gray-700 italic">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 max-w-[95%]">
                  <img 
                    src={msg.playerAvatar} 
                    alt={msg.playerName} 
                    className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-gray-700">{msg.playerName}</span>
                      <span className="text-[9px] text-gray-400">{formatTimestamp(msg.timestamp)}</span>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-gray-100 shadow-sm mt-0.5">
                      <p className="text-xs text-gray-800 leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input Footer */}
      <form 
        onSubmit={handleSendMessage}
        className="p-2 bg-white border-t border-gray-200 flex gap-2"
      >
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-bowls-darkGreen focus:border-transparent outline-none transition-all"
        />
        <button 
          type="submit"
          disabled={!inputText.trim() || !currentUser}
          className="bg-bowls-darkGreen text-white p-1.5 rounded-lg hover:bg-bowls-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

export default MatchChatPanel;
