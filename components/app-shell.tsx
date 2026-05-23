'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { cn } from '@/lib/helpers';

const navItems = [
  { href: '/', label: '首页', shortLabel: '首页', icon: '⌂' },
  { href: '/train', label: '记录训练', shortLabel: '记录', icon: '✍️' },
  { href: '/review', label: '训练库', shortLabel: '训练库', icon: '▦' },
  { href: '/recovery', label: '恢复状态', shortLabel: '恢复', icon: '♡' },
  { href: '/trends', label: '数据趋势', shortLabel: '趋势', icon: '⌁' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type AppShellProps = {
  children: ReactNode;
  contentSize?: 'default' | 'wide';
};

export function AppShell({ children, contentSize = 'default' }: AppShellProps) {
  const pathname = usePathname();
  const isTrainPage = isActivePath(pathname, '/train');

  return (
    <div className="m1-app-shell min-h-screen w-full bg-[radial-gradient(circle_at_82%_8%,rgba(45,212,191,0.28),transparent_30%),radial-gradient(circle_at_16%_18%,rgba(236,253,245,0.92),transparent_32%),linear-gradient(135deg,#f7fffb_0%,#e9faf4_42%,#d8f5ef_100%)] text-teal-950">
      <aside className="fixed bottom-6 left-6 top-6 z-40 hidden w-[230px] flex-col rounded-[32px] border border-white/70 bg-white/82 p-4 shadow-[0_24px_80px_rgba(13,94,88,0.16)] backdrop-blur-2xl lg:flex">
        <Link href="/" className="flex items-center gap-3 rounded-[24px] px-2 py-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-xl font-black text-white shadow-lg shadow-teal-700/20">
            练
          </span>
          <span>
            <span className="block text-xl font-black tracking-[-0.04em] text-teal-950">练了吗</span>
            <span className="mt-0.5 block text-xs font-semibold tracking-tight text-teal-700/70">Training Habit OS</span>
          </span>
        </Link>

        <nav className="mt-6 space-y-2">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-200',
                  active
                    ? 'll-active-nav bg-teal-950 text-white shadow-xl shadow-teal-950/18'
                    : 'text-teal-950/62 hover:bg-emerald-50 hover:text-teal-950',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-xl text-xs transition',
                    active ? 'bg-white/12 text-white' : 'bg-teal-50 text-teal-800/65 group-hover:bg-white',
                  )}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-inner shadow-white/70">
          <p className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            {isTrainPage ? '● 本地规则匹配' : '● 本地记录 / 无需登录'}
          </p>
          <p className="mt-3 text-sm font-bold text-teal-950">{isTrainPage ? '输入一句话就行' : '先把训练记下来'}</p>
          <p className="mt-2 text-xs leading-5 text-teal-900/58">
            {isTrainPage ? '先做可靠的动作别名与组数重量识别，再考虑更复杂的智能化。' : '输入一句话，系统自动识别动作、组数和重量；训练后再补回顾和恢复感。'}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-[280px]">
        <header className="sticky top-0 z-30 border-b border-white/55 bg-white/74 px-4 py-3 shadow-sm shadow-teal-900/5 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-base font-black text-white">练</span>
              <span>
                <span className="block text-base font-black text-teal-950">练了吗</span>
                <span className="block text-[11px] font-semibold text-teal-700/70">Training Habit OS</span>
              </span>
            </Link>
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">本地记录</span>
          </div>
        </header>

        <main
          className={cn(
            'mx-auto w-full flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-12 lg:pt-8',
            contentSize === 'wide' ? 'max-w-[1180px] xl:max-w-[1220px]' : 'max-w-[940px] xl:max-w-[1040px]',
          )}
        >
          <div className={cn('mx-auto w-full', contentSize === 'wide' ? 'max-w-none' : 'max-w-[860px]')}>{children}</div>
        </main>
      </div>

      <nav className="fixed bottom-3 left-3 right-3 z-50 rounded-[28px] border border-white/75 bg-white/88 px-2 py-2 shadow-[0_18px_60px_rgba(13,94,88,0.20)] backdrop-blur-2xl lg:hidden">
        <div className="grid grid-cols-5 gap-1 text-center text-[11px] font-semibold">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl px-1 transition',
                  active ? 'll-active-nav bg-teal-950 text-white shadow-lg shadow-teal-950/18' : 'text-teal-950/58 hover:bg-emerald-50 hover:text-teal-950',
                )}
              >
                <span className="text-sm leading-none">{item.icon}</span>
                <span>{item.shortLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SectionCard({
  title,
  eyebrow,
  children,
  tone = 'default',
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  tone?: 'default' | 'highlight' | 'soft';
}) {
  return (
    <section
      className={cn(
        'rounded-[28px] border p-4 shadow-[0_18px_70px_rgba(15,118,110,0.10)] backdrop-blur-xl sm:p-5',
        tone === 'highlight' && 'border-emerald-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(209,250,229,0.72))]',
        tone === 'soft' && 'border-white/78 bg-white/68',
        tone === 'default' && 'border-white/78 bg-white/78',
      )}
    >
      {(eyebrow || title) && (
        <div className="mb-3 space-y-1">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-600/80">{eyebrow}</p> : null}
          {title ? <h2 className="text-lg font-black tracking-[-0.02em] text-teal-950">{title}</h2> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageIntro({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="mb-5 space-y-2 lg:mb-6">
      <p className="inline-flex rounded-full border border-emerald-100 bg-white/72 px-3 py-1 text-xs font-black tracking-tight text-teal-700 shadow-sm shadow-teal-900/5">
        🌿 Web v1.1 视觉方向 · 浅色 SaaS Dashboard
      </p>
      <h1 className="text-[30px] font-black leading-tight tracking-[-0.06em] text-teal-950 sm:text-[40px]">{title}</h1>
      <p className="max-w-[62ch] text-sm leading-6 text-teal-900/62 sm:text-base">{subtitle}</p>
    </header>
  );
}

export function NumberPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100/80 bg-white/70 px-3 py-3 shadow-sm shadow-teal-900/5">
      <p className="text-xs font-medium text-teal-900/48">{label}</p>
      <p className="mt-1 text-base font-black text-teal-950">{value}</p>
    </div>
  );
}
