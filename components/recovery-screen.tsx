'use client';

import { useRouter } from 'next/navigation';
import { AppShell, NumberPill, PageIntro, SectionCard } from '@/components/app-shell';
import { useDemo } from '@/components/demo-store';
import { getRecoveryJudgement, getWorkoutSummary } from '@/lib/helpers';
import { sorenessOptions } from '@/lib/mock-data';

function ScoreSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-zinc-300">
        <span>{label}</span>
        <span className="text-white">{value}/5</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((option) => (
          <button
            key={`${label}-${option}`}
            onClick={() => onChange(option)}
            className={`rounded-2xl px-3 py-3 text-sm transition ${
              value === option ? 'bg-white text-slate-950' : 'bg-white/5 text-zinc-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RecoveryScreen() {
  const router = useRouter();
  const { state, updateRecoveryField, toggleSorenessArea, completeRecovery } = useDemo();
  const judgement = getRecoveryJudgement(state.recovery);
  const workoutSummary = getWorkoutSummary(state.workout);

  return (
    <AppShell>
      <PageIntro
        title="次日恢复"
        subtitle="恢复不是附属项。把这一步补上，今天该不该顶才更准。"
      />

      <SectionCard eyebrow="关联前次训练" title={state.workout.theme} tone="soft">
        <div className="grid grid-cols-3 gap-3">
          <NumberPill label="动作" value={`${workoutSummary.exerciseCount} 个`} />
          <NumberPill label="总组数" value={`${workoutSummary.setCount} 组`} />
          <NumberPill label="昨日体重" value={state.review.postWeight ? `${state.review.postWeight} kg` : '未补'} />
        </div>
        <p className="mt-4 text-sm leading-6 text-zinc-300">
          昨天的判断：{state.review.note || '这次训练完成了，但今天更重要的是看恢复有没有接上。'}
        </p>
      </SectionCard>

      <div className="mt-4 space-y-4">
        <SectionCard eyebrow="今天状态" title="先看恢复，再决定推进。" tone="highlight">
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm text-zinc-300">晨起空腹体重</span>
              <input
                value={state.recovery.morningWeight}
                onChange={(event) => updateRecoveryField('morningWeight', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
                placeholder="79.0"
              />
            </label>
            <ScoreSelect label="睡眠质量" value={state.recovery.sleep} onChange={(value) => updateRecoveryField('sleep', value)} />
            <ScoreSelect label="精神状态" value={state.recovery.energy} onChange={(value) => updateRecoveryField('energy', value)} />
            <ScoreSelect
              label="功能恢复感"
              value={state.recovery.functionFeel}
              onChange={(value) => updateRecoveryField('functionFeel', value)}
            />
            <ScoreSelect
              label="整体酸痛程度"
              value={state.recovery.sorenessLevel}
              onChange={(value) => updateRecoveryField('sorenessLevel', value)}
            />
          </div>
        </SectionCard>

        <SectionCard eyebrow="酸痛部位" title="点一下就够，不用填很复杂。">
          <div className="flex flex-wrap gap-2">
            {sorenessOptions.map((area) => {
              const active = state.recovery.sorenessAreas.includes(area);
              return (
                <button
                  key={area}
                  onClick={() => toggleSorenessArea(area)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    active ? 'bg-white text-slate-950' : 'bg-white/5 text-zinc-300'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
          <textarea
            value={state.recovery.note}
            onChange={(event) => updateRecoveryField('note', event.target.value)}
            rows={3}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-zinc-500"
            placeholder="比如：睡得一般，腿酸明显，但精神还可以。"
          />
        </SectionCard>

        <SectionCard eyebrow="恢复结论" title="今天怎么安排更稳？">
          <p className="text-base leading-7 text-zinc-100">{judgement}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">这一步越完整，首页的“今天下一步”就越像判断，不像催促。</p>
        </SectionCard>
      </div>

      <div className="mt-5 space-y-3">
        <button
          onClick={() => {
            completeRecovery();
            router.push('/');
          }}
          className="w-full rounded-[24px] bg-white px-4 py-4 text-sm font-semibold text-slate-950"
        >
          保存恢复，回到今日页
        </button>
        <p className="text-center text-xs leading-5 text-zinc-500">完成这一步后，首页会回到“今天可以继续练”那种清楚感。</p>
      </div>
    </AppShell>
  );
}
