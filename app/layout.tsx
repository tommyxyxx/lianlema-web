import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { DemoProvider } from '@/components/demo-store';

export const metadata: Metadata = {
  title: '练了吗 · Web v1',
  description: '一个把训练记录、训练回顾和节奏提醒串起来的 Web 原型。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
