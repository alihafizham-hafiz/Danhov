import SectionCta from '@/components/SectionCta';
const TRUST_ITEMS = [
  'Lifetime Craftsmanship Warranty',
  'Insured Delivery',
  'Private Appointments Available',
  'Handcrafted in Los Angeles',
];

export default function HeritageSection() {
  return (
    <section className="heritage-section">
      <div className="heritage-inner">
        <span className="heritage-eyebrow">Craft &amp; Trust — DANHOV Los Angeles</span>
        <h2 className="heritage-title">
          For four decades, every piece has come from{' '}
          <em>one workshop.</em>
          <br />One pair of hands. One philosophy.
        </h2>
        <div className="heritage-stats">
          <div>
            <span className="heritage-stat-num">1984</span>
            <span className="heritage-stat-label">Founded</span>
          </div>
          <div>
            <span className="heritage-stat-num"><em>40+</em></span>
            <span className="heritage-stat-label">Years of Craft</span>
          </div>
          <div>
            <span className="heritage-stat-num">LA</span>
            <span className="heritage-stat-label">Handcrafted</span>
          </div>
        </div>

        <div className="heritage-trust">
          {TRUST_ITEMS.map((item) => (
            <span key={item} className="heritage-trust-item">
              <span className="heritage-trust-check" aria-hidden="true">✓</span>
              {item}
            </span>
          ))}
        </div>
      </div>
        <SectionCta label="Contact a Jewelry Specialist" chat="I&apos;d like to speak with a DANHOV jewelry specialist about a piece." />
    </section>
  );
}
