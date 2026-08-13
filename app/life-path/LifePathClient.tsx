'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ── Data ─────────────────────────────────────────────────────────────────────

const LIFE_PATH_DATA: Record<number, { title: string; desc: string; element: string }> = {
  1:  { title: 'The Origin',          desc: 'The first. The one who begins. You carry the energy of creation — new paths, new forms. Where others wait, you start.',                element: 'Fire'  },
  2:  { title: 'The Union',           desc: 'The peacemaker. You understand that two can become one without either disappearing. You hold space. You bring together.',              element: 'Water' },
  3:  { title: 'The Voice',           desc: 'The expresser. Joy moves through you and out into the world. You were made to create, to speak, to light up a room.',                  element: 'Air'   },
  4:  { title: 'The Foundation',      desc: 'The builder. Steady, grounded, real. You make things that last. The world rests on people like you.',                                  element: 'Earth' },
  5:  { title: 'The Free',            desc: 'The seeker of experience. Change is your element. You cannot be contained — and you were never meant to be.',                          element: 'Ether' },
  6:  { title: 'The Heart',           desc: 'The nurturer. Love is your language. You carry others, you tend, you hold. Home is wherever you are.',                                 element: 'Earth' },
  7:  { title: 'The Seeker',          desc: 'The one who goes inward. You are here to understand what cannot be seen. The way out, for you, was always in.',                       element: 'Water' },
  8:  { title: 'The Force',           desc: 'The one with power. You move things in the world. Strength held with intention. Build, lead, manifest.',                               element: 'Fire'  },
  9:  { title: 'The Completion',      desc: 'The old soul. You carry all the others within you. You are here to give, to release, to love without holding.',                       element: 'Air'   },
  11: { title: 'The Illuminator',     desc: 'A master number. The intuitive light. You see what others miss. You are a candle in a dark room — you make others see.',             element: 'Light' },
  22: { title: 'The Master Builder',  desc: 'A master number. You can build the impossible. Vision and foundation in one. What you imagine, you can make real.',                   element: 'All'   },
  33: { title: 'The Teacher of Love', desc: 'A master number. The rarest path. Pure compassion made form. You are here to love at a scale most never reach.',                     element: 'All'   },
};

const ZODIAC_DATA = [
  { sign: 'Capricorn',   dates: 'Dec 22 – Jan 19', desc: 'The mountain climber. Patient, enduring, built for the long path. You reach summits others abandon.' },
  { sign: 'Aquarius',    dates: 'Jan 20 – Feb 18', desc: 'The water bearer. You see the future before it arrives. You belong to everyone and no one.' },
  { sign: 'Pisces',      dates: 'Feb 19 – Mar 20', desc: 'The two fish. You swim between worlds — the seen and the felt. The most intuitive of all.' },
  { sign: 'Aries',       dates: 'Mar 21 – Apr 19', desc: 'The ram. First of the zodiac. Courage in motion. You begin what others fear to start.' },
  { sign: 'Taurus',      dates: 'Apr 20 – May 20', desc: 'The bull. Grounded in the senses. You know the value of what is real, slow, and lasting.' },
  { sign: 'Gemini',      dates: 'May 21 – Jun 20', desc: 'The twins. Two minds, endless curiosity. You hold both sides of every truth at once.' },
  { sign: 'Cancer',      dates: 'Jun 21 – Jul 22', desc: 'The crab. You carry home within you. Soft inside, protected outside. You feel everything.' },
  { sign: 'Leo',         dates: 'Jul 23 – Aug 22', desc: 'The lion. Born to shine. The warmth of the sun lives in you. You light the way for others.' },
  { sign: 'Virgo',       dates: 'Aug 23 – Sep 22', desc: 'The maiden. The one who refines. You see what could be better and make it so. Devotion in detail.' },
  { sign: 'Libra',       dates: 'Sep 23 – Oct 22', desc: 'The scales. The seeker of balance and beauty. You restore harmony wherever you go.' },
  { sign: 'Scorpio',     dates: 'Oct 23 – Nov 21', desc: 'The scorpion. Depth and transformation. You are not afraid of the dark — you were forged there.' },
  { sign: 'Sagittarius', dates: 'Nov 22 – Dec 21', desc: 'The archer. The seeker of meaning. You aim beyond the horizon and trust the arrow.' },
];

// ── Calculations ──────────────────────────────────────────────────────────────

function calcLifePath(day: number, month: number, year: number): number {
  const str = `${day}${month}${year}`;
  let sum = str.split('').reduce((a, d) => a + Number(d), 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').reduce((a, d) => a + Number(d), 0);
  }
  return sum;
}

function getZodiac(day: number, month: number) {
  const n = month * 100 + day;
  let i = 11;
  if (n >= 1222 || n <= 119) i = 0;
  else if (n <= 218)  i = 1;
  else if (n <= 320)  i = 2;
  else if (n <= 419)  i = 3;
  else if (n <= 520)  i = 4;
  else if (n <= 620)  i = 5;
  else if (n <= 722)  i = 6;
  else if (n <= 822)  i = 7;
  else if (n <= 922)  i = 8;
  else if (n <= 1022) i = 9;
  else if (n <= 1121) i = 10;
  return { zodiac: ZODIAC_DATA[i], index: i };
}

function generateStory(lpTitle: string, zodiacSign: string): string {
  const inward = ['The Seeker', 'The Illuminator', 'The Foundation', 'The Union', 'The Completion'];
  const direction = inward.includes(lpTitle) ? 'turns inward' : 'opens outward';
  return `You are ${lpTitle} walking the path of ${zodiacSign}. A spiral that ${direction}, holding a single stone where the two energies meet. This form is yours alone — no other birth date makes it.`;
}

// ── Zodiac SVG Icons ──────────────────────────────────────────────────────────

