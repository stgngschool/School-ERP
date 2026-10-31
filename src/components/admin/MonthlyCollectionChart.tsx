"use client";

import { useState } from 'react';
import { formatP } from '@/lib/currency';
import styles from './MonthlyCollectionChart.module.css';

interface Props {
  months: string[];
  values: Record<string, number>;
  masked: boolean;
  currentMonth: string;
}

export default function MonthlyCollectionChart({ months, values, masked, currentMonth }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const month = selected ?? (months.includes(currentMonth) ? currentMonth : months[0]);
  const maximum = Math.max(...months.map(m => values[m] || 0), 100);
  const ceiling = Math.ceil(maximum / (10 ** Math.floor(Math.log10(maximum)))) * (10 ** Math.floor(Math.log10(maximum)));
  const points = months.map((m, index) => ({ month: m, x: 64 + index * 57, y: 174 - ((values[m] || 0) / ceiling) * 138 }));
  const line = points.map(p => `${p.x},${p.y}`).join(' ');
  const compact = (paisa: number) => {
    const rupees = paisa / 100;
    return rupees >= 100000 ? `₹${+(rupees / 100000).toFixed(1)}L` : rupees >= 1000 ? `₹${+(rupees / 1000).toFixed(1)}k` : `₹${Math.round(rupees)}`;
  };

  return <div className={styles.chart}>
    <div className={styles.readout} aria-live="polite">
      <span><span className={styles.dot} />{month} collection</span>
      <strong>{masked ? '₹••••••' : formatP(values[month] || 0)}</strong>
    </div>
    <div className={styles.scroll}>
      <svg viewBox="0 0 720 214" className={styles.plot} role="group" aria-label="Monthly fee collection trend, April to March">
        {[0, 0.5, 1].map(fraction => <g key={fraction}>
          <line x1="64" x2="691" y1={174 - fraction * 138} y2={174 - fraction * 138} stroke="#e2e8f0" strokeDasharray={fraction ? '3 5' : undefined} />
          <text x="52" y={178 - fraction * 138} textAnchor="end" className={styles.axis}>{masked ? '•••' : compact(ceiling * fraction)}</text>
        </g>)}
        <polygon points={`64,174 ${line} 691,174`} fill="#eef2ff" opacity="0.65" />
        <polyline points={line} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map(point => <g key={point.month}>
          {point.month === month && <line x1={point.x} x2={point.x} y1="24" y2="174" stroke="#c7d2fe" strokeDasharray="3 4" />}
          <circle cx={point.x} cy={point.y} r={point.month === month ? 5 : 3.5} fill={point.month === month ? '#4f46e5' : 'white'} stroke="#4f46e5" strokeWidth="2" />
          <text x={point.x} y="202" textAnchor="middle" className={point.month === currentMonth ? styles.current : styles.axis}>{point.month}</text>
          <rect x={point.x - 22} y="20" width="44" height="190" fill="transparent" role="button" tabIndex={0}
            className={styles.target} aria-label={`${point.month}: ${masked ? 'amount hidden' : formatP(values[point.month] || 0)}`}
            aria-pressed={point.month === month} onMouseEnter={() => setSelected(point.month)} onFocus={() => setSelected(point.month)}
            onClick={() => setSelected(point.month)} onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(point.month); }
            }} />
        </g>)}
      </svg>
    </div>
    <p className={styles.hint}>Select a month to view its collection.</p>
  </div>;
}
