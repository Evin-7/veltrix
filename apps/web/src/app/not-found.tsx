import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-muted"><SearchX size={22} /></div>
        <p className="eyebrow mt-6">Signal lost</p>
        <h1 className="display mt-3 text-5xl text-ink">That world isn&apos;t here.</h1>
        <p className="mt-4 text-sm leading-6 text-muted">The page you were looking for may have moved or is still being tuned.</p>
        <Link className="focus-ring mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-muted-strong hover:bg-white/[0.09] hover:text-ink" href="/casino"><ArrowLeft size={15} /> Back to the lobby</Link>
      </div>
    </main>
  );
}
