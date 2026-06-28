import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { calculatePoints } from '../lib/scoring';
import { getCircuitMetadata } from '../data/circuits';
import { fetchQualifyingResult, fetchRaceResult } from '../services/f1Api';
import { 
  Lock, Unlock, Send, Sparkles, AlertTriangle, 
  MapPin, CheckCircle, XCircle, Trophy, Flag, Timer
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RaceDetail({ round, race, drivers, currentUser, results, onPredictionSaved }) {
  const [predictions, setPredictions] = useState([]);
  const [userPrediction, setUserPrediction] = useState({
    pole_driver_id: '',
    p1_driver_id: '',
    p2_driver_id: '',
    p3_driver_id: '',
    dotd_driver_id: '',
    chaos_vector: false
  });
  
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const now = new Date();
  
  // Lock logic: Lock if current time > qualifying session time or 24h before race if qualifying is missing
  let isLocked = false;
  let lockTimeStr = "";
  if (race) {
    let qualifyingDateTime = null;
    if (race.Qualifying && race.Qualifying.date) {
      qualifyingDateTime = new Date(`${race.Qualifying.date}T${race.Qualifying.time || '15:00:00Z'}`);
      lockTimeStr = `Qualifying start: ${qualifyingDateTime.toLocaleString()}`;
    } else {
      // Fallback: 24h before race
      qualifyingDateTime = new Date(`${race.date}T${race.time || '15:00:00Z'}`);
      qualifyingDateTime.setHours(qualifyingDateTime.getHours() - 24);
      lockTimeStr = `24h before Race: ${qualifyingDateTime.toLocaleString()}`;
    }
    isLocked = now > qualifyingDateTime;
  }

  const circuitMeta = race ? getCircuitMetadata(race.Circuit.circuitId) : null;
  const raceResult = results.find(r => r.round === round);
  const isFinalized = raceResult?.is_finalized;

  // Set the dynamic accent color in root node
  useEffect(() => {
    if (circuitMeta?.accent) {
      document.documentElement.style.setProperty('--accent-color', circuitMeta.accent);
    }
  }, [circuitMeta]);

  // Load predictions, comments, and current user prediction
  useEffect(() => {
    if (!round) return;
    loadRaceData();
    // Setup real-time subscription for comments
    const commentsSubscription = supabase
      .channel('public:banter_wall')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'banter_wall', filter: `round=eq.${round}` }, () => {
        loadComments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, [round, currentUser]);

  const loadRaceData = async () => {
    setErrorMsg('');
    try {
      // Load all predictions for this round
      const { data: preds, error: predsErr } = await supabase
        .from('predictions')
        .select('*, profiles(name)')
        .eq('round', round);

      if (predsErr) throw predsErr;
      setPredictions(preds || []);

      // Filter current user's prediction
      if (currentUser) {
        const userPred = preds.find(p => p.user_id === currentUser.id);
        if (userPred) {
          setUserPrediction({
            pole_driver_id: userPred.pole_driver_id,
            p1_driver_id: userPred.p1_driver_id,
            p2_driver_id: userPred.p2_driver_id,
            p3_driver_id: userPred.p3_driver_id,
            dotd_driver_id: userPred.dotd_driver_id,
            chaos_vector: userPred.chaos_vector
          });
        } else {
          // Reset
          setUserPrediction({
            pole_driver_id: '',
            p1_driver_id: '',
            p2_driver_id: '',
            p3_driver_id: '',
            dotd_driver_id: '',
            chaos_vector: false
          });
        }
      }

      await loadComments();
    } catch (err) {
      console.error("Error loading race details:", err);
      setErrorMsg("Failed to load prediction data.");
    }
  };

  const loadComments = async () => {
    const { data: comms, error: commsErr } = await supabase
      .from('banter_wall')
      .select('*, profiles(name)')
      .eq('round', round)
      .order('created_at', { ascending: true });

    if (!commsErr) {
      setComments(comms || []);
    }
  };

  const handleSavePrediction = async (e) => {
    e.preventDefault();
    if (isLocked) {
      setErrorMsg("Submissions are locked for this race weekend!");
      return;
    }
    if (!currentUser) return;

    // Check full validation
    const { pole_driver_id, p1_driver_id, p2_driver_id, p3_driver_id, dotd_driver_id } = userPrediction;
    if (!pole_driver_id || !p1_driver_id || !p2_driver_id || !p3_driver_id || !dotd_driver_id) {
      setErrorMsg("Please make picks for all fields!");
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Upsert prediction
      const { error } = await supabase
        .from('predictions')
        .upsert(
          {
            user_id: currentUser.id,
            round,
            pole_driver_id,
            p1_driver_id,
            p2_driver_id,
            p3_driver_id,
            dotd_driver_id,
            chaos_vector: userPrediction.chaos_vector
          },
          { onConflict: 'user_id,round' }
        );

      if (error) throw error;
      
      setSuccessMsg("Predictions saved in grid!");
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: [circuitMeta?.accent || '#FF0000', '#000000', '#FFFFFF']
      });
      loadRaceData();
      if (onPredictionSaved) onPredictionSaved();
    } catch (err) {
      console.error("Upsert failed:", err);
      setErrorMsg("Failed to save prediction. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setCommentSaving(true);
    try {
      const { error } = await supabase
        .from('banter_wall')
        .insert({
          round,
          user_id: currentUser.id,
          comment: newComment.trim()
        });

      if (error) throw error;
      setNewComment('');
      loadComments();
    } catch (err) {
      console.error("Comment post error:", err);
    } finally {
      setCommentSaving(false);
    }
  };

  const renderComparisonCell = (predictedId, actualId, allActualPodiums = null) => {
    const predictedDriver = drivers.find(d => d.driverId === predictedId);
    const code = predictedDriver ? `${predictedDriver.code || predictedDriver.familyName.slice(0, 3).toUpperCase()}` : predictedId;
    
    let isHit = false;
    if (allActualPodiums) {
      isHit = allActualPodiums.includes(predictedId);
    } else {
      isHit = predictedId === actualId;
    }

    if (!isFinalized || !actualId) {
      return <span className="font-mono text-xs">{code || '-'}</span>;
    }

    return (
      <span className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded ${
        isHit ? 'bg-green-950/30 text-green-400 border border-green-900/60' : 'bg-red-950/30 text-red-400 border border-red-900/60'
      }`}>
        {isHit ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> : <XCircle className="w-3 h-3 flex-shrink-0" />}
        {code}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Section: Circuit Info */}
      {race && (
        <div className="carbon-panel rounded-lg p-6 border border-neutral-800 relative overflow-hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Left: Circuit meta data bento grid */}
            <div className="space-y-4 flex-1">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs accent-text font-bold uppercase tracking-widest">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{circuitMeta?.city || race.Circuit.Location.locality}, {race.Circuit.Location.country}</span>
                </div>
                <h1 className="text-3xl font-black uppercase text-white tracking-tight leading-none">
                  {race.raceName}
                </h1>
                <p className="text-sm text-neutral-400">{circuitMeta?.name || race.Circuit.circuitName}</p>
              </div>

              {/* Bento circuit stats */}
              {circuitMeta && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-black/60 border border-neutral-900 p-3 rounded text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Lap Count</p>
                    <p className="text-lg font-mono font-bold text-white mt-0.5">{circuitMeta.laps}</p>
                  </div>
                  <div className="bg-black/60 border border-neutral-900 p-3 rounded text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Lap Length</p>
                    <p className="text-lg font-mono font-bold text-white mt-0.5">{circuitMeta.length} km</p>
                  </div>
                  <div className="bg-black/60 border border-neutral-900 p-3 rounded text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Race Distance</p>
                    <p className="text-lg font-mono font-bold text-white mt-0.5">{circuitMeta.distance} km</p>
                  </div>
                  <div className="bg-black/60 border border-neutral-900 p-3 rounded text-center">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest">DRS Zones</p>
                    <p className="text-lg font-mono font-bold text-white mt-0.5">{circuitMeta.drsZones}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right: SVG track map */}
            {circuitMeta?.svgPath && (
              <div className="w-full lg:w-64 h-40 flex items-center justify-center bg-neutral-950 rounded border border-neutral-900 p-4 relative">
                <svg viewBox={circuitMeta.viewBox || "0 0 500 500"} className="w-full h-full stroke-neutral-700 stroke-[3px] fill-none">
                  {/* Dynamic outline with glow */}
                  <path 
                    d={circuitMeta.svgPath} 
                    className="stroke-[var(--accent-color)] transition-all duration-350"
                    vectorEffect="non-scaling-stroke"
                    style={{
                      filter: `drop-shadow(0 0 4px ${circuitMeta.accent})`
                    }}
                  />
                  {/* Outline overlay */}
                  <path d={circuitMeta.svgPath} className="stroke-white/45 stroke-[1.5px]" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="absolute bottom-2 right-2 text-[8px] font-mono text-neutral-600 uppercase tracking-widest">
                  Circuit Layout
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lock status banner */}
      <div className={`p-3 rounded border text-xs flex items-center justify-between gap-3 ${
        isLocked 
          ? 'bg-red-950/20 border-red-900/50 text-red-400' 
          : 'bg-green-950/20 border-green-900/50 text-green-400'
      }`}>
        <div className="flex items-center gap-2">
          {isLocked ? <Lock className="w-4 h-4 flex-shrink-0" /> : <Unlock className="w-4 h-4 flex-shrink-0" />}
          <span>
            {isLocked 
              ? `Submissions are locked for this round. (${lockTimeStr})` 
              : `Submissions are open! Entries lock at: ${lockTimeStr}`
            }
          </span>
        </div>
        <span className="font-mono text-[10px] opacity-80">{isLocked ? 'LOCKED' : 'OPEN'}</span>
      </div>

      {/* Grid Layout for Prediction Entry Form & Standings Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Prediction Form (left 5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="carbon-panel rounded-lg p-6 border border-neutral-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-400" />
              Make Your Picks
            </h2>

            <form onSubmit={handleSavePrediction} className="space-y-4">
              {/* Pole Position */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Pole Position Winner
                </label>
                <select
                  disabled={isLocked || saving}
                  value={userPrediction.pole_driver_id}
                  onChange={(e) => setUserPrediction({ ...userPrediction, pole_driver_id: e.target.value })}
                  className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2.5 px-3 outline-none focus:border-neutral-800 disabled:opacity-50"
                >
                  <option value="" disabled>-- Select Driver --</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.driverId}>
                      {d.givenName} {d.familyName} ({d.code || d.familyName.slice(0, 3).toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Podium P1 */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  P1 Winner
                </label>
                <select
                  disabled={isLocked || saving}
                  value={userPrediction.p1_driver_id}
                  onChange={(e) => setUserPrediction({ ...userPrediction, p1_driver_id: e.target.value })}
                  className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2.5 px-3 outline-none focus:border-neutral-800 disabled:opacity-50"
                >
                  <option value="" disabled>-- Select Driver --</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.driverId}>
                      {d.givenName} {d.familyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Podium P2 */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  P2 Position
                </label>
                <select
                  disabled={isLocked || saving}
                  value={userPrediction.p2_driver_id}
                  onChange={(e) => setUserPrediction({ ...userPrediction, p2_driver_id: e.target.value })}
                  className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2.5 px-3 outline-none focus:border-neutral-800 disabled:opacity-50"
                >
                  <option value="" disabled>-- Select Driver --</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.driverId}>
                      {d.givenName} {d.familyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Podium P3 */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  P3 Position
                </label>
                <select
                  disabled={isLocked || saving}
                  value={userPrediction.p3_driver_id}
                  onChange={(e) => setUserPrediction({ ...userPrediction, p3_driver_id: e.target.value })}
                  className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2.5 px-3 outline-none focus:border-neutral-800 disabled:opacity-50"
                >
                  <option value="" disabled>-- Select Driver --</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.driverId}>
                      {d.givenName} {d.familyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Driver of the Day */}
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Driver of the Day
                </label>
                <select
                  disabled={isLocked || saving}
                  value={userPrediction.dotd_driver_id}
                  onChange={(e) => setUserPrediction({ ...userPrediction, dotd_driver_id: e.target.value })}
                  className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2.5 px-3 outline-none focus:border-neutral-800 disabled:opacity-50"
                >
                  <option value="" disabled>-- Select Driver --</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.driverId}>
                      {d.givenName} {d.familyName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chaos Vector Toggle */}
              <div className="flex items-center justify-between p-3 bg-neutral-950 rounded border border-neutral-900 mt-2">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Chaos Vector Pick
                  </label>
                  <span className="text-[10px] text-neutral-500 block">Safety Car/Red Flag/DNF Over?</span>
                </div>
                <button
                  type="button"
                  disabled={isLocked || saving}
                  onClick={() => setUserPrediction({ ...userPrediction, chaos_vector: !userPrediction.chaos_vector })}
                  className={`px-4 py-1.5 text-xs font-mono font-bold uppercase rounded border transition ${
                    userPrediction.chaos_vector 
                      ? 'bg-red-950/20 text-red-400 border-red-900/60' 
                      : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                  }`}
                >
                  {userPrediction.chaos_vector ? 'YES' : 'NO'}
                </button>
              </div>

              {successMsg && <p className="text-xs text-green-400 bg-green-950/20 p-2.5 rounded border border-green-900/50">{successMsg}</p>}
              {errorMsg && <p className="text-xs text-red-400 bg-red-950/20 p-2.5 rounded border border-red-900/50">{errorMsg}</p>}

              <button
                type="submit"
                disabled={isLocked || saving || !currentUser}
                className="w-full py-2.5 bg-white text-black font-semibold rounded hover:bg-neutral-200 transition uppercase tracking-wider text-xs disabled:opacity-50"
              >
                {saving ? "Locking in..." : isLocked ? "Predictions Locked" : "Lock in Picks"}
              </button>
            </form>
          </div>
        </div>

        {/* Comparative Scores and Official Results (right 7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="carbon-panel rounded-lg p-6 border border-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Round Comparison
              </h2>
              {isFinalized && (
                <span className="text-[9px] bg-green-950/30 text-green-400 border border-green-900/60 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                  Finalized
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900">
                    <th className="py-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Metric</th>
                    <th className="py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Hunter</th>
                    <th className="py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Danny</th>
                    <th className="py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Adrian</th>
                    <th className="py-2 text-[10px] font-bold accent-text uppercase tracking-wider">Official</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 font-sans">
                  {/* Pole Sitter */}
                  <tr>
                    <td className="py-3 text-xs font-semibold text-neutral-400">Pole</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Hunter')?.pole_driver_id, raceResult?.pole_driver_id)}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Danny')?.pole_driver_id, raceResult?.pole_driver_id)}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Adrian')?.pole_driver_id, raceResult?.pole_driver_id)}</td>
                    <td className="py-3 font-mono text-xs font-bold uppercase text-white">
                      {drivers.find(d => d.driverId === raceResult?.pole_driver_id)?.code || raceResult?.pole_driver_id || '-'}
                    </td>
                  </tr>

                  {/* P1 Winner */}
                  <tr>
                    <td className="py-3 text-xs font-semibold text-neutral-400">P1</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Hunter')?.p1_driver_id, raceResult?.p1_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Danny')?.p1_driver_id, raceResult?.p1_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Adrian')?.p1_driver_id, raceResult?.p1_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3 font-mono text-xs font-bold text-white">
                      {drivers.find(d => d.driverId === raceResult?.p1_driver_id)?.code || raceResult?.p1_driver_id || '-'}
                    </td>
                  </tr>

                  {/* P2 Position */}
                  <tr>
                    <td className="py-3 text-xs font-semibold text-neutral-400">P2</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Hunter')?.p2_driver_id, raceResult?.p2_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Danny')?.p2_driver_id, raceResult?.p2_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Adrian')?.p2_driver_id, raceResult?.p2_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3 font-mono text-xs font-bold text-white">
                      {drivers.find(d => d.driverId === raceResult?.p2_driver_id)?.code || raceResult?.p2_driver_id || '-'}
                    </td>
                  </tr>

                  {/* P3 Position */}
                  <tr>
                    <td className="py-3 text-xs font-semibold text-neutral-400">P3</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Hunter')?.p3_driver_id, raceResult?.p3_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Danny')?.p3_driver_id, raceResult?.p3_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Adrian')?.p3_driver_id, raceResult?.p3_driver_id, [raceResult?.p1_driver_id, raceResult?.p2_driver_id, raceResult?.p3_driver_id])}</td>
                    <td className="py-3 font-mono text-xs font-bold text-white">
                      {drivers.find(d => d.driverId === raceResult?.p3_driver_id)?.code || raceResult?.p3_driver_id || '-'}
                    </td>
                  </tr>

                  {/* Driver of the Day */}
                  <tr>
                    <td className="py-3 text-xs font-semibold text-neutral-400">DOTD</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Hunter')?.dotd_driver_id, raceResult?.dotd_driver_id)}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Danny')?.dotd_driver_id, raceResult?.dotd_driver_id)}</td>
                    <td className="py-3">{renderComparisonCell(predictions.find(p => p.profiles?.name === 'Adrian')?.dotd_driver_id, raceResult?.dotd_driver_id)}</td>
                    <td className="py-3 font-mono text-xs font-bold text-white">
                      {drivers.find(d => d.driverId === raceResult?.dotd_driver_id)?.code || raceResult?.dotd_driver_id || '-'}
                    </td>
                  </tr>

                  {/* Chaos Vector */}
                  <tr>
                    <td className="py-3 text-xs font-semibold text-neutral-400">Chaos</td>
                    <td className="py-3">
                      {isFinalized && raceResult ? (
                        <span className={`font-mono text-xs ${predictions.find(p => p.profiles?.name === 'Hunter')?.chaos_vector === raceResult.chaos_vector ? 'text-green-400 font-bold' : 'text-red-500'}`}>
                          {predictions.find(p => p.profiles?.name === 'Hunter')?.chaos_vector ? 'YES' : 'NO'}
                        </span>
                      ) : (
                        <span className="font-mono text-xs">{predictions.find(p => p.profiles?.name === 'Hunter')?.chaos_vector ? 'YES' : 'NO'}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {isFinalized && raceResult ? (
                        <span className={`font-mono text-xs ${predictions.find(p => p.profiles?.name === 'Danny')?.chaos_vector === raceResult.chaos_vector ? 'text-green-400 font-bold' : 'text-red-500'}`}>
                          {predictions.find(p => p.profiles?.name === 'Danny')?.chaos_vector ? 'YES' : 'NO'}
                        </span>
                      ) : (
                        <span className="font-mono text-xs">{predictions.find(p => p.profiles?.name === 'Danny')?.chaos_vector ? 'YES' : 'NO'}</span>
                      )}
                    </td>
                    <td className="py-3">
                      {isFinalized && raceResult ? (
                        <span className={`font-mono text-xs ${predictions.find(p => p.profiles?.name === 'Adrian')?.chaos_vector === raceResult.chaos_vector ? 'text-green-400 font-bold' : 'text-red-500'}`}>
                          {predictions.find(p => p.profiles?.name === 'Adrian')?.chaos_vector ? 'YES' : 'NO'}
                        </span>
                      ) : (
                        <span className="font-mono text-xs">{predictions.find(p => p.profiles?.name === 'Adrian')?.chaos_vector ? 'YES' : 'NO'}</span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-xs font-bold text-white">
                      {raceResult?.chaos_vector !== undefined ? (raceResult.chaos_vector ? 'YES' : 'NO') : '-'}
                    </td>
                  </tr>

                  {/* Calculated Round Points */}
                  <tr className="bg-neutral-950/20 font-bold">
                    <td className="py-4 text-xs uppercase tracking-wider text-neutral-400">Points</td>
                    <td className="py-4 text-lg font-mono text-white">
                      {isFinalized && raceResult ? calculatePoints(predictions.find(p => p.profiles?.name === 'Hunter'), raceResult).total : '-'}
                    </td>
                    <td className="py-4 text-lg font-mono text-white">
                      {isFinalized && raceResult ? calculatePoints(predictions.find(p => p.profiles?.name === 'Danny'), raceResult).total : '-'}
                    </td>
                    <td className="py-4 text-lg font-mono text-white">
                      {isFinalized && raceResult ? calculatePoints(predictions.find(p => p.profiles?.name === 'Adrian'), raceResult).total : '-'}
                    </td>
                    <td className="py-4 font-mono text-xs text-neutral-500">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Banter Wall (shared text log) */}
      <div className="carbon-panel rounded-lg p-6 border border-neutral-800">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
          Banter Wall
        </h2>

        {/* Comment log */}
        <div className="space-y-3 max-h-60 overflow-y-auto mb-4 border border-neutral-900 rounded p-4 bg-neutral-950/40">
          {comments.length === 0 ? (
            <p className="text-xs text-neutral-600 uppercase text-center py-4">No banter yet. Start the trash talk!</p>
          ) : (
            comments.map(c => {
              const isSelf = currentUser && c.user_id === currentUser.id;
              return (
                <div key={c.id} className="text-xs flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isSelf ? 'accent-text' : 'text-neutral-400'}`}>
                      {c.profiles?.name || 'Unknown'}
                    </span>
                    <span className="text-[9px] text-neutral-600">
                      {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-neutral-200 bg-neutral-950/70 py-2 px-3 rounded border border-neutral-900 leading-normal">
                    {c.comment}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Send Comment Form */}
        <form onSubmit={handleSendComment} className="flex gap-2">
          <input
            type="text"
            disabled={!currentUser || commentSaving}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={currentUser ? "Type some banter..." : "Log in to join the banter"}
            className="flex-1 bg-neutral-950 text-xs text-white rounded border border-neutral-900 p-3 outline-none focus:border-neutral-850"
          />
          <button
            type="submit"
            disabled={!currentUser || commentSaving || !newComment.trim()}
            className="px-4 bg-white text-black font-semibold rounded hover:bg-neutral-200 transition flex items-center justify-center disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
