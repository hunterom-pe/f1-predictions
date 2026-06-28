import React, { useEffect, useRef } from 'react';
import { Calendar, Flag, CheckCircle, ArrowRight } from 'lucide-react';
import { getCircuitMetadata } from '../data/circuits';

export default function RaceSchedule({ schedule, activeRound, onSelectRace, results }) {
  const upcomingRef = useRef(null);

  // Find the next upcoming/active race
  const now = new Date();
  const upcomingRace = schedule.find(race => {
    const raceDateTime = new Date(`${race.date}T${race.time || '15:00:00Z'}`);
    return raceDateTime >= now;
  }) || schedule[schedule.length - 1]; // Fallback to last race if all finished

  useEffect(() => {
    // Auto-scroll to the upcoming race after a short timeout to let layout settle
    if (upcomingRef.current) {
      const timer = setTimeout(() => {
        upcomingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [schedule]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Season Calendar</h3>
        <span className="text-[10px] bg-neutral-900 border border-neutral-800 px-2 py-1 rounded text-neutral-400 font-mono">
          {schedule.length} Rounds
        </span>
      </div>

      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {schedule.map(race => {
          const isUpcoming = upcomingRace && upcomingRace.round === race.round;
          const isSelected = activeRound === Number(race.round);
          const raceResult = results.find(r => r.round === Number(race.round));
          const isFinished = raceResult?.is_finalized || new Date(`${race.date}T${race.time || '15:00:00Z'}`) < now;
          
          const circuitMeta = getCircuitMetadata(race.Circuit.circuitId);
          const raceDate = new Date(`${race.date}T${race.time || '15:00:00Z'}`);
          
          const formattedDate = raceDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });

          return (
            <div
              key={race.round}
              ref={isUpcoming ? upcomingRef : null}
              onClick={() => onSelectRace(Number(race.round))}
              className={`p-4 rounded-lg cursor-pointer transition flex justify-between items-center ${
                isSelected 
                  ? 'bg-neutral-900 border-l-4 accent-border' 
                  : isUpcoming
                    ? 'bg-neutral-950 border border-neutral-800 border-l-4 accent-border accent-glow-subtle'
                    : 'bg-neutral-950 border border-neutral-900 hover:border-neutral-850'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Round indicator */}
                <div className="text-center font-mono w-10 flex-shrink-0">
                  <p className="text-[10px] text-neutral-500 uppercase">RND</p>
                  <p className="text-lg font-bold text-white leading-none">{race.round}</p>
                </div>

                {/* Vertical Divider */}
                <div className="h-8 w-px bg-neutral-900"></div>

                {/* Race Details */}
                <div>
                  <h4 className="font-bold text-sm uppercase text-white flex items-center gap-2">
                    {race.raceName.replace('Grand Prix', 'GP')}
                    {isUpcoming && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white text-black font-semibold tracking-wider uppercase animate-pulse">
                        NEXT
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-neutral-500 uppercase mt-0.5">
                    {race.Circuit.circuitName} • {circuitMeta?.city || race.Circuit.Location.locality}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-1">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {isFinished ? (
                  <span className="flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-900/40 border border-neutral-900 px-2 py-1 rounded">
                    <CheckCircle className="w-3 h-3 text-neutral-600" />
                    <span>DONE</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-neutral-400 bg-neutral-900/60 border border-neutral-850 px-2 py-1 rounded">
                    <Flag className="w-3 h-3 text-neutral-500" />
                    <span>UPCOMING</span>
                  </span>
                )}
                <ArrowRight className="w-4 h-4 text-neutral-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
