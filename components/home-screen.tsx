'use client';

import Link from 'next/link';
import { AppShell, SectionCard } from '@/components/app-shell';
import { useDemo } from '@/components/demo-store';
import {
  formatDay,
  formatSessionTime,
  getRecoveryJudgement,
  getReviewJudgement,
  getWorkoutSummary,
} from '@/lib/helpers';
import { DemoMode } from '@/lib/mock-data';

const modeCopy: Record<DemoMode, { tag: string; title: string; detail: string; metric: string; rhythm: string }> = {
  new: {
    tag: '开始第一条',
    title: '先记录一组训练，把闭环跑起来。',
    detail: '不用先搭复杂计划。今天只要把动作、重量、次数和组数留下来。',
    metric: '0次',
    rhythm: '待启动',
  },
  ready: {
    tag: '今日状态',
    title: '可训练，但建议别冲太满',
    detail: '上次腿部训练距今 2 天，恢复感 7/10。今天适合上肢或全身轻量。',
    metric: '3次',
    rhythm: '持续',
  },
  review: {
    tag: '待补回顾',
    title: '训练记下来了，差一次主观回顾。',
    detail: '先把这次练得怎么样补完，后面判断强度才不会只看数字。',
    metric: '3次',
    rhythm: '待收口',
  },
  recovery: {
    tag: '待补恢复',
    title: '昨天练完了，今天先看恢复。',
    detail: '恢复不是附属项。补完睡眠、精神和酸痛，再决定今天要不要顶。',
    metric: '2次',
    rhythm: '观察中',
  },
  slipping: {
    tag: '节奏提醒',
    title: '节奏断了几天，先轻量接回来。',
    detail: '不用补作业，也别一上来拉满。今天先记一次训练或恢复都算回到轨道。',
    metric: '1次',
    rhythm: '回接中',
  },
};

function MiniBarChart() {
  const bars = [32, 46, 39, 58, 34, 42, 66];

  return (
    <div className="mt-8 flex h-20 items-end gap-2 sm:gap-3" aria-hidden="true">
      {bars.map((height, index) => (
        <span
          key={index}
          className="w-full rounded-full bg-gradient-to-t from-emerald-400 to-teal-200 shadow-[0_10px_28px_rgba(20,184,166,0.28)]"
          style={{ height: `${height}%` }}
        />
      ))}
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

function ProgressRing({ value }: { value: number }) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalizedValue / 100);
  const angle = (normalizedValue / 100) * 360 - 90;
  const endpointX = 60 + radius * Math.cos((angle * Math.PI) / 180);
  const endpointY = 60 + radius * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-white shadow-[0_14px_32px_rgba(15,118,110,0.12)]">
      <svg className="h-full w-full" viewBox="0 0 120 120" role="img" aria-label={`本周完成度 ${normalizedValue}%`}>
        <defs>
          <linearGradient id="weekly-ring-gradient" x1="18" y1="18" x2="102" y2="102" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="58%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="44" fill="none" stroke="#d9f8ee" strokeWidth="14" />
        <circle
          cx="60"
          cy="60"
          r="44"
          fill="none"
          stroke="url(#weekly-ring-gradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 60 60)"
        />
        {normalizedValue > 0 ? <circle cx={endpointX} cy={endpointY} r="5.2" fill="#ffffff" stroke="#14b8a6" strokeWidth="3" /> : null}
      </svg>
      <div className="absolute inset-[23px] rounded-full bg-white shadow-inner shadow-emerald-50" />
      <span className="absolute text-lg font-black tracking-[-0.04em] text-teal-950">{normalizedValue}%</span>
    </div>
  );
}

