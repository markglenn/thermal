'use client';

import type { SnapGuide } from '@/lib/snap';

interface Props {
  guides: SnapGuide[];
  labelWidth: number;
  labelHeight: number;
}

const GUIDE_COLOR = '#ff00ff';

export function SmartGuides({ guides, labelWidth, labelHeight }: Props) {
  if (guides.length === 0) return null;

  return (
    <svg className="absolute inset-0 pointer-events-none" width={labelWidth} height={labelHeight}>
      {guides.map((g, i) =>
        g.axis === 'v' ? (
          <line
            key={i}
            x1={g.position}
            y1={g.from}
            x2={g.position}
            y2={g.to}
            stroke={GUIDE_COLOR}
            strokeWidth={1}
            opacity={0.7}
          />
        ) : (
          <line
            key={i}
            x1={g.from}
            y1={g.position}
            x2={g.to}
            y2={g.position}
            stroke={GUIDE_COLOR}
            strokeWidth={1}
            opacity={0.7}
          />
        )
      )}
    </svg>
  );
}
