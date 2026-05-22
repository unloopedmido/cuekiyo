import PulseBlock from "./PulseBlock";

export function SkeletonLine({ className = "" }: { className?: string }) {
  return <PulseBlock className={`bg-white/[0.07] ${className}`} />;
}

export function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-panel/70 p-5">
      {children}
    </div>
  );
}
