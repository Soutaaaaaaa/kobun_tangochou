"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = { title: string; back?: string; right?: React.ReactNode };

export default function AppBar({ title, back, right }: Props) {
  const router = useRouter();
  return (
    <>
      {/* ステータスバー部分の塗り */}
      <div className="fixed inset-x-0 top-0 z-10 h-[env(safe-area-inset-top)] bg-surface" />
      <header className="sticky top-[env(safe-area-inset-top)] z-10 border-b border-line bg-surface px-[max(16px,env(safe-area-inset-left))]">
        <div className="mx-auto flex h-[52px] max-w-[640px] items-center gap-2">
          {back && (
            <Link
              href={back}
              onClick={(e) => {
                if (window.history.length > 1) {
                  e.preventDefault();
                  router.back();
                }
              }}
              className="flex items-center py-1.5 pr-2 text-[15px] text-ai"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
              戻る
            </Link>
          )}
          <h1 className="min-w-0 flex-1 truncate text-base font-bold">{title}</h1>
          {right}
        </div>
      </header>
    </>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-[max(16px,env(safe-area-inset-left))] pb-10 pt-4">
      {children}
    </main>
  );
}
