"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="page-shell flex min-h-[60vh] items-center justify-center py-20"><div className="max-w-md text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#ffb1c9]/20 bg-[#ff9bbb]/10 text-[#ffb1c9]"><AlertTriangle size={22} /></div><p className="eyebrow mt-6">Signal interrupted</p><h1 className="display mt-3 text-5xl text-ink">The lobby needs a moment.</h1><p className="mt-4 text-sm leading-6 text-muted">The service may be unavailable or being updated. Try again in a moment.</p><Button className="mt-7" onClick={reset} type="button"><RotateCcw size={15} /> Try again</Button></div></main>;
}
