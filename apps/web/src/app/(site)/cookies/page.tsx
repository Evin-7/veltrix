import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return <main className="page-shell pb-20 pt-10 sm:pt-16"><div className="max-w-3xl"><p className="eyebrow">Veltrix information</p><h1 className="display mt-4 text-5xl leading-none text-ink sm:text-6xl">Cookies</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-muted">Veltrix keeps cookie use focused on the features you need to use the product.</p></div><article className="surface-subtle mt-10 max-w-3xl rounded-[28px] p-6 text-sm leading-7 text-muted sm:p-9"><h2 className="display text-3xl text-ink">Essential cookies</h2><p className="mt-4">A secure session cookie keeps you signed in and helps protect account actions. Without it, account features and gameplay cannot work reliably.</p><h2 className="display mt-9 text-3xl text-ink">Your theme preference</h2><p className="mt-4">Veltrix stores your light, dark, or system theme preference in your browser so the interface opens the way you left it.</p><h2 className="display mt-9 text-3xl text-ink">No advertising profile</h2><p className="mt-4">Veltrix does not need advertising cookies for the core product experience. You can clear browser storage at any time, though doing so may sign you out or reset your theme preference.</p></article></main>;
}
