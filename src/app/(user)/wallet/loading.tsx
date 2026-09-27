import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col h-[50vh] w-full items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500 opacity-80" />
      <div className="text-sm font-medium text-slate-500 animate-pulse">Loading data...</div>
    </div>
  );
}
