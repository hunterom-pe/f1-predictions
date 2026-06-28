import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { calculateStandings } from './lib/scoring';
import { fetchSchedule, fetchDrivers } from './services/f1Api';
import Login from './components/Login';
import Leaderboard from './components/Leaderboard';
import RaceSchedule from './components/RaceSchedule';
import RaceDetail from './components/RaceDetail';
import AdminPanel from './components/AdminPanel';
import { Trophy, Calendar, Settings, LogOut, ArrowLeft, Loader2, Flag } from 'lucide-react';

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [results, setResults] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState('standings'); // standings or calendar

  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('f1_prediction_user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setLoading(true);
    try {
      // 1. Fetch Jolpica F1 API static data (calendar & drivers)
      const [f1Schedule, f1Drivers] = await Promise.all([
        fetchSchedule(),
        fetchDrivers()
      ]);
      setSchedule(f1Schedule);
      setDrivers(f1Drivers);

      // 2. Fetch Supabase DB data
      await refreshDbData();
    } catch (err) {
      console.error("Initialization error:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshDbData = async () => {
    try {
      const [profilesRes, predictionsRes, resultsRes] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('predictions').select('*'),
        supabase.from('race_results').select('*')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (predictionsRes.error) throw predictionsRes.error;
      if (resultsRes.error) throw resultsRes.error;

      setProfiles(profilesRes.data || []);
      setPredictions(predictionsRes.data || []);
      setResults(resultsRes.data || []);
    } catch (err) {
      console.error("Error refreshing database:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('f1_prediction_user');
    setCurrentUser(null);
    navigate('/');
  };

  // Calculate seasonal standings
  const standings = calculateStandings(profiles, predictions, results);
  const currentLeader = standings[0];

  // Helper component for race-specific details route
  const RaceDetailWrapper = () => {
    const { round } = useParams();
    const roundNumber = Number(round);
    const race = schedule.find(r => Number(r.round) === roundNumber);

    if (!race) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-neutral-400">
          <p className="uppercase text-xs tracking-widest">Race round not found</p>
          <Link to="/" className="mt-4 text-xs accent-text font-bold uppercase flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white uppercase font-bold tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <RaceDetail
          round={roundNumber}
          race={race}
          drivers={drivers}
          currentUser={currentUser}
          results={results}
          onPredictionSaved={refreshDbData}
        />
      </div>
    );
  };

  // Helper component for admin route
  const AdminWrapper = () => {
    // Current active round default
    const now = new Date();
    const active = schedule.find(race => {
      const raceDateTime = new Date(`${race.date}T${race.time || '15:00:00Z'}`);
      return raceDateTime >= now;
    }) || schedule[schedule.length - 1];

    const currentRound = active ? Number(active.round) : 1;

    return (
      <div className="space-y-6">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white uppercase font-bold tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <AdminPanel
          round={currentRound}
          schedule={schedule}
          drivers={drivers}
          results={results}
          onResultsUpdated={refreshDbData}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-10 h-10 animate-spin accent-text mb-4" />
        <p className="text-xs uppercase tracking-widest text-neutral-400">Configuring Pitlane...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-neutral-800">
      {/* Top Navigation Bar */}
      <nav className="border-b border-neutral-900 bg-neutral-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full accent-bg animate-pulse"></div>
            <span className="font-mono font-black text-md tracking-wider uppercase text-white">
              F1 prediction
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-neutral-500 hover:text-white transition">
              <Settings className="w-5 h-5" />
            </Link>
            
            <div className="h-4 w-px bg-neutral-900"></div>
            
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-[9px] text-neutral-500 uppercase leading-none">Driver</p>
                <p className="text-xs font-bold text-white uppercase">{currentUser.name}</p>
              </div>
              <button 
                onClick={handleLogout} 
                className="p-1.5 hover:bg-neutral-900 rounded border border-transparent hover:border-neutral-850 text-neutral-500 hover:text-white transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          {/* Dashboard Route */}
          <Route path="/" element={
            <div className="space-y-6">
              {/* Standings overview banner */}
              {currentLeader && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-neutral-950 border border-neutral-900 rounded p-4 text-xs gap-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span>
                      Championship Leader: <span className="font-bold text-white uppercase">{currentLeader.name}</span> with <span className="font-mono font-bold accent-text">{currentLeader.totalPoints} PTS</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-600 uppercase font-mono">2026 Predictions League</span>
                </div>
              )}

              {/* Tab Navigation */}
              <div className="flex border-b border-neutral-900">
                <button
                  onClick={() => setActiveTab('standings')}
                  className={`py-3 px-6 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                    activeTab === 'standings'
                      ? 'border-white text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  Standings
                </button>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className={`py-3 px-6 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
                    activeTab === 'calendar'
                      ? 'border-white text-white'
                      : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  Race Calendar
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'standings' ? (
                <Leaderboard standings={standings} />
              ) : (
                <RaceSchedule
                  schedule={schedule}
                  results={results}
                  onSelectRace={(round) => navigate(`/race/${round}`)}
                />
              )}
            </div>
          } />
          
          {/* Race details page */}
          <Route path="/race/:round" element={<RaceDetailWrapper />} />

          {/* Admin panel */}
          <Route path="/admin" element={<AdminWrapper />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}
