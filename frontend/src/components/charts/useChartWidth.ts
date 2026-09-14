import React, { useEffect, useRef, useState } from 'react';

/**
 * Tracks the rendered width of a chart container so the SVG can lay out in
 * real pixels. A scaled `viewBox` would stretch text and strokes along with
 * the geometry, which shows up as blurry labels at every breakpoint except the
 * one the viewBox was authored for.
 */
export function useChartWidth<T extends HTMLElement = HTMLDivElement>(): {
  ref: React.RefObject<T | null>;
  width: number;
} {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(element);
    setWidth(element.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
