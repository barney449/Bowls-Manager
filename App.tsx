import React, { useState, useEffect, useRef } from 'react';
import { Match, ViewMode, Player, Scorecard } from './types';
import { MOCK_PLAYERS, INITIAL_MATCH } from './constants';
import MatchEditor from './components/MatchEditor';
import DatabaseView from './components/DatabaseView';
import SpreadsheetView from './components/SpreadsheetView';
import PlayerManager from './components/PlayerManager';
import ClubChamps, { ClubChampsHandle } from './components/ClubChamps';
import PlayerAvailability from './components/PlayerAvailability';
import LoginView from './components/LoginView';
import Dashboard from './components/Dashboard';
import { LayoutDashboard, Table, UserCircle, Settings, Users, Plus, Shield, X, RefreshCw, Trophy, LogOut, AlertTriangle, Calendar, Image, Upload, Trash2, Check, Download } from 'lucide-react';

const App: React.FC = () => {
  // Persistence state
  const [matches, setMatches] = useState<Match[]>(() => {
      const saved = localStorage.getItem('bowls_matches');
      return saved ? JSON.parse(saved) : [INITIAL_MATCH];
  });
  const [databaseMatches, setDatabaseMatches] = useState<Match[]>(() => {
      const saved = localStorage.getItem('bowls_database');
      return saved ? JSON.parse(saved) : [];
  });
  const [scorecards, setScorecards] = useState<Scorecard[]>(() => {
      const saved = localStorage.getItem('bowls_club_champs');
      return saved ? JSON.parse(saved) : [];
  });
  const [appSettings, setAppSettings] = useState<any>(() => {
      const saved = localStorage.getItem('bowls_app_settings');
      return saved ? JSON.parse(saved) : {};
  });
  const [players, setPlayers] = useState<Player[]>(() => {
      const saved = localStorage.getItem('bowls_players');
      // Merge mock players with any new fields if they don't exist in saved data
      // This is a simple migration strategy for the demo
      let parsed = saved ? JSON.parse(saved) : MOCK_PLAYERS;
      if (parsed.length > 0 && !parsed[0].role) {
          parsed = MOCK_PLAYERS; // Reset to mock if schema changed significantly
      }
      
      // Force update mock players with their default emails/passwords/roles for demo purposes
      return parsed.map((p: Player) => {
          const mockPlayer = MOCK_PLAYERS.find(mp => mp.id === p.id);
          if (mockPlayer) {
              return { 
                  ...p, 
                  email: mockPlayer.email, 
                  password: mockPlayer.password,
                  role: p.id === '5' ? 'Admin Editor' : p.role // Force Sean to be Admin Editor
              };
          }
          return p;
      });
  });
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<Player | null>(() => {
      const saved = localStorage.getItem('bowls_current_user');
      if (saved) {
          const parsedUser = JSON.parse(saved);
          // Sync with the latest players data to ensure roles/emails are up to date
          const updatedUser = players.find(p => p.id === parsedUser.id);
          return updatedUser || parsedUser;
      }
      return null;
  });

  // Background State
  const [backgroundImage, setBackgroundImage] = useState<string | null>(() => {
      return appSettings?.backgroundImage || localStorage.getItem('bowls_background_image');
  });
  const [backgroundScale, setBackgroundScale] = useState<number>(() => {
      return appSettings?.backgroundScale || parseFloat(localStorage.getItem('bowls_background_scale') || '1');
  });
  const [bgPosition, setBgPosition] = useState<{x: number, y: number}>(() => {
      return appSettings?.bgPosition || JSON.parse(localStorage.getItem('bowls_background_position') || '{"x": 50, "y": 50}');
  });
  const [bgBlur, setBgBlur] = useState<number>(() => {
      return appSettings?.bgBlur || parseFloat(localStorage.getItem('bowls_background_blur') || '0');
  });
  const [bgOverlayOpacity, setBgOverlayOpacity] = useState<number>(() => {
      return appSettings?.bgOverlayOpacity || parseFloat(localStorage.getItem('bowls_background_overlay') || '0.2');
  });
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoreData, setRestoreData] = useState<any>(null);

  const clubChampsRef = useRef<ClubChampsHandle>(null);

  // UI State
  const [currentView, setCurrentView] = useState<ViewMode>('Member');
  // activeTab now holds either a match ID or 'Players'/'Database'
  const [activeTab, setActiveTab] = useState<string>('Dashboard');

  // Save active tab
  useEffect(() => {
      localStorage.setItem('bowls_active_tab', activeTab);
  }, [activeTab]);

  // Warning State
  const [upcomingGamesCount, setUpcomingGamesCount] = useState<number>(0);
  const [overdueGamesCount, setOverdueGamesCount] = useState<number>(0);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [daysUntilNextGame, setDaysUntilNextGame] = useState<number>(0);
  const [daysOverdue, setDaysOverdue] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Effect to update view mode based on user role
  useEffect(() => {
      if (currentUser) {
          if (currentUser.role === 'Admin') {
              setCurrentView('Admin');
          } else if (currentUser.role === 'Admin Editor') {
              setCurrentView('Admin Editor');
          } else {
              setCurrentView('Member');
          }

          // Check for upcoming Club Champs games
          const savedScorecards = localStorage.getItem('bowls_club_champs');
          if (savedScorecards) {
              const scorecards: Scorecard[] = JSON.parse(savedScorecards);
              const today = new Date();
              const todayMidnight = new Date(today.setHours(0,0,0,0));
              const fifteenDaysFromNow = new Date(today);
              fifteenDaysFromNow.setDate(today.getDate() + 15);

              let upcomingCount = 0;
              let overdueCount = 0;
              let minUpcomingDiff = Infinity;
              let maxOverdueDiff = 0;

              scorecards.forEach(sc => {
                  // Check if user is in the scorecard
                  const inTeamA = sc.teamA.assignments.some(a => a.playerId === currentUser.id);
                  const inTeamB = sc.teamB.assignments.some(a => a.playerId === currentUser.id);
                  
                  if ((inTeamA || inTeamB) && sc.playByDate) {
                      const playDate = new Date(sc.playByDate);
                      const playDateMidnight = new Date(playDate.setHours(0,0,0,0));
                      
                      const diffTime = playDateMidnight.getTime() - todayMidnight.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      if (diffDays < 0) {
                          // Overdue
                          overdueCount++;
                          const overdueDays = Math.abs(diffDays);
                          if (overdueDays > maxOverdueDiff) maxOverdueDiff = overdueDays;
                      } else if (diffDays >= 0 && diffDays <= 15) {
                          // Upcoming
                          upcomingCount++;
                          if (diffDays < minUpcomingDiff) minUpcomingDiff = diffDays;
                      }
                  }
              });

              setUpcomingGamesCount(upcomingCount);
              setOverdueGamesCount(overdueCount);
              setDaysUntilNextGame(minUpcomingDiff === Infinity ? 0 : minUpcomingDiff);
              setDaysOverdue(maxOverdueDiff);
              
              setShowWarning(upcomingCount > 0 || overdueCount > 0);
          }
      } else {
          setShowWarning(false);
      }
  }, [currentUser]);

  // Save current user
  useEffect(() => {
      if (currentUser) {
          localStorage.setItem('bowls_current_user', JSON.stringify(currentUser));
      } else {
          localStorage.removeItem('bowls_current_user');
      }
  }, [currentUser]);

  // Initialize Data
  const loadData = async () => {
      // Data is already initialized from localStorage in the useState initializers
      console.log("Data loaded from local storage");
  };

  useEffect(() => {
      loadData();
      
      // Set initial active tab if not set (though useState handles it mostly)
      if (!activeTab && matches.length > 0) {
          setActiveTab(matches[0].id);
      }
  }, []);

  // Save on change
  const saveData = async (manualData?: any) => {
      const content = manualData || {
          players,
          matches,
          databaseMatches,
          scorecards,
          appSettings
      };
      
      localStorage.setItem('bowls_players', JSON.stringify(content.players));
      localStorage.setItem('bowls_matches', JSON.stringify(content.matches));
      localStorage.setItem('bowls_database', JSON.stringify(content.databaseMatches));
      localStorage.setItem('bowls_club_champs', JSON.stringify(content.scorecards));
      localStorage.setItem('bowls_app_settings', JSON.stringify(content.appSettings));
  };

  useEffect(() => {
    // Only save if we have data (avoid overwriting with empty state on initial load)
    if (players.length > 0 || matches.length > 0) {
        saveData();
    }

    if (matches.length > 0) {
      localStorage.setItem('bowls_matches', JSON.stringify(matches));
    }
  }, [matches, players, databaseMatches, scorecards, appSettings]);

  useEffect(() => {
    localStorage.setItem('bowls_database', JSON.stringify(databaseMatches));
  }, [databaseMatches]);

  useEffect(() => {
      localStorage.setItem('bowls_players', JSON.stringify(players));
  }, [players]);

  // Save Background Settings
  useEffect(() => {
      setAppSettings(prev => ({
          ...prev,
          backgroundImage,
          backgroundScale,
          bgPosition,
          bgBlur,
          bgOverlayOpacity
      }));
      
      try {
          if (backgroundImage) {
              localStorage.setItem('bowls_background_image', backgroundImage);
          } else {
              localStorage.removeItem('bowls_background_image');
          }
      } catch (e) {
          console.error('Failed to save background image to localStorage:', e);
      }
      localStorage.setItem('bowls_background_scale', backgroundScale.toString());
      localStorage.setItem('bowls_background_position', JSON.stringify(bgPosition));
      localStorage.setItem('bowls_background_blur', bgBlur.toString());
      localStorage.setItem('bowls_background_overlay', bgOverlayOpacity.toString());
      localStorage.setItem('bowls_app_settings', JSON.stringify({
          backgroundImage,
          backgroundScale,
          bgPosition,
          bgBlur,
          bgOverlayOpacity
      }));
  }, [backgroundImage, backgroundScale, bgPosition, bgBlur, bgOverlayOpacity]);

  // Redirect Members away from Admin-only tabs (Players, Database) and un-emailed matches
  useEffect(() => {
      if (currentView === 'Member') {
          const activeMatch = matches.find(m => m.id === activeTab);
          const isUnconfirmedMatch = activeMatch && !activeMatch.isConfirmed;
          
          if (activeTab === 'Players' || activeTab === 'Database' || isUnconfirmedMatch) {
              const firstAvailableMatch = matches.find(m => m.isConfirmed);
              if (firstAvailableMatch) {
                  setActiveTab(firstAvailableMatch.id);
              } else {
                  setActiveTab('Dashboard');
              }
          }
      }
  }, [currentView, activeTab, matches]);

  const handleMatchUpdate = (updatedMatch: Match) => {
    setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    
    // If a match was just confirmed, switch to its tab
    const oldMatch = matches.find(m => m.id === updatedMatch.id);
    if (oldMatch && !oldMatch.isConfirmed && updatedMatch.isConfirmed) {
        setActiveTab(updatedMatch.id);
    } else if (oldMatch && oldMatch.isConfirmed && !updatedMatch.isConfirmed) {
        // If a match was just unconfirmed, switch to AddNewMatch tab
        setActiveTab('AddNewMatch');
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  const handleExportAllData = () => {
    const allData = {
        matches,
        databaseMatches,
        scorecards,
        appSettings,
        players,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bowls_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setCommitMessage('Backup downloaded successfully! You can now upload this file to your Google Drive.');
    setTimeout(() => setCommitMessage(null), 5000);
  };

  const handleImportAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            
            // Basic validation
            if (!data.matches || !data.players) {
                throw new Error('Invalid backup file format.');
            }

            setRestoreData(data);
            setShowRestoreConfirm(true);
        } catch (error) {
            console.error('Import failed:', error);
            setCommitMessage('Failed to restore backup. Please ensure the file is a valid JSON backup.');
            setTimeout(() => setCommitMessage(null), 5000);
        }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be uploaded again if needed
    e.target.value = '';
  };

  const confirmRestore = () => {
    if (!restoreData) return;
    
    setMatches(restoreData.matches);
    setDatabaseMatches(restoreData.databaseMatches || []);
    setScorecards(restoreData.scorecards || []);
    setAppSettings(restoreData.appSettings || {});
    setPlayers(restoreData.players);
    
    setCommitMessage('Data restored successfully!');
    setTimeout(() => setCommitMessage(null), 5000);
    setActiveTab('AddNewMatch');
    setShowRestoreConfirm(false);
    setRestoreData(null);
  };

  const handleRemoveMatch = (id: string) => {
    const newMatches = matches.filter(m => m.id !== id);
    setMatches(newMatches);
    
    // If we deleted the active tab, switch to Dashboard
    if (activeTab === id) {
        setActiveTab('Dashboard');
    }
  };

  const handleCommitResults = (matchToCommit: Match) => {
    // 1. Commit to Database
    // Create a snapshot with a unique ID to ensure it's treated as a new entry
    const snapshot = {
        ...JSON.parse(JSON.stringify(matchToCommit)),
        id: `${matchToCommit.id}-db-${Date.now()}`
    };

    setDatabaseMatches(prev => {
        // Add new record at the BEGINNING (top)
        return [snapshot, ...prev];
    });

    // 2. Clear scores in Live Match
    setMatches(prev => prev.map(m => {
        if (m.id === matchToCommit.id) {
            return {
                ...m,
                disciplines: m.disciplines.map(d => ({
                    ...d,
                    pointsFor: '',
                    pointsAgainst: ''
                }))
            };
        }
        return m;
    }));

    setCommitMessage('Results saved to Database and scores cleared.');
    setTimeout(() => setCommitMessage(null), 3000);
  };

  const restoreDefaultTabs = () => {
      setShowResetConfirm(true);
  };

  const confirmRestoreDefaultTabs = () => {
      const defaultMatch: Match = {
          ...INITIAL_MATCH,
          id: `match-${Date.now()}`
      };
      setMatches([defaultMatch]);
      setActiveTab('Dashboard');
      setShowResetConfirm(false);
  };

  const handleAddPlayer = (player: Player) => {
      setPlayers(prev => [...prev, player]);
  };

  const handleRemovePlayer = (id: string) => {
      setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePlayer = (updatedPlayer: Player) => {
      setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
      if (currentUser && currentUser.id === updatedPlayer.id) {
          setCurrentUser(updatedPlayer);
      }
  };

  const createNewMatch = () => {
    const newId = `match-${Date.now()}`;
    
    const newMatch: Match = {
        ...INITIAL_MATCH,
        id: newId,
        date: new Date().toISOString().split('T')[0],
        competition: 'New Competition',
        opponent: 'TBD',
        disciplines: [], // Start empty
        selector1Picks: [],
        selector2Picks: [],
        isConfirmed: false,
        selector1Id: '',
        selector2Id: ''
    };
    setMatches([newMatch, ...matches]);
    setActiveTab('AddNewMatch');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        // Validate it's an image
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size too large. Please select an image under 5MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadstart = () => {
            console.log('Starting to read file...');
        };
        reader.onloadend = () => {
            const result = reader.result as string;
            if (result) {
                setBackgroundImage(result);
            } else {
                alert('Failed to load image. The file might be corrupted.');
            }
        };
        reader.onerror = (e) => {
            console.error('FileReader error:', e);
            alert('Error reading file. Please try another image.');
        };
        
        try {
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Error starting FileReader:', err);
            alert('Could not start reading the file.');
        }
    }
  };

  const hasUnavailablePlayer = (match: Match) => {
      return match.disciplines.some(d => d.assignments.some(a => a.availability === 'No'));
  };

  const getMatchTabStyles = (match: Match, isActive: boolean) => {
    let hasNo = hasUnavailablePlayer(match);
    let hasUnset = false;
    
    if (match.disciplines.length === 0) {
        hasUnset = true;
    } else {
        match.disciplines.forEach(d => {
            d.assignments.forEach(a => {
                if (a.availability === 'Unset') hasUnset = true;
            });
        });
    }

    let colorClass = '';
    
    // Priority: Red (Alert) -> Yellow (Pending) -> Green (Ready)
    if (hasNo) {
        // Red
        colorClass = isActive 
            ? 'bg-red-100 text-red-900 border-red-300 ring-2 ring-red-500 ring-offset-1' 
            : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100';
    } else if (hasUnset) {
        // Yellow
        colorClass = isActive 
            ? 'bg-yellow-100 text-yellow-900 border-yellow-300 ring-2 ring-yellow-500 ring-offset-1' 
            : 'bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100';
    } else {
        // Green
        colorClass = isActive 
            ? 'bg-green-100 text-green-900 border-green-300 ring-2 ring-green-500 ring-offset-1' 
            : 'bg-green-50 text-green-800 border-green-200 hover:bg-green-100';
    }

    // Check if current user is selected to play in this match
    const isSelected = currentUser && match.disciplines.some(d => 
        d.assignments.some(a => a.playerId === currentUser.id)
    );

    if (isSelected) {
        // User is playing: Add Blue Border and Badge styling
        // We override the border color to Blue to indicate "Playing"
        // We ONLY add the heavy ring if it is ALSO active
        
        // Remove existing border classes to avoid conflicts (simple string replacement hack or just append !important)
        colorClass = colorClass.replace(/border-[a-z]+-[0-9]+/, '');
        
        if (isActive) {
            // Active & Playing: Blue Ring + Blue Border + Shadow
            colorClass += ' !border-blue-600 !border-2 !ring-4 !ring-blue-500/30 !ring-offset-1 shadow-md z-10 relative';
        } else {
            // Inactive & Playing: Blue Border only (No Ring)
            colorClass += ' !border-blue-400 !border-2 hover:bg-blue-50';
        }
    }

    return `flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${colorClass}`;
  };

  // Determine what to render based on activeTab
  const activeMatch = matches.find(m => m.id === activeTab);

  const handleLogin = (user: Player) => {
      setCurrentUser(user);
      setCommitMessage(`Welcome Back ${user.name}`);
      setTimeout(() => setCommitMessage(null), 3000);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setCurrentView('Member');
  };

  const handleRequestAccess = (name: string, email: string) => {
      const newPlayer: Player = {
          id: `req-${Date.now()}`,
          name,
          email,
          password: 'password', // Default password for demo
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          role: 'Pending',
          isApproved: false,
          status: 'Active'
      };
      setPlayers(prev => [...prev, newPlayer]);
  };

  const handleImportMatches = (newMatches: Match[]) => {
      setDatabaseMatches(prev => {
          const updated = [...prev, ...newMatches];
          return updated;
      });
  };

  return (
    <div className="min-h-screen font-sans relative">
      
      {/* Commit Message Toast */}
      {commitMessage && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4 flex items-center gap-2">
              <Check className="w-5 h-5" />
              <span className="font-bold">{commitMessage}</span>
          </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-orange-100">
                  <div className="p-8 text-center">
                      <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Upload className="w-10 h-10 text-orange-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Restore Backup?</h3>
                      <p className="text-gray-600 mb-8">
                          This will overwrite all current matches, players, and settings with the data from the backup file. This action cannot be undone.
                      </p>
                      <div className="flex flex-col gap-3">
                          <button
                              onClick={confirmRestore}
                              className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-200"
                          >
                              Yes, Restore All Data
                          </button>
                          <button
                              onClick={() => {
                                  setShowRestoreConfirm(false);
                                  setRestoreData(null);
                              }}
                              className="w-full py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                          >
                              Cancel
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in">
                  <div className="flex items-center gap-3 text-red-600 mb-4">
                      <AlertTriangle className="w-8 h-8" />
                      <h3 className="text-xl font-black uppercase tracking-tight">Reset All Tabs?</h3>
                  </div>
                  <p className="text-gray-600 mb-6 font-medium leading-relaxed">
                      This will reset all tabs to the default empty state. <span className="text-red-600 font-bold">Unsaved data in the current tabs will be lost.</span> Database entries are safe.
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={confirmRestoreDefaultTabs}
                          className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-red-200"
                      >
                          Yes, Reset Everything
                      </button>
                      <button 
                          onClick={() => setShowResetConfirm(false)}
                          className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Background Image Layer */}
      {backgroundImage && (
          <div className="fixed inset-0 -z-10 overflow-hidden bg-gray-100">
              <img 
                  src={backgroundImage} 
                  alt="App Background" 
                  className="w-full h-full object-cover transition-transform duration-300"
                  style={{ 
                      transform: `scale(${backgroundScale})`,
                      objectPosition: `${bgPosition.x}% ${bgPosition.y}%`,
                      filter: `blur(${bgBlur}px)`
                  }}
              />
              <div 
                  className="absolute inset-0 bg-white transition-opacity duration-300"
                  style={{ opacity: bgOverlayOpacity }}
              ></div>
          </div>
      )}
      {!backgroundImage && (
          <div className="fixed inset-0 -z-10 bg-gray-100"></div>
      )}

      {!currentUser ? (
          <LoginView 
              players={players} 
              onLogin={handleLogin} 
              onRequestAccess={handleRequestAccess} 
          />
      ) : (
        <>
          {/* Navigation Bar */}
          <nav className="bg-bowls-darkGreen text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-bowls-darkGreen font-bold border-2 border-bowls-green shadow-[0_0_10px_rgba(34,197,94,0.5)]">B</div>
                  <span className="font-bold text-xl tracking-wide hidden sm:inline-block text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.8)]">BowlsManager</span>
               </div>

               {(currentView === 'Admin' || currentView === 'Admin Editor') && (
                    <button
                        onClick={() => {
                            setActiveTab('AddNewMatch');
                        }}
                        className="flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)] border-2 border-blue-400 hover:scale-105 active:scale-95"
                        title="Add New Match Page"
                    >
                        <Plus className="w-4 h-4 mr-2" /> <span>Add New Match Page</span>
                    </button>
                )}

               {activeTab === 'ClubChamps' && currentView !== 'Member' && (
                    <button
                        onClick={() => clubChampsRef.current?.addScorecard()}
                        className="flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-bold text-bowls-darkGreen bg-white hover:bg-gray-100 transition-colors shadow-md border-2 border-dashed border-bowls-darkGreen/30"
                        title="Add Another Scorecard"
                    >
                        <Plus className="w-4 h-4 mr-2" /> <span>Add Another Scorecard</span>
                    </button>
                )}
            </div>

            <div className="flex items-center justify-end gap-4 flex-1">
               <div className="text-sm font-medium text-bowls-green hidden md:block whitespace-nowrap">
                   Welcome, {currentUser.name}
               </div>
               
               {/* View Mode Toggle / Logout */}
               <div className="bg-bowls-green/20 rounded-lg p-1 flex items-center gap-2">
                  {currentUser.role === 'Admin' && (
                      <>
                        <button
                            onClick={() => setShowBackgroundModal(true)}
                            className="px-3 py-1 text-xs font-bold rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors flex items-center gap-1 shadow-sm"
                            title="Edit Layout"
                        >
                            <Image className="w-3 h-3" /> Layout
                        </button>
                        <button
                            onClick={restoreDefaultTabs}
                            className="px-3 py-1 text-xs font-bold rounded-md text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-1 shadow-sm mr-2"
                            title="Restore Default Tabs"
                        >
                            <RefreshCw className="w-3 h-3" /> Restore
                        </button>
                      </>
                  )}
                  
                  <div className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 ${currentUser.role === 'Admin' ? 'bg-white text-bowls-darkGreen shadow' : 'text-bowls-green'}`}>
                    {currentUser.role === 'Admin' ? <Settings className="w-3 h-3" /> : <UserCircle className="w-3 h-3" />}
                    {currentUser.role}
                  </div>

                  <button 
                    onClick={handleLogout}
                    className="px-3 py-1 text-xs font-bold rounded-md text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" /> Logout
                  </button>
               </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Warning Banner */}
        {showWarning && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm flex items-start justify-between animate-in slide-in-from-top-2">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700 font-medium">
                            Attention Required
                        </p>
                        <div className="text-sm text-red-600 mt-1 space-y-1">
                            {overdueGamesCount > 0 && (
                                <p>
                                    You have <span className="font-bold">{overdueGamesCount}</span> overdue {overdueGamesCount === 1 ? 'game' : 'games'} ({daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue).
                                </p>
                            )}
                            {upcomingGamesCount > 0 && (
                                <p>
                                    You have <span className="font-bold">{upcomingGamesCount}</span> upcoming {upcomingGamesCount === 1 ? 'game' : 'games'} (next game in {daysUntilNextGame} {daysUntilNextGame === 1 ? 'day' : 'days'}).
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => setShowWarning(false)}
                    className="ml-auto pl-3 text-red-400 hover:text-red-500"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        )}

        {/* Dynamic Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center mb-8 gap-4">
            <div className="w-full">
                <div className="flex flex-wrap gap-2 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm border border-gray-200">
                    {/* Dashboard Tab */}
                    <button
                        onClick={() => setActiveTab('Dashboard')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
                            activeTab === 'Dashboard' 
                            ? 'bg-bowls-darkGreen text-white border-bowls-darkGreen ring-2 ring-bowls-green ring-offset-1' 
                            : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                    </button>

                    <div className="w-px bg-gray-200 mx-2"></div>

                    {/* Match Tabs */}
                    {matches.map(match => {
                        // Hide unconfirmed matches from the main tab bar
                        if (!match.isConfirmed) {
                            return null;
                        }
                        
                        const isSelected = currentUser && match.disciplines.some(d => 
                            d.assignments.some(a => a.playerId === currentUser.id)
                        );
                        const isActive = activeTab === match.id;
                        return (
                        <div key={match.id} className="relative group">
                            <button
                                onClick={() => setActiveTab(match.id)}
                                className={getMatchTabStyles(match, isActive)}
                            >
                                <Shield className="w-4 h-4 mr-2" />
                                {match.competition || 'Untitled Match'}
                                {isSelected && isActive && (
                                    <div className="ml-2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                                        <UserCircle className="w-3 h-3" />
                                        <span>PLAYING</span>
                                    </div>
                                )}
                            </button>
                            {(currentView === 'Admin' || currentView === 'Admin Editor') && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveMatch(match.id);
                                    }}
                                    className="absolute -top-2 -right-2 bg-white text-gray-400 hover:text-white hover:bg-red-500 border border-gray-200 rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
                                    title="Delete Match"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )})}


                    <div className="w-px bg-gray-200 mx-2"></div>

                    {/* Club Champs Tab (Available to Admin and Member) */}
                    <button
                        onClick={() => {
                            setActiveTab('ClubChamps');
                            setShowWarning(false); // Clear warning on click
                        }}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
                            activeTab === 'ClubChamps' 
                            ? 'bg-gray-100 text-gray-900 border-gray-300 ring-2 ring-gray-400 ring-offset-1' 
                            : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
                        }`}
                    >
                        <Trophy className="w-4 h-4 mr-2" />
                        Club Champs
                        {showWarning && (
                            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">
                                {upcomingGamesCount}
                            </span>
                        )}
                    </button>

                    {/* My Availability Tab */}
                    <button
                        onClick={() => setActiveTab('Availability')}
                        className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
                            activeTab === 'Availability' 
                            ? 'bg-gray-100 text-gray-900 border-gray-300 ring-2 ring-gray-400 ring-offset-1' 
                            : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
                        }`}
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        My Availability
                    </button>

                    {/* Admin Only: Players Tab */}
                    {currentView === 'Admin' && (
                        <button
                            onClick={() => setActiveTab('Players')}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
                                activeTab === 'Players' 
                                ? 'bg-gray-100 text-gray-900 border-gray-300 ring-2 ring-gray-400 ring-offset-1' 
                                : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Players
                        </button>
                    )}

                    {/* Admin Only: Database Tab */}
                    {(currentView === 'Admin' || currentView === 'Admin Editor') && (
                        <button
                            onClick={() => setActiveTab('Database')}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
                                activeTab === 'Database' 
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300 ring-2 ring-indigo-400 ring-offset-1' 
                                : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            <Table className="w-4 h-4 mr-2" />
                            Database
                        </button>
                    )}

                    {/* Admin Only: Ledger Tab (Old Database View) */}
                    {(currentView === 'Admin' || currentView === 'Admin Editor') && (
                        <button
                            onClick={() => setActiveTab('Ledger')}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
                                activeTab === 'Ledger' 
                                ? 'bg-gray-100 text-gray-900 border-gray-300 ring-2 ring-gray-400 ring-offset-1' 
                                : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Ledger
                        </button>
                    )}

                    {/* Admin Only: Settings Tab */}
                    {(currentView === 'Admin' || currentView === 'Admin Editor') && (
                        <button
                            onClick={() => setActiveTab('Settings')}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
                                activeTab === 'Settings' 
                                ? 'bg-gray-100 text-gray-900 border-gray-300 ring-2 ring-gray-400 ring-offset-1' 
                                : 'bg-white text-gray-500 border-transparent hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* Content Render */}
        <div className="min-h-[500px]">
            {activeTab === 'Dashboard' ? (
                <Dashboard 
                    matches={matches} 
                    scorecards={scorecards} 
                    players={players} 
                    currentUser={currentUser}
                    onSelectTab={setActiveTab}
                />
            ) : activeMatch ? (
                <MatchEditor 
                    match={activeMatch} 
                    players={players} 
                    databaseMatches={databaseMatches}
                    viewMode={currentView}
                    currentUser={currentUser}
                    onMatchUpdate={handleMatchUpdate}
                    onCommitResults={handleCommitResults}
                    onViewResults={() => setActiveTab('Database')}
                    isLatestMatch={matches.findIndex(m => m.id === activeMatch.id) === 0}
                    isRedMatch={hasUnavailablePlayer(activeMatch)}
                />
            ) : activeTab === 'AddNewMatch' ? (
                <div className="space-y-12">
                    {matches.filter(m => !m.isConfirmed || hasUnavailablePlayer(m)).length > 0 && (
                        <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Shield className="w-6 h-6 text-bowls-darkGreen" />
                                Draft Matches
                            </h2>
                            <button
                                onClick={createNewMatch}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.6)] border border-blue-400 hover:scale-105 active:scale-95"
                            >
                                <Plus className="w-5 h-5" /> Add New Match
                            </button>
                        </div>
                    )}
                    {matches.filter(m => !m.isConfirmed || hasUnavailablePlayer(m)).sort((a, b) => {
                        const aRed = hasUnavailablePlayer(a);
                        const bRed = hasUnavailablePlayer(b);
                        if (aRed && !bRed) return -1;
                        if (!aRed && bRed) return 1;
                        return 0;
                    }).map((match, index) => {
                        const isRed = hasUnavailablePlayer(match);
                        return (
                        <div key={match.id} className={`relative rounded-2xl shadow-sm border p-6 ${isRed ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}>
                            {/* Delete button for draft match */}
                            <div className="absolute top-4 right-4 z-10">
                                <button
                                    onClick={() => handleRemoveMatch(match.id)}
                                    className="bg-white text-gray-400 hover:text-white hover:bg-red-500 border border-gray-200 rounded-full p-2 shadow-sm transition-all"
                                    title="Delete Draft"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <MatchEditor 
                                match={match} 
                                players={players} 
                                databaseMatches={databaseMatches}
                                viewMode={currentView}
                                currentUser={currentUser}
                                onMatchUpdate={handleMatchUpdate}
                                onCommitResults={handleCommitResults}
                                onViewResults={() => setActiveTab('Database')}
                                isLatestMatch={index === 0}
                                isRedMatch={isRed}
                            />
                        </div>
                    )})}
                    {matches.filter(m => !m.isConfirmed || hasUnavailablePlayer(m)).length === 0 && (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No Draft Matches</h3>
                            <p className="text-gray-500 mb-6">Click "Add New Match" to create a new match.</p>
                            <button
                                onClick={createNewMatch}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-[0_0_20px_rgba(37,99,235,0.6)] border border-blue-400 hover:scale-105 active:scale-95"
                            >
                                Add New Match
                            </button>
                        </div>
                    )}
                </div>
            ) : activeTab === 'ClubChamps' ? (
                <ClubChamps 
                    ref={clubChampsRef}
                    players={players} 
                    scorecards={scorecards}
                    setScorecards={setScorecards}
                    onCommitResults={handleCommitResults}
                    viewMode={currentView}
                    currentUser={currentUser}
                />
            ) : activeTab === 'Availability' ? (
                <PlayerAvailability 
                    currentUser={currentUser}
                    players={players}
                    onUpdatePlayer={handleUpdatePlayer}
                />
            ) : activeTab === 'Players' && currentView === 'Admin' ? (
                <PlayerManager 
                    players={players} 
                    onAddPlayer={handleAddPlayer} 
                    onRemovePlayer={handleRemovePlayer}
                    onUpdatePlayer={handleUpdatePlayer}
                />
            ) : activeTab === 'Ledger' ? (
                <DatabaseView 
                    matches={databaseMatches} 
                    players={players} 
                    onUpdateMatch={(updatedMatch) => {
                        setDatabaseMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
                    }}
                    onDeleteMatch={(matchId) => {
                        setDatabaseMatches(prev => prev.filter(m => m.id !== matchId));
                    }}
                    onImportMatches={handleImportMatches}
                    onAddPlayer={handleAddPlayer}
                />
            ) : activeTab === 'Database' ? (
                <SpreadsheetView 
                    data={databaseMatches}
                    isLoading={isSyncing}
                    onRefresh={loadData}
                    onSave={(newData) => {
                        setDatabaseMatches(newData);
                        saveData({ 
                            players,
                            matches,
                            databaseMatches: newData,
                            scorecards,
                            appSettings
                        });
                    }}
                />
            ) : activeTab === 'Settings' && (currentView === 'Admin' || currentView === 'Admin Editor') ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-6">
                            <Settings className="w-6 h-6 text-bowls-darkGreen" />
                            System Settings
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Backup & Export */}
                            <div className="space-y-4 p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Download className="w-5 h-5 text-blue-600" />
                                    Backup & Export
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Download a complete backup of all application data (matches, players, scorecards, and settings). 
                                    You can use this file to restore your data on another account or keep it as a safe copy on Google Drive.
                                </p>
                                <button
                                    onClick={handleExportAllData}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 hover:scale-105 active:scale-95"
                                >
                                    <Download className="w-5 h-5" />
                                    Download Full Backup (.json)
                                </button>
                            </div>

                            {/* Restore Data */}
                            <div className="space-y-4 p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Upload className="w-5 h-5 text-orange-600" />
                                    Restore Data
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Upload a previously exported backup file to restore all application data. 
                                    <span className="text-red-600 font-bold"> Warning: This will overwrite all current data.</span>
                                </p>
                                <label className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold hover:border-orange-500 hover:text-orange-600 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95">
                                    <Upload className="w-5 h-5" />
                                    Upload Backup File
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        onChange={handleImportAllData} 
                                        className="hidden" 
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Reset Section */}
                    <div className="bg-red-50 p-8 rounded-2xl border border-red-200">
                        <h3 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5" />
                            Danger Zone
                        </h3>
                        <p className="text-sm text-red-600 mb-6">
                            Resetting the application will clear all local data and restore the default mock players and matches. 
                            This action cannot be undone unless you have a backup.
                        </p>
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 hover:scale-105 active:scale-95"
                        >
                            Reset Application Data
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white/90 backdrop-blur-sm rounded-xl shadow border border-dashed border-gray-300">
                    <p className="text-gray-500 mb-4">No matches selected.</p>
                    {(currentView === 'Admin' || currentView === 'Admin Editor') && matches.length === 0 && (
                        <button onClick={createNewMatch} className="text-bowls-darkGreen font-bold hover:underline flex items-center gap-2">
                             <Plus className="w-4 h-4" /> Create your first match
                        </button>
                    )}
                </div>
            )}
        </div>
      </main>
    </>
  )}

      {/* Background Editor Modal */}
      {showBackgroundModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <Image className="w-5 h-5 text-bowls-darkGreen" />
                          Layout Editor
                      </h3>
                      <button 
                          onClick={() => setShowBackgroundModal(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                      {/* Upload Section */}
                      <div className="space-y-2">
                          <label className="block text-sm font-bold text-gray-700">Background Image</label>
                          <div className="flex items-center gap-3">
                              <label className="flex-1 cursor-pointer bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-bowls-green hover:bg-bowls-green/5 transition-all group text-center">
                                  <input 
                                      type="file" 
                                      accept="image/*" 
                                      onChange={handleImageUpload}
                                      className="hidden" 
                                  />
                                  <div className="flex flex-col items-center gap-2 text-gray-500 group-hover:text-bowls-darkGreen">
                                      <Upload className="w-6 h-6" />
                                      <span className="text-xs font-medium">Click to upload file</span>
                                  </div>
                              </label>
                              {backgroundImage && (
                                  <button 
                                      onClick={() => setBackgroundImage(null)}
                                      className="p-4 rounded-xl border-2 border-red-100 bg-red-50 text-red-500 hover:bg-red-100 hover:border-red-200 transition-colors"
                                      title="Remove Background"
                                  >
                                      <Trash2 className="w-6 h-6" />
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* Controls Section */}
                      {backgroundImage && (
                          <div className="space-y-6">
                              {/* Scale */}
                              <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Scale</label>
                                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                          {Math.round(backgroundScale * 100)}%
                                      </span>
                                  </div>
                                  <input 
                                      type="range" 
                                      min="1" 
                                      max="2" 
                                      step="0.1" 
                                      value={backgroundScale}
                                      onChange={(e) => setBackgroundScale(parseFloat(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bowls-darkGreen"
                                  />
                              </div>

                              {/* Position X */}
                              <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Horizontal Position</label>
                                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                          {bgPosition.x}%
                                      </span>
                                  </div>
                                  <input 
                                      type="range" 
                                      min="0" 
                                      max="100" 
                                      value={bgPosition.x}
                                      onChange={(e) => setBgPosition(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bowls-darkGreen"
                                  />
                              </div>

                              {/* Position Y */}
                              <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Vertical Position</label>
                                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                          {bgPosition.y}%
                                      </span>
                                  </div>
                                  <input 
                                      type="range" 
                                      min="0" 
                                      max="100" 
                                      value={bgPosition.y}
                                      onChange={(e) => setBgPosition(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bowls-darkGreen"
                                  />
                              </div>

                              {/* Blur */}
                              <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Blur</label>
                                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                          {bgBlur}px
                                      </span>
                                  </div>
                                  <input 
                                      type="range" 
                                      min="0" 
                                      max="20" 
                                      value={bgBlur}
                                      onChange={(e) => setBgBlur(parseInt(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bowls-darkGreen"
                                  />
                              </div>

                              {/* Overlay Opacity */}
                              <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Overlay Opacity</label>
                                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                          {Math.round(bgOverlayOpacity * 100)}%
                                      </span>
                                  </div>
                                  <input 
                                      type="range" 
                                      min="0" 
                                      max="1" 
                                      step="0.05" 
                                      value={bgOverlayOpacity}
                                      onChange={(e) => setBgOverlayOpacity(parseFloat(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-bowls-darkGreen"
                                  />
                              </div>
                          </div>
                      )}

                      {!backgroundImage && (
                          <div className="p-4 bg-blue-50 text-blue-700 text-sm rounded-lg flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                              <p>Upload an image to unlock layout controls.</p>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                      <button 
                          onClick={() => {
                              if (confirm('Reset all layout settings to default?')) {
                                  setBackgroundScale(1);
                                  setBgPosition({ x: 50, y: 50 });
                                  setBgBlur(0);
                                  setBgOverlayOpacity(0.2);
                              }
                          }}
                          className="text-xs font-bold text-gray-500 hover:text-red-500 transition-colors"
                      >
                          Reset Defaults
                      </button>
                      <button 
                          onClick={() => setShowBackgroundModal(false)}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)] border border-blue-400 hover:scale-105 active:scale-95"
                      >
                          Done
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;