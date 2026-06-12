"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ title, description, aside, children }: SectionCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="rounded-[24px] border border-[#E7EEF5] bg-white p-6 shadow-[0_8px_24px_rgba(15,39,64,0.08)] transition-transform md:p-7"
    >
      <div className="mb-5 flex flex-col gap-3 border-b border-[#EEF3F8] pb-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-[#12263A]">{title}</h2>
          {description ? <p className="max-w-2xl text-sm leading-7 text-[#64748B]">{description}</p> : null}
        </div>
        {aside ? <div className="text-sm text-[#64748B]">{aside}</div> : null}
      </div>
      {children}
    </motion.section>
  );
}
