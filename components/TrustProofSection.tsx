import SectionCta from '@/components/SectionCta';
const TESTIMONIALS = [
  {
    quote: "In silence, I found what I was looking for. The ring arrived and I cried. It was exactly what I had seen in my mind.",
    couple: "Sarah & Michael",
    location: "New York",
  },
  {
    quote: "Jack's process isn't buying jewelry. It is becoming who you already are. The ring knew before we did.",
    couple: "Emma & James",
    location: "Los Angeles",
  },
  {
    quote: "We described a feeling. They returned a form we hadn't imagined — yet recognized the moment we saw it.",
    couple: "Priya & Alex",
    location: "San Francisco",
  },
];

export default function TrustProofSection() {
  return (
    <section className="proof-section">
      <div className="proof-inner">
        <span className="proof-eyebrow">Real Couples</span>
        <h2 className="proof-title">What they received</h2>

        <div className="proof-grid">
          {TESTIMONIALS.map((t) => (
            <div key={t.couple} className="proof-card">
              <div className="proof-stars" aria-label="5 stars">★★★★★</div>
              <blockquote className="proof-quote">&ldquo;{t.quote}&rdquo;</blockquote>
              <div className="proof-attribution">
                <span className="proof-couple">{t.couple}</span>
                <span className="proof-location">{t.location}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="proof-press-bar">
          <span className="proof-press-label">As seen in</span>
          <span className="proof-press-item">Brides</span>
          <span className="proof-press-sep">·</span>
          <span className="proof-press-item">Vogue</span>
          <span className="proof-press-sep">·</span>
          <span className="proof-press-item">Town &amp; Country</span>
          <span className="proof-press-sep">·</span>
          <span className="proof-press-item">Who What Wear</span>
        </div>
      </div>
        <SectionCta label="Build Your Ring" href="/ring-builder" />
    </section>
  );
}
