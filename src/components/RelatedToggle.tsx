"use client";

import { useSettings } from "@/lib/settings";

/** 古文単語315：関連語（関・同・反・類）を単語カード・クイズに含めるか */
export default function RelatedToggle({ className = "" }: { className?: string }) {
  const [{ includeRelated }, set] = useSettings();
  return (
    <label className={`inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted ${className}`}>
      <input
        type="checkbox"
        className="h-4 w-4 accent-[var(--ai)]"
        checked={includeRelated}
        onChange={(e) => set({ includeRelated: e.target.checked })}
      />
      関連語（関・同・反・類）もカードやクイズに出す
    </label>
  );
}
