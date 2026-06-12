"use client";

import { motion } from "framer-motion";

type KpiCardProps = {
  label: string;
  value: string;
  helper: string;
  badge?: string;
};

export function KpiCard({ label, value, helper, badge }: KpiCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-[24px] border border-[#E7EEF5] bg-white p-7 shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-transform"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1E4F80] via-[#2E6AA8] to-[#5F7D95]" />
      <div className="mb-6 flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#64748B]">{label}</p>
        {badge ? (
          <span className="rounded-full border border-[#D7E6F5] bg-[#EEF5FC] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1E4F80]">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="text-3xl font-semibold tracking-tight text-[#12263A]">{value}</p>
      <p className="mt-3 text-sm leading-7 text-[#64748B]">{helper}</p>
    </motion.article>
  );
}
