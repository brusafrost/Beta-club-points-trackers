import React, { useState, useMemo } from 'react';
import { Member, Submission, EventItem, AppConfig } from '../types';
import { BarChart3, TrendingUp, Users, Calendar, Award, CheckCircle2, ChevronRight, Filter } from 'lucide-react';

interface DeepDiveChartsProps {
  members: Member[];
  submissions: Submission[];
  events: EventItem[];
  config: AppConfig;
  currentMember?: Member | null;
}

export const DeepDiveCharts: React.FC<DeepDiveChartsProps> = ({
  members,
  submissions,
  events,
  config,
  currentMember
}) => {
  const [timeRange, setTimeRange] = useState<'all' | 'semester' | 'month'>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const cap = config.pointCap || 40;

  // Filter members by grade if selected
  const filteredMembers = useMemo(() => {
    if (selectedGrade === 'all') return members;
    return members.filter(m => String(m.gradeLevel || 11) === selectedGrade);
  }, [members, selectedGrade]);

  // Approved Submissions
  const approvedSubs = useMemo(() => {
    return submissions.filter(s => s.status === 'Approved');
  }, [submissions]);

  // 1. Points Distribution Bins scaled for 40 pt cap
  const distributionBins = useMemo(() => {
    const bins = [
      { label: '0–9 pts', min: 0, max: 9.9, count: 0, students: [] as string[] },
      { label: '10–19 pts', min: 10, max: 19.9, count: 0, students: [] as string[] },
      { label: '20–29 pts', min: 20, max: 29.9, count: 0, students: [] as string[] },
      { label: '30–39 pts', min: 30, max: 39.9, count: 0, students: [] as string[] },
      { label: '40+ (Cap Met)', min: 40, max: 9999, count: 0, students: [] as string[] }
    ];

    filteredMembers.forEach(m => {
      const pts = m.totalPoints || 0;
      for (const bin of bins) {
        if (pts >= bin.min && pts <= bin.max) {
          bin.count++;
          if (bin.students.length < 5) bin.students.push(m.name);
          break;
        }
      }
    });

    const maxCount = Math.max(...bins.map(b => b.count), 1);
    return { bins, maxCount };
  }, [filteredMembers]);

  // 2. Grade Level Comparison (9th, 10th, 11th, 12th)
  const gradeComparison = useMemo(() => {
    const grades = [
      { grade: 9, label: 'Freshmen (9th)', members: 0, totalPts: 0, avgPts: 0 },
      { grade: 10, label: 'Sophomores (10th)', members: 0, totalPts: 0, avgPts: 0 },
      { grade: 11, label: 'Juniors (11th)', members: 0, totalPts: 0, avgPts: 0 },
      { grade: 12, label: 'Seniors (12th)', members: 0, totalPts: 0, avgPts: 0 }
    ];

    members.forEach(m => {
      const g = m.gradeLevel || 11;
      const target = grades.find(item => item.grade === g) || grades[2];
      target.members++;
      target.totalPts += m.totalPoints || 0;
    });

    grades.forEach(g => {
      g.avgPts = g.members > 0 ? Math.round((g.totalPts / g.members) * 10) / 10 : 0;
      g.totalPts = Math.round(g.totalPts * 10) / 10;
    });

    const maxAvg = Math.max(...grades.map(g => g.avgPts), 1);
    return { grades, maxAvg };
  }, [members]);

  // 3. Event Category Breakdown
  const categoryStats = useMemo(() => {
    const map: Record<string, { name: string; hours: number; points: number; submissions: number; isBeta: boolean }> = {};

    approvedSubs.forEach(s => {
      const cat = s.category || 'General Service';
      if (!map[cat]) {
        const evt = events.find(e => e.name === cat);
        map[cat] = {
          name: cat,
          hours: 0,
          points: 0,
          submissions: 0,
          isBeta: evt ? evt.type === 'BETA' : true
        };
      }
      map[cat].hours += s.hours || 0;
      map[cat].points += s.points || 0;
      map[cat].submissions += 1;
    });

    const list = Object.values(map).sort((a, b) => b.points - a.points);
    const totalPoints = list.reduce((sum, item) => sum + item.points, 0) || 1;
    const totalBetaPoints = list.filter(i => i.isBeta).reduce((sum, item) => sum + item.points, 0);
    const totalNonBetaPoints = totalPoints - totalBetaPoints;

    return {
      list,
      totalPoints,
      totalBetaPoints,
      totalNonBetaPoints,
      betaPct: Math.round((totalBetaPoints / totalPoints) * 100),
      nonBetaPct: Math.round((totalNonBetaPoints / totalPoints) * 100)
    };
  }, [approvedSubs, events]);

  // 4. Monthly Timeline
  const monthlyTimeline = useMemo(() => {
    const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
    const data = months.map(m => ({ month: m, hours: 0, points: 0, count: 0 }));

    approvedSubs.forEach(s => {
      if (!s.date) return;
      const d = new Date(s.date);
      const mIdx = d.getMonth(); // 0-11
      // Convert to school year indices (Aug=7, Sep=8... May=4)
      const schoolMap: Record<number, number> = {
        7: 0, 8: 1, 9: 2, 10: 3, 11: 4, 0: 5, 1: 6, 2: 7, 3: 8, 4: 9
      };
      const idx = schoolMap[mIdx];
      if (idx !== undefined && data[idx]) {
        data[idx].hours += s.hours || 0;
        data[idx].points += s.points || 0;
        data[idx].count += 1;
      }
    });

    const maxPoints = Math.max(...data.map(d => d.points), 1);
    return { data, maxPoints };
  }, [approvedSubs]);

  // Total club overview numbers
  const totalApprovedClubHours = useMemo(() => 
    approvedSubs.reduce((sum, s) => sum + (s.hours || 0), 0), 
    [approvedSubs]
  );
  const totalMembersCapped = useMemo(() => 
    members.filter(m => m.totalPoints >= cap).length, 
    [members, cap]
  );
  const overallClubAverage = useMemo(() => {
    const total = members.reduce((sum, m) => sum + (m.totalPoints || 0), 0);
    return members.length > 0 ? (total / members.length).toFixed(1) : '0.0';
  }, [members]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-800 text-[11px] font-mono font-semibold uppercase tracking-wider border border-zinc-200">
              Analytics & Dive Charts
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Dataset: {members.length} Members &bull; {submissions.length} Submissions
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Club Service Data & Distribution
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Statistical breakdown of volunteer hours, point milestones, and grade-level activity.
          </p>
        </div>

        {/* Quick Filter Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              type="button"
              onClick={() => setSelectedGrade('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedGrade === 'all' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All Grades
            </button>
            {['9', '10', '11', '12'].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGrade(g)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  selectedGrade === g ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {g}th
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 4 Core Metrics Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Total Verified Hours</div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1 font-mono">{totalApprovedClubHours.toFixed(1)} <span className="text-xs text-zinc-500 font-normal">hrs</span></div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">From {approvedSubs.length} approved slips</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Club Mean Average</div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1 font-mono">{overallClubAverage} <span className="text-xs text-zinc-500 font-normal">pts/student</span></div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">Requirement Cap: {cap} pts</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Reached {cap}pt Cap</div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1 font-mono">{totalMembersCapped} <span className="text-xs text-zinc-500 font-normal">members</span></div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">{((totalMembersCapped / members.length) * 100).toFixed(1)}% of total chapter</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">Active Roster Size</div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1 font-mono">{members.length} <span className="text-xs text-zinc-500 font-normal">students</span></div>
          <div className="text-[11px] text-zinc-400 mt-1 font-mono">4 Grade Cohorts</div>
        </div>
      </div>

      {/* Chart Section 1: Points Histogram & Grade Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Histogram: Distribution of Points across 500 students */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-700" />
                <span>Points Distribution Histogram</span>
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                {filteredMembers.length} students grouped into 20-point milestone bands
              </p>
            </div>
            <span className="text-xs font-mono px-2 py-1 bg-zinc-100 rounded-md text-zinc-700 border border-zinc-200">
              Cap: {cap} pts
            </span>
          </div>

          {/* SVG Histogram Chart */}
          <div className="pt-4 pb-2">
            <div className="h-56 flex items-end gap-3 sm:gap-5 px-2 border-b border-zinc-200 relative">
              {distributionBins.bins.map((bin, i) => {
                const heightPct = Math.max(8, (bin.count / distributionBins.maxCount) * 100);
                const isHovered = hoveredBar === bin.label;
                const isCapBin = i === distributionBins.bins.length - 1;

                return (
                  <div
                    key={bin.label}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                    onMouseEnter={() => setHoveredBar(bin.label)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute -top-12 z-20 bg-zinc-900 text-white text-[11px] font-mono py-1 px-2.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none">
                        <strong>{bin.count} students</strong> ({((bin.count / filteredMembers.length) * 100).toFixed(1)}%)
                      </div>
                    )}

                    <div className="text-xs font-mono font-bold text-zinc-700 mb-1">
                      {bin.count}
                    </div>

                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isCapBin
                          ? 'bg-emerald-600 group-hover:bg-emerald-500'
                          : isHovered
                          ? 'bg-zinc-800'
                          : 'bg-zinc-300 group-hover:bg-zinc-400'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="flex gap-3 sm:gap-5 px-2 pt-2 text-[11px] font-mono text-zinc-500 text-center">
              {distributionBins.bins.map(bin => (
                <div key={bin.label} className="flex-1 truncate" title={bin.label}>
                  {bin.label}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-600 flex items-center justify-between">
            <span className="font-mono">Distribution Insights:</span>
            <span>
              <strong>{((distributionBins.bins[distributionBins.bins.length - 1].count / filteredMembers.length) * 100).toFixed(1)}%</strong> of selected students have satisfied graduation cap honors.
            </span>
          </div>
        </div>

        {/* Grade Level Activity Comparison */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-700" />
              <span>Grade Level Performance</span>
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Average points per student by graduation year
            </p>
          </div>

          <div className="space-y-4 my-auto">
            {gradeComparison.grades.map(g => {
              const widthPct = Math.max(10, (g.avgPts / gradeComparison.maxAvg) * 100);

              return (
                <div key={g.grade} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800">{g.label}</span>
                    <span className="font-mono text-zinc-500">
                      <strong>{g.avgPts.toFixed(1)}</strong> avg ({g.members} members &bull; {g.totalPts.toFixed(0)} total pts)
                    </span>
                  </div>
                  <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                    <div
                      style={{ width: `${widthPct}%` }}
                      className="h-full bg-zinc-800 rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-600">
            <span className="font-semibold">Top Cohort: </span>
            <span>
              {gradeComparison.grades.slice().sort((a, b) => b.avgPts - a.avgPts)[0]?.label} leads with {gradeComparison.grades.slice().sort((a, b) => b.avgPts - a.avgPts)[0]?.avgPts.toFixed(1)} pts/student average.
            </span>
          </div>
        </div>

      </div>

      {/* Chart Section 2: Monthly Trajectory & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Monthly Submission Trajectory (Line / Area SVG) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-zinc-700" />
                <span>Monthly Service Hours Trajectory</span>
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                Approved service volume across the 2025–2026 school calendar
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              10 Month Academic Year
            </span>
          </div>

          {/* SVG Line / Bar Chart */}
          <div className="pt-4 pb-2">
            <div className="h-48 flex items-end gap-2 sm:gap-3 px-2 border-b border-zinc-200">
              {monthlyTimeline.data.map(d => {
                const heightPct = Math.max(6, (d.points / monthlyTimeline.maxPoints) * 100);

                return (
                  <div key={d.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="text-[10px] font-mono font-bold text-zinc-500 mb-1 group-hover:text-zinc-900">
                      {d.points > 0 ? `${Math.round(d.points)}` : '0'}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-zinc-800 hover:bg-zinc-950 rounded-t-md transition-all duration-300"
                      title={`${d.month}: ${d.points.toFixed(1)} points (${d.count} submissions)`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 sm:gap-3 px-2 pt-2 text-[11px] font-mono text-zinc-500 text-center">
              {monthlyTimeline.data.map(d => (
                <div key={d.month} className="flex-1 truncate">{d.month}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Beta vs Non-Beta & Event Allocation */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-zinc-200 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-zinc-700" />
              <span>Event Category Allocation</span>
            </h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Service distribution by official Beta vs Non-Beta events
            </p>
          </div>

          {/* Ratio Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-800 font-semibold">Beta Events: {categoryStats.betaPct}%</span>
              <span className="text-zinc-500">Non-Beta: {categoryStats.nonBetaPct}%</span>
            </div>
            <div className="h-3 w-full bg-zinc-200 rounded-full flex overflow-hidden">
              <div
                style={{ width: `${categoryStats.betaPct}%` }}
                className="h-full bg-zinc-900"
                title={`Beta Events: ${categoryStats.totalBetaPoints.toFixed(1)} pts`}
              />
              <div
                style={{ width: `${categoryStats.nonBetaPct}%` }}
                className="h-full bg-zinc-400"
                title={`Non-Beta Events: ${categoryStats.totalNonBetaPoints.toFixed(1)} pts`}
              />
            </div>
          </div>

          {/* Top Event Rows */}
          <div className="space-y-2 pt-2 max-h-52 overflow-y-auto pr-1 text-xs">
            {categoryStats.list.slice(0, 5).map(cat => (
              <div key={cat.name} className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between">
                <div className="truncate pr-2">
                  <div className="font-semibold text-zinc-900 truncate">{cat.name}</div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    {cat.submissions} submissions &bull; {cat.hours} hrs
                  </div>
                </div>
                <span className="px-2 py-1 bg-white border border-zinc-200 rounded-md font-mono font-bold text-zinc-900 shrink-0">
                  {cat.points.toFixed(1)} pts
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
