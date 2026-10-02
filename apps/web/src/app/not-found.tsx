import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell flex min-h-[60vh] items-center justify-center py-20">
      <div className="max-w-md text-center">
        <p className="eyebrow">404 · Table empty</p>
        <h1 className="display mt-3 text-5xl text-ink">That page is not in the lobby.</h1>
        <p className="mt-4 text-sm leading-6 text-muted">The page you are looking for is not available.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link className="button-primary focus-ring inline-flex items-center rounded-full px-4 py-3 text-sm" href="/">Return home</Link>
          <Link className="button-secondary focus-ring inline-flex items-center rounded-full px-4 py-3 text-sm" href="/casino">Explore casino</Link>
        </div>
      </div>
    </main>
  );
}
