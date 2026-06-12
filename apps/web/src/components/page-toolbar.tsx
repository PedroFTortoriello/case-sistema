import Link from "next/link";
import type { ReactNode } from "react";

type ToolbarAction = {
  href: string;
  label: string;
  tone?: "primary" | "secondary";
};

type PageToolbarProps = {
  title: string;
  description: string;
  actions?: ToolbarAction[];
  aside?: ReactNode;
};

export function PageToolbar({ title, description, actions, aside }: PageToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h3 className="text-2xl font-semibold tracking-tight text-[#12263A]">{title}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[#64748B]">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {aside}
        {actions?.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`inline-flex h-12 items-center rounded-[14px] px-5 text-sm font-semibold transition-colors duration-200 ${
              action.tone === "secondary"
                ? "border border-[#D8E2EC] bg-white text-[#1E4F80] hover:bg-[#F5F9FD]"
                : "bg-[#1E4F80] text-white hover:bg-[#173A5E]"
            }`}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