export function HomeScreen() {
  const { state } = useDemo();
  const workoutSummary = getWorkoutSummary(state.workout);
  const reviewJudgement = getReviewJudgement(state.review);
  const recoveryJudgement = getRecoveryJudgement(state.recovery);
  const copy = modeCopy[state.mode];
  const recoveryScore = Math.round(((state.recovery.sleep + state.recovery.energy + state.recovery.functionFeel) / 15) * 10);
  const lastSessionTime = formatSessionTime(state.workout.startedAt);
  const completedThisWeek = state.mode === 'new' ? 0 : Number(copy.metric.replace('次', '')) || 0;
  const weeklyProgress = state.mode === 'ready' ? 78 : Math.round((completedThisWeek / 4) * 100);
  const todayAdvice =
    state.mode === 'slipping'
      ? '先回来，不用一口气补完。建议从 20 分钟轻量训练开始，把节奏接上。'
      : state.mode === 'review'
        ? reviewJudgement
        : state.mode === 'new'
          ? '先记录第一条训练，别急着做数据大盘。'
          : recoveryJudgement;

  const metricCards = [
    {
      icon: '☀️',
      label: '今日状态',
      value: state.mode === 'new' ? '待开始' : `${recoveryScore}.${state.recovery.sorenessLevel}`,
      note: state.mode === 'new' ? '先完成第一条记录' : '恢复底评分',
      badge: state.mode === 'ready' ? '良好' : copy.rhythm,
    },
    {
      icon: '↗',
      label: '本周训练',
      value: copy.metric,
      note: state.mode === 'new' ? '目标 1 次' : '目标 4 次',
      badge: state.mode === 'ready' ? '+1' : undefined,
    },
    {
      icon: '⏱',
      label: '最近训练',
      value: state.mode === 'new' ? '无' : state.workout.theme,
      note: state.mode === 'new' ? '还没有训练记录' : lastSessionTime,
      badge: state.mode === 'recovery' ? '昨天' : undefined,
    },
    {
      icon: '☑',
      label: '总组数',
      value: `${workoutSummary.setCount}组`,
      note: `${workoutSummary.exerciseCount} 个动作`,
      badge: state.mode === 'review' ? '待回顾' : undefined,
    },
    {
      icon: '♡',
      label: '恢复感',
      value: state.mode === 'new' ? '待补' : recoveryScore >= 7 ? '中高' : '偏低',
      note: state.mode === 'new' ? '次日再记录' : '睡眠 / 精神 / 体感',
      badge: recoveryScore >= 7 ? '稳' : undefined,
    },
    {
      icon: '↔',
      label: '训练节奏',
      value: state.mode === 'slipping' ? '1周' : '4周',
      note: state.mode === 'slipping' ? '需要接回' : '连续记录',
      badge: copy.rhythm,
    },
  ];

  const recentRows = [
    {
      icon: '🏋️',
      title: `${state.workout.theme || '胸肩'} · ${workoutSummary.exerciseCount} 个动作`,
      meta: `${lastSessionTime} · ${workoutSummary.setCount} 组 · ${state.review.kcal || '—'} kcal`,
      tag: state.mode === 'review' ? '待回顾' : 'Push',
    },
    {
      icon: '🚴',
      title: '椭圆机 25 分钟 + 核心',
      meta: '周三 19:12 · 心肺轻量 · RPE 6',
      tag: '恢复',
    },
    {
      icon: '🦵',
      title: '深蹲 · 腿举 · 腿弯举',
      meta: '周一 18:50 · 7 个动作 · 腿部主练',
      tag: 'Leg',
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5 lg:space-y-6">
        <section className="grid max-w-full gap-4 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-stretch">
          <div className="overflow-hidden rounded-[34px] border border-white/72 bg-white/44 p-4 shadow-[0_24px_80px_rgba(13,94,88,0.10)] backdrop-blur-xl sm:p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex max-w-full rounded-full border border-emerald-100 bg-white/76 px-3 py-1 text-xs font-black leading-5 tracking-tight text-teal-700 shadow-sm shadow-teal-900/5">
                🌿 本地记录 · 训练习惯 Dashboard
              </span>
              <span className="rounded-full bg-white/76 px-3 py-1 text-xs font-bold text-teal-900/55 shadow-sm shadow-teal-900/5">
                {formatDay(new Date().toISOString())}
              </span>
            </div>

            <div className="mt-7">
              <h1 className="break-all text-[36px] font-black leading-[1.04] tracking-[-0.07em] text-teal-950 sm:text-[48px]">
                今天，练了吗？
              </h1>
              <p className="mt-4 max-w-[60ch] break-all text-sm leading-7 text-teal-900/64 sm:text-base">
                用最少输入完成训练闭环：记录 → 识别 → 调整 → 回顾。训练数据默认保存在本地，打开就能继续记。
              </p>
            </div>

            <div className="relative mt-8 overflow-hidden rounded-[30px] border border-emerald-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(213,250,242,0.72))] p-5 shadow-inner shadow-white/80 sm:p-6 lg:min-h-[206px] lg:pr-[250px]">
              <p className="break-all text-[28px] font-black leading-tight tracking-[-0.05em] text-teal-950 sm:text-[34px]">
                固定入口，任何时候都能快速记录一组训练
              </p>
              <p className="mt-3 max-w-[58ch] break-all text-sm leading-6 text-teal-900/60">
                打开首页就能开记：一句话写下动作、重量、次数和组数，再按需要调整保存。
              </p>
              <div className="mt-6 flex flex-row flex-wrap items-center gap-3 pr-0 lg:flex-nowrap lg:pr-[248px]">
                <Link
                  href="/train"
                  className="inline-flex h-14 shrink-0 whitespace-nowrap items-center justify-center rounded-[20px] bg-emerald-500 px-7 text-base font-black text-white shadow-[0_16px_38px_rgba(16,185,129,0.34)] transition hover:bg-emerald-600"
                >
                  ＋ 记录训练
                </Link>
                <a
                  href="#recent-workouts"
                  className="inline-flex h-14 shrink-0 whitespace-nowrap items-center justify-center rounded-[20px] border border-emerald-100 bg-white/82 px-7 text-base font-black text-teal-950 shadow-sm shadow-teal-900/5 transition hover:bg-white"
                >
                  查看最近一次
                </a>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 rounded-[26px] bg-white/90 p-4 shadow-[0_18px_46px_rgba(15,118,110,0.12)] backdrop-blur-xl lg:absolute lg:right-6 lg:top-6 lg:mt-0 lg:w-[228px]">
                <div className="min-w-0">
                  <p className="text-xs font-black text-teal-900/58">本周节奏</p>
                  <p className="mt-1 text-sm font-black leading-5 text-teal-950">已完成 {completedThisWeek} / 4 次</p>
                  <p className="mt-1 text-xs leading-5 text-teal-900/52">建议今晚做一次轻量拉训练。</p>
                </div>
                <ProgressRing value={weeklyProgress} />
              </div>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[34px] bg-teal-950 p-5 shadow-[0_26px_80px_rgba(9,61,56,0.26)] sm:p-6 lg:p-7">
            <div className="pointer-events-none absolute -bottom-14 -right-12 h-40 w-40 rounded-full bg-emerald-300/16" aria-hidden="true" />
            <div className="relative">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#bff8ec]/82">{copy.tag}</p>
              <h2 className="mt-4 break-all text-2xl font-black leading-tight tracking-[-0.04em] text-[#f4fffc] sm:text-3xl">{copy.title}</h2>
              <p className="mt-4 break-all text-sm leading-7 text-[#d7fff5]/82">{copy.detail}</p>
              <MiniBarChart />
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4" aria-label="首页关键指标">
          {metricCards.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <SectionCard title="最近训练摘要" eyebrow="最近一次" tone="default">
            <div id="recent-workouts" className="space-y-3 scroll-mt-24">
              {recentRows.map((row) => (
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
              ))}
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
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-900 to-emerald-500 text-sm font-black text-white shadow-[0_10px_24px_rgba(15,118,110,0.20)]">
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
          <SectionCard title="今天建议" eyebrow="下一步行动" tone="highlight">
            <p className="text-[22px] font-black leading-tight tracking-[-0.04em] text-teal-950">{copy.rhythm}</p>
            <p className="mt-3 text-sm leading-7 text-teal-900/64">{todayAdvice}</p>
          </SectionCard>

          <SectionCard title="本地记录" eyebrow="使用方式" tone="soft">
            <p className="text-sm leading-7 text-teal-900/60">
              先把每次训练稳定记下来，再用回顾和恢复感帮助判断下一次怎么练。现在不需要注册账号，也不需要先搭复杂计划。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-teal-900/54">
              {['记录训练', '补回顾', '看趋势'].map((item, index) => (
                <div key={item} className="rounded-2xl border border-emerald-100 bg-white/68 px-2 py-3">
                  <p className="text-[11px] text-teal-700/60">0{index + 1}</p>
                  <p className="mt-1">{item}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </section>
      </div>
    </AppShell>
  );
}
