'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, NumberPill, PageIntro, SectionCard } from '@/components/app-shell';
import { useDemo } from '@/components/demo-store';
import { cn, getLocalDateKey, getSessionSummary, getWorkoutSummary, inferSessionCategory, inferSessionTitle } from '@/lib/helpers';
import { WorkoutSessionV2 } from '@/lib/mock-data';

function ScoreRow({
  label,
  value,
  min = 1,
  max = 5,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-teal-900/62">
        <span>{label}</span>
        <span className="font-bold text-teal-950">{value}/{max}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: max - min + 1 }, (_, index) => {
          const current = index + min;
          return (
            <button
              key={`${label}-${current}`}
              onClick={() => onChange(current)}
              className={cn(
                'rounded-2xl px-3 py-3 text-sm font-bold transition',
                value === current
                  ? 'bg-teal-950 !text-white shadow-lg shadow-teal-950/15'
                  : 'border border-emerald-100/80 bg-white/70 text-teal-900/58 hover:bg-emerald-50',
              )}
            >
              {current}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function formatSessionClock(value?: string) {
  if (!value) return '待确认';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '待确认';
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function minutesBetween(start?: string, end?: string) {
  if (!start || !end) return undefined;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return undefined;
  return Math.max(1, Math.round((endMs - startMs) / 60000));
}

function getSessionEnd(session: WorkoutSessionV2) {
  return session.endedAt ?? session.lastSetAt ?? session.completedAt ?? session.updatedAt ?? session.savedAt;
}

function buildReviewTrainings(sessions: WorkoutSessionV2[], currentWorkoutId?: string): Array<{
  id: string;
  title: string;
  category: string;
  start: string;
  end: string;
  durationMin?: number;
  exerciseCount: number;
  setCount: number;
  review?: WorkoutSessionV2['review'];
  note?: string;
}> {
  const currentSession = currentWorkoutId ? sessions.find((session) => session.id === currentWorkoutId) : undefined;
  if (!currentSession) return [];

  const currentDay = getLocalDateKey(currentSession.startedAt);
  const relatedSessions = sessions
    .filter((session) => {
      if (!session.exercises.length) return false;
      const sessionDay = getLocalDateKey(session.startedAt);
      return session.id === currentSession.id || sessionDay === currentDay;
    })
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));

  return relatedSessions.map((session) => {
    const names = session.exercises.map((exercise) => exercise.name);
    return {
      id: session.id,
      title: inferSessionTitle(session),
      category: inferSessionCategory(session),
      start: session.startedAt,
      end: getSessionEnd(session),
      durationMin: minutesBetween(session.startedAt, getSessionEnd(session)),
      exerciseCount: session.exercises.length,
      setCount: session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
      review: session.review,
      note: session.note,
    };
  });
}

function SessionTimeline({
  trainings,
  selectedTrainingId,
  onSelectTraining,
}: {
  trainings: ReturnType<typeof buildReviewTrainings>;
  selectedTrainingId?: string;
  onSelectTraining?: (trainingId: string) => void;
}) {
  if (!trainings.length) return null;

  return (
    <div className="mt-5 space-y-3">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-600/80">训练时间线</p>
      <div className="space-y-3">
        {trainings.map((training) => {
          const selected = selectedTrainingId === training.id;
          const hasDeviceSummary = Boolean(training.review?.durationMin || training.review?.kcal || training.review?.avgHr || training.review?.maxHr);
          return (
            <button
              key={training.id}
              type="button"
              onClick={() => onSelectTraining?.(training.id)}
              className={cn(
                'grid w-full grid-cols-[54px_14px_1fr] gap-3 rounded-[22px] p-1 text-left text-sm transition sm:grid-cols-[72px_16px_1fr]',
                selected ? 'bg-emerald-50/80 ring-2 ring-emerald-300/70' : 'hover:bg-white/50',
              )}
            >
              <div className="pt-1.5 text-xs font-black leading-5 text-teal-700 sm:text-sm">
                {formatSessionClock(training.start)}
              </div>
              <div className="relative pt-2">
                <span className={cn(
                  'block h-3.5 w-3.5 rounded-full border-[3px] shadow-[0_0_0_4px_rgba(16,185,129,0.08)]',
                  hasDeviceSummary ? 'border-emerald-100 bg-emerald-500' : 'border-teal-50 bg-teal-300',
                )} />
              </div>
              <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-3 shadow-sm shadow-teal-900/5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">{training.category}</span>
                  <span className="font-black text-teal-950">{training.title}</span>
                  {selected ? <span className="rounded-full bg-teal-950 px-2 py-0.5 text-[11px] font-black !text-white">正在记录</span> : null}
                  {hasDeviceSummary ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-teal-700">已填设备摘要</span> : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-teal-900/56">
                  {formatSessionClock(training.start)}–{formatSessionClock(training.end)}
                  {training.durationMin ? ` · ${training.durationMin} 分钟` : ''} · {training.exerciseCount} 个动作 · {training.setCount} 组
                </p>
                {hasDeviceSummary ? (
                  <p className="mt-2 text-xs leading-5 text-teal-900/62">
                    设备摘要：{training.review?.durationMin ? `${training.review.durationMin} 分钟` : '时长未填'}
                    {training.review?.kcal ? ` · ${training.review.kcal} kcal` : ''}
                    {training.review?.avgHr ? ` · 平均 ${training.review.avgHr}` : ''}
                    {training.review?.maxHr ? ` · 最高 ${training.review.maxHr}` : ''}
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewScreen() {
  const router = useRouter();
  const { state, updateReviewField, updateSessionDeviceReviewField, completeReview } = useDemo();
  const workoutSummary = getWorkoutSummary(state.workout);
  const currentSession = state.currentWorkoutId ? state.workoutSessions.find((session) => session.id === state.currentWorkoutId) : undefined;
  const trainings = useMemo(
    () => buildReviewTrainings(state.workoutSessions, state.currentWorkoutId),
    [state.workoutSessions, state.currentWorkoutId],
  );
  const sessionSummary = getSessionSummary(currentSession);
  const summary = currentSession ? sessionSummary : workoutSummary;
  const categories = trainings.map((training) => training.category);
  const uniqueCategories = [...new Set(categories)];
  const summaryTitle = currentSession ? `本次包含 ${trainings.length} 个训练` : state.workout.theme || '本次训练';
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | undefined>(currentSession?.id ?? trainings[0]?.id);
  const selectedTraining = useMemo(
    () => trainings.find((training) => training.id === selectedTrainingId) ?? trainings[0],
    [selectedTrainingId, trainings],
  );
  const selectedDeviceReview = selectedTraining?.review;

  useEffect(() => {
    if (!trainings.length) return;
    if (!selectedTrainingId || !trainings.some((training) => training.id === selectedTrainingId)) {
      setSelectedTrainingId(currentSession?.id ?? trainings[0].id);
    }
  }, [currentSession?.id, selectedTrainingId, trainings]);

  const getDeviceFieldValue = (field: 'durationMin' | 'avgHr' | 'maxHr' | 'kcal') => {
    const value = selectedDeviceReview?.[field];
    return value === undefined || value === null ? '' : String(value);
  };

  const updateSelectedDeviceField = (field: 'durationMin' | 'avgHr' | 'maxHr' | 'kcal', value: string) => {
    if (!selectedTraining) return;
    updateSessionDeviceReviewField(selectedTraining.id, field, value);
  };

  return (
    <AppShell>
      <PageIntro
        title="训练后回顾"
        subtitle="动作记完只是半套。这里把本次训练摘要、主观反馈和设备摘要收口。"
      />

      <SectionCard eyebrow="本次训练摘要" title={summaryTitle} tone="soft">
        <div className="mb-4 flex flex-wrap gap-2">
          {(uniqueCategories.length ? uniqueCategories : ['综合训练']).map((category) => (
            <span key={category} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
              {category}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberPill label="动作" value={`${summary.exerciseCount} 个`} />
          <NumberPill label="总组数" value={`${summary.setCount} 组`} />
          <NumberPill label="训练分类" value={`${uniqueCategories.length || 1} 类`} />
        </div>
        <p className="mt-4 text-sm leading-6 text-teal-900/62">{state.workout.note || currentSession?.note || '这次先把主观感受补完整。'}</p>
      </SectionCard>

      <div className="mt-4 space-y-4">
        <SectionCard eyebrow="设备摘要" title="先选一组训练，再填设备数据。">
          <div className="space-y-4">
            <SessionTimeline
              trainings={trainings}
              selectedTrainingId={selectedTraining?.id}
              onSelectTraining={setSelectedTrainingId}
            />
            <div className="rounded-[24px] border border-emerald-100/80 bg-white/62 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  {selectedTraining ? `${selectedTraining.category} · ${selectedTraining.title}` : '本次训练'}
                </span>
                <span className="text-xs font-bold text-teal-900/52">设备摘要会按这组训练单独保存</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-2 block text-sm text-teal-900/62">时长（分钟）</span>
                  <input
                    value={getDeviceFieldValue('durationMin')}
                    onChange={(event) => updateSelectedDeviceField('durationMin', event.target.value)}
                    className="w-full rounded-2xl border border-emerald-100/80 bg-white/76 px-4 py-3 text-teal-950 outline-none"
                    placeholder={selectedTraining?.durationMin ? String(selectedTraining.durationMin) : '60'}
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm text-teal-900/62">活动消耗</span>
                  <input
                    value={getDeviceFieldValue('kcal')}
                    onChange={(event) => updateSelectedDeviceField('kcal', event.target.value)}
                    className="w-full rounded-2xl border border-emerald-100/80 bg-white/76 px-4 py-3 text-teal-950 outline-none"
                    placeholder="420"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm text-teal-900/62">平均心率</span>
                  <input
                    value={getDeviceFieldValue('avgHr')}
                    onChange={(event) => updateSelectedDeviceField('avgHr', event.target.value)}
                    className="w-full rounded-2xl border border-emerald-100/80 bg-white/76 px-4 py-3 text-teal-950 outline-none"
                    placeholder="128"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-sm text-teal-900/62">最高心率</span>
                  <input
                    value={getDeviceFieldValue('maxHr')}
                    onChange={(event) => updateSelectedDeviceField('maxHr', event.target.value)}
                    className="w-full rounded-2xl border border-emerald-100/80 bg-white/76 px-4 py-3 text-teal-950 outline-none"
                    placeholder="162"
                  />
                </label>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard eyebrow="主观反馈" title="先看你自己怎么感觉。" tone="highlight">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-teal-900/62">训练后体重</span>
              <input
                value={state.review.postWeight}
                onChange={(event) => updateReviewField('postWeight', event.target.value)}
                className="w-full rounded-2xl border border-emerald-100/80 bg-white/76 px-4 py-3 text-teal-950 outline-none placeholder:text-teal-900/35"
                placeholder="79.4"
              />
            </label>
            <ScoreRow
              label="主观强度"
              value={state.review.intensity}
              min={1}
              max={5}
              onChange={(value) => updateReviewField('intensity', value)}
            />
            <ScoreRow
              label="疲劳感"
              value={state.review.fatigue}
              min={1}
              max={5}
              onChange={(value) => updateReviewField('fatigue', value)}
            />
            <ScoreRow
              label="完成度"
              value={state.review.completion}
              min={1}
              max={5}
              onChange={(value) => updateReviewField('completion', value)}
            />
            <textarea
              value={state.review.note}
              onChange={(event) => updateReviewField('note', event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-emerald-100/80 bg-white/76 px-4 py-3 text-teal-950 outline-none placeholder:text-teal-900/35"
              placeholder="比如：刺激够了，胸背训练完成度不错，下次可以先看卧推动作质量。"
            />
          </div>
        </SectionCard>

      </div>

      <div className="mt-5 space-y-3">
        <button
          onClick={() => {
            completeReview();
            router.push('/');
          }}
          className="w-full rounded-[24px] bg-teal-950 px-4 py-4 text-sm font-semibold !text-white shadow-lg shadow-teal-950/18"
        >
          保存回顾，完成本次训练
        </button>
        <p className="text-center text-xs leading-5 text-teal-900/48">这里的目标不是写长报告，是给下一次训练一个靠谱的判断。</p>
      </div>
    </AppShell>
  );
}
