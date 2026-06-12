"use client";

export function LoadingSkeletonPanel() {
  return (
    <div className="rounded-[24px] border border-[#E7EEF5] bg-white p-6 shadow-[0_8px_24px_rgba(15,39,64,0.08)]">
      <div className="h-4 w-28 animate-pulse rounded-full bg-[#EAF1F7]" />
      <div className="mt-5 grid gap-3">
        <div className="h-12 animate-pulse rounded-2xl bg-[#F3F7FB]" />
        <div className="h-12 animate-pulse rounded-2xl bg-[#F3F7FB]" />
        <div className="h-12 animate-pulse rounded-2xl bg-[#F3F7FB]" />
      </div>
    </div>
  );
}