function ZodiacIcon({ sign, size = 44 }: { sign: string; size?: number }) {
  const S = '#AC3438';
  const W = 1.6;
  const icons: Record<string, React.ReactNode> = {
    Aries: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <path d="M22 32 C22 22 14 16 10 11 C8 8 9 15 12 17" />
        <path d="M22 32 C22 22 30 16 34 11 C36 8 35 15 32 17" />
      </g>
    ),
    Taurus: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <circle cx="22" cy="27" r="11" />
        <path d="M11 21 Q11 9 22 9 Q33 9 33 21" />
      </g>
    ),
    Gemini: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <line x1="15" y1="10" x2="15" y2="34" />
        <line x1="29" y1="10" x2="29" y2="34" />
        <line x1="9"  y1="10" x2="35" y2="10" />
        <line x1="9"  y1="34" x2="35" y2="34" />
      </g>
    ),
    Cancer: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <circle cx="18" cy="17" r="8" />
        <circle cx="26" cy="27" r="8" />
        <circle cx="25" cy="11" r="2.5" fill={S} />
        <circle cx="19" cy="33" r="2.5" fill={S} />
      </g>
    ),
    Leo: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <circle cx="17" cy="20" r="9" />
        <path d="M26 20 C32 20 36 14 35 22 C34 30 28 34 25 34" />
      </g>
    ),
    Virgo: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <line x1="11" y1="9"  x2="11" y2="33" />
        <line x1="22" y1="9"  x2="22" y2="33" />
        <path d="M11 9 Q16.5 5 22 9" />
        <path d="M22 22 Q28 16 32 22 Q34 29 29 33 Q27 35 24 35" />
      </g>
    ),
    Libra: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <line x1="7"  y1="27" x2="37" y2="27" />
        <line x1="7"  y1="35" x2="37" y2="35" />
        <path d="M14 27 Q22 13 30 27" />
      </g>
    ),
    Scorpio: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <line x1="11" y1="9"  x2="11" y2="29" />
        <line x1="22" y1="9"  x2="22" y2="29" />
        <path d="M11 9 Q16.5 5 22 9" />
        <path d="M22 27 Q29 27 32 23" />
        <polyline points="30,19 34,23 30,27" />
      </g>
    ),
    Sagittarius: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <line x1="9"  y1="35" x2="35" y2="9" />
        <polyline points="21,9 35,9 35,23" />
      </g>
    ),
    Capricorn: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <path d="M9 10 L9 28 Q9 35 18 35 Q27 35 27 28 L27 22 Q27 15 33 14 Q38 13 38 19 Q38 25 33 28" />
      </g>
    ),
    Aquarius: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <path d="M7 19 Q11 14 15 19 Q19 24 23 19 Q27 14 31 19 Q35 24 37 19" />
        <path d="M7 28 Q11 23 15 28 Q19 33 23 28 Q27 23 31 28 Q35 33 37 28" />
      </g>
    ),
    Pisces: (
      <g stroke={S} strokeWidth={W} strokeLinecap="round" fill="none">
        <line x1="7" y1="22" x2="37" y2="22" />
        <path d="M16 8 Q7 15 7 22 Q7 29 16 36" />
        <path d="M28 8 Q37 15 37 22 Q37 29 28 36" />
      </g>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      {icons[sign] ?? <circle cx="22" cy="22" r="15" stroke={S} strokeWidth={W} fill="none" />}
    </svg>
  );
}

// ── Geometric ring design (unique per birth date) ─────────────────────────────

function LifePathDesign({ num, zodiacIndex, day }: { num: number; zodiacIndex: number; day: number }) {
  const cx = 140, cy = 140, outerR = 100;
  const geoNum  = num === 33 ? 6 : num === 22 ? 5 : num === 11 ? 4 : num;
  const innerR  = 28 + geoNum * 4;
  const petals  = (geoNum % 8) + 4;
  const rotDeg  = zodiacIndex * 30;
  const rings   = (day % 4) + 2;
  const centerR = Math.min(8 + geoNum, 18);
  const spokes  = Array.from({ length: petals }, (_, i) => {
    const rad = ((i / petals) * 360 + rotDeg) * (Math.PI / 180);
    return {
      x1: (cx + Math.cos(rad) * innerR).toFixed(2),
      y1: (cy + Math.sin(rad) * innerR).toFixed(2),
      x2: (cx + Math.cos(rad) * outerR).toFixed(2),
      y2: (cy + Math.sin(rad) * outerR).toFixed(2),
    };
  });
  return (
    <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx={cx} cy={cy} r={120} stroke="#AC3438" strokeWidth="0.5" opacity="0.2" />
      {Array.from({ length: rings }, (_, i) => {
        const r  = (innerR + (i * (outerR - innerR)) / rings).toFixed(2);
        const op = (0.35 - i * 0.06).toFixed(2);
        return <circle key={i} cx={cx} cy={cy} r={r} stroke="#AC3438" strokeWidth="0.6" fill="none" opacity={op} />;
      })}
      {spokes.map((p, i) => (
        <g key={i}>
          <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="#AC3438" strokeWidth="1" opacity="0.55" />
          <circle cx={p.x2} cy={p.y2} r="3" fill="#AC3438" opacity="0.65" />
        </g>
      ))}
      <circle cx={cx} cy={cy} r={centerR} fill="#AC3438" opacity="0.18" />
      <circle cx={cx} cy={cy} r={centerR} stroke="#AC3438" strokeWidth="1.5" fill="none" />
      <text x={cx} y={cy + 6} textAnchor="middle" fontFamily="var(--font-cormorant), 'Cormorant Garamond', serif" fontSize="18" fill="#faf6f1" opacity="0.85">{num}</text>
    </svg>
  );
}

// ── Jewelry piece SVG illustrations ──────────────────────────────────────────

function PieceRingSVG({ num }: { num: number }) {
  const prongs = [30, 90, 150, 210, 270, 330];
  return (
    <svg viewBox="0 0 120 160" fill="none" aria-hidden="true">
      <circle cx="60" cy="52" r="28" stroke="#AC3438" strokeWidth="1.2" fill="rgba(172,52,56,0.05)" />
      <circle cx="60" cy="52" r="18" stroke="#AC3438" strokeWidth="0.5" fill="none" opacity="0.35" />
      <line x1="60" y1="24" x2="60" y2="80" stroke="#AC3438" strokeWidth="0.4" opacity="0.18" />
      <line x1="32" y1="52" x2="88" y2="52" stroke="#AC3438" strokeWidth="0.4" opacity="0.18" />
      <line x1="40" y1="32" x2="80" y2="72" stroke="#AC3438" strokeWidth="0.3" opacity="0.14" />
      <line x1="80" y1="32" x2="40" y2="72" stroke="#AC3438" strokeWidth="0.3" opacity="0.14" />
      {prongs.map(deg => {
        const r = (deg * Math.PI) / 180;
        return (
          <line key={deg}
            x1={(60 + Math.cos(r) * 18).toFixed(1)} y1={(52 + Math.sin(r) * 18).toFixed(1)}
            x2={(60 + Math.cos(r) * 30).toFixed(1)} y2={(52 + Math.sin(r) * 30).toFixed(1)}
            stroke="#AC3438" strokeWidth="1.8" strokeLinecap="round"
          />
        );
      })}
      <text x="60" y="60" textAnchor="middle" fontFamily="var(--font-cormorant), 'Cormorant Garamond', serif" fontSize="20" fill="#AC3438" fontStyle="italic">{num}</text>
      <path d="M34 70 C32 96 32 118 36 132 Q42 144 60 144 Q78 144 84 132 C88 118 88 96 86 70" stroke="#AC3438" strokeWidth="1.2" />
      <path d="M43 72 C42 97 42 116 45 128 Q50 138 60 138 Q70 138 75 128 C78 116 78 97 77 72" stroke="#AC3438" strokeWidth="0.4" opacity="0.28" />
    </svg>
  );
}

