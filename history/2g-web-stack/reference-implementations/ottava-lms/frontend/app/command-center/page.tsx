'use client';

import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';

const liveFeed = [
  'Sarah J. just scored 100% on HIPAA shuffle',
  'Mike T. replaying Password Policy (metal version)',
  'Finance team: 12 active shuffles this morning',
  'New hire cohort synced to GDPR playlist',
  'Support pod humming along to “Phishing Phantoms”'
];

const riskAlerts = [
  { level: 'high', text: 'Sales Team: 67% failing Data Privacy - Mandatory refresh recommended' },
  { level: 'medium', text: 'New Hire Cohort: Behind schedule on Day 3 modules' },
  { level: 'low', text: 'Warehouse: 21-day perfect streak!' }
];

const recommendedActions = [
  'Create “February Focus” playlist: Data Privacy + Password Policy',
  'Schedule Metal Monday: Heavy metal genre increases completion 34%',
  'Deploy GDPR refresher to EU office (knowledge decay detected)',
  'Enable attention boosts for remote cohorts in APAC'
];

const departments = [
  { name: 'Sales', completion: 94, attention: 82, shuffle: '5.2/day', weakness: 'Email Security', trend: '+12%', trendDir: 'up' },
  { name: 'IT', completion: 100, attention: 95, shuffle: '8.7/day', weakness: 'None', trend: '→ Stable', trendDir: 'flat' },
  { name: 'Warehouse', completion: 87, attention: 79, shuffle: '3.1/day', weakness: 'Safety Protocol', trend: '-5%', trendDir: 'down' },
  { name: 'Finance', completion: 98, attention: 91, shuffle: '7.2/day', weakness: 'SOX Updates', trend: '+3%', trendDir: 'up' }
];

