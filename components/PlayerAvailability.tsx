import React, { useState } from 'react';
import { Player, UnavailablePeriod, AvailabilityType } from '../types';
import { Calendar, Trash2, Plus, AlertCircle, Users, ArrowRight, Clock } from 'lucide-react';
import Avatar from './Avatar';

interface PlayerAvailabilityProps {
  currentUser: Player;
  players: Player[];
  onUpdatePlayer: (updatedPlayer: Player) => void;
}

const PlayerAvailability: React.FC<PlayerAvailabilityProps> = ({ currentUser, players, onUpdatePlayer }) => {
  const [absenceType, setAbsenceType] = useState<'Part Day' | 'Full Day' | 'Multi-Day'>('Full Day');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [partDayType, setPartDayType] = useState<'Morning' | 'Afternoon'>('Morning');

  const unavailablePeriods = currentUser.unavailablePeriods || [];

  // Sort periods by start date
  const sortedPeriods = [...unavailablePeriods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const handleAddPeriod = () => {
    if (!startDate) return;
    
    let finalEndDate = startDate;
    let type: AvailabilityType = 'All Day';

    if (absenceType === 'Multi-Day') {
        if (!endDate) {
            alert('Please select an end date for multi-day absence.');
            return;
        }
        finalEndDate = endDate;
        if (new Date(finalEndDate) < new Date(startDate)) {
            alert('End date cannot be before start date.');
            return;
        }
    } else if (absenceType === 'Part Day') {
        type = partDayType;
    }

    const newPeriod: UnavailablePeriod = {
        id: `period-${Date.now()}`,
        startDate,
        endDate: finalEndDate,
        type: type
    };

    const updatedPeriods = [...unavailablePeriods, newPeriod];
    onUpdatePlayer({ ...currentUser, unavailablePeriods: updatedPeriods });
    
    // Reset form
    setStartDate('');
    setEndDate('');
    setPartDayType('Morning');
    setAbsenceType('Full Day');
  };

  const handleRemovePeriod = (id: string) => {
    const updatedPeriods = unavailablePeriods.filter(p => p.id !== id);
    onUpdatePlayer({ ...currentUser, unavailablePeriods: updatedPeriods });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatPeriod = (period: UnavailablePeriod) => {
      if (period.startDate === period.endDate) {
          return formatDate(period.startDate);
      }
      return `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`;
  };

  // Get other players' unavailability
  const getOtherUnavailablePlayers = () => {
      const today = new Date();
      today.setHours(0,0,0,0);

      const others = players.filter(p => p.id !== currentUser.id);
      const upcoming: { player: Player, period: UnavailablePeriod }[] = [];

      others.forEach(player => {
          if (player.unavailablePeriods) {
              player.unavailablePeriods.forEach(period => {
                  const end = new Date(period.endDate);
                  if (end >= today) {
                      upcoming.push({ player, period });
                  }
              });
          }
      });

      // Sort by date
      return upcoming.sort((a, b) => new Date(a.period.startDate).getTime() - new Date(b.period.startDate).getTime());
  };

  const otherUnavailable = getOtherUnavailablePlayers();

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 pb-20">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Manage My Unavailability */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                <div className="relative bg-bowls-darkGreen p-8 border-b border-gray-200 rounded-t-xl overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        <img 
                            src="https://images.unsplash.com/photo-1585822736279-56a735f73022?q=80&w=2070&auto=format&fit=crop" 
                            alt="Bowls Green" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                            My Unavailability
                        </h2>
                        <p className="text-white/80 mt-2 font-medium">Manage dates when you are away or cannot play.</p>
                    </div>
                </div>
                
                <div className="p-6 space-y-8">
                    {/* Add Period Form */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
                             <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Plus className="w-4 h-4 text-bowls-green" />
                                Add New Period
                             </h3>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Absence Type Selector */}
                            <div className="grid grid-cols-3 gap-4">
                                {(['Part Day', 'Full Day', 'Multi-Day'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setAbsenceType(type)}
                                        className={`relative overflow-hidden group py-4 px-2 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                                            absenceType === type 
                                            ? 'border-bowls-darkGreen bg-bowls-darkGreen/5 text-bowls-darkGreen' 
                                            : 'border-gray-100 hover:border-bowls-green/30 hover:bg-gray-50 text-gray-500'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-full ${absenceType === type ? 'bg-bowls-darkGreen text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:text-bowls-green transition-colors'}`}>
                                            {type === 'Part Day' && <Clock className="w-5 h-5" />}
                                            {type === 'Full Day' && <Calendar className="w-5 h-5" />}
                                            {type === 'Multi-Day' && <ArrowRight className="w-5 h-5" />}
                                        </div>
                                        <span className="font-bold text-sm">{type}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {absenceType === 'Multi-Day' ? 'Start Date' : 'Date'}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-bowls-green/5 to-blue-500/5 rounded-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <input 
                                            type="date" 
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full rounded-lg border-gray-300 border-2 p-3 focus:ring-0 focus:border-bowls-darkGreen shadow-sm bg-white/50 backdrop-blur-sm transition-colors cursor-pointer"
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                </div>

                                {absenceType === 'Multi-Day' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">End Date</label>
                                        <div className="relative group">
                                            <input 
                                                type="date" 
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="w-full rounded-lg border-gray-300 border-2 p-3 focus:ring-0 focus:border-bowls-darkGreen shadow-sm bg-white/50 backdrop-blur-sm transition-colors cursor-pointer"
                                                min={startDate || new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    </div>
                                )}

                                {absenceType === 'Part Day' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Time of Day</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {(['Morning', 'Afternoon'] as const).map(type => (
                                                <label key={type} className={`cursor-pointer relative overflow-hidden rounded-xl border-2 p-4 flex items-center justify-center gap-3 transition-all ${partDayType === type ? 'border-bowls-darkGreen bg-bowls-darkGreen/5' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                                                    <input 
                                                        type="radio" 
                                                        name="partDayType" 
                                                        value={type} 
                                                        checked={partDayType === type}
                                                        onChange={() => setPartDayType(type)}
                                                        className="hidden"
                                                    />
                                                    {/* Background Image for Time of Day */}
                                                    <div className="absolute inset-0 opacity-10">
                                                        <img 
                                                            src={type === 'Morning' 
                                                                ? "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=2070&auto=format&fit=crop" 
                                                                : "https://images.unsplash.com/photo-1472120435266-53107fd0c44a?q=80&w=2070&auto=format&fit=crop"
                                                            }
                                                            alt={type}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className={`relative z-10 p-2 rounded-full ${partDayType === type ? 'bg-bowls-darkGreen text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                        <Clock className="w-4 h-4" />
                                                    </div>
                                                    <span className={`relative z-10 font-bold ${partDayType === type ? 'text-bowls-darkGreen' : 'text-gray-600'}`}>{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={handleAddPeriod}
                                disabled={!startDate || (absenceType === 'Multi-Day' && !endDate)}
                                className="w-full bg-bowls-darkGreen text-white px-6 py-4 rounded-xl font-bold hover:bg-bowls-green transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 shadow-lg shadow-bowls-green/20"
                            >
                                <Plus className="w-5 h-5" />
                                Add Unavailable Period
                            </button>
                        </div>
                    </div>

                    {/* List Section */}
                    <div>
                        <h3 className="font-bold text-gray-700 flex items-center justify-between mb-4">
                            My Upcoming Away Dates
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {sortedPeriods.length} periods
                            </span>
                        </h3>
                        
                        {sortedPeriods.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                <p className="text-gray-400 text-sm">No unavailable dates set.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sortedPeriods.map(period => {
                                    const isPast = new Date(period.endDate) < new Date(new Date().setHours(0,0,0,0));
                                    if (isPast) return null;

                                    return (
                                        <div key={period.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-bowls-green/50 transition-colors group">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-lg ${period.type === 'All Day' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-lg">
                                                        {formatPeriod(period)}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${period.type === 'All Day' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                                            {period.type}
                                                        </span>
                                                        {period.startDate !== period.endDate && (
                                                            <span className="text-xs text-gray-400">
                                                                ({Math.ceil((new Date(period.endDate).getTime() - new Date(period.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleRemovePeriod(period.id)}
                                                className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                title="Remove period"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Who Else is Away */}
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full">
                <div className="bg-blue-50 p-6 border-b border-blue-100 rounded-t-xl">
                    <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" />
                        Who Else is Away?
                    </h2>
                    <p className="text-blue-700/70 text-sm mt-1">Check team availability.</p>
                </div>
                
                <div className="p-0">
                    {otherUnavailable.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-400 text-sm">Everyone else seems to be available!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {otherUnavailable.map((item, idx) => (
                                <div key={idx} className="p-4 hover:bg-gray-50 transition-colors flex items-start gap-3">
                                    <Avatar src={item.player.avatarUrl} alt={item.player.name} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 text-sm truncate">{item.player.name}</p>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatPeriod(item.period)}
                                        </p>
                                        <div className="mt-1 flex items-center gap-2">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${item.period.type === 'All Day' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {item.period.type}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerAvailability;
