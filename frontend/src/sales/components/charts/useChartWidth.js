import { useEffect, useRef, useState } from 'react';

/**
 * Tracks the rendered width of a chart container so the SVG can lay out in
 * real pixels. A scaled `viewBox` would stretch text and strokes along with
 * the geometry, which shows up as blurry labels at every breakpoint except the
 * one the viewBox was authored for.
 *
 * The initial width is 0, so a server render (or a first paint before the
 * effect runs) emits the chart's empty footprint rather than a mis-scaled one.
 */
export function useChartWidth() {
  const ref = useRef(null);
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
