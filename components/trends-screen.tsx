'use client';

import Link from 'next/link';
import { AppShell, PageIntro, SectionCard } from '@/components/app-shell';
import { trendData } from '@/lib/mock-data';

function MiniBars({ values, suffix = '' }: { values: number[]; suffix?: string }) {
  const max = Math.max(...values, 1);

  return (
    <div className="grid grid-cols-7 gap-2">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end rounded-2xl bg-white/5 p-1">
            <div
              className="w-full rounded-xl bg-gradient-to-t from-sky-300 to-white"
              style={{ height: `${Math.max(((value || 0.2) / max) * 100, 14)}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-400">
            {value}
            {suffix}
          </p>
        </div>
      ))}
    </div>
  );
}

export function TrendsScreen() {
  return (
    <AppShell>
      <PageIntro
        title="趋势页（极简版）"
        subtitle="这页故意收着做。不是让你沉迷图表，只是看方向有没有在回稳。"
      />

      <div className="space-y-4">
        <SectionCard eyebrow="近 7 天训练次数" title="节奏有没有掉？">
          <MiniBars values={trendData.workoutCount7d} suffix="次" />
          <p className="mt-4 text-sm leading-6 text-zinc-300">这周做到了 3 次训练。重点不是漂亮，而是节奏没断太久。</p>
        </SectionCard>

        <SectionCard eyebrow="近 14 天体重" title="只看方向，不做情绪波动。">
          <MiniBars values={trendData.weight14d.slice(-7)} suffix="kg" />
          <p className="mt-4 text-sm leading-6 text-zinc-300">体重在慢慢往下走，但不要只靠体重解释训练质量。</p>
        </SectionCard>

        <SectionCard eyebrow="近 7 天恢复感" title="恢复有跟上吗？">
          <MiniBars values={trendData.recovery7d} suffix="分" />
          <p className="mt-4 text-sm leading-6 text-zinc-300">最近恢复记录比之前完整，后面的判断会更稳，不容易只靠感觉乱猜。</p>
        </SectionCard>

        <SectionCard eyebrow="一句话判断" title="最近 2 周的感觉">
          <p className="text-base leading-7 text-zinc-100">训练频率在回稳，疲劳没有明显堆爆。继续把回顾和恢复接上，比多做一张复杂图更值。</p>
          <Link href="/" className="mt-4 inline-flex text-sm font-medium text-sky-200">
            回到今日页 →
          </Link>
        </SectionCard>
      </div>
    </AppShell>
  );
}
