import Link from 'next/link';

/**
 * Closing call-to-action for a homepage section (brief §7: "every major
 * section should end with a call-to-action").
 *
 * One component so the four CTA types stay visually identical wherever they
 * appear. `chat` seeds the concierge widget via the existing [data-dnh]
 * trigger rather than bouncing the visitor off to a mailto.
 */

type Props = {
  label: string;
  href?: string;
  /** Seed text for the chat concierge; renders a button instead of a link. */
  chat?: string;
  /** External link (e.g. Calendly) — opens in a new tab. */
  external?: boolean;
  /** Light-on-dark sections need the inverted treatment. */
  tone?: 'light' | 'dark';
};

export default function SectionCta({ label, href, chat, external, tone = 'light' }: Props) {
  const cls = `section-cta section-cta--${tone}`;
  const arrow = <span aria-hidden="true">&rarr;</span>;

  if (chat) {
    return (
      <div className="section-cta-wrap">
        <button type="button" className={cls} data-dnh={chat}>
          {label} {arrow}
        </button>
      </div>
    );
  }

  if (external && href) {
    return (
      <div className="section-cta-wrap">
        <a className={cls} href={href} target="_blank" rel="noopener noreferrer">
          {label} {arrow}
        </a>
      </div>
    );
  }

  return (
    <div className="section-cta-wrap">
      <Link className={cls} href={href ?? '/'}>
        {label} {arrow}
      </Link>
    </div>
  );
}
