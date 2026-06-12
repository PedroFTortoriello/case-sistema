"use client";

import { Inbox } from "lucide-react";

type EmptyStatePanelProps = {
  title: string;
  description: string;
};

export function EmptyStatePanel({ title, description }: EmptyStatePanelProps) {
  return (
    <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#D8E2EC] bg-[#FBFDFF] px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5FC] text-[#1E4F80]">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-[#12263A]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-7 text-[#64748B]">{description}</p>
    </div>
  );
}
