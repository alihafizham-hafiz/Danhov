import Link from 'next/link';

export default function AbbraccioStorySection() {
  return (
    <section className="abbr-section" aria-labelledby="abbr-title">
      <div className="abbr-inner">
        <div className="abbr-text">
          <span className="abbr-eyebrow">The Danhov Story</span>
          <h2 id="abbr-title" className="abbr-title">
            One wire. Two lives. <em>One again.</em>
          </h2>

          <p className="abbr-body">
            Every Abbraccio begins as a <strong>single continuous wire</strong>. It does not
            start as two pieces joined together. It starts as one.
          </p>
          <p className="abbr-body">
            That one wire parts — and for a while it travels as two, side by side,
            each with its own line, its own turn, its own light. Then it returns.
            Not soldered. Not fused. <em>Returned</em> — to the one thing it always was.
          </p>
          <p className="abbr-body abbr-body--lead">
            This is why the ring has no beginning and no end. Two people were never
            two. Marriage is not the joining of halves; it is the remembering of one.
          </p>

          <p className="abbr-statement">&ldquo;You already are one. The ring is the reminder.&rdquo;</p>

          <div className="abbr-ctas">
            <Link href="/collection/abbraccio" className="abbr-cta abbr-cta--primary">
              Explore Abbraccio
            </Link>
            <Link href="/ring-builder" className="abbr-cta abbr-cta--ghost">
              Build Your Ring
            </Link>
          </div>
        </div>

        <div className="abbr-visual">
          <img
            src="/abbraccio-one-wire-story.jpeg"
            alt="Abbraccio ring shown as two lines returning to one"
            className="abbr-photo"
          />
        </div>
      </div>
    </section>
  );
}