function PiecePendantSVG({ num }: { num: number }) {
  const ticks = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg viewBox="0 0 120 150" fill="none" aria-hidden="true">
      <path d="M52 16 Q60 9 68 16" stroke="#AC3438" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <line x1="60" y1="16" x2="60" y2="30" stroke="#AC3438" strokeWidth="0.9" />
      <circle cx="60" cy="92" r="46" stroke="#AC3438" strokeWidth="1.2" fill="rgba(172,52,56,0.03)" />
      <circle cx="60" cy="92" r="36" stroke="#AC3438" strokeWidth="0.5" fill="none" opacity="0.32" />
      {ticks.map(d => {
        const rad = (d - 90) * Math.PI / 180;
        return (
          <line key={d}
            x1={(60 + Math.cos(rad) * 37).toFixed(1)} y1={(92 + Math.sin(rad) * 37).toFixed(1)}
            x2={(60 + Math.cos(rad) * 44).toFixed(1)} y2={(92 + Math.sin(rad) * 44).toFixed(1)}
            stroke="#AC3438" strokeWidth="0.8" opacity="0.38"
          />
        );
      })}
      <text x="60" y="106" textAnchor="middle" fontFamily="var(--font-cormorant), 'Cormorant Garamond', serif" fontSize="44" fill="#AC3438" fontStyle="italic">{num}</text>
    </svg>
  );
}

function PieceSignetSVG({ num }: { num: number }) {
  return (
    <svg viewBox="0 0 120 140" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="48" rx="40" ry="28" stroke="#AC3438" strokeWidth="1.2" fill="rgba(172,52,56,0.04)" />
      <ellipse cx="60" cy="48" rx="32" ry="20" stroke="#AC3438" strokeWidth="0.5" fill="none" opacity="0.35" />
      <text x="60" y="57" textAnchor="middle" fontFamily="var(--font-cormorant), 'Cormorant Garamond', serif" fontSize="28" fill="#AC3438" fontStyle="italic">{num}</text>
      <path d="M20 64 C20 76 22 88 22 106" stroke="#AC3438" strokeWidth="1.2" fill="none" />
      <path d="M100 64 C100 76 98 88 98 106" stroke="#AC3438" strokeWidth="1.2" fill="none" />
      <ellipse cx="60" cy="106" rx="38" ry="9"  stroke="#AC3438" strokeWidth="1.2" fill="rgba(172,52,56,0.03)" />
      <ellipse cx="60" cy="106" rx="28" ry="6"  stroke="#AC3438" strokeWidth="0.4" fill="none" opacity="0.24" />
    </svg>
  );
}

function PieceBangleSVG({ num }: { num: number }) {
  const dots = [45, 90, 135, 180, 225, 270, 315];
  return (
    <svg viewBox="0 0 120 150" fill="none" aria-hidden="true">
      <path d="M18 108 A44 44 0 1 1 102 108" stroke="#AC3438" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M28 103 A34 34 0 1 1 92 103" stroke="#AC3438" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.28" />
      <text x="60" y="48" textAnchor="middle" fontFamily="var(--font-cormorant), 'Cormorant Garamond', serif" fontSize="22" fill="#AC3438" fontStyle="italic">{num}</text>
      {dots.map(d => {
        const rad = (d - 90) * Math.PI / 180;
        return (
          <circle key={d}
            cx={(60 + Math.cos(rad) * 44).toFixed(1)}
            cy={(60 + Math.sin(rad) * 44).toFixed(1)}
            r="1.6" fill="#AC3438" opacity="0.35"
          />
        );
      })}
      <circle cx="18"  cy="108" r="5" stroke="#AC3438" strokeWidth="0.9" fill="rgba(172,52,56,0.08)" />
      <circle cx="102" cy="108" r="5" stroke="#AC3438" strokeWidth="0.9" fill="rgba(172,52,56,0.08)" />
    </svg>
  );
}

function PieceEarringSVG() {
  const starDots = [0, 60, 120, 180, 240, 300];
  return (
    <svg viewBox="0 0 120 150" fill="none" aria-hidden="true">
      <path d="M60 16 Q74 9 78 21 Q80 31 70 37" stroke="#AC3438" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <line x1="60" y1="16" x2="60" y2="38" stroke="#AC3438" strokeWidth="1" />
      <path d="M60 38 Q90 58 90 88 Q90 120 60 130 Q30 120 30 88 Q30 58 60 38 Z" stroke="#AC3438" strokeWidth="1.2" fill="rgba(172,52,56,0.04)" />
      <circle cx="60" cy="90" r="22" stroke="#AC3438" strokeWidth="0.6" fill="none" opacity="0.32" />
      {starDots.map(d => {
        const rad = (d - 90) * Math.PI / 180;
        return (
          <circle key={d}
            cx={(60 + Math.cos(rad) * 15).toFixed(1)}
            cy={(90 + Math.sin(rad) * 15).toFixed(1)}
            r="1.8" fill="#AC3438" opacity="0.45"
          />
        );
      })}
      <circle cx="60" cy="90" r="3.5" fill="#AC3438" opacity="0.22" stroke="#AC3438" strokeWidth="0.8" />
    </svg>
  );
}

// ── Jewelry pieces data ───────────────────────────────────────────────────────

