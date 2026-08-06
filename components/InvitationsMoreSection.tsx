import Link from 'next/link';
import DesignInSilenceCard from '@/components/DesignInSilenceCard';

export default function InvitationsMoreSection() {
  return (
    <section className="invmore-section">
      <div className="invmore-header">
        <span className="section-eyebrow">What We Offer</span>
        <h2 className="section-title">More than a <em>store</em></h2>
      </div>

      <div className="invmore-grid">
        {/* Opens the two-panel modal: Create Your Own + Browse Collection */}
        <DesignInSilenceCard />

        <button
          type="button"
          className="invmore-card invmore-card--btn"
          data-dnh="I'd like to book a virtual appointment with DANHOV to discuss a ring."
        >
          <div className="invmore-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h11a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="invmore-label">Virtual Consultation</span>
          <h3 className="invmore-name">Speak <em>With Us</em></h3>
          <p className="invmore-body">
            A private consultation for those who want guidance, intention, and a ring made for one love story.
          </p>
          <span className="invmore-link">Book Now &rarr;</span>
        </button>

        {/* The Signposts → Philosophy page */}
        <Link href="/philosophy" className="invmore-card">
          <div className="invmore-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="4" x2="12" y2="9" strokeLinecap="round" />
              <line x1="12" y1="15" x2="12" y2="20" strokeLinecap="round" />
              <line x1="4" y1="12" x2="9" y2="12" strokeLinecap="round" />
              <line x1="15" y1="12" x2="20" y2="12" strokeLinecap="round" />
            </svg>
          </div>
          <span className="invmore-label">The Collections</span>
          <h3 className="invmore-name">The <em>Signposts</em></h3>
          <p className="invmore-body">
            &ldquo;Each collection carries a name given for a reason. Each piece made for a meaning.&rdquo;
          </p>
          <span className="invmore-link">Explore &rarr;</span>
        </Link>
      </div>
    </section>
  );
}
