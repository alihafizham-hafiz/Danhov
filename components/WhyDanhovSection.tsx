import SectionCta from '@/components/SectionCta';
// Six-point value proposition — lets a visitor grasp why DANHOV in ~10 seconds.
// Icon-led, minimal, luxury-aligned. Static server component.

type Point = { label: string; icon: React.ReactNode };

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const POINTS: Point[] = [
  {
    label: 'Handcrafted in Los Angeles',
    icon: (
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <path {...S} d="M16 4C11 4 7 8 7 13c0 6.5 9 15 9 15s9-8.5 9-15c0-5-4-9-9-9Z" />
        <circle {...S} cx="16" cy="13" r="3.2" />
      </svg>
    ),
  },
  {
    label: '40 Years of Craft',
    icon: (
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <path {...S} d="M11 26c-3-1-5-4-5-8 0-1.6.5-3.1 1.3-4.4" />
        <path {...S} d="M21 6c3 1 5 4 5 8 0 1.6-.5 3.1-1.3 4.4" />
        <text x="16" y="20" textAnchor="middle" fontFamily="'Cormorant Garamond',serif" fontSize="12" fontWeight="600" fill="currentColor" stroke="none">40</text>
      </svg>
    ),
  },
  {
    label: 'Award Winning Designs',
    icon: (
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <circle {...S} cx="16" cy="12" r="7" />
        <path {...S} d="M16 9.2l1.4 2.9 3.1.4-2.3 2.2.6 3.1L16 18.3l-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" />
        <path {...S} d="M12 18l-2 9 6-3 6 3-2-9" />
      </svg>
    ),
  },
  {
    label: 'Lifetime Warranty',
    icon: (
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <path {...S} d="M16 4l10 3v7c0 7-4.6 11.3-10 14C10.6 25.3 6 21 6 14V7z" />
        <path {...S} d="M11.5 15.5l3 3 6-6.5" />
      </svg>
    ),
  },
  {
    label: 'Made to Order',
    icon: (
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <circle {...S} cx="16" cy="19" r="7" />
        <path {...S} d="M12.5 12.5L16 6l3.5 6.5" />
        <path {...S} d="M12.5 12.5h7" />
      </svg>
    ),
  },
  {
    label: 'Private Concierge',
    icon: (
      <svg viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <path {...S} d="M8 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        <path {...S} d="M16 13v-2" />
        <path {...S} d="M13.5 11h5" />
        <path {...S} d="M6 21h20" />
      </svg>
    ),
  },
];

export default function WhyDanhovSection() {
  const calendlyUrl =
    process.env.NEXT_PUBLIC_CALENDLY_URL || 'https://calendly.com/jack-70/30min';

  return (
    <section className="whyd-section" aria-labelledby="whyd-title">
      <div className="whyd-inner">
        <h2 id="whyd-title" className="whyd-title">Why <em>DANHOV?</em></h2>
        <div className="whyd-grid">
          {POINTS.map((p) => (
            <div key={p.label} className="whyd-item">
              <span className="whyd-icon">{p.icon}</span>
              <span className="whyd-label">{p.label}</span>
            </div>
          ))}
        </div>
      </div>
        <SectionCta label="Book a Virtual Appointment" href={calendlyUrl} external />
    </section>
  );
}
