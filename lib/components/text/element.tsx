'use client';

import { useRef, useLayoutEffect, useCallback, useState } from 'react';
import type { TextProperties } from '@/lib/types';
import { getZplFontStyle } from '@/lib/constants';

interface Props {
  props: TextProperties;
  isSelected?: boolean;
}

const JUSTIFICATION_MAP: Record<string, React.CSSProperties['textAlign']> = {
  L: 'left',
  C: 'center',
  R: 'right',
  J: 'justify',
};

const ROTATION_TRANSFORMS: Record<number, string> = {
  90: 'rotate(90deg) translateY(-100%)',
  180: 'rotate(180deg)',
  270: 'rotate(-90deg) translateX(-100%)',
};

/**
 * Detect line breaks by walking character-by-character through a text node,
 * using Range.getClientRects() to detect Y position changes. Returns an
 * array of line strings as the browser actually rendered them.
 */
function detectLineBreaks(element: HTMLElement): string[] {
  // Collect all text nodes in order
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }

  if (textNodes.length === 0) return [element.textContent ?? ''];

  const lines: string[] = [];
  let currentLine = '';
  let prevTop = -Infinity;

  const range = document.createRange();

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? '';
    for (let i = 0; i < text.length; i++) {
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      const rect = range.getBoundingClientRect();

      if (rect.height === 0) {
        currentLine += text[i];
        continue;
      }

      if (prevTop === -Infinity) {
        prevTop = rect.top;
      }

      if (rect.top > prevTop + 1) {
        // New line — push current and start fresh
        lines.push(currentLine);
        currentLine = text[i];
        prevTop = rect.top;
      } else {
        currentLine += text[i];
      }
    }
  }

  // Push the last line
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [''];
}

export function TextElement({ props, isSelected: _isSelected }: Props) {
  const fb = props.fieldBlock;
  const rot = props.rotation;
  const fontStyle = getZplFontStyle(props.font, props.fontSize, props.fontWidth);

  const rotationTransform = ROTATION_TRANSFORMS[rot] ?? '';
  const scaleTransformParts = [
    fontStyle.scaleX !== 1 ? `scaleX(${fontStyle.scaleX})` : '',
    fontStyle.scaleY !== 1 ? `scaleY(${fontStyle.scaleY})` : '',
  ].filter(Boolean).join(' ');
  const fullTransform = [rotationTransform, scaleTransformParts].filter(Boolean).join(' ');

  const baseStyle: React.CSSProperties = {
    fontSize: fontStyle.fontSize,
    lineHeight: fb ? 1 + (fb.lineSpacing / props.fontSize) : 1,
    fontFamily: fontStyle.fontFamily,
    fontWeight: fontStyle.fontWeight,
    textTransform: fontStyle.textTransform,
    color: 'black',
    ...(fullTransform
      ? {
          transform: fullTransform,
          transformOrigin: rot === 180 ? 'center' : 'top left',
        }
      : {}),
  };

  if (fb) {
    return (
      <FieldBlockText
        content={props.content}
        baseStyle={baseStyle}
        justification={fb.justification}
        maxLines={fb.maxLines}
        lineSpacing={fb.lineSpacing}
        fontSize={props.fontSize}
      />
    );
  }

  return (
    <div className="whitespace-nowrap" style={baseStyle}>
      {props.content}
    </div>
  );
}

/**
 * Renders field block text with ZPL-accurate overflow behavior.
 * Uses a hidden DOM element to detect actual browser line breaks, then
 * renders each line as a positioned div. Overflow lines are stacked on
 * top of the last allowed line, replicating the printer's overwrite effect.
 */
function FieldBlockText({ content, baseStyle, justification, maxLines, lineSpacing, fontSize }: {
  content: string;
  baseStyle: React.CSSProperties;
  justification: string;
  maxLines: number;
  lineSpacing: number;
  fontSize: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [lines, setLines] = useState<string[] | null>(null);

  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  const setMeasureRef = useCallback((node: HTMLDivElement | null) => {
    measureRef.current = node;
  }, []);

  // Detect line breaks from the hidden measurement element
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = measureRef.current;
      if (!el) return;
      const detected = detectLineBreaks(el);
      setLines(detected);
    });
    return () => cancelAnimationFrame(raf);
  });

  const textAlign = JUSTIFICATION_MAP[justification] || 'left';
  const lineHeightPx = fontSize + lineSpacing;

  // Hidden measurement element — always rendered, uses same styles as visible text
  // but without any line clamping so we can detect all line breaks
  const measureElement = (
    <div
      ref={setMeasureRef}
      aria-hidden
      style={{
        ...baseStyle,
        textAlign,
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        position: 'absolute',
        visibility: 'hidden',
        pointerEvents: 'none',
        width: '100%',
      }}
    >
      {content}
    </div>
  );

  // Before measurement, show fallback with line-clamp
  if (!lines) {
    return (
      <div ref={setContainerRef} style={{ ...baseStyle, textAlign, position: 'relative' }}>
        {measureElement}
        <div
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            overflow: 'hidden',
            ...(maxLines > 0
              ? {
                  display: '-webkit-box',
                  WebkitLineClamp: maxLines,
                  WebkitBoxOrient: 'vertical' as const,
                }
              : {}),
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  const hasOverflow = maxLines > 0 && lines.length > maxLines;
  const visibleHeight = maxLines > 0 ? maxLines * lineHeightPx : undefined;

  return (
    <div
      ref={setContainerRef}
      style={{
        ...baseStyle,
        textAlign,
        position: 'relative',
        height: visibleHeight,
        overflow: 'hidden',
      }}
    >
      {measureElement}
      {lines.map((line, i) => {
        // Lines within maxLines render at their natural position.
        // Overflow lines all stack at the position of the last allowed line.
        const effectiveIndex = (hasOverflow && i >= maxLines) ? maxLines - 1 : i;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: effectiveIndex * lineHeightPx,
              left: 0,
              right: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
}
