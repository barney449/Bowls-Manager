import React, { useState, useEffect, useRef } from 'react';
import { Player, Scorecard } from '../types';
import { Send, MessageSquare, User, Shield, Calendar } from 'lucide-react';

interface Comment {
    id: string;
    name: string;
    image: string;
    text: string;
    date: string;
    isAdmin?: boolean;
}

interface ScorecardCommentsProps {
    scorecard: Scorecard;
    currentUser: Player | null;
    players: Player[];
    onUpdateScorecard: (updates: Partial<Scorecard>) => void;
}

const ScorecardComments: React.FC<ScorecardCommentsProps> = ({ scorecard, currentUser, players, onUpdateScorecard }) => {
    const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseDateTime = (text: string) => {
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const words = text.toLowerCase().split(/\s+/);
        
        let foundDate: Date | null = null;
        let foundTime: string | null = null;

        // 1. Check for Weekdays
        for (const word of words) {
            const cleanWord = word.replace(/[^\w]/g, '');
            const index = days.indexOf(cleanWord);
            if (index !== -1) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                const todayIndex = now.getDay();
                let diff = index - todayIndex;
                if (diff <= 0) diff += 7;
                
                const nextDate = new Date(now);
                nextDate.setDate(now.getDate() + diff);
                foundDate = nextDate;
                break;
            }
        }

        // 2. Check for specific dates (e.g., "30th", "March 30", "30/03")
        const dateMatch = text.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i);
        if (dateMatch) {
            const day = parseInt(dateMatch[1], 10);
            const monthName = dateMatch[2].toLowerCase();
            const monthIndex = months.findIndex(m => m.startsWith(monthName));
            if (monthIndex !== -1) {
                const now = new Date();
                const d = new Date(now.getFullYear(), monthIndex, day);
                if (d < now) d.setFullYear(now.getFullYear() + 1);
                foundDate = d;
            }
        }

        // 3. Check for Time (e.g., "10am", "10:30", "2pm", "5.30", "5")
        const timeMatch = 
            text.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)/i) || 
            text.match(/(\d{1,2})[:.](\d{2})/i) ||
            text.match(/\b(?:at|play|@|time)\s*(\d{1,2})\b/i);

        if (timeMatch) {
            let hour = parseInt(timeMatch[1], 10);
            const minute = timeMatch[2] || '00';
            const period = timeMatch[3]?.toLowerCase();

            if (period === 'pm' && hour < 12) {
                hour += 12;
            } else if (period === 'am' && hour === 12) {
                hour = 0;
            } else if (!period) {
                // If no am/pm specified, assume PM for typical bowls hours (1-7 and 12)
                if ((hour >= 1 && hour <= 7) || hour === 12) {
                    if (hour < 12) hour += 12;
                }
            }

            foundTime = `${hour.toString().padStart(2, '0')}:${minute}`;
        }

        return { date: foundDate, time: foundTime };
    };

    const getPlayersInScorecard = () => {
        const ids = [
            ...scorecard.teamA.assignments.map(a => a.playerId),
            ...scorecard.teamB.assignments.map(a => a.playerId)
        ].filter(Boolean);
        
        return ids.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];
    };

    const checkAvailability = (date: Date) => {
        const dateStr = formatDate(date);
        const scorecardPlayers = getPlayersInScorecard();
        const unavailablePlayers: string[] = [];

        scorecardPlayers.forEach(player => {
            if (player.unavailablePeriods) {
                const isAway = player.unavailablePeriods.some(period => {
                    const start = new Date(period.startDate);
                    const end = new Date(period.endDate);
                    const check = new Date(dateStr);
                    return check >= start && check <= end;
                });
                if (isAway) {
                    unavailablePlayers.push(player.name);
                }
            }
        });

        return unavailablePlayers;
    };

    const isUserAllowed = () => {
        if (!currentUser) return false;
        const scorecardPlayers = getPlayersInScorecard();
        return scorecardPlayers.some(p => p.id === currentUser.id);
    };

    const [comments, setComments] = useState<Comment[]>([]);
    const [inputText, setInputText] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const storageKey = `scorecard_comments_${scorecard.id}`;

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            const parsedComments = JSON.parse(saved);
            setComments(parsedComments);

            // Scan history for latest date/time
            let latestDate: string | null = null;
            let latestTime: string | null = null;

            // Iterate backwards to find the most recent mentions
            for (let i = parsedComments.length - 1; i >= 0; i--) {
                const comment = parsedComments[i];
                if (comment.isAdmin) continue; // Skip system messages for extraction

                const { date, time } = parseDateTime(comment.text);
                const lowerText = comment.text.toLowerCase();
                const isSuggestion = comment.text.includes('?');
                const isDirectDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].some(d => lowerText.includes(d));
                const isIntentional = isSuggestion || isDirectDay || lowerText.includes('can play') || lowerText.includes('let\'s play');

                if (date && !latestDate && isIntentional) {
                    latestDate = formatDate(date);
                }
                if (time && !latestTime) {
                    latestTime = time;
                }
                if (latestDate && latestTime) break;
            }

            // Sync with scorecard if different
            if (latestDate && latestDate !== scorecard.agreedPlayDate) {
                onUpdateScorecard({ agreedPlayDate: latestDate });
            }
            if (latestTime && latestTime !== scorecard.startTime) {
                onUpdateScorecard({ startTime: latestTime });
            }
        }
    }, [storageKey]);

    // Effect to auto-post availability alerts when players or date changes
    const lastAlertedRef = useRef<string>('');
    useEffect(() => {
        const dateToCheck = scorecard.agreedPlayDate || scorecard.playByDate;
        if (!dateToCheck) return;

        const dateObj = new Date(dateToCheck);
        const unavailableNames = checkAvailability(dateObj);
        
        if (unavailableNames.length > 0) {
            const alertKey = `${scorecard.id}_${dateToCheck}_${unavailableNames.join(',')}`;
            if (lastAlertedRef.current === alertKey) return;

            const formattedDate = dateObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
            const systemComment: Comment = {
                id: `alert_${Date.now()}`,
                name: "Bowls Manager",
                image: "https://api.dicebear.com/7.x/bottts/svg?seed=manager",
                text: `${unavailableNames.join(' and ')} ${unavailableNames.length === 1 ? 'is' : 'are'} unavailable on ${formattedDate}.`,
                date: new Date().toISOString(),
                isAdmin: true
            };

            setComments(prev => {
                const updated = [...prev, systemComment];
                localStorage.setItem(storageKey, JSON.stringify(updated));
                return updated;
            });
            lastAlertedRef.current = alertKey;
        }
    }, [scorecard.teamA.assignments, scorecard.teamB.assignments, scorecard.agreedPlayDate, scorecard.playByDate]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const handleSend = () => {
        if (!inputText.trim() || !currentUser) return;
        if (!isUserAllowed()) {
            alert("Only players in this scorecard can comment.");
            return;
        }

        const newComment: Comment = {
            id: Date.now().toString(),
            name: currentUser.name,
            image: currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`,
            text: inputText,
            date: new Date().toISOString()
        };

        let updatedComments = [...comments, newComment];
        
        // Bowls Manager Logic
        const { date: mentionedDate, time: mentionedTime } = parseDateTime(inputText);
        const updates: Partial<Scorecard> = {};
        const isSuggestion = inputText.includes('?');
        const lowerText = inputText.toLowerCase();

        if (mentionedDate) {
            const unavailableNames = checkAvailability(mentionedDate);
            const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
            const formattedDate = mentionedDate.toLocaleDateString(undefined, dateOptions);
            const isoDate = formatDate(mentionedDate);

            if (unavailableNames.length > 0) {
                // Someone is away
                const systemComment: Comment = {
                    id: (Date.now() + 1).toString(),
                    name: "Bowls Manager",
                    image: "https://api.dicebear.com/7.x/bottts/svg?seed=manager",
                    text: `${unavailableNames.join(' and ')} ${unavailableNames.length === 1 ? 'is' : 'are'} away on ${formattedDate}.`,
                    date: new Date().toISOString(),
                    isAdmin: true
                };
                updatedComments.push(systemComment);
            } else {
                // Everyone is available
                // If it's a suggestion (contains ?) or a confirmation, or just a day name mentioned
                const isDirectDay = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].some(d => lowerText.includes(d));
                
                if (isSuggestion || isDirectDay || lowerText.includes('can play') || lowerText.includes('let\'s play')) {
                    updates.agreedPlayDate = isoDate;
                }
            }
        }

        if (mentionedTime) {
            updates.startTime = mentionedTime;
        }

        if (Object.keys(updates).length > 0) {
            onUpdateScorecard({ ...updates, isEditing: scorecard.isEditing });
        }

        setComments(updatedComments);
        localStorage.setItem(storageKey, JSON.stringify(updatedComments));
        setInputText('');
    };

    return (
        <div className="flex flex-col h-full min-h-[300px] bg-gray-50/50 border-l border-gray-200">
            <div className="p-3 border-b border-gray-200 bg-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-bowls-darkGreen" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Match Chat</span>
            </div>

            <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-4 scroll-smooth"
                style={{ height: '280px', maxHeight: '280px' }}
            >
                {comments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 py-10">
                        <MessageSquare className="w-8 h-8 mb-2" />
                        <p className="text-[10px] font-medium">No comments yet</p>
                    </div>
                ) : (
                    comments.map(comment => (
                        <div 
                            key={comment.id} 
                            className={`flex flex-col ${comment.isAdmin ? 'items-center' : 'items-start'}`}
                        >
                            {comment.isAdmin ? (
                                <div className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white">
                                            <Shield className="w-3 h-3" />
                                        </div>
                                        <span className="text-[10px] font-black text-orange-800 uppercase tracking-tighter">System Alert</span>
                                    </div>
                                    <p className="text-[11px] text-orange-900 font-bold leading-relaxed">
                                        {comment.text}
                                    </p>
                                    <div className="mt-2 text-[8px] text-orange-400 font-medium">
                                        {new Date(comment.date).toLocaleDateString()} – {new Date(comment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2 w-full group">
                                    <img 
                                        src={comment.image} 
                                        alt={comment.name} 
                                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-[11px] font-black text-gray-900 truncate">
                                                {comment.name}
                                            </span>
                                        </div>
                                        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm group-hover:shadow-md transition-shadow">
                                            <p className="text-[12px] text-gray-700 leading-relaxed break-words">
                                                {comment.text}
                                            </p>
                                        </div>
                                        <div className="mt-1 flex items-center gap-1 text-[9px] text-gray-400 font-medium px-1">
                                            <Calendar className="w-2.5 h-2.5" />
                                            {new Date(comment.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                                            <span className="mx-1">•</span>
                                            {new Date(comment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={isUserAllowed() ? "Type a message..." : "Read-only mode"}
                        disabled={!isUserAllowed()}
                        className="flex-1 text-[12px] bg-gray-50 border border-gray-200 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-bowls-darkGreen focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!isUserAllowed() || !inputText.trim()}
                        className="bg-bowls-darkGreen text-white p-2 rounded-full hover:bg-bowls-darkGreen/90 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-900/10"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                {!isUserAllowed() && currentUser && (
                    <p className="text-[9px] text-red-500 mt-2 font-bold text-center uppercase tracking-tighter">
                        Participation Required to Chat
                    </p>
                )}
            </div>
        </div>
    );
};

export default ScorecardComments;
