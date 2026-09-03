'use client';

import Link from 'next/link';

interface ExperienceItem {
  id: string;
  title: string;
  description: string;
  linkText: string;
  linkHref: string;
}

interface DanhovExperienceProps {
  sectionTitle?: string;
  items?: ExperienceItem[];
}

const DEFAULT_ITEMS: ExperienceItem[] = [
  {
    id: '1',
    title: 'Design in Silence',
    description: "Two ways to find your form — create something entirely your own, or discover the one that already speaks to you.",
    linkText: 'BOOK AN APPOINTMENT',
    linkHref: '/appointments',
  },
  {
    id: '2',
    title: 'Speak With Us',
    description: 'A private consultation for those who want guidance, intention, and a ring made for one love story.',
    linkText: 'LEARN MORE',
    linkHref: '/shipping',
  },
  {
    id: '3',
    title: 'The Signposts',
    description: '“Each collection carries a name given for a reason. Each piece made for a meaning.”',
    linkText: 'EXPLORE ALL GIFTS',
    linkHref: '/gifts',
  },
];

export default function DanhovExperienceSection({
  sectionTitle = 'More than a store',
  items = DEFAULT_ITEMS,
}: DanhovExperienceProps) {
  return (
    <section className="danhov-exp-section">
      <div className="danhov-exp-container">
        <h2 className="danhov-exp-main-title">{sectionTitle}</h2>

        <div className="danhov-exp-grid">
          {items.map((item) => (
            <div key={item.id} className="danhov-exp-card">
              <h3 className="danhov-exp-title">{item.title}</h3>
              <p className="danhov-exp-desc">{item.description}</p>
              <Link href={item.linkHref} className="danhov-exp-link">
                {item.linkText}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}