function getPieces(num: number, lpTitle: string, zodiacSign: string) {
  return [
    {
      id: 'solitaire',
      tag: 'Engagement Ring',
      name: `Life Path ${num} Solitaire`,
      desc: `The number ${num} lives beneath your stone — visible from above, felt in the hand. Set with your chosen diamond in 18k gold.`,
      svg: <PieceRingSVG num={num} />,
    },
    {
      id: 'pendant',
      tag: 'Fine Necklace',
      name: `The ${lpTitle} Medallion`,
      desc: `A hand-engraved disc in 18k gold. Your number at the centre of a sacred geometry frame — worn close to the heart.`,
      svg: <PiecePendantSVG num={num} />,
    },
    {
      id: 'signet',
      tag: 'Signet Ring',
      name: `Life Path ${num} Signet`,
      desc: `Your number set on an oval signet face. A quiet declaration, worn on the hand that writes.`,
      svg: <PieceSignetSVG num={num} />,
    },
    {
      id: 'bangle',
      tag: 'Hinged Bangle',
      name: `The ${num} Bangle`,
      desc: `Your number engraved along the inner face. The world sees gold. You carry the number.`,
      svg: <PieceBangleSVG num={num} />,
    },
    {
      id: 'earring',
      tag: 'Fine Earrings',
      name: `${zodiacSign} Drop Earrings`,
      desc: `Constellation drops in 18k gold. Your zodiac sign traced in gold and set with diamond starpoints for daily wear.`,
      svg: <PieceEarringSVG />,
    },
  ];
}

// ── Main Component ────────────────────────────────────────────────────────────

type Screen = 'landing' | 'input' | 'results' | 'commission' | 'success';

interface ResultData {
  lifePathNum: number;
  zodiac: (typeof ZODIAC_DATA)[number];
  zodiacIndex: number;
  birthDate: string;
  day: number;
}

