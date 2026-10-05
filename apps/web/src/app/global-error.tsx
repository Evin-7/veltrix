"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0a0a0b", color: "#f8f5ee", fontFamily: "Arial, sans-serif" }}>
        <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: "2rem", textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <p style={{ color: "var(--gold, #d4af37)", fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>Veltrix</p>
            <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", lineHeight: 1.05, margin: "1rem 0" }}>The table is taking a moment.</h1>
            <p style={{ color: "#aaa7a1", lineHeight: 1.6 }}>We could not load the experience. Please try again.</p>
            <button className="button-primary focus-ring" onClick={reset} style={{ borderRadius: 999, cursor: "pointer", marginTop: "1.5rem", padding: "0.8rem 1.2rem" }} type="button">Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
