'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell, SectionCard } from '@/components/app-shell';
import { useDemo } from '@/components/demo-store';
import {
  formatDay,
  formatShortDate,
  formatSessionTime,
  getHomeDashboardState,
  getSessionSummary,
  getSessionTime,
  inferSessionCategory,
  inferSessionTitle,
} from '@/lib/helpers';

function clampWeeklyGoal(goal: number) {
  return Math.max(1, Math.min(7, Math.round(goal)));
}

function MiniBarChart({ bars }: { bars: Array<{ key: string; dateLabel: string; setCount: number; height: number; isLatest: boolean; title: string }> }) {
  if (!bars.length) {
    return (
      <div className="mt-7 rounded-[22px] border border-white/10 bg-white/6 px-4 py-5 text-xs font-semibold leading-5 text-[#d7fff5]/72">
        记录一次训练后，这里会显示最近 7 次训练组数。
      </div>
    );
  }

  return (
    <div className="mt-7" aria-label="最近7次训练组数">
      <div className="flex items-end justify-between gap-2 border-b border-white/10 pb-2">
        {bars.map((bar) => (
          <div key={bar.key} className="flex min-w-0 flex-1 flex-col items-center gap-2" title={bar.title}>
            <span className={bar.isLatest ? 'text-[11px] font-black text-[#f4fffc]' : 'text-[11px] font-bold text-[#d7fff5]/70'}>{bar.setCount}组</span>
            <span
              className={bar.isLatest
                ? 'w-full max-w-7 rounded-full bg-gradient-to-t from-emerald-300 to-teal-100 shadow-[0_10px_28px_rgba(20,184,166,0.32)]'
                : 'w-full max-w-7 rounded-full bg-gradient-to-t from-emerald-500/68 to-teal-200/68 shadow-[0_8px_20px_rgba(20,184,166,0.18)]'}
              style={{ height: `${bar.height}px` }}
              aria-label={bar.title}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {bars.map((bar) => (
          <span key={`${bar.key}-date`} className={bar.isLatest ? 'min-w-0 flex-1 text-center text-[10px] font-black text-[#f4fffc]' : 'min-w-0 flex-1 text-center text-[10px] font-semibold text-[#d7fff5]/58'}>
            {bar.dateLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, note, badge }: { icon: string; label: string; value: string; note: string; badge?: string }) {
  return (
    <div className="min-h-[150px] rounded-[26px] border border-white/80 bg-white/78 p-4 shadow-[0_18px_50px_rgba(15,118,110,0.10)] backdrop-blur-xl sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-base shadow-inner shadow-white/80">
          {icon}
        </span>
        {badge ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-teal-700">{badge}</span> : null}
      </div>
      <p className="mt-5 text-sm font-semibold text-teal-900/58">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-teal-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-teal-900/48">{note}</p>
    </div>
  );
}

function ProgressRing({ value, label, variant = 'normal' }: { value: number; label?: string; variant?: 'normal' | 'achieved' | 'exceeded' }) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalizedValue / 100);
  const angle = (normalizedValue / 100) * 360 - 90;
  const endpointX = 60 + radius * Math.cos((angle * Math.PI) / 180);
  const endpointY = 60 + radius * Math.sin((angle * Math.PI) / 180);
  const gradientId = `weekly-ring-gradient-${variant}`;
  const colors = variant === 'exceeded'
    ? ['#fb923c', '#facc15', '#34d399']
    : variant === 'achieved'
      ? ['#34d399', '#14b8a6', '#0f766e']
      : ['#5eead4', '#2dd4bf', '#0f766e'];

  return (
    <div className={variant === 'exceeded'
      ? 'relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle,#fff7ed_0%,#ffffff_62%)] shadow-[0_16px_38px_rgba(251,146,60,0.22)]'
      : 'relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-white shadow-[0_14px_32px_rgba(15,118,110,0.12)]'}>
      <svg className="h-full w-full" viewBox="0 0 120 120" role="img" aria-label={`本周完成度 ${label ?? `${normalizedValue}%`}`}>
        <defs>
          <linearGradient id={gradientId} x1="18" y1="18" x2="102" y2="102" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={colors[0]} />
            <stop offset="54%" stopColor={colors[1]} />
            <stop offset="100%" stopColor={colors[2]} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="44" fill="none" stroke={variant === 'exceeded' ? '#ffedd5' : '#d9f8ee'} strokeWidth="14" />
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
        />
        {normalizedValue > 0 ? <circle cx={endpointX} cy={endpointY} r="5.2" fill="#ffffff" stroke={colors[1]} strokeWidth="3" /> : null}
      </svg>
      <div className={variant === 'exceeded' ? 'absolute inset-[23px] rounded-full bg-white shadow-inner shadow-orange-50' : 'absolute inset-[23px] rounded-full bg-white shadow-inner shadow-emerald-50'} />
      <span className={variant === 'exceeded' ? 'absolute text-lg font-black tracking-[-0.04em] text-orange-600' : 'absolute text-lg font-black tracking-[-0.04em] text-teal-950'}>{label ?? `${normalizedValue}%`}</span>
    </div>
  );
}

const statusLabel: Record<string, string> = {
  inProgress: '进行中',
  needsReview: '待回顾',
  completed: '已完成',
};

export function HomeScreen() {
  const { state, updateWeeklyWorkoutGoal } = useDemo();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const dashboard = getHomeDashboardState(state, nowMs);
  const recentSessions = dashboard.recent7Sessions;
  const latestSession = dashboard.latestSession;
  const lastSessionTime = latestSession ? formatSessionTime(getSessionTime(latestSession)) : '暂无记录';
  const hasRealSessions = recentSessions.length > 0;
  const todayKcalText = dashboard.todayKcal ? `今日 ${dashboard.todayKcal} kcal` : '今日暂无训练消耗';
  const weeklyGoalNote = dashboard.weeklyGoalStatus === 'exceeded'
    ? `目标 ${dashboard.weeklyGoal} 次 · 超额 ${dashboard.weeklyOverCount} 次`
    : dashboard.weeklyGoalStatus === 'achieved'
      ? `目标 ${dashboard.weeklyGoal} 次 · 已达标`
      : `目标 ${dashboard.weeklyGoal} 次 · 还差 ${dashboard.weeklyRemainingCount} 次`;
  const weeklyMetricBadge = dashboard.weeklyGoalStatus === 'exceeded' ? '🔥 超额' : dashboard.weeklyGoalStatus === 'achieved' ? '达标' : '推进中';
  const progressRingLabel = dashboard.weeklyGoalStatus === 'exceeded' ? `+${dashboard.weeklyOverCount}` : undefined;
  const nowIso = new Date(nowMs).toISOString();

  const metricCards = [
    {
      icon: '☀️',
      label: '今日状态',
      value: dashboard.workoutGap.label,
      note: dashboard.focusSession ? `基于 ${inferSessionTitle(dashboard.focusSession)}` : '先完成第一条记录',
      badge: dashboard.status === 'new' ? '待启动' : '间隔提醒',
    },
    {
      icon: '↗',
      label: '本周训练',
      value: `${dashboard.weeklyWorkoutCount}次`,
      note: weeklyGoalNote,
      badge: weeklyMetricBadge,
    },
    {
      icon: '⏱',
      label: '最近训练',
      value: latestSession ? inferSessionCategory(latestSession) : '无',
      note: latestSession ? `${inferSessionTitle(latestSession)} · ${lastSessionTime}` : '还没有训练记录',
      badge: latestSession ? statusLabel[latestSession.status] : undefined,
    },
    {
      icon: '☑',
      label: '本周总量',
      value: `${dashboard.weeklySetCount}组`,
      note: `${dashboard.weeklyExerciseCount} 个动作`,
      badge: dashboard.weeklySetCount ? '真实记录' : undefined,
    },
    {
      icon: '🏷️',
      label: '训练类型',
      value: dashboard.latestSession ? dashboard.focusCategory : '待开始',
      note: dashboard.latestSession ? '来自最近训练动作' : '记录后自动识别',
      badge: dashboard.latestSession ? '自动' : undefined,
    },
    {
      icon: '↔',
      label: '训练节奏',
      value: dashboard.workoutGap.label,
      note: todayKcalText,
      badge: dashboard.rhythmLabel,
    },
  ];

  const recentRows = recentSessions.map((session) => {
    const summary = getSessionSummary(session);
    const timeValue = getSessionTime(session);
    const time = formatSessionTime(timeValue);
    const shortDate = formatShortDate(timeValue);
    const deviceMeta = [
      summary.kcal ? `${summary.kcal} kcal` : undefined,
      session.review?.avgHr ? `平均心率 ${session.review.avgHr}` : undefined,
      session.review?.maxHr ? `最高 ${session.review.maxHr}` : undefined,
    ].filter(Boolean).join(' · ');
    return {
      icon: session.exercises.some((exercise) => exercise.type === 'cardio') ? '🏃' : '🏋️',
      title: `${inferSessionCategory(session)} · ${summary.exerciseCount} 个动作`,
      meta: `${shortDate} · ${time} · ${summary.setCount} 组${deviceMeta ? ` · ${deviceMeta}` : ''}`,
      tag: statusLabel[session.status] ?? '记录',
    };
  });

  return (
    <AppShell>
      <div className="space-y-5 lg:space-y-6">
        <section className="grid max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-stretch">
          <div className="overflow-hidden rounded-[34px] border border-white/72 bg-white/44 p-4 shadow-[0_24px_80px_rgba(13,94,88,0.10)] backdrop-blur-xl sm:p-6 lg:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="break-all text-[36px] font-black leading-[1.04] tracking-[-0.07em] text-teal-950 sm:text-[48px]">
                  今天，练了吗？
                </h1>
                <p className="mt-4 max-w-[60ch] break-all text-sm leading-7 text-teal-900/64 sm:text-base">
                  用最少输入完成训练闭环：记录 → 识别 → 调整 → 回顾。训练数据默认保存在本地，打开就能继续记。
                </p>
              </div>
              <div className="shrink-0 rounded-[28px] border border-emerald-100/80 bg-white/82 px-5 py-4 shadow-[0_18px_48px_rgba(15,118,110,0.10)] backdrop-blur-xl sm:min-w-[172px]">
                <div className="flex flex-col items-center justify-center text-center sm:items-end sm:text-right">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700/62">今日</p>
                  <p className="mt-2 text-[30px] font-black leading-none tracking-[-0.06em] text-teal-950 sm:text-[36px]">{formatShortDate(nowIso)}</p>
                  <p className="mt-2 text-sm font-black text-teal-700/72">{formatDay(nowIso).replace(formatShortDate(nowIso), '').trim()}</p>
                </div>
              </div>
            </div>

            <div className="relative mt-8 overflow-hidden rounded-[30px] border border-emerald-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(213,250,242,0.72))] p-5 shadow-inner shadow-white/80 sm:p-6 lg:min-h-[252px] lg:pr-[292px]">
              <div className="max-w-[58ch]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700/62">训练间隔</p>
                <p className="mt-3 break-all text-[24px] font-black leading-tight tracking-[-0.04em] text-teal-950 sm:text-[30px]">
                  {dashboard.workoutGap.titlePrefix}
                </p>
                {dashboard.workoutGap.titleValue ? (
                  <p className="mt-3 break-all text-[44px] font-black leading-none tracking-[-0.08em] text-teal-950 sm:text-[56px] lg:text-[62px]">
                    {dashboard.workoutGap.titleValue}
                  </p>
                ) : null}
              </div>
              <p className="mt-4 max-w-[58ch] break-all text-sm leading-6 text-teal-900/60">
                {dashboard.workoutGap.detail}
              </p>
              <div className="mt-7 flex flex-row flex-wrap items-center gap-3 pr-0 lg:flex-nowrap lg:pr-[292px]">
                <Link
                  href={dashboard.copy.primaryHref}
                  className="inline-flex h-14 shrink-0 whitespace-nowrap items-center justify-center rounded-[20px] bg-emerald-500 px-7 text-base font-black !text-white shadow-[0_16px_38px_rgba(16,185,129,0.34)] transition hover:bg-emerald-600"
                >
                  {dashboard.workoutGap.primaryLabel}
                </Link>
                <a
                  href={dashboard.copy.secondaryHref}
                  className="inline-flex h-14 shrink-0 whitespace-nowrap items-center justify-center rounded-[20px] border border-emerald-100 bg-white/82 px-7 text-base font-black text-teal-950 shadow-sm shadow-teal-900/5 transition hover:bg-white"
                >
                  {dashboard.workoutGap.secondaryLabel}
                </a>
              </div>

              <div className="mt-6 flex items-center justify-between gap-5 rounded-[28px] bg-white/90 p-5 shadow-[0_18px_46px_rgba(15,118,110,0.12)] backdrop-blur-xl lg:absolute lg:right-7 lg:top-7 lg:mt-0 lg:w-[250px] lg:flex-col lg:items-stretch lg:gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-teal-900/58">本周节奏</p>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-teal-700">{dashboard.weeklyGoalBadge}</span>
                  </div>
                  <p className="mt-2 text-sm font-black leading-5 text-teal-950">已完成 {dashboard.weeklyWorkoutCount} / {dashboard.weeklyGoal} 次</p>
                  <p className="mt-2 text-xs leading-5 text-teal-900/52">{hasRealSessions ? dashboard.weeklyGoalDetail : '记录第一条训练后开始计算。'}</p>
                  <div className="mt-4 inline-flex items-center rounded-full border border-emerald-100 bg-white/80 p-1 shadow-sm shadow-teal-900/5" aria-label="调整每周训练目标">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-teal-700 transition hover:bg-emerald-50 disabled:text-teal-900/24"
                      disabled={dashboard.weeklyGoal <= 1}
                      onClick={() => updateWeeklyWorkoutGoal(clampWeeklyGoal(dashboard.weeklyGoal - 1))}
                    >
                      −
                    </button>
                    <span className="min-w-12 px-2 text-center text-xs font-black text-teal-950">目标 {dashboard.weeklyGoal}</span>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-teal-700 transition hover:bg-emerald-50 disabled:text-teal-900/24"
                      disabled={dashboard.weeklyGoal >= 7}
                      onClick={() => updateWeeklyWorkoutGoal(clampWeeklyGoal(dashboard.weeklyGoal + 1))}
                    >
                      ＋
                    </button>
                  </div>
                </div>
                <ProgressRing value={dashboard.weeklyProgress} label={progressRingLabel} variant={dashboard.weeklyGoalStatus === 'pending' ? 'normal' : dashboard.weeklyGoalStatus} />
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[34px] bg-teal-950 p-5 shadow-[0_26px_80px_rgba(9,61,56,0.26)] sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute -bottom-14 -right-12 h-40 w-40 rounded-full bg-emerald-300/16" aria-hidden="true" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#bff8ec]/82">{dashboard.copy.tag}</p>
              <h2 className="mt-4 break-all text-2xl font-black leading-tight tracking-[-0.04em] text-[#f4fffc] sm:text-3xl">{dashboard.copy.title}</h2>
              <p className="mt-4 break-all text-sm leading-7 text-[#d7fff5]/82">{dashboard.copy.detail}</p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#bff8ec]/82">最近 7 次训练组数</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-black text-[#f4fffc]">{dashboard.recentSessionSetBars.length} 次</span>
              </div>
              <MiniBarChart bars={dashboard.recentSessionSetBars} />
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4" aria-label="今日页关键指标">
          {metricCards.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <SectionCard title="最近训练记录" eyebrow="真实记录" tone="default">
            <div id="recent-workouts" className="space-y-3 scroll-mt-24">
              {recentRows.length ? recentRows.map((row) => (
                <div
                  key={row.title}
                  className="flex items-center gap-3 rounded-[24px] border border-emerald-100/70 bg-white/72 p-3 shadow-sm shadow-teal-900/5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-xl">{row.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-teal-950 sm:text-base">{row.title}</p>
                    <p className="mt-1 truncate text-xs font-medium text-teal-900/48">{row.meta}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-teal-700">{row.tag}</span>
                </div>
              )) : (
                <div className="rounded-[24px] border border-dashed border-emerald-200 bg-white/72 px-4 py-8 text-center text-sm font-bold leading-6 text-teal-900/58">
                  最近还没有训练记录。先记录第一条训练，今日页会从这里开始显示你的真实数据。
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/train" className="text-sm font-black text-teal-700 hover:text-teal-950">
                打开训练记录 →
              </Link>
              <Link href="/trends" className="text-sm font-black text-teal-700/70 hover:text-teal-950">
                看最近趋势 →
              </Link>
            </div>
          </SectionCard>

          <SectionCard title="训练闭环" eyebrow="记录路径" tone="default">
            <div className="space-y-1">
              {[
                { step: '1', title: '文本输入', detail: '“卧推 60kg 8次 4组，飞鸟 12kg 12次” 这种自然语言直接记。' },
                { step: '2', title: '自动拆解动作', detail: '用动作别名、数字模式和单位识别，先把记录成本降下来。' },
                { step: '3', title: '手动调整后保存', detail: '识别错了也能快速改，后面复盘才有可靠记录。' },
              ].map((item) => (
                <div key={item.step} className="grid grid-cols-[40px_1fr] gap-3 border-b border-emerald-100/70 py-4 last:border-b-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-900 to-emerald-500 text-sm font-black !text-white shadow-[0_10px_24px_rgba(15,118,110,0.20)]">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-black text-teal-950">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-teal-900/54">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <SectionCard title="今日建议" eyebrow="下一步行动" tone="highlight">
            <p className="text-[22px] font-black leading-tight tracking-[-0.04em] text-teal-950">{dashboard.copy.adviceTitle}</p>
            <p className="mt-3 text-sm leading-7 text-teal-900/64">{dashboard.copy.advice}</p>
          </SectionCard>

          <SectionCard title="本地记录" eyebrow="使用方式" tone="soft">
            <p className="text-sm leading-7 text-teal-900/60">
              先把每次训练稳定记下来，再用本次回顾和设备摘要帮助判断下一次怎么练。现在不需要注册账号，也不需要先搭复杂计划。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-teal-900/54">
              {[
                { step: '1', title: '记录训练', detail: dashboard.status === 'training' ? '当前已有训练进行中，继续补动作、重量、次数和组数。' : '用自然语言或手动输入，把本次动作先留下来。' },
                { step: '2', title: '补本次回顾', detail: dashboard.status === 'needsReview' ? '现在最该做的是补主观反馈和设备摘要。' : '训练结束后补主观强度、疲劳感、完成度和设备摘要。' },
                { step: '3', title: '完成闭环', detail: dashboard.status === 'needsReview' ? '补完本次回顾后，这次训练就会标记完成。' : '回顾保存后直接完成本次训练，今日页和训练库同步更新。' },
              ].map((item, index) => (
                <div key={item.title} className="rounded-2xl border border-emerald-100 bg-white/68 px-2 py-3">
                  <p className="text-[11px] text-teal-700/60">0{index + 1}</p>
                  <p className="mt-1">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-teal-900/42">{item.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>
      </div>
    </AppShell>
  );
}
