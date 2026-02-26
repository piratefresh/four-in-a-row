import { Spinner } from "@/components/ui/spinner";

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading..." }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 rounded-xl border border-slate-700 bg-slate-800/90 px-12 py-10 shadow-2xl">
        <Spinner size="lg" className="text-slate-300" />
        <p className="text-xl font-semibold text-slate-200">{message}</p>
      </div>
    </div>
  );
}
