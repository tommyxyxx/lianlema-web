'use client';

import Link from 'next/link';
import { AppShell, PageIntro, SectionCard } from '@/components/app-shell';
import { useDemo } from '@/components/demo-store';
import {
  formatShortDate,
  formatSessionTime,
  getHomeDashboardState,
  getRecentSessions,
  getSessionSummary,
  getSessionTime,
  inferSessionCategory,
} from '@/lib/helpers';
import { WorkoutSessionV2 } from '@/lib/mock-data';

function average(values: Array<number | undefined>) {
  const validValues = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!validValues.length) return undefined;
  return Math.round((validValues.reduce((sum, value) => sum + value, 0) / validValues.length) * 10) / 10;
}

function isClosedSession(session: WorkoutSessionV2) {
  return Boolean(session.review?.savedAt || session.status === 'completed' || session.status === 'needsRecovery');
}

function getSessionsWithinDays(sessions: WorkoutSessionV2[], days: number) {
  const now = Date.now();
  const windowMs = days * 24 * 60 * 60 * 1000;
  return sessions.filter((session) => {
    const time = Date.parse(getSessionTime(session));
    return Number.isFinite(time) && now - time >= 0 && now - time <= windowMs;
  });
}

function getStartOfMondayWeek(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);
  return start;
}

