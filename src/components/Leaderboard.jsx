import React from 'react';
import { Trophy, Award, Target, Flame, Shuffle, Zap } from 'lucide-react';

export default function Leaderboard({ standings }) {
  const leader = standings[0];

  return (
    <div className="space-y-6">
      {/* Leader Showcase Panel */}
      {leader && leader.totalPoints > 0 && (
        <div className="relative overflow-hidden rounded-lg carbon-panel border border-neutral-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-32 h-32 accent-bg opacity-[0.03] rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-full text-yellow-500 accent-glow">
              <Trophy className="w-10 h-10 animate-bounce" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-widest">Championship Leader</p>
              <h2 className="text-2xl font-bold text-white uppercase">{leader.name}</h2>
              <p className="text-sm text-neutral-400 mt-1">
                Dominating with <span className="font-mono accent-text font-bold">{leader.totalPoints}</span> pts
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-neutral-950 px-4 py-2 rounded border border-neutral-900 text-center">
              <p className="text-[10px] text-neutral-500 uppercase">Poles</p>
              <p className="text-lg font-mono font-bold text-white">{leader.stats.poleWins}</p>
            </div>
            <div className="bg-neutral-950 px-4 py-2 rounded border border-neutral-900 text-center">
              <p className="text-[10px] text-neutral-500 uppercase">Perfects</p>
              <p className="text-lg font-mono font-bold text-white">{leader.stats.perfectPodiums}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Standings Table */}
      <div className="carbon-panel rounded-lg overflow-hidden border border-neutral-800">
        <div className="px-6 py-4 border-b border-neutral-850 flex justify-between items-center bg-neutral-950/50">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Championship Standings</h3>
          <span className="text-xs text-neutral-500 uppercase">3 Drivers</span>
        </div>

        <div className="divide-y divide-neutral-900">
          {standings.map((driver, index) => {
            const isFirst = index === 0;
            return (
              <div key={driver.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-neutral-950/30 transition">
                {/* Driver Info */}
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
                    isFirst ? 'bg-yellow-500 text-black' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold uppercase text-white flex items-center gap-2">
                      {driver.name}
                      {isFirst && <Award className="w-4 h-4 text-yellow-500" />}
                    </h4>
                  </div>
                </div>

                {/* Score and Stats */}
                <div className="flex flex-wrap items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  {/* Detailed Stats grid */}
                  <div className="flex gap-3 text-xs text-neutral-400">
                    <div className="flex items-center gap-1 bg-neutral-900/60 px-2 py-1 rounded border border-neutral-900" title="Correct Poles">
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-mono font-semibold">{driver.stats.poleWins}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-neutral-900/60 px-2 py-1 rounded border border-neutral-900" title="Correct Podiums (Any order)">
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                      <span className="font-mono font-semibold">{driver.stats.podiumWins}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-neutral-900/60 px-2 py-1 rounded border border-neutral-900" title="Perfect Podium Bonuses">
                      <Zap className="w-3.5 h-3.5 text-purple-500" />
                      <span className="font-mono font-semibold">{driver.stats.perfectPodiums}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-neutral-900/60 px-2 py-1 rounded border border-neutral-900" title="Driver of the Days matched">
                      <Award className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-mono font-semibold">{driver.stats.dotdWins}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-neutral-900/60 px-2 py-1 rounded border border-neutral-900" title="Chaos Vectors matched">
                      <Shuffle className="w-3.5 h-3.5 text-green-500" />
                      <span className="font-mono font-semibold">{driver.stats.chaosWins}</span>
                    </div>
                  </div>

                  {/* Points display */}
                  <div className="text-right">
                    <span className="text-3xl font-mono font-bold tracking-tight text-white">{driver.totalPoints}</span>
                    <span className="text-xs text-neutral-500 uppercase ml-1 block sm:inline">PTS</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
