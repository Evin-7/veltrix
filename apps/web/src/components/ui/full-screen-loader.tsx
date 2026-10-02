import { VeltrixLoader } from "@/components/ui/veltrix-loader";

export function FullScreenLoader() {
  return <main aria-label="Loading Veltrix" className="full-screen-loader"><VeltrixLoader /></main>;
}
