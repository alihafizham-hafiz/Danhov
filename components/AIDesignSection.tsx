import '../app/ring-builder/builder.css';

export default function AIDesignSection() {
  return (
    <section className="builder-ai-section">
      <div className="builder-ai-inner">
        <div className="builder-ai-text">
          <span className="builder-ai-eyebrow">Guided by AI. Crafted by Hand.</span>
          <h2 className="builder-ai-title">Design Your Own with AI</h2>
          <p className="builder-ai-body">
            Describe your dream ring in your own words — or upload a photo for inspiration.
            Our AI renders a visual of your idea in seconds. Share it with a master jeweler
            and we&apos;ll bring it to life by hand in Los Angeles.
          </p>
          <button
            type="button"
            className="btn-solid"
            style={{ border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}
            data-dnh-design
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3l1.5 4.5h4.5l-3.5 2.5 1.5 4.5L12 12l-4 2.5 1.5-4.5L6 7.5h4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            Start Designing
          </button>
        </div>
        <div className="builder-ai-visual" aria-hidden="true">
          <div className="builder-ai-orb">
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="80" stroke="#ffffff" strokeWidth="0.6" opacity="0.25" />
              <circle cx="100" cy="100" r="58" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
              <circle cx="100" cy="100" r="36" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
              <path d="M100 42 Q130 70 100 100 Q70 130 100 158" stroke="#ffffff" strokeWidth="0.8" fill="none" opacity="0.5" />
              <path d="M42 100 Q70 70 100 100 Q130 130 158 100" stroke="#ffffff" strokeWidth="0.8" fill="none" opacity="0.5" />
              <circle cx="100" cy="58" r="5" fill="#ffffff" opacity="0.7" />
              <circle cx="100" cy="142" r="3" fill="#ffffff" opacity="0.4" />
              <text x="100" y="108" textAnchor="middle" fontFamily="'Cormorant Garamond',serif" fontSize="11" fill="#ffffff" opacity="0.8" letterSpacing="3">AI</text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
