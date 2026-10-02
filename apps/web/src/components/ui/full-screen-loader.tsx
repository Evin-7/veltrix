import { VeltrixLoader } from "@/components/ui/veltrix-loader";

export function FullScreenLoader({ className, label = "Loading Veltrix" }: { className?: string; label?: string }) {
  return <main aria-busy="true" aria-label={label} className={`full-screen-loader${className ? ` ${className}` : ""}`}><VeltrixLoader label={label} /></main>;
}
