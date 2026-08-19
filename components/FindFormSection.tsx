'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const SHAPES = [
  { name: 'Round',    value: 'ROUND',    meaning: 'Wholeness, complete',     img: '/diamond-shapes/round.jpg' },
  { name: 'Oval',     value: 'OVAL',     meaning: 'Soft eternity',           img: '/diamond-shapes/oval.jpg' },
  { name: 'Cushion',  value: 'CUSHION',  meaning: 'Held, supported',         img: '/diamond-shapes/cushion.jpg' },
  { name: 'Pear',     value: 'PEAR',     meaning: 'Flowing, like water',     img: '/diamond-shapes/pear.jpg' },
  { name: 'Heart',    value: 'HEART',    meaning: 'Cannot be hidden',        img: '/diamond-shapes/heart.png' },
  { name: 'Emerald',  value: 'EMERALD',  meaning: 'Clarity, depth',          img: '/diamond-shapes/emerald.jpg' },
  { name: 'Princess', value: 'PRINCESS', meaning: 'Sharp, sovereign',        img: '/diamond-shapes/princess.jpg' },
  { name: 'Marquise', value: 'MARQUISE', meaning: 'Reach, expansion',        img: '/diamond-shapes/marquise.jpg' },
  { name: 'Radiant',  value: 'RADIANT',  meaning: 'Light in all directions', img: '/diamond-shapes/radiant.jpg' },
  { name: 'Asscher',  value: 'ASSCHER',  meaning: 'Stepped, ancient',        img: '/diamond-shapes/asscher.jpg' },
];

export default function FindFormSection() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="findform-section">
      <div className="findform-section-inner">
        <div className="findform-header">
          <span className="section-eyebrow">Find Your Form</span>
          <h2 className="section-title">
            Light enters from the cracks of <em>the darkness.</em>
          </h2>
          <p className="findform-teaching">
            &ldquo;The diamond was created in the dark. Now it sparkles.&rdquo;
          </p>
          <p className="findform-intro">
            Each diamond shape lets light in differently. Round opens widest.
            Pear flows like water. Heart shows what cannot be hidden.
            The shape does not need to be chosen &mdash; it needs to be recognized.
          </p>
        </div>

        <div className="findform-grid">
          {SHAPES.map((s) => (
            <Link
              key={s.value}
              href={`/ring-builder/diamond?shape=${s.value}`}
              className={`findform-card${active === s.value ? ' findform-card--active' : ''}`}
              aria-label={`Browse ${s.name} cut diamonds`}
              onClick={() => setActive(s.value)}
            >
              <div className="findform-card-img">
                <Image
                  src={s.img}
                  alt={`${s.name} cut diamond`}
                  fill
                  sizes="60px"
                  style={{ objectFit: 'contain' }}
                />
                {active === s.value && (
                  <span className="findform-card-spinner" aria-hidden="true" />
                )}
              </div>
              <span className="findform-card-name">{s.name}</span>
              <p className="findform-card-meaning">{s.meaning}</p>
            </Link>
          ))}
        </div>

        <div className="findform-cta-wrap">
          <Link href="/engagement-rings" className="btn-solid" style={{ marginLeft: 0 }}>
            Begin Your Search
          </Link>
          <span className="findform-cta-note">
            Or let the form find you &mdash; design in silence
          </span>
        </div>
      </div>
    </section>
  );
}
