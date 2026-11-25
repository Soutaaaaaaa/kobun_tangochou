"use client";

import AppBar, { Page } from "@/components/AppBar";
import { useSettings } from "@/lib/settings";

function Toggle({
  id,
  label,
  desc,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="grid gap-0.5 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-xs leading-relaxed text-muted">{desc}</span>
      </span>
      <input type="checkbox" role="switch" id={id} className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative mt-0.5 h-7 w-12 shrink-0 rounded-full bg-line transition-colors after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow after:transition-transform peer-checked:bg-ai peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-ai"
      />
    </label>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useSettings();
  return (
    <>
      <AppBar title="設定" back="/" />
      <Page>
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-surface-2 px-3 py-2 text-xs text-muted">
          <span className="rounded bg-shu-soft px-1.5 py-0.5 text-[11px] font-bold text-shu">WIP</span>
          設定画面は作成中です。項目はこれから増えます。
        </p>

        <section className="panel grid gap-3 p-4">
          <h2 className="font-bold">学習</h2>
          <Toggle
            id="show-tips"
            label="覚え方のコツを表示"
            desc="単語カードをめくったときと、クイズで間違えたときに、語源や見分け方などのコツを表示します。"
            checked={settings.showTips}
            onChange={(v) => setSettings({ showTips: v })}
          />
          <hr className="border-line" />
          <Toggle
            id="ask-resume"
            label="中断した続きから再開するか確認する"
            desc="オンにすると、中断した単語カード・クイズ・今日の復習を開いたときに「続きから／最初から」を選ぶ画面を出します。オフにすると、確認せずに自動で続きから再開します。"
            checked={settings.askResume}
            onChange={(v) => setSettings({ askResume: v })}
          />
        </section>

        <p className="px-0.5 text-[11px] text-muted">設定は、この端末のブラウザに保存されます。</p>
      </Page>
    </>
  );
}
