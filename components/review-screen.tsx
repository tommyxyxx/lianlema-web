'use client';

import { useRouter } from 'next/navigation';
import { AppShell, NumberPill, PageIntro, SectionCard } from '@/components/app-shell';
import { useDemo } from '@/components/demo-store';
import { getReviewJudgement, getWorkoutSummary } from '@/lib/helpers';

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
      <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
        <span>{label}</span>
        <span className="text-white">{value}/{max}</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: max - min + 1 }, (_, index) => {
          const current = index + min;
          return (
            <button
              key={`${label}-${current}`}
              onClick={() => onChange(current)}
              className={`rounded-2xl px-3 py-3 text-sm transition ${
                value === current ? 'bg-white text-slate-950' : 'bg-white/5 text-zinc-300'
              }`}
            >
              {current}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReviewScreen() {
  const router = useRouter();
  const { state, updateReviewField, completeReview } = useDemo();
  const workoutSummary = getWorkoutSummary(state.workout);
  const judgement = getReviewJudgement(state.review);

  return (
    <AppShell>
      <PageIntro
        title="训练后回顾"
        subtitle="动作记完只是半套。这里把主观感受、设备摘要和一句判断收口。"
      />

      <SectionCard eyebrow="本次训练摘要" title={state.workout.theme} tone="soft">
        <div className="grid grid-cols-3 gap-3">
          <NumberPill label="动作" value={`${workoutSummary.exerciseCount} 个`} />
          <NumberPill label="总组数" value={`${workoutSummary.setCount} 组`} />
          <NumberPill label="训练日体重" value={state.workout.bodyWeight ? `${state.workout.bodyWeight} kg` : '未填'} />
        </div>
        <p className="mt-4 text-sm leading-6 text-zinc-300">{state.workout.note || '这次先把主观感受补完整。'}</p>
      </SectionCard>

      <div className="mt-4 space-y-4">
        <SectionCard eyebrow="主观反馈" title="先看你自己怎么感觉。" tone="highlight">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">训练后体重</span>
              <input
                value={state.review.postWeight}
                onChange={(event) => updateReviewField('postWeight', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
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
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
              placeholder="比如：刺激够了，但别只看表，明天优先看恢复。"
            />
          </div>
        </SectionCard>

        <SectionCard eyebrow="设备摘要" title="可以参考，但别单看它。">
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-2 block text-sm text-zinc-300">时长（分钟）</span>
              <input
                value={state.review.durationMin}
                onChange={(event) => updateReviewField('durationMin', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-zinc-300">活动消耗</span>
              <input
                value={state.review.kcal}
                onChange={(event) => updateReviewField('kcal', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-zinc-300">平均心率</span>
              <input
                value={state.review.avgHr}
                onChange={(event) => updateReviewField('avgHr', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-zinc-300">最高心率</span>
              <input
                value={state.review.maxHr}
                onChange={(event) => updateReviewField('maxHr', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard eyebrow="系统轻判断" title="这次练得怎么样？">
          <p className="text-base leading-7 text-zinc-100">{judgement}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">设备数据只是辅助。真正有用的是，你把主观强度和次日恢复也接上。</p>
        </SectionCard>
      </div>

      <div className="mt-5 space-y-3">
        <button
          onClick={() => {
            completeReview();
            router.push('/recovery');
          }}
          className="w-full rounded-[24px] bg-white px-4 py-4 text-sm font-semibold text-slate-950"
        >
          保存回顾，去次日恢复
        </button>
        <p className="text-center text-xs leading-5 text-zinc-500">这里的目标不是写长报告，是给下一次训练一个靠谱的判断。</p>
      </div>
    </AppShell>
  );
}
