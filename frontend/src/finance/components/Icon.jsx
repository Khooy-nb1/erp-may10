const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  file: 'M14 3H5v18h14V8z M14 3v5h5 M8 12h8 M8 16h6',
  edit: 'M12 5H4v15h15v-8 M15 4l5 5 M10 14l-1 4 4-1 9-9-3-3z',
  book: 'M12 5v16 M12 5C8 2 4 3 2 4v15c3-1 6-1 10 2 4-3 7-3 10-2V4c-2-1-6-2-10 1z',
  wallet: 'M20 8V5H4a2 2 0 0 1 0-4h14v4 M4 5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16V8H4 M20 12h-5v5h5',
  layers: 'M12 3L2 8l10 5 10-5z M2 12l10 5 10-5 M2 16l10 5 10-5',
  calculator: 'M5 2h14v20H5z M8 5h8v4H8z M8 13h1 M15 13h1 M8 17h1 M15 17h1',
  chart: 'M3 3v18h18 M7 16v-5 M12 16V8 M17 16V5',
  report: 'M14 3H4v18h16V9z M14 3v6h6 M8 17v-4 M12 17v-6 M16 17v-2',
  arrow: 'M4 12h16 M14 6l6 6-6 6', chevron: 'M8 5l7 7-7 7', down: 'M6 9l6 6 6-6',
  menu: 'M3 6h18 M3 12h18 M3 18h18', close: 'M6 6l12 12 M6 18L18 6',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
  calendar: 'M3 5h18v16H3z M7 2v6 M17 2v6 M3 11h18',
  plus: 'M12 5v14 M5 12h14', download: 'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  check: 'M20 6L9 17l-5-5',
  search: 'M21 21l-4.35-4.35 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  filter: 'M3 5h18l-7 8v6l-4 2v-8z',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  warning: 'M12 3 2 21h20L12 3z M12 9v5 M12 18h.01',
  home: 'M3 11.5 12 4l9 7.5 M5 10v10h14V10 M9 20v-6h6v6',
  package: 'M4 7l8-4 8 4-8 4-8-4z M4 7v10l8 4 8-4V7 M12 11v10',
};

export default function Icon({ name, className = 'h-[18px] w-[18px]' }) {
  return <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.file} /></svg>;
}