function getWeeklyBuckets(sessions: WorkoutSessionV2[], goal: number, minWeeks = 8) {
  const safeGoal = Math.max(1, goal);
  const thisWeekStart = getStartOfMondayWeek(new Date());
  const sessionTimes = sessions
    .map((session) => Date.parse(getSessionTime(session)))
    .filter((time) => Number.isFinite(time));
  const earliest = sessionTimes.length ? getStartOfMondayWeek(new Date(Math.min(...sessionTimes))) : thisWeekStart;
  const diffWeeks = Math.floor((thisWeekStart.getTime() - earliest.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const weeks = Math.max(minWeeks, diffWeeks + 1);

  return Array.from({ length: weeks }, (_, index) => {
    const start = new Date(thisWeekStart);
    start.setDate(thisWeekStart.getDate() - (weeks - 1 - index) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const weekSessions = sessions.filter((session) => {
      const time = new Date(getSessionTime(session));
      return time >= start && time < end;
    });
    const count = weekSessions.length;
    const overCount = Math.max(0, count - safeGoal);
    const percentage = Math.round((count / safeGoal) * 100);
    return {
      key: start.toISOString(),
      start,
      end,
      label: `${formatShortDate(start.toISOString())}-${formatShortDate(new Date(end.getTime() - 1).toISOString())}`,
      count,
      goal: safeGoal,
      overCount,
      percentage,
      status: count > safeGoal ? 'exceeded' as const : count === safeGoal ? 'achieved' as const : 'pending' as const,
      sets: weekSessions.reduce((sum, session) => sum + getSessionSummary(session).setCount, 0),
    };
  });
}

function getCategoryRows(sessions: WorkoutSessionV2[]) {
  const counts = sessions.reduce<Record<string, { count: number; sets: number }>>((acc, session) => {
    const category = inferSessionCategory(session);
    acc[category] = acc[category] ?? { count: 0, sets: 0 };
    acc[category].count += 1;
    acc[category].sets += getSessionSummary(session).setCount;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([category, value]) => ({ category, ...value }))
    .sort((a, b) => b.count - a.count || b.sets - a.sets);
}


function getSessionBodyWeight(session: WorkoutSessionV2) {
  return session.bodyWeightAfterKg ?? session.review?.postWeightKg ?? session.recovery?.morningWeightKg ?? session.bodyWeightBeforeKg;
}

function getMetricLinePoints(
  sessions: WorkoutSessionV2[],
  getValue: (session: WorkoutSessionV2) => number | undefined,
  unit: string,
  limit = 8,
): LinePoint[] {
  return [...sessions]
    .filter((session) => session.exercises.length > 0)
    .sort((a, b) => Date.parse(getSessionTime(a)) - Date.parse(getSessionTime(b)))
    .flatMap((session): LinePoint[] => {
      const value = getValue(session);
      if (value === undefined || !Number.isFinite(value)) return [];
      const time = getSessionTime(session);
      return [{
        key: `${session.id}-${unit}`,
        label: formatShortDate(time),
        value: Math.round(value * 10) / 10,
        title: `${formatSessionTime(time)} · ${Math.round(value * 10) / 10}${unit}`,
      }];
    })
    .slice(-limit);
}

function TrendBars({
  bars,
  valueSuffix = '',
  tone = 'teal',
}: {
  bars: Array<{ key: string; label: string; value: number; subLabel?: string; title?: string; isLatest?: boolean }>;
  valueSuffix?: string;
  tone?: 'teal' | 'orange';
}) {
  const maxValue = Math.max(1, ...bars.map((bar) => bar.value));
  const gradient = tone === 'orange' ? 'from-orange-300 via-amber-200 to-emerald-200' : 'from-emerald-400 via-teal-200 to-white';

  if (!bars.length) {
    return <div className="rounded-[24px] border border-dashed border-emerald-200 bg-white/62 px-4 py-8 text-center text-sm font-bold text-teal-900/55">有训练记录后，这里会显示趋势。</div>;
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
      {bars.map((bar) => (
        <div key={bar.key} className="min-w-0" title={bar.title}>
          <div className="flex h-28 items-end rounded-2xl border border-white/70 bg-white/48 p-1.5 shadow-inner shadow-white/80">
            <div
              className={`w-full rounded-xl bg-gradient-to-t ${gradient} shadow-[0_10px_24px_rgba(20,184,166,0.16)] ${bar.isLatest ? 'ring-2 ring-emerald-300/70' : ''}`}
              style={{ height: `${Math.max(18, Math.round((bar.value / maxValue) * 100))}%` }}
              aria-label={`${bar.label} ${bar.value}${valueSuffix}`}
            />
          </div>
          <p className="mt-2 truncate text-center text-[11px] font-black text-teal-950">{bar.value}{valueSuffix}</p>
          <p className="mt-0.5 truncate text-center text-[10px] font-semibold text-teal-900/48">{bar.label}</p>
          {bar.subLabel ? <p className="mt-0.5 truncate text-center text-[10px] font-semibold text-teal-900/38">{bar.subLabel}</p> : null}
        </div>
      ))}
    </div>
  );
}


type LinePoint = {
  key: string;
  label: string;
  value: number;
  title?: string;
};

function LineTrend({
  points,
  unit,
  tone = 'teal',
}: {
  points: LinePoint[];
  unit: string;
  tone?: 'teal' | 'rose';
}) {
  if (!points.length) {
    return <div className="rounded-[24px] border border-dashed border-emerald-200 bg-white/62 px-4 py-8 text-center text-sm font-bold text-teal-900/55">补充回顾数据后，这里会显示曲线。</div>;
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = Math.max(1, maxValue - minValue);
  const width = 320;
  const height = 148;
  const left = 30;
  const right = 18;
  const top = 18;
  const bottom = 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const stroke = tone === 'rose' ? '#f43f5e' : '#0f766e';
  const fill = tone === 'rose' ? 'rgba(244,63,94,0.12)' : 'rgba(20,184,166,0.13)';
  const dot = tone === 'rose' ? '#fb7185' : '#14b8a6';
  const coords = points.map((point, index) => {
    const x = points.length === 1 ? left + plotWidth / 2 : left + (index / (points.length - 1)) * plotWidth;
    const y = top + (1 - (point.value - minValue) / range) * plotHeight;
    return { ...point, x, y };
  });
  const line = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${left},${top + plotHeight} ${line} ${left + plotWidth},${top + plotHeight}`;
  const latest = points[points.length - 1];

  return (
    <div className="rounded-[26px] border border-white/70 bg-white/54 p-3 shadow-inner shadow-white/80">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-xs font-bold text-teal-900/48">最近 {points.length} 条有效记录</p>
        <p className="text-sm font-black text-teal-950">最新 {latest.value}{unit}</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full overflow-visible" role="img" aria-label={`趋势曲线，最新 ${latest.value}${unit}`}>
        <line x1={left} y1={top} x2={left} y2={top + plotHeight} stroke="rgba(15,118,110,0.12)" strokeWidth="1" />
        <line x1={left} y1={top + plotHeight} x2={left + plotWidth} y2={top + plotHeight} stroke="rgba(15,118,110,0.12)" strokeWidth="1" />
        <line x1={left} y1={top + plotHeight / 2} x2={left + plotWidth} y2={top + plotHeight / 2} stroke="rgba(15,118,110,0.08)" strokeDasharray="4 5" strokeWidth="1" />
        <text x="0" y={top + 4} className="fill-teal-900/45 text-[10px] font-bold">{maxValue}{unit}</text>
        <text x="0" y={top + plotHeight + 3} className="fill-teal-900/45 text-[10px] font-bold">{minValue}{unit}</text>
        <polygon points={area} fill={fill} />
        <polyline points={line} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((point) => (
          <g key={point.key}>
            <circle cx={point.x} cy={point.y} r="5" fill="white" stroke={dot} strokeWidth="3" />
            <title>{point.title ?? `${point.label} · ${point.value}${unit}`}</title>
          </g>
        ))}
        {coords.map((point, index) => index === 0 || index === coords.length - 1 || coords.length <= 4 ? (
          <text key={`${point.key}-label`} x={point.x} y={height - 8} textAnchor="middle" className="fill-teal-900/45 text-[10px] font-bold">{point.label}</text>
        ) : null)}
      </svg>
    </div>
  );
}

type PieSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
  note?: string;
};

const categoryColors = ['#14b8a6', '#0f766e', '#f59e0b', '#38bdf8', '#a78bfa', '#fb7185', '#84cc16'];

function getCategorySegments(rows: ReturnType<typeof getCategoryRows>): PieSegment[] {
  return rows.map((row, index) => ({
    key: row.category,
    label: row.category,
    value: row.count,
    color: categoryColors[index % categoryColors.length],
    note: `${row.count} 次 · ${row.sets} 组`,
  }));
}

function DistributionPie({
  segments,
  center,
  detail,
  emptyText,
}: {
  segments: PieSegment[];
  center: string;
  detail: string;
  emptyText: string;
}) {
  const visibleSegments = segments.filter((segment) => segment.value > 0);
  const total = visibleSegments.reduce((sum, segment) => sum + segment.value, 0);

  if (!total) {
    return <div className="rounded-[24px] border border-dashed border-emerald-200 bg-white/62 px-4 py-8 text-center text-sm font-bold text-teal-900/55">{emptyText}</div>;
  }

  let cursor = 0;
  const stops = visibleSegments.flatMap((segment) => {
    const start = cursor;
    const end = cursor + (segment.value / total) * 100;
    cursor = end;
    return [`${segment.color} ${start}%`, `${segment.color} ${end}%`];
  }).join(', ');

  return (
    <div className="grid gap-4 sm:grid-cols-[176px_minmax(0,1fr)] sm:items-center">
      <div className="relative mx-auto h-44 w-44 rounded-full border border-white/80 shadow-[0_18px_45px_rgba(15,118,110,0.13)]" style={{ background: `conic-gradient(${stops})` }} aria-label={detail}>
        <div className="absolute inset-8 grid place-items-center rounded-full border border-white/80 bg-white/92 text-center shadow-inner shadow-white">
          <div>
            <p className="text-2xl font-black tracking-[-0.05em] text-teal-950">{center}</p>
            <p className="mt-1 text-[11px] font-bold text-teal-900/46">占比</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {visibleSegments.map((segment) => {
          const percent = Math.round((segment.value / total) * 100);
          return (
            <div key={segment.key} className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-white/66 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-teal-950">{segment.label}</p>
                  {segment.note ? <p className="truncate text-[11px] font-semibold text-teal-900/42">{segment.note}</p> : null}
                </div>
              </div>
              <p className="shrink-0 text-sm font-black text-teal-700">{percent}%</p>
            </div>
          );
        })}
        <p className="pt-1 text-xs font-semibold leading-5 text-teal-900/50">{detail}</p>
      </div>
    </div>
  );
}

function WeeklyRing({ bucket }: { bucket: ReturnType<typeof getWeeklyBuckets>[number] }) {
  const normalizedValue = Math.max(0, Math.min(100, bucket.percentage));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalizedValue / 100);
  const variant = bucket.status;
  const gradientId = `trend-weekly-ring-${bucket.key.replace(/[^a-zA-Z0-9]/g, '')}`;
  const colors = variant === 'exceeded'
    ? ['#fb923c', '#facc15', '#34d399']
    : variant === 'achieved'
      ? ['#34d399', '#14b8a6', '#0f766e']
      : ['#5eead4', '#2dd4bf', '#0f766e'];
  const centerLabel = bucket.overCount > 0 ? `+${bucket.overCount}` : `${normalizedValue}%`;

  return (
    <div className="min-w-0 rounded-[22px] border border-emerald-100 bg-white/66 px-2 py-3 text-center shadow-inner shadow-white/80" title={`${bucket.label} · ${bucket.count}/${bucket.goal} 次 · ${bucket.sets} 组`}>
      <p className="mb-2 truncate text-xs font-black text-teal-950">{bucket.count}/{bucket.goal} 次</p>
      <div className="relative mx-auto flex h-[82px] w-[82px] items-center justify-center rounded-full bg-white shadow-[0_12px_28px_rgba(15,118,110,0.10)]">
        <svg className="h-full w-full" viewBox="0 0 104 104" role="img" aria-label={`${bucket.label} 完成度 ${centerLabel}`}>
          <defs>
            <linearGradient id={gradientId} x1="12" y1="12" x2="92" y2="92" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={colors[0]} />
              <stop offset="54%" stopColor={colors[1]} />
              <stop offset="100%" stopColor={colors[2]} />
            </linearGradient>
          </defs>
          <circle cx="52" cy="52" r={radius} fill="none" stroke={variant === 'exceeded' ? '#ffedd5' : '#d9f8ee'} strokeWidth="12" />
          <circle cx="52" cy="52" r={radius} fill="none" stroke={`url(#${gradientId})`} strokeWidth="12" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 52 52)" />
        </svg>
        <span className={variant === 'exceeded' ? 'absolute text-base font-black tracking-[-0.04em] text-orange-600' : 'absolute text-base font-black tracking-[-0.04em] text-teal-950'}>{centerLabel}</span>
      </div>
      <p className="mt-2 truncate text-[10px] font-bold text-teal-900/46">{bucket.label}</p>
    </div>
  );
}

function WeeklyRingGrid({ buckets }: { buckets: ReturnType<typeof getWeeklyBuckets> }) {
  return (
    <div className="max-h-[356px] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {buckets.map((bucket) => <WeeklyRing key={bucket.key} bucket={bucket} />)}
      </div>
    </div>
  );
}

function StatCard({ label, value, note, badge }: { label: string; value: string; note: string; badge?: string }) {
  return (
    <div className="rounded-[26px] border border-white/80 bg-white/76 p-4 shadow-[0_18px_50px_rgba(15,118,110,0.10)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-teal-900/56">{label}</p>
        {badge ? <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-teal-700">{badge}</span> : null}
      </div>
      <p className="mt-3 text-2xl font-black tracking-[-0.04em] text-teal-950">{value}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-teal-900/48">{note}</p>
    </div>
  );
}

function PillMeter({ label, value, note }: { label: string; value?: number; note: string }) {
  const normalizedValue = value === undefined ? 0 : Math.max(0, Math.min(5, value));
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white/66 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black text-teal-950">{label}</p>
        <p className="text-xs font-black text-teal-700">{value === undefined ? '暂无' : value.toFixed(1)}</p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-emerald-50">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${(normalizedValue / 5) * 100}%` }} />
      </div>
      <p className="mt-2 text-[11px] leading-4 text-teal-900/46">{note}</p>
    </div>
  );
}

function buildLocalTrendJudgement({
  recentSessions,
  weeklyGoalStatus,
  avgIntensity,
  avgFatigue,
  closedCount,
}: {
  recentSessions: WorkoutSessionV2[];
  weeklyGoalStatus: 'pending' | 'achieved' | 'exceeded';
  avgIntensity?: number;
  avgFatigue?: number;
  closedCount: number;
}) {
  if (!recentSessions.length) {
    return {
      title: '先积累 2-3 次训练记录',
      detail: '趋势页会在有训练、回顾和设备摘要后变得更有用。现在先把记录闭环跑起来。',
      next: '下一步：完成一次训练记录，并补本次回顾。',
    };
  }

  if (weeklyGoalStatus === 'exceeded') {
    return {
      title: '本周训练节奏已经超额完成',
      detail: '这周不用继续单纯追次数，下一步更应该看疲劳、完成度和训练类型是否均衡。',
      next: avgFatigue !== undefined && avgFatigue >= 4 ? '下一步：安排一次轻量训练或休息，把疲劳降下来。' : '下一步：优先补一个相对少练的训练类型，不要盲目加量。',
    };
  }

  if (avgIntensity !== undefined && avgFatigue !== undefined && avgIntensity >= 4 && avgFatigue >= 4) {
    return {
      title: '刺激够，但疲劳也在积累',
      detail: '最近主观强度和疲劳都偏高，说明训练不是没练到，而是要注意恢复和下一次训练量。',
      next: '下一步：下一练先控制组数，保留动作质量。',
    };
  }

  if (closedCount < recentSessions.length) {
    return {
      title: '训练记录有了，回顾还需要补齐',
      detail: '趋势判断不仅看动作和组数，也需要主观强度、疲劳和设备摘要。缺回顾时判断会偏粗。',
      next: '下一步：优先补齐最近一次训练回顾。',
    };
  }

  return {
    title: '训练节奏正在形成',
    detail: '最近训练记录和回顾已经能支撑基础趋势判断。继续稳定记录，比追求复杂图表更重要。',
    next: '下一步：保持每周目标，并观察训练类型是否均衡。',
  };
}

export function TrendsScreen() {
  const { state } = useDemo();
  const dashboard = getHomeDashboardState(state);
  const allSessions = getRecentSessions(state.workoutSessions, state.workoutSessions.length || 1);
  const recent14Sessions = getSessionsWithinDays(allSessions, 14);
  const trendSessions = recent14Sessions;
  const recent7Sessions = getRecentSessions(state.workoutSessions, 7);
  const closedCount = trendSessions.filter(isClosedSession).length;
  const totalSets = trendSessions.reduce((sum, session) => sum + getSessionSummary(session).setCount, 0);
  const totalExercises = trendSessions.reduce((sum, session) => sum + getSessionSummary(session).exerciseCount, 0);
  const categoryRows = getCategoryRows(trendSessions);
  const mainCategoryText = categoryRows.length ? categoryRows.slice(0, 2).map((row) => row.category).join(' / ') : '暂无';
  const latestTime = allSessions[0] ? formatSessionTime(getSessionTime(allSessions[0])) : '暂无记录';
  const avgIntensity = average(trendSessions.map((session) => session.review?.intensity));
  const avgFatigue = average(trendSessions.map((session) => session.review?.fatigue));
  const avgCompletion = average(trendSessions.map((session) => session.review?.completion));
  const avgDuration = average(trendSessions.map((session) => session.review?.durationMin));
  const avgKcal = average(trendSessions.map((session) => session.review?.kcal));
  const avgHr = average(trendSessions.map((session) => session.review?.avgHr));
  const maxHr = Math.max(0, ...trendSessions.map((session) => session.review?.maxHr ?? 0));
  const missingReviewCount = trendSessions.filter((session) => !session.review?.savedAt).length;
  const missingDeviceSummaryCount = trendSessions.filter((session) => !session.review?.durationMin && !session.review?.kcal && !session.review?.avgHr && !session.review?.maxHr).length;
  const weeklyBuckets = getWeeklyBuckets(allSessions, dashboard.weeklyGoal, 8);
  const weightLinePoints = getMetricLinePoints(allSessions, getSessionBodyWeight, 'kg');
  const avgHrLinePoints = getMetricLinePoints(allSessions, (session) => session.review?.avgHr, '');
  const categorySegments = getCategorySegments(categoryRows);
  const categoryTotal = categoryRows.reduce((sum, row) => sum + row.count, 0);
  const sessionSetBars = recent7Sessions.reverse().map((session, index, sessions) => {
    const summary = getSessionSummary(session);
    const time = getSessionTime(session);
    return {
      key: session.id,
      label: formatShortDate(time),
      subLabel: inferSessionCategory(session),
      value: summary.setCount,
      isLatest: index === sessions.length - 1,
      title: `${formatSessionTime(time)} · ${inferSessionCategory(session)} · ${summary.setCount} 组`,
    };
  });
  const localJudgement = buildLocalTrendJudgement({
    recentSessions: trendSessions,
    weeklyGoalStatus: dashboard.weeklyGoalStatus,
    avgIntensity,
    avgFatigue,
    closedCount,
  });

  return (
    <AppShell contentSize="wide">
      <PageIntro
        title="训练趋势"
        subtitle="看最近训练节奏、训练量和主观反馈。这里先用本地记录做趋势判断，暂不接入阿练私教 agent。"
      />

      <div className="space-y-4 lg:space-y-5">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="近 14 天训练" value={`${trendSessions.length} 次`} note={`最近一次：${latestTime}`} badge={dashboard.weeklyGoalBadge} />
          <StatCard label="总训练量" value={`${totalSets} 组`} note={`${totalExercises} 个动作`} />
          <StatCard label="主要类型" value={mainCategoryText} note={categoryRows.length ? `覆盖 ${categoryRows.length} 类训练` : '记录后自动识别'} />
          <StatCard label="闭环完成" value={`${closedCount} / ${trendSessions.length || 0}`} note={missingReviewCount ? `${missingReviewCount} 次训练还缺回顾` : '最近训练均已收口'} badge={missingReviewCount ? '待补' : '完整'} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.15fr)]">
          <SectionCard eyebrow="周目标闭环" title="每周训练完成度">
            <div className="rounded-[26px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(209,250,229,0.64))] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-3xl font-black tracking-[-0.05em] text-teal-950">{dashboard.weeklyWorkoutCount} / {dashboard.weeklyGoal} 次</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-teal-900/58">{dashboard.weeklyGoalDetail}</p>
                </div>
                <span className="rounded-full bg-teal-950 px-3 py-1.5 text-sm font-black !text-white shadow-lg shadow-teal-950/16">{dashboard.weeklyGoalBadge}</span>
              </div>
              <p className="mt-4 text-xs font-semibold text-teal-900/46">统计口径：每周一 00:00 重置；历史周按当前每周目标 {dashboard.weeklyGoal} 次计算。</p>
            </div>
            <div className="mt-4">
              <WeeklyRingGrid buckets={weeklyBuckets} />
            </div>
          </SectionCard>

          <SectionCard eyebrow="最近 7 次训练" title="训练量有没有接住？">
            <TrendBars bars={sessionSetBars} valueSuffix="组" />
            <p className="mt-4 text-sm leading-6 text-teal-900/58">
              每根柱子是一条训练记录；组数突然升高时，下一次要结合疲劳和完成度判断是否需要降量。
            </p>
          </SectionCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <SectionCard eyebrow="体重曲线" title="体重变化单独看">
            <LineTrend points={weightLinePoints} unit="kg" />
            <p className="mt-4 text-sm leading-6 text-teal-900/58">
              优先读取训练回顾里的训练后体重；没有时，用恢复记录或训练前体重兜底。
            </p>
          </SectionCard>

          <SectionCard eyebrow="平均心率曲线" title="心率负荷单独看">
            <LineTrend points={avgHrLinePoints} unit=" bpm" tone="rose" />
            <p className="mt-4 text-sm leading-6 text-teal-900/58">
              平均心率来自回顾页设备摘要，用来观察最近训练负荷是否持续升高。
            </p>
          </SectionCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <SectionCard eyebrow="训练类型" title="整体训练占比">
            <DistributionPie
              segments={categorySegments}
              center={categoryTotal ? `${categoryTotal}次` : '暂无'}
              detail={categoryRows.length ? '按最近 14 天训练次数计算臀腿、胸背、有氧等类型占比。' : '记录训练后，这里会显示臀腿 / 胸背 / 有氧等类型占比。'}
              emptyText="记录训练后，这里会显示类型分布。"
            />
          </SectionCard>

          <SectionCard eyebrow="主观反馈" title="强度、疲劳和完成度">
            <div className="grid gap-3 sm:grid-cols-3">
              <PillMeter label="强度" value={avgIntensity} note="训练刺激是否够" />
              <PillMeter label="疲劳" value={avgFatigue} note="疲劳是否积累" />
              <PillMeter label="完成度" value={avgCompletion} note="计划完成情况" />
            </div>
            <p className="mt-4 text-sm leading-6 text-teal-900/58">
              主观反馈来自训练回顾。强度和疲劳同时偏高时，下一次不建议继续单纯加量。
            </p>
          </SectionCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SectionCard eyebrow="设备摘要" title="训练负荷参考">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="平均时长" value={avgDuration === undefined ? '暂无' : `${avgDuration} 分`} note="来自回顾设备摘要" />
              <StatCard label="平均消耗" value={avgKcal === undefined ? '暂无' : `${avgKcal} kcal`} note="只作负荷参考" />
              <StatCard label="平均心率" value={avgHr === undefined ? '暂无' : `${avgHr}`} note="有氧/强度参考" />
              <StatCard label="最高心率" value={maxHr ? `${maxHr}` : '暂无'} note="最近 14 天最高" />
            </div>
            <p className="mt-4 text-sm leading-6 text-teal-900/58">
              {missingDeviceSummaryCount ? `还有 ${missingDeviceSummaryCount} 次训练缺少设备摘要；补齐后，趋势判断会更稳。` : '最近训练都已有设备摘要，可以更稳定地观察训练负荷。'}
            </p>
          </SectionCard>

          <SectionCard eyebrow="本地判断" title={localJudgement.title} tone="highlight">
            <p className="text-sm leading-7 text-teal-900/64">{localJudgement.detail}</p>
            <div className="mt-4 rounded-[24px] border border-emerald-100 bg-white/68 p-4 text-sm font-bold leading-6 text-teal-950">
              {localJudgement.next}
            </div>
            <Link href="/" className="mt-4 inline-flex text-sm font-black text-teal-700 hover:text-teal-950">
              回到今日页 →
            </Link>
          </SectionCard>
        </section>
      </div>
    </AppShell>
  );
}