export default function CommandCenterPage() {
  const [activeShufflers, setActiveShufflers] = useState(1247);
  const [attentionScore, setAttentionScore] = useState(87);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveShufflers(prev => Math.max(900, prev + Math.floor(Math.random() * 10) - 5));
      setAttentionScore(prev => {
        const delta = (Math.random() - 0.5) * 1.2;
        return Math.min(96, Math.max(80, Number((prev + delta).toFixed(1))));
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const floatingDots = useMemo(() => (
    new Array(6).fill(null).map((_, idx) => ({
      id: idx,
      top: `${15 + Math.random() * 60}%`,
      left: `${10 + Math.random() * 70}%`,
      delay: `${Math.random() * 3}s`
    }))
  ), []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-gray-900 text-white">
      <Navigation />

      <main className="relative container mx-auto px-4 py-10 space-y-8 overflow-hidden">
        {floatingDots.map(dot => (
          <span
            key={dot.id}
            className="absolute w-3 h-3 rounded-full bg-accent-300/60 blur-[1px] animate-ping"
            style={{ top: dot.top, left: dot.left, animationDelay: dot.delay }}
          />
        ))}

        <header className="rounded-3xl bg-gradient-to-r from-primary-600/90 to-accent-400/90 shadow-2xl p-8 border border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="uppercase tracking-[0.4em] text-white/70 text-xs mb-2">Live Mission Control</p>
            <h1 className="text-3xl md:text-4xl font-black">ACME Corp Compliance Command Center</h1>
          </div>
          <div className="flex flex-wrap gap-6 text-right">
            <div>
              <p className="text-white/70 text-sm uppercase tracking-wide">Live Now</p>
              <p className="text-3xl font-black">{activeShufflers.toLocaleString()} <span className="text-base font-semibold">employees</span></p>
            </div>
            <div className="border-l border-white/20 pl-6">
              <p className="text-white/70 text-sm uppercase tracking-wide">Last Violation</p>
              <p className="text-3xl font-black">47 <span className="text-base font-semibold">days ago</span></p>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1.6fr_1.2fr]">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Organization Pulse</h2>
                <span className="text-white/60 text-sm">Active Heat Map</span>
              </div>
              <div className="grid grid-cols-4 gap-2 h-56">
                {new Array(16).fill(null).map((_, idx) => {
                  const score = 60 + Math.random() * 40;
                  const color = score > 90 ? 'bg-emerald-400/80' : score > 70 ? 'bg-amber-400/80' : 'bg-red-500/70';
                  return (
                    <div key={idx} className={`relative rounded-2xl ${color} backdrop-blur overflow-hidden`}>
                      <span className="absolute inset-0 animate-pulse opacity-30 bg-gradient-to-br from-white/40 to-transparent" />
                      <div className="absolute bottom-1 left-2 text-xs font-semibold">{Math.round(score)}%</div>
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-ping" />
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-sm text-white/70">IT Department: <span className="text-white font-semibold">3 shuffling now 🎵</span></p>
            </div>
            <div className="border-t border-white/10 pt-4">
              <h3 className="font-semibold mb-3">Live Shuffle Feed</h3>
              <div className="space-y-3">
                {liveFeed.map((item, idx) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm bg-white/5 rounded-2xl p-3 border border-white/5 hover:border-white/20 transition-all duration-300"
                    style={{ transitionDelay: `${idx * 60}ms` }}
                  >
                    <span className="w-2 h-2 rounded-full bg-accent-300 animate-pulse" />
                    <p className="flex-1">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-6 space-y-6 overflow-hidden">
            <div className="relative rounded-3xl bg-gradient-to-br from-primary-600/30 to-accent-400/10 border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Attention Efficiency Score</h3>
                <span className="text-white/70 text-sm">Organization-wide</span>
              </div>
              <div className="flex flex-col xl:flex-row items-center gap-6">
                <div className="relative w-48 h-48">
                  <div className="absolute inset-0 rounded-full border-4 border-white/20" />
                  <div className="absolute inset-4 rounded-full border-4 border-primary-400" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                  <div className="absolute inset-8 rounded-full bg-white/10 flex items-center justify-center">
                    <p className="text-4xl font-black">{attentionScore}%</p>
                  </div>
                  <div className="absolute -right-6 top-1/4">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/30 text-xs font-semibold text-emerald-200">+4.2% this week</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {[
                    { label: 'Lyrics Retention', value: 91, color: 'from-emerald-400 to-emerald-500' },
                    { label: 'Visual Retention', value: 83, color: 'from-sky-400 to-sky-500' },
                    { label: 'Policy Application', value: 84, color: 'from-purple-400 to-purple-500' }
                  ].map(bar => (
                    <div key={bar.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">{bar.label}</span>
                        <span className="font-semibold">{bar.value}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${bar.color}`} style={{ width: `${bar.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Knowledge Decay Prediction</h3>
                <span className="text-sm text-white/60">Next 30 days</span>
              </div>
              <div className="relative h-48">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-3xl" />
                <div className="absolute inset-4 flex flex-col justify-between text-xs text-white/50">
                  {[100, 90, 80, 70, 60].map(level => (
                    <div key={level} className="flex items-center gap-2">
                      <span>{level}%</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                  ))}
                </div>
                <svg className="absolute inset-6 w-[calc(100%-3rem)] h-[calc(100%-3rem)]" viewBox="0 0 400 160" preserveAspectRatio="none">
                  <path d="M0,60 C60,20 100,20 160,40 C220,60 300,90 360,120" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" className="animate-[pulse_4s_ease-in-out_infinite]" />
                  <path d="M0,90 C70,60 150,80 220,70 C300,60 320,40 360,50" fill="none" stroke="#fbbf24" strokeDasharray="8 6" strokeWidth="3" opacity={0.6} />
                  <line x1="0" y1="110" x2="400" y2="110" stroke="#f87171" strokeDasharray="6 6" />
                </svg>
                <div className="absolute bottom-3 right-4 text-sm">
                  <p className="text-red-300 font-semibold">HIPAA: Refresh needed in 12 days ⚠️</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Statistical Process Control</h3>
                <span className="text-sm text-white/60">Real-time quiz performance</span>
              </div>
              <div className="relative h-48">
                <div className="absolute inset-0 grid grid-cols-8 gap-2">
                  {new Array(8).fill(null).map((_, idx) => (
                    <div key={idx} className="bg-white/5 rounded-full w-8 mx-auto flex items-end justify-center">
                      <div className="w-3 rounded-full bg-accent-400" style={{ height: `${40 + Math.random() * 80}px` }} />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col justify-between text-xs text-white/60">
                  {[100, 80, 60].map(level => (
                    <div key={level} className="flex items-center gap-2">
                      <span>{level}%</span>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-2 left-4 text-sm text-white/80">
                  Password Policy: <span className="font-semibold text-amber-300">2 points outside control limits - investigate</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 border border-white/10 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Compliance Risk Alerts</h3>
              <div className="space-y-3">
                {riskAlerts.map(alert => (
                  <div key={alert.text} className="flex items-start gap-3 rounded-2xl border border-white/10 p-4 bg-white/5">
                    <span className={`text-xl ${alert.level === 'high' ? 'text-red-400' : alert.level === 'medium' ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {alert.level === 'high' ? '🔴' : alert.level === 'medium' ? '🟡' : '🟢'}
                    </span>
                    <p className="text-sm text-white/80">{alert.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">Recommended Actions</h3>
              <div className="space-y-3">
                {recommendedActions.map(action => (
                  <div key={action} className="p-3 rounded-2xl bg-primary-600/20 border border-primary-600/30 text-sm text-white/80 flex items-center gap-3">
                    <span className="text-accent-200 text-lg">✨</span>
                    {action}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-emerald-500/30 to-emerald-400/20 border border-emerald-400/40 p-6 text-center">
              <p className="uppercase text-xs tracking-[0.5em] text-white/70 mb-4">Violation Prevention</p>
              <p className="text-5xl font-black mb-2">94% <span className="text-lg font-semibold">Protected</span></p>
              <p className="text-sm text-white/80 mb-4">Est. violations prevented this month: <span className="font-semibold text-white">47</span></p>
              <p className="text-sm text-emerald-100 font-semibold">Est. cost savings: $247,000</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white/5 border border-white/10 p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Department Breakdowns</h3>
            <span className="text-sm text-white/60">Scroll for more</span>
          </div>
          <div className="min-w-[720px]">
            <div className="grid grid-cols-6 gap-4 text-xs uppercase text-white/60 tracking-wide mb-3">
              <span>Department</span>
              <span>Completion</span>
              <span>Avg Attention</span>
              <span>Shuffle Rate</span>
              <span>Top Weakness</span>
              <span>Trending</span>
            </div>
            <div className="space-y-3">
              {departments.map(dept => (
                <div key={dept.name} className="grid grid-cols-6 gap-4 bg-white/5 rounded-2xl p-4 border border-white/10 text-sm">
                  <div>
                    <p className="font-semibold">{dept.name}</p>
                  </div>
                  <p className="font-medium text-emerald-300">{dept.completion}%</p>
                  <p>{dept.attention}%</p>
                  <p>{dept.shuffle}</p>
                  <p>{dept.weakness}</p>
                  <p className={dept.trendDir === 'up' ? 'text-emerald-300' : dept.trendDir === 'down' ? 'text-red-300' : 'text-white/80'}>
                    {dept.trend}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <h3 className="font-semibold mb-2">Genre Preferences</h3>
            <div className="flex items-center gap-6">
              <div className="relative w-36 h-36">
                <div className="absolute inset-0 rounded-full border-4 border-primary-500/40 animate-[spin_12s_linear_infinite]" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary-600/40 to-accent-400/40 flex items-center justify-center">
                  <p className="text-center text-sm">Pop <br /><span className="text-2xl font-bold">34%</span></p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-white/80">
                <p>Country — 28%</p>
                <p>Metal — 22%</p>
                <p>Jazz — 11%</p>
                <p>Classical — 5%</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <h3 className="font-semibold mb-2">Today's Shuffle Champion</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary-500 to-accent-400 flex items-center justify-center text-3xl">🏆</div>
              <div>
                <p className="text-lg font-semibold">Alex M.</p>
                <p className="text-sm text-white/70">47 correct streak!</p>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-5/6 bg-gradient-to-r from-yellow-300 to-yellow-500 animate-pulse" />
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
            <h3 className="font-semibold mb-2">Real-Time Training Counter</h3>
            <p className="text-sm text-white/70 mb-2">Traditional minutes compressed this year</p>
            <p className="text-3xl font-black">2,847,291 ➜ 28,472</p>
            <p className="text-sm text-accent-200">Time reclaimed: 2,818,819 minutes</p>
          </div>
        </div>
      </main>
    </div>
  );
}
