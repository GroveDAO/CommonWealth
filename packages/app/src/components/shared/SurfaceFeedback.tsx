import type { ReactNode } from "react";

type Tone = "info" | "warning" | "error" | "success";

const toneClasses: Record<Tone, string> = {
  info: "border-accent-cyan/30 bg-accent-cyan/10 text-text-primary",
  warning: "border-accent-yellow/30 bg-accent-yellow/10 text-text-primary",
  error: "border-accent-red/30 bg-accent-red/10 text-text-primary",
  success: "border-accent-green/30 bg-accent-green/10 text-text-primary",
};

export function SurfaceBanner({
  tone = "info",
  title,
  detail,
  action,
}: {
  tone?: Tone;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className={`rounded-card border px-4 py-3 ${toneClasses[tone]}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-1">{title}</p>
          <p className="text-sm text-text-muted">{detail}</p>
        </div>
        {action}
      </div>
    </div>
  );
}

export function EmptySurface({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-bg-card px-5 py-8 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-text-dim mb-2">No records</p>
      <h3 className="font-serif text-2xl text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-2xl mx-auto">{detail}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}