export default function LifePathClient() {
  const router = useRouter();
  const [screen, setScreen]             = useState<Screen>('landing');
  const [day, setDay]                   = useState('');
  const [month, setMonth]               = useState('');
  const [year, setYear]                 = useState('');
  const [inputEmail, setInputEmail]     = useState('');
  const [inputError, setInputError]     = useState('');
  const [result, setResult]             = useState<ResultData | null>(null);
  const [commName, setCommName]         = useState('');
  const [commEmail, setCommEmail]       = useState('');
  const [commMessage, setCommMessage]   = useState('');
  const [commError, setCommError]       = useState('');
  const [commSubmitting, setCommSubmitting] = useState(false);

  const lpData = result ? (LIFE_PATH_DATA[result.lifePathNum] ?? LIFE_PATH_DATA[9]) : null;

  // Push a history entry when moving forward through screens
  function goTo(next: Screen) {
    window.history.pushState({ screen: next }, '');
    setScreen(next);
  }

  // Handle browser back button — pop to previous screen
  const handlePop = useCallback((e: PopStateEvent) => {
    const prev = (e.state as { screen?: Screen } | null)?.screen;
    if (prev) {
      setScreen(prev);
    } else {
      // No more app history — let the browser navigate away naturally
      router.back();
    }
  }, [router]);

  useEffect(() => {
    // Seed the initial history state so the first back pop has state
    window.history.replaceState({ screen: 'landing' }, '');
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [handlePop]);

  function handleReveal() {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!d || !m || !y || d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2025) {
      setInputError('Please enter a valid date of birth.');
      return;
    }
    setInputError('');
    const num = calcLifePath(d, m, y);
    const { zodiac, index: zodiacIndex } = getZodiac(d, m);
    setResult({ lifePathNum: num, zodiac, zodiacIndex, birthDate: `${d}/${m}/${y}`, day: d });
    goTo('results');
  }

  function goToCommission() {
    setCommEmail(inputEmail);
    goTo('commission');
  }

  function handleReset() {
    setDay(''); setMonth(''); setYear(''); setResult(null); setInputError('');
    goTo('input');
  }

  async function handleCommissionSubmit() {
    if (!commName.trim()) { setCommError('Please enter your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(commEmail.trim())) { setCommError('Please enter a valid email address.'); return; }
    setCommError('');
    setCommSubmitting(true);
    const lpInfo = result && lpData
      ? `Life Path ${result.lifePathNum} — ${lpData.title} · ${result.zodiac.sign} · Born ${result.birthDate}`
      : '';
    try {
      const res = await fetch('/api/consultation/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name:  commName.trim(),
          customer_email: commEmail.trim().toLowerCase(),
          notes: [lpInfo, commMessage.trim()].filter(Boolean).join('\n\n'),
        }),
      });
      if (!res.ok) throw new Error('Request failed');
      goTo('success');
    } catch {
      setCommError('Something went wrong. Please try again.');
    } finally {
      setCommSubmitting(false);
    }
  }

  const pieces = result && lpData
    ? getPieces(result.lifePathNum, lpData.title, result.zodiac.sign)
    : [];

  return (
    <main className="lp-page">
      <style>{`
        .lp-page { min-height: 100vh; font-family: 'Cormorant Garamond', serif; }

        /* ── Landing ── */
        .lp-landing {
          min-height: 100vh; background: #faf6f1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 24px; text-align: center; position: relative; overflow: hidden;
        }
        .lp-landing-bg {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none; opacity: 0.12;
        }
        .lp-landing-bg svg { width: min(560px, 90vw); }
        .lp-landing-nav {
          position: absolute; top: 24px; left: 24px;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #9c8f86; text-decoration: none;
          display: flex; align-items: center; gap: 8px; transition: color 0.2s; z-index: 2;
        }
        .lp-landing-nav:hover { color: #1a1410; }
        .lp-landing-inner { position: relative; z-index: 1; max-width: 520px; }
        .lp-landing-eyebrow {
          display: block; font-size: 10px; letter-spacing: 0.26em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 24px;
        }
        .lp-landing-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(42px, 7vw, 72px); font-weight: 300;
          color: #1a1410; margin: 0 0 20px; line-height: 1.05; letter-spacing: 0.04em;
        }
        .lp-landing-divider { width: 40px; height: 1px; background: #AC3438; margin: 0 auto 20px; }
        .lp-landing-sub {
          font-size: 15px; color: #7a5c58; line-height: 1.7; margin: 0 0 44px;
          font-style: italic; font-family: 'Cormorant Garamond', serif;
        }
        .lp-landing-btn {
          display: inline-block; padding: 16px 56px; background: #AC3438; color: #faf6f1;
          font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
          border: none; cursor: pointer; font-family: 'Cormorant Garamond', serif;
          border-radius: 4px; transition: background 0.2s;
        }
        .lp-landing-btn:hover { background: #8f2b2e; }

        /* ── Input screen ── */
        .lp-input {
          min-height: 100vh; background: #faf6f1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 24px; text-align: center;
        }
        .lp-input-back {
          position: absolute; top: 24px; left: 24px;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #9c8f86; background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: color 0.2s;
          font-family: 'Cormorant Garamond', serif;
        }
        .lp-input-back:hover { color: #1a1410; }
        .lp-input-inner { max-width: 440px; width: 100%; }
        .lp-input-eyebrow {
          display: block; font-size: 10px; letter-spacing: 0.26em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 20px;
        }
        .lp-input-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(30px, 5vw, 46px); font-weight: 400;
          color: #1a1410; margin: 0 0 8px; line-height: 1.1;
        }
        .lp-input-sub { font-size: 13.5px; color: #8a7f76; margin: 0 0 36px; line-height: 1.6; }
        .lp-date-row {
          display: grid; grid-template-columns: 1fr 1fr 1.4fr;
          gap: 12px; margin-bottom: 14px;
        }
        .lp-date-field { display: flex; flex-direction: column; gap: 6px; text-align: left; }
        .lp-date-label {
          font-size: 10px; letter-spacing: 0.16em;
          text-transform: uppercase; color: #9c8f86;
        }
        .lp-date-input {
          width: 100%; padding: 14px 12px; background: #fff; border: 1px solid #ede8e2;
          font-size: 16px; font-family: 'Cormorant Garamond', serif; color: #1a1410;
          text-align: center; outline: none; transition: border-color 0.2s; box-sizing: border-box;
        }
        .lp-date-input:focus { border-color: #AC3438; }
        .lp-date-input::placeholder { color: #bdb0a8; }
        .lp-email-row { display: flex; flex-direction: column; gap: 6px; text-align: left; margin-bottom: 4px; }
        .lp-email-input {
          width: 100%; padding: 14px 16px; background: #fff; border: 1px solid #ede8e2;
          font-size: 14px; font-family: 'Cormorant Garamond', serif; color: #1a1410;
          outline: none; transition: border-color 0.2s; box-sizing: border-box;
        }
        .lp-email-input:focus { border-color: #AC3438; }
        .lp-email-input::placeholder { color: #c0b5ac; }
        .lp-email-hint { font-size: 11px; color: #b0a49c; font-style: italic; margin-top: 4px; }
        .lp-error { font-size: 12px; color: #AC3438; margin: 10px 0 0; min-height: 18px; text-align: left; }
        .lp-reveal-btn {
          width: 100%; margin-top: 24px; padding: 16px; background: #AC3438; color: #faf6f1;
          font-family: 'Cormorant Garamond', serif; font-size: 11px; letter-spacing: 0.2em;
          text-transform: uppercase; border: none; cursor: pointer;
          border-radius: 4px; transition: background 0.2s;
        }
        .lp-reveal-btn:hover { background: #8B2A2D; }

        /* ── Results screen ── */
        .lp-results {
          min-height: 100vh; background: #faf6f1; padding: 80px 24px 60px; position: relative;
        }
        .lp-results-back {
          position: absolute; top: 24px; left: 24px;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #9c8f86; background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: color 0.2s;
          font-family: 'Cormorant Garamond', serif;
        }
        .lp-results-back:hover { color: #1a1410; }
        .lp-results-inner {
          max-width: 960px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 64px; align-items: start;
        }
        .lp-results-left { position: sticky; top: 80px; }
        .lp-design-label {
          display: block; font-size: 9.5px; letter-spacing: 0.24em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 20px; text-align: center;
        }
        .lp-design-svg-wrap {
          background: #fff; border: 1px solid #ede8e2; aspect-ratio: 1;
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .lp-design-svg-wrap svg { width: 100%; height: 100%; }
        .lp-design-story {
          font-family: 'Cormorant Garamond', serif; font-style: italic;
          font-size: 15px; color: #6b5e57; line-height: 1.75;
          text-align: center; margin: 20px 0 10px;
        }
        .lp-design-note {
          font-size: 11px; color: #b0a49c; letter-spacing: 0.08em; line-height: 1.6;
          text-align: center; font-style: italic;
        }

        .lp-results-right { padding-top: 12px; }
        .lp-number-eyebrow {
          display: block; font-size: 9.5px; letter-spacing: 0.24em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 12px;
        }
        .lp-number-big {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(72px, 12vw, 110px); color: #AC3438;
          line-height: 1; margin: 0; display: block;
        }
        .lp-number-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(24px, 4vw, 34px); font-weight: 400;
          color: #1a1410; margin: 8px 0 0;
        }
        .lp-divider { width: 40px; height: 2px; background: #AC3438; margin: 20px 0; }
        .lp-number-desc { font-size: 14.5px; color: #6b5e57; line-height: 1.8; margin: 0 0 32px; }
        .lp-element-row {
          display: flex; align-items: center; gap: 10px; margin-bottom: 32px;
        }
        .lp-element-label { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #9c8f86; }
        .lp-element-dot { width: 6px; height: 6px; border-radius: 50%; background: #AC3438; }
        .lp-element-val { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: #1a1410; font-weight: 500; }

        /* Zodiac card */
        .lp-zodiac-card {
          background: #fff; border: 1px solid #ede8e2; padding: 20px 24px;
          display: flex; align-items: flex-start; gap: 18px; margin-bottom: 32px;
        }
        .lp-zodiac-icon-wrap { flex-shrink: 0; padding-top: 2px; }
        .lp-zodiac-info {}
        .lp-zodiac-label {
          display: block; font-size: 9px; letter-spacing: 0.22em;
          text-transform: uppercase; color: #9c8f86; margin-bottom: 4px;
        }
        .lp-zodiac-sign {
          font-family: 'Cormorant Garamond', serif;
          font-size: 22px; color: #1a1410; display: block; line-height: 1; margin-bottom: 4px;
        }
        .lp-zodiac-dates { font-size: 11px; color: #9c8f86; display: block; margin-bottom: 6px; }
        .lp-zodiac-desc { font-size: 12px; color: #6b5e57; font-style: italic; font-family: 'Cormorant Garamond', serif; }

        /* CTAs */
        .lp-ctas { display: flex; flex-direction: column; gap: 12px; }
        .lp-cta-primary {
          display: block; width: 100%; padding: 16px; background: #AC3438; color: #faf6f1;
          font-family: 'Cormorant Garamond', serif; font-size: 11px; letter-spacing: 0.2em;
          text-transform: uppercase; text-decoration: none; text-align: center;
          border: none; border-radius: 4px; transition: background 0.2s; cursor: pointer;
        }
        .lp-cta-primary:hover { background: #8f2b2e; }
        .lp-cta-secondary {
          display: block; width: 100%; padding: 15px; background: transparent; color: #1a1410;
          font-family: 'Cormorant Garamond', serif; font-size: 11px; letter-spacing: 0.2em;
          text-transform: uppercase; text-align: center;
          border: 1px solid rgba(172,52,56,0.25); cursor: pointer;
          border-radius: 4px; transition: border-color 0.2s, color 0.2s;
        }
        .lp-cta-secondary:hover { border-color: #AC3438; color: #AC3438; }

        /* ── Jewelry pieces section ── */
        .lp-pieces-section {
          max-width: 1120px; margin: 64px auto 0; padding: 0 0 56px;
          border-top: 1px solid #ede8e2; padding-top: 56px;
        }
        .lp-pieces-header { text-align: center; margin-bottom: 40px; }
        .lp-pieces-eyebrow {
          display: block; font-size: 10px; letter-spacing: 0.26em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 12px;
        }
        .lp-pieces-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(26px, 4vw, 38px); font-weight: 400;
          color: #1a1410; margin: 0 0 12px; line-height: 1.1;
        }
        .lp-pieces-sub { font-size: 14px; color: #8a7f76; line-height: 1.65; max-width: 500px; margin: 0 auto; }
        .lp-pieces-grid {
          display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px;
        }
        .lp-piece-card {
          background: #fff; border: 1px solid #ede8e2;
          display: flex; flex-direction: column; transition: border-color 0.2s;
        }
        .lp-piece-card:hover { border-color: rgba(172,52,56,0.35); }
        .lp-piece-svg-wrap {
          background: #faf6f1; padding: 20px;
          border-bottom: 1px solid #ede8e2; display: flex;
          align-items: center; justify-content: center;
        }
        .lp-piece-svg-wrap svg { width: 100%; height: auto; display: block; }
        .lp-piece-info { padding: 16px 16px 20px; flex: 1; display: flex; flex-direction: column; }
        .lp-piece-tag {
          display: block; font-size: 9px; letter-spacing: 0.2em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 6px;
        }
        .lp-piece-name {
          font-family: 'Cormorant Garamond', serif; font-size: 17px;
          color: #1a1410; margin: 0 0 8px; line-height: 1.2; font-weight: 400;
        }
        .lp-piece-desc { font-size: 12px; color: #7a6e68; line-height: 1.65; margin: 0 0 16px; flex: 1; }
        .lp-piece-cta {
          display: inline-block; font-size: 10px; letter-spacing: 0.14em;
          text-transform: uppercase; color: #AC3438; text-decoration: none;
          cursor: pointer; background: none; border: none; padding: 0;
          font-family: 'Cormorant Garamond', serif; align-self: flex-start;
          transition: color 0.2s;
        }
        .lp-piece-cta:hover { color: #8B2A2D; }
        .lp-pieces-commission {
          text-align: center; margin-top: 40px;
        }
        .lp-pieces-commission-note {
          font-family: 'Cormorant Garamond', serif; font-style: italic;
          font-size: 15px; color: #7a6e68; margin: 0 0 20px; line-height: 1.7;
        }

        /* Disclaimer */
        .lp-disclaimer {
          max-width: 600px; margin: 48px auto 0; padding-top: 32px;
          border-top: 1px solid #ede8e2;
          font-family: 'Cormorant Garamond', serif; font-style: italic;
          font-size: 14px; color: #9c8f86; line-height: 1.75; text-align: center;
        }

        /* ── Commission screen ── */
        .lp-commission {
          min-height: 100vh; background: #faf6f1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 24px 60px; position: relative;
        }
        .lp-commission-back {
          position: absolute; top: 24px; left: 24px;
          font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
          color: #9c8f86; background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 6px; transition: color 0.2s;
          font-family: 'Cormorant Garamond', serif;
        }
        .lp-commission-back:hover { color: #1a1410; }
        .lp-commission-inner { max-width: 480px; width: 100%; }
        .lp-commission-eyebrow {
          display: block; font-size: 10px; letter-spacing: 0.26em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 12px;
        }
        .lp-commission-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(26px, 4vw, 38px); font-weight: 400;
          color: #1a1410; margin: 0 0 8px; line-height: 1.1;
        }
        .lp-commission-sub { font-size: 13.5px; color: #8a7f76; margin: 0 0 28px; line-height: 1.65; }
        .lp-commission-context {
          background: #fff; border: 1px solid #ede8e2;
          padding: 16px 20px; margin-bottom: 28px;
          display: flex; align-items: center; gap: 14px;
        }
        .lp-commission-context-num {
          font-family: 'Cormorant Garamond', serif; font-size: 36px;
          color: #AC3438; line-height: 1; flex-shrink: 0;
        }
        .lp-commission-context-title {
          font-family: 'Cormorant Garamond', serif; font-size: 18px;
          color: #1a1410; display: block;
        }
        .lp-commission-context-zodiac { font-size: 11px; color: #9c8f86; letter-spacing: 0.08em; }
        .lp-commission-context-zodiac-inner {
          display: inline-flex; align-items: center; gap: 6px; vertical-align: middle;
        }
        .lp-form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .lp-form-label {
          font-size: 10px; letter-spacing: 0.16em;
          text-transform: uppercase; color: #9c8f86;
        }
        .lp-form-input, .lp-form-textarea {
          width: 100%; padding: 13px 14px; background: #fff; border: 1px solid #ede8e2;
          font-size: 14px; font-family: 'Cormorant Garamond', serif; color: #1a1410;
          outline: none; transition: border-color 0.2s; box-sizing: border-box;
        }
        .lp-form-input:focus, .lp-form-textarea:focus { border-color: #AC3438; }
        .lp-form-input::placeholder, .lp-form-textarea::placeholder { color: #c0b5ac; }
        .lp-form-textarea { resize: vertical; min-height: 96px; }
        .lp-form-error { font-size: 12px; color: #AC3438; margin: 8px 0 0; min-height: 18px; }
        .lp-submit-btn {
          width: 100%; margin-top: 24px; padding: 16px; background: #AC3438; color: #faf6f1;
          font-family: 'Cormorant Garamond', serif; font-size: 11px; letter-spacing: 0.2em;
          text-transform: uppercase; border: none; cursor: pointer;
          border-radius: 4px; transition: background 0.2s;
        }
        .lp-submit-btn:hover:not(:disabled) { background: #8f2b2e; }
        .lp-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Success screen ── */
        .lp-success {
          min-height: 100vh; background: #faf6f1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 60px 24px; text-align: center;
        }
        .lp-success-inner { max-width: 480px; }
        .lp-success-icon {
          width: 56px; height: 56px; border: 1px solid #AC3438; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 28px; color: #AC3438;
        }
        .lp-success-eyebrow {
          display: block; font-size: 10px; letter-spacing: 0.26em;
          text-transform: uppercase; color: #AC3438; margin-bottom: 14px;
        }
        .lp-success-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(30px, 5vw, 48px); font-weight: 300;
          color: #1a1410; margin: 0 0 16px; line-height: 1.1;
        }
        .lp-success-divider { width: 40px; height: 1px; background: #AC3438; margin: 0 auto 20px; }
        .lp-success-sub {
          font-size: 14px; color: #7a5c58; line-height: 1.75; margin: 0 0 40px;
          font-style: italic; font-family: 'Cormorant Garamond', serif;
        }
        .lp-success-back {
          display: inline-block; padding: 14px 48px; border: 1px solid #ede8e2;
          color: #1a1410; font-family: 'Cormorant Garamond', serif; font-size: 11px;
          letter-spacing: 0.2em; text-transform: uppercase; text-decoration: none;
          transition: border-color 0.2s, color 0.2s;
        }
        .lp-success-back:hover { border-color: #1a1410; }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .lp-pieces-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 720px) {
          .lp-results { padding: 60px 20px 40px; }
          .lp-results-inner { grid-template-columns: 1fr; gap: 40px; }
          .lp-results-left { position: static; }
          .lp-number-big { font-size: 80px; }
          .lp-pieces-grid {
            display: flex; overflow-x: auto; scroll-snap-type: x mandatory;
            gap: 14px; padding-bottom: 12px; -webkit-overflow-scrolling: touch;
          }
          .lp-piece-card { flex: 0 0 210px; scroll-snap-align: start; }
        }
        @media (max-width: 500px) {
          .lp-pieces-grid { grid-template-columns: 1fr 1fr; display: grid; }
          .lp-piece-card { flex: none; }
        }
      `}</style>

      {/* ── LANDING ── */}
      {screen === 'landing' && (
        <div className="lp-landing">
          <Link href="/engagement-rings" className="lp-landing-nav">← Back to Rings</Link>
          <div className="lp-landing-bg" aria-hidden="true">
            <svg viewBox="0 0 600 600" fill="none">
              <circle cx="300" cy="300" r="280" stroke="#AC3438" strokeWidth="2.5"/>
              <circle cx="300" cy="300" r="220" stroke="#AC3438" strokeWidth="1.2" opacity="0.6"/>
              <circle cx="300" cy="300" r="165" stroke="#AC3438" strokeWidth="0.8" opacity="0.5"/>
              <circle cx="300" cy="300" r="115" stroke="#AC3438" strokeWidth="0.6" opacity="0.4"/>
              <circle cx="300" cy="300" r="72"  stroke="#AC3438" strokeWidth="0.5" opacity="0.3"/>
              <circle cx="300" cy="300" r="38"  stroke="#AC3438" strokeWidth="0.4" opacity="0.2"/>
              <line x1="300" y1="20"  x2="300" y2="580" stroke="#AC3438" strokeWidth="0.3" opacity="0.4"/>
              <line x1="20"  y1="300" x2="580" y2="300" stroke="#AC3438" strokeWidth="0.3" opacity="0.4"/>
              <line x1="95"  y1="95"  x2="505" y2="505" stroke="#AC3438" strokeWidth="0.25" opacity="0.3"/>
              <line x1="505" y1="95"  x2="95"  y2="505" stroke="#AC3438" strokeWidth="0.25" opacity="0.3"/>
              <polygon points="300,22 548,162 548,438 300,578 52,438 52,162" stroke="#AC3438" strokeWidth="0.4" fill="none" opacity="0.3"/>
            </svg>
          </div>
          <div className="lp-landing-inner">
            <span className="lp-landing-eyebrow">DANHOV · The Life Path</span>
            <h1 className="lp-landing-title">THE LIFE PATH</h1>
            <div className="lp-landing-divider"/>
            <p className="lp-landing-sub">
              Your birth date holds a number.<br/>
              Your number holds a meaning.<br/>
              Not your fate — a mirror.
            </p>
            <button className="lp-landing-btn" onClick={() => goTo('input')}>Begin</button>
          </div>
        </div>
      )}

      {/* ── DATE INPUT ── */}
      {screen === 'input' && (
        <div className="lp-input" style={{ position: 'relative' }}>
          <button className="lp-input-back" onClick={() => window.history.back()}>← Back</button>
          <div className="lp-input-inner">
            <span className="lp-input-eyebrow">Your Birth Date</span>
            <h2 className="lp-input-title">When did you arrive?</h2>
            <p className="lp-input-sub">Enter your date of birth to reveal your life path number, zodiac sign, and five bespoke jewelry designs made for your number.</p>

            <div className="lp-date-row">
              <div className="lp-date-field">
                <label className="lp-date-label" htmlFor="lp-month">Month</label>
                <input id="lp-month" type="number" className="lp-date-input" placeholder="MM"
                  min={1} max={12} value={month} onChange={e => setMonth(e.target.value)} />
              </div>
              <div className="lp-date-field">
                <label className="lp-date-label" htmlFor="lp-day">Day</label>
                <input id="lp-day" type="number" className="lp-date-input" placeholder="DD"
                  min={1} max={31} value={day} onChange={e => setDay(e.target.value)} />
              </div>
              <div className="lp-date-field">
                <label className="lp-date-label" htmlFor="lp-year">Year</label>
                <input id="lp-year" type="number" className="lp-date-input" placeholder="YYYY"
                  min={1900} max={2025} value={year} onChange={e => setYear(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReveal()} />
              </div>
            </div>

            <div className="lp-email-row">
              <label className="lp-date-label" htmlFor="lp-input-email">Email — receive your designs</label>
              <input id="lp-input-email" type="email" className="lp-email-input"
                placeholder="you@example.com" value={inputEmail}
                onChange={e => setInputEmail(e.target.value)}
                autoComplete="email"
                onKeyDown={e => e.key === 'Enter' && handleReveal()} />
              <span className="lp-email-hint">Optional. We&apos;ll send your five jewelry designs and never share your address.</span>
            </div>

            {inputError && <p className="lp-error">{inputError}</p>}

            <button className="lp-reveal-btn" onClick={handleReveal}>Reveal My Path</button>
          </div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {screen === 'results' && result && lpData && (
        <div className="lp-results">
          <button className="lp-results-back" onClick={() => window.history.back()}>← Back</button>

          <div className="lp-results-inner">
            {/* Left: geometric ring design */}
            <div className="lp-results-left">
              <span className="lp-design-label">Your Original Design · {result.birthDate}</span>
              <div className="lp-design-svg-wrap">
                <LifePathDesign num={result.lifePathNum} zodiacIndex={result.zodiacIndex} day={result.day} />
              </div>
              <p className="lp-design-story">&ldquo;{generateStory(lpData.title, result.zodiac.sign)}&rdquo;</p>
              <p className="lp-design-note">A unique form, generated from your number and sign. When you request your piece, our jeweler will refine it by hand — in silence.</p>
            </div>

            {/* Right: life path info */}
            <div className="lp-results-right">
              <span className="lp-number-eyebrow">Life Path Number</span>
              <span className="lp-number-big">{result.lifePathNum}</span>
              <h2 className="lp-number-title">{lpData.title}</h2>
              <div className="lp-divider"/>
              <p className="lp-number-desc">{lpData.desc}</p>

              <div className="lp-element-row">
                <span className="lp-element-label">Element</span>
                <span className="lp-element-dot"/>
                <span className="lp-element-val">{lpData.element}</span>
              </div>

              {/* Zodiac card with SVG icon */}
              <div className="lp-zodiac-card">
                <div className="lp-zodiac-icon-wrap">
                  <ZodiacIcon sign={result.zodiac.sign} size={44} />
                </div>
                <div className="lp-zodiac-info">
                  <span className="lp-zodiac-label">Zodiac Sign</span>
                  <span className="lp-zodiac-sign">{result.zodiac.sign}</span>
                  <span className="lp-zodiac-dates">{result.zodiac.dates}</span>
                  <span className="lp-zodiac-desc">{result.zodiac.desc}</span>
                </div>
              </div>

              {/* CTAs */}
              <div className="lp-ctas">
                <button type="button" className="lp-cta-primary" onClick={goToCommission}>
                  Request This Design
                </button>
                <button type="button" className="lp-cta-secondary" onClick={handleReset}>
                  Calculate Another
                </button>
              </div>
            </div>
          </div>

          {/* ── Jewellery Pieces ── */}
          <div className="lp-pieces-section">
            <div className="lp-pieces-header">
              <span className="lp-pieces-eyebrow">Your Bespoke Collection</span>
              <h3 className="lp-pieces-title">Five pieces made for Life Path {result.lifePathNum}</h3>
              <p className="lp-pieces-sub">
                Each design is built around your number. Our atelier crafts every piece to order in Los Angeles — handmade, hallmarked, yours alone.
              </p>
            </div>

            <div className="lp-pieces-grid">
              {pieces.map(piece => (
                <div key={piece.id} className="lp-piece-card">
                  <div className="lp-piece-svg-wrap">
                    {piece.svg}
                  </div>
                  <div className="lp-piece-info">
                    <span className="lp-piece-tag">{piece.tag}</span>
                    <h4 className="lp-piece-name">{piece.name}</h4>
                    <p className="lp-piece-desc">{piece.desc}</p>
                    <button type="button" className="lp-piece-cta" onClick={goToCommission}>
                      Enquire →
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lp-pieces-commission">
              <p className="lp-pieces-commission-note">
                Every piece is made to order, handcrafted by a single jeweler in Los Angeles. Pricing is confirmed by your specialist within one business day.
              </p>
              <button type="button" className="lp-cta-primary" style={{ maxWidth: 320, margin: '0 auto', display: 'block' }} onClick={goToCommission}>
                Request Your Design
              </button>
            </div>
          </div>

          <p className="lp-disclaimer">
            Your number and your sign are not your fate. They are doorways — ways of looking at yourself you may not have tried. Take what resonates. Leave the rest.
          </p>
        </div>
      )}

      {/* ── COMMISSION ── */}
      {screen === 'commission' && result && lpData && (
        <div className="lp-commission">
          <button className="lp-commission-back" onClick={() => window.history.back()}>← Back</button>
          <div className="lp-commission-inner">
            <span className="lp-commission-eyebrow">Private Design Request</span>
            <h2 className="lp-commission-title">Request Your<br/>Life Path Piece</h2>
            <p className="lp-commission-sub">
              Our atelier will handcraft a piece designed around your unique number. Leave your details and a DANHOV jeweler will reach out to begin.
            </p>

            <div className="lp-commission-context">
              <span className="lp-commission-context-num">{result.lifePathNum}</span>
              <div>
                <span className="lp-commission-context-title">{lpData.title}</span>
                <span className="lp-commission-context-zodiac">
                  <span className="lp-commission-context-zodiac-inner">
                    <ZodiacIcon sign={result.zodiac.sign} size={16} />
                    {result.zodiac.sign}
                  </span>
                  {' '}· Element: {lpData.element}
                </span>
              </div>
            </div>

            <div className="lp-form-field">
              <label className="lp-form-label" htmlFor="comm-name">Your Name</label>
              <input id="comm-name" type="text" className="lp-form-input" placeholder="Full name"
                value={commName} onChange={e => setCommName(e.target.value)} autoComplete="name" />
            </div>
            <div className="lp-form-field">
              <label className="lp-form-label" htmlFor="comm-email">Email Address</label>
              <input id="comm-email" type="email" className="lp-form-input" placeholder="you@example.com"
                value={commEmail} onChange={e => setCommEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="lp-form-field">
              <label className="lp-form-label" htmlFor="comm-message">Message (optional)</label>
              <textarea id="comm-message" className="lp-form-textarea"
                placeholder="Which piece interests you most? Any preferences for metal, stone, or engraving…"
                value={commMessage} onChange={e => setCommMessage(e.target.value)} />
            </div>

            {commError && <p className="lp-form-error">{commError}</p>}

            <button type="button" className="lp-submit-btn" disabled={commSubmitting} onClick={handleCommissionSubmit}>
              {commSubmitting ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </div>
      )}

      {/* ── SUCCESS ── */}
      {screen === 'success' && (
        <div className="lp-success">
          <div className="lp-success-inner">
            <div className="lp-success-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polyline points="4,12 9,17 20,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="lp-success-eyebrow">Request Received</span>
            <h2 className="lp-success-title">Your request<br/>is on its way.</h2>
            <div className="lp-success-divider"/>
            <p className="lp-success-sub">
              A DANHOV jeweler will be in touch within one business day to begin crafting your Life Path piece — made only for you.
            </p>
            <Link href="/engagement-rings" className="lp-success-back">Return to Rings</Link>
          </div>
        </div>
      )}
    </main>
  );
}
