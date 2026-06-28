import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchQualifyingResult, fetchRaceResult } from '../services/f1Api';
import { Settings, ShieldAlert, Sparkles, RefreshCw, Save, Lock, Check } from 'lucide-react';

export default function AdminPanel({ round, schedule, drivers, onResultsUpdated, results }) {
  const [adminPin, setAdminPin] = useState('');
  const [isAdminAuthorized, setIsAdminAuthorized] = useState(false);
  const [pinError, setPinError] = useState('');

  const [selectedRound, setSelectedRound] = useState(round || 1);
  const [poleDriverId, setPoleDriverId] = useState('');
  const [p1DriverId, setP1DriverId] = useState('');
  const [p2DriverId, setP2DriverId] = useState('');
  const [p3DriverId, setP3DriverId] = useState('');
  const [dotdDriverId, setDotdDriverId] = useState('');
  const [chaosVector, setChaosVector] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  
  const [syncLoading, setSyncLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // Handle Admin Authorization
  const handleAuthorize = (e) => {
    e.preventDefault();
    // Default Admin PIN: 9999
    if (adminPin === '9999') {
      setIsAdminAuthorized(true);
      setPinError('');
      loadRoundResults(selectedRound);
    } else {
      setPinError('Invalid Admin PIN.');
    }
  };

  // Load existing results from cache
  const loadRoundResults = (rnd) => {
    const existing = results.find(r => r.round === Number(rnd));
    if (existing) {
      setPoleDriverId(existing.pole_driver_id || '');
      setP1DriverId(existing.p1_driver_id || '');
      setP2DriverId(existing.p2_driver_id || '');
      setP3DriverId(existing.p3_driver_id || '');
      setDotdDriverId(existing.dotd_driver_id || '');
      setChaosVector(Boolean(existing.chaos_vector));
      setIsFinalized(Boolean(existing.is_finalized));
    } else {
      // Clear
      setPoleDriverId('');
      setP1DriverId('');
      setP2DriverId('');
      setP3DriverId('');
      setDotdDriverId('');
      setChaosVector(false);
      setIsFinalized(false);
    }
  };

  // Handle Round Selection Change
  const handleRoundChange = (rnd) => {
    setSelectedRound(rnd);
    loadRoundResults(rnd);
    setSyncStatus('');
    setSaveStatus('');
  };

  // Fetch from Jolpica API and update state
  const handleSyncFromAPI = async () => {
    setSyncLoading(true);
    setSyncStatus('Fetching Jolpica F1 API...');
    try {
      // 1. Fetch Qualifying (Pole Sitter)
      const poleDriver = await fetchQualifyingResult(selectedRound);
      if (poleDriver) {
        setPoleDriverId(poleDriver.driverId);
      }

      // 2. Fetch Race Results (P1, P2, P3)
      const raceResult = await fetchRaceResult(selectedRound);
      if (raceResult) {
        setP1DriverId(raceResult.p1.driverId);
        setP2DriverId(raceResult.p2.driverId);
        setP3DriverId(raceResult.p3.driverId);
        setSyncStatus('Qualifying & Race data fetched and synced successfully!');
      } else {
        setSyncStatus('Qualifying fetched. Race results not available yet.');
      }
    } catch (error) {
      console.error(error);
      setSyncStatus('API Sync failed. Data might not be published yet.');
    } finally {
      setSyncLoading(false);
    }
  };

  // Save/Finalize Results to Supabase
  const handleSaveResults = async (e) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveStatus('');
    
    try {
      const { error } = await supabase
        .from('race_results')
        .upsert({
          round: Number(selectedRound),
          pole_driver_id: poleDriverId || null,
          p1_driver_id: p1DriverId || null,
          p2_driver_id: p2DriverId || null,
          p3_driver_id: p3DriverId || null,
          dotd_driver_id: dotdDriverId || null,
          chaos_vector: chaosVector,
          is_finalized: isFinalized,
          updated_at: new Date()
        });

      if (error) throw error;
      setSaveStatus('Race results updated and saved to DB successfully!');
      if (onResultsUpdated) onResultsUpdated();
    } catch (error) {
      console.error(error);
      setSaveStatus('Failed to save results. Check Supabase connection.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (!isAdminAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div className="w-full max-w-sm p-6 carbon-panel rounded-lg border border-neutral-800">
          <div className="flex items-center gap-2 mb-4 text-red-500">
            <ShieldAlert className="w-6 h-6" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Admin Verification</h2>
          </div>
          <form onSubmit={handleAuthorize} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase mb-2">
                Enter Admin PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-neutral-950 text-white text-center text-lg tracking-widest rounded border border-neutral-900 py-2.5 outline-none focus:border-neutral-800 transition"
              />
            </div>
            {pinError && <p className="text-xs text-red-500">{pinError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 bg-red-600 text-white font-semibold rounded hover:bg-red-700 transition uppercase tracking-wider text-xs"
            >
              Verify Keys
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="carbon-panel rounded-lg p-6 border border-neutral-800">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-900">
          <h1 className="text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-500" />
            Admin Control Center
          </h1>
          <span className="text-[10px] bg-red-950/20 text-red-400 border border-red-900/60 px-2 py-0.5 rounded font-mono">
            SECURE SESSION
          </span>
        </div>

        {/* Round selection */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Select Active Round to Manage
          </label>
          <select
            value={selectedRound}
            onChange={(e) => handleRoundChange(Number(e.target.value))}
            className="w-full sm:w-64 bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2 px-3 outline-none focus:border-neutral-800 cursor-pointer"
          >
            {schedule.map(r => (
              <option key={r.round} value={r.round}>
                Round {r.round} - {r.raceName}
              </option>
            ))}
          </select>
        </div>

        {/* Sync from API box */}
        <div className="p-4 bg-neutral-950 rounded border border-neutral-900 mb-6 space-y-3">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase text-white flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                API Automation Sync
              </h3>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Pulls Qualifying & Race results automatically from Jolpica F1 API.
              </p>
            </div>
            <button
              type="button"
              disabled={syncLoading}
              onClick={handleSyncFromAPI}
              className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs font-bold uppercase text-white rounded transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {syncLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              Sync Data
            </button>
          </div>
          {syncStatus && (
            <p className="text-[10px] bg-neutral-900 p-2 rounded text-neutral-400 border border-neutral-850 font-mono">
              {syncStatus}
            </p>
          )}
        </div>

        {/* DDL Input Form */}
        <form onSubmit={handleSaveResults} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pole Position */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                Pole Position Winner
              </label>
              <select
                value={poleDriverId}
                onChange={(e) => setPoleDriverId(e.target.value)}
                className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2 px-3 outline-none focus:border-neutral-800"
              >
                <option value="">-- Unset / Blank --</option>
                {drivers.map(d => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.givenName} {d.familyName} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            {/* P1 Winner */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                P1 Winner
              </label>
              <select
                value={p1DriverId}
                onChange={(e) => setP1DriverId(e.target.value)}
                className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2 px-3 outline-none focus:border-neutral-800"
              >
                <option value="">-- Unset / Blank --</option>
                {drivers.map(d => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.givenName} {d.familyName}
                  </option>
                ))}
              </select>
            </div>

            {/* P2 Position */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                P2 Position
              </label>
              <select
                value={p2DriverId}
                onChange={(e) => setP2DriverId(e.target.value)}
                className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2 px-3 outline-none focus:border-neutral-800"
              >
                <option value="">-- Unset / Blank --</option>
                {drivers.map(d => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.givenName} {d.familyName}
                  </option>
                ))}
              </select>
            </div>

            {/* P3 Position */}
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                P3 Position
              </label>
              <select
                value={p3DriverId}
                onChange={(e) => setP3DriverId(e.target.value)}
                className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2 px-3 outline-none focus:border-neutral-800"
              >
                <option value="">-- Unset / Blank --</option>
                {drivers.map(d => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.givenName} {d.familyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver of the Day (Subjective - Must input manually) */}
            <div>
              <label className="block text-[10px] font-bold accent-text uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Driver of the Day (Manual)
              </label>
              <select
                value={dotdDriverId}
                onChange={(e) => setDotdDriverId(e.target.value)}
                className="w-full bg-neutral-950 text-sm text-white rounded border border-neutral-900 py-2 px-3 outline-none focus:border-neutral-800"
              >
                <option value="">-- Select DOTD --</option>
                {drivers.map(d => (
                  <option key={d.driverId} value={d.driverId}>
                    {d.givenName} {d.familyName}
                  </option>
                ))}
              </select>
            </div>

            {/* Chaos Vector Toggle (Subjective) */}
            <div className="flex items-center justify-between p-3 bg-neutral-950 rounded border border-neutral-900">
              <div>
                <label className="block text-[10px] font-bold accent-text uppercase tracking-wider">
                  Chaos Vector Result (Manual)
                </label>
                <span className="text-[10px] text-neutral-500 block">Safety Car/Red Flag/DNF?</span>
              </div>
              <button
                type="button"
                onClick={() => setChaosVector(!chaosVector)}
                className={`px-4 py-1.5 text-xs font-mono font-bold uppercase rounded border transition ${
                  chaosVector 
                    ? 'bg-red-950/20 text-red-400 border-red-900/60' 
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                }`}
              >
                {chaosVector ? 'YES' : 'NO'}
              </button>
            </div>
          </div>

          {/* Finalize round check */}
          <div className="flex items-center justify-between p-3 bg-neutral-950 rounded border border-neutral-900 mt-2">
            <div>
              <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Finalize results for score calculation
              </label>
              <span className="text-[10px] text-neutral-500 block">Locks official results and unlocks standings.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFinalized(!isFinalized)}
              className={`px-4 py-1.5 text-xs font-mono font-bold uppercase rounded border transition ${
                isFinalized 
                  ? 'bg-green-950/20 text-green-400 border-green-900/60' 
                  : 'bg-neutral-900 text-neutral-400 border-neutral-850'
              }`}
            >
              {isFinalized ? 'FINAL' : 'DRAFT'}
            </button>
          </div>

          {saveStatus && (
            <p className="text-xs text-green-400 bg-green-950/20 p-2.5 rounded border border-green-900/50">
              {saveStatus}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saveLoading}
              className="flex-1 py-2.5 bg-white text-black font-semibold rounded hover:bg-neutral-200 transition uppercase tracking-wider text-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save Round Results
            </button>
            
            <button
              type="button"
              onClick={() => setIsAdminAuthorized(false)}
              className="px-4 py-2.5 bg-neutral-900 border border-neutral-800 text-xs font-semibold rounded hover:bg-neutral-850 transition uppercase tracking-wider text-white"
            >
              Exit Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
