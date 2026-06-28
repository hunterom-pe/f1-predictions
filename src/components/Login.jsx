import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, User, AlertCircle, CircleDot } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      setError("Please select your name.");
      return;
    }
    if (pin.length !== 4) {
      setError("Please enter a 4-digit PIN.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Query the user profile from Supabase
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('name', name)
        .single();

      if (fetchError || !data) {
        throw new Error("User profile not found.");
      }

      // Check PIN match (seeded database values)
      if (data.pin === pin) {
        // Success
        const loggedUser = { id: data.id, name: data.name };
        localStorage.setItem('f1_prediction_user', JSON.stringify(loggedUser));
        onLoginSuccess(loggedUser);
      } else {
        setError("Invalid PIN. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Authentication failed. Please verify connection.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (val) => {
    // Only allow numbers and max length of 4
    if (/^\d*$/.test(val) && val.length <= 4) {
      setPin(val);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="w-full max-w-md p-6 carbon-panel rounded-lg accent-glow-subtle border-t-2 accent-border">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-neutral-900 rounded-full border border-neutral-800 mb-3">
            <CircleDot className="w-8 h-8 accent-text animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-white uppercase">
            F1 Trio Prediction
          </h1>
          <p className="text-xs text-neutral-500 uppercase mt-1">
            High-Octane Carbon League
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase mb-2">
              Select Profile
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
              <select
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError('');
                }}
                className="w-full bg-neutral-900 text-white rounded border border-neutral-800 py-3 pl-10 pr-4 outline-none focus:border-neutral-700 transition appearance-none cursor-pointer"
              >
                <option value="" disabled>-- Choose Name --</option>
                <option value="Hunter">Hunter</option>
                <option value="Danny">Danny</option>
                <option value="Adrian">Adrian</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase mb-2">
              4-Digit PIN
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 w-5 h-5 text-neutral-500" />
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="••••"
                className="w-full bg-neutral-900 text-white text-center text-lg tracking-widest rounded border border-neutral-800 py-3 pl-10 pr-4 outline-none focus:border-neutral-700 transition"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-950/20 border border-red-900/50 p-3 rounded text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-white text-black font-semibold rounded hover:bg-neutral-200 transition uppercase tracking-wider text-sm disabled:opacity-50"
          >
            {loading ? "Authorizing..." : "Enter Pitlane"}
          </button>
        </form>
      </div>
    </div>
  );
}
