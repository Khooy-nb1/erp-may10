import { createContext, useContext, useId } from 'react';
import { cn } from '../../lib/cn.js';

/**
 * PH1 built these primitives on `@radix-ui/react-tabs`; Core cannot take that
 * dependency (PLAN Step 6H), so the same controlled API is hand-rolled here:
 * a context carries `value`/`onChange` and the roving tab stop, `TabList` owns
 * arrow-key navigation (loop, automatic activation), and `Tab`/`TabPanel` keep
 * Radix's roles, `data-state` and `${baseId}-trigger-|content-${value}` ids so
 * the `data-[state=active]:` utilities and any page markup stay untouched.
 */
const TabsContext = createContext(null);

function useTabsContext(component) {
  const context = useContext(TabsContext);
  if (context === null) throw new Error(`${component} phải nằm trong <Tabs>.`);
  return context;
}

const triggerIdOf = (baseId, value) => `${baseId}-trigger-${value}`;
const contentIdOf = (baseId, value) => `${baseId}-content-${value}`;

/** Tab set root. Compose as `Tabs > TabList > Tab…` plus one `TabPanel` per tab. */
export function Tabs({ value, onChange, children, className }) {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ baseId, value, onChange }}>
      <div dir="ltr" data-orientation="horizontal" className={cn('flex flex-col gap-4', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/**
 * Tab strip. `label` names the tab set for assistive tech. Focus moves with
 * ArrowRight/ArrowLeft (wrapping) and Home/End, and each newly focused tab is
 * activated, matching Radix's default automatic activation.
 */
export function TabList({ children, label = 'Thẻ nội dung', className }) {
  const { baseId, value, onChange } = useTabsContext('TabList');

  const onKeyDown = (event) => {
    const { key } = event;
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return;
    const tabs = Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
    if (tabs.length === 0) return;
    const current = tabs.indexOf(document.activeElement);
    let next;
    if (key === 'Home') next = 0;
    else if (key === 'End') next = tabs.length - 1;
    else if (key === 'ArrowRight') next = current < 0 ? 0 : (current + 1) % tabs.length;
    else next = current <= 0 ? tabs.length - 1 : current - 1;

    event.preventDefault();
    const nextTab = tabs[next];
    const wasFocused = document.activeElement === nextTab;
    nextTab.focus();
    // A focus change activates the tab through `Tab`'s onFocus; re-activating
    // here only covers the already-focused case, which fires no focus event.
    if (!wasFocused) return;
    const id = nextTab.getAttribute('id') || '';
    const prefix = `${baseId}-trigger-`;
    if (id.startsWith(prefix) && id.slice(prefix.length) !== value) onChange(id.slice(prefix.length));
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      dir="ltr"
      data-orientation="horizontal"
      tabIndex={0}
      style={{ outline: 'none' }}
      onKeyDown={onKeyDown}
      className={cn('flex flex-nowrap gap-1 overflow-x-auto', className)}
    >
      {children}
    </div>
  );
}

export function Tab({ value, label, className }) {
  const { baseId, value: selectedValue, onChange } = useTabsContext('Tab');
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      role="tab"
      id={triggerIdOf(baseId, value)}
      aria-selected={isSelected}
      aria-controls={contentIdOf(baseId, value)}
      data-state={isSelected ? 'active' : 'inactive'}
      tabIndex={isSelected ? 0 : -1}
      onMouseDown={(event) => {
        if (event.button === 0 && event.ctrlKey === false) onChange(value);
        else event.preventDefault();
      }}
      onFocus={() => {
        if (!isSelected) onChange(value);
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === ' ' || event.key === 'Enter') onChange(value);
      }}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 pb-2.5 pt-1 text-sm font-medium text-brand-secondary transition-colors hover:text-brand-text data-[state=active]:border-brand-primary data-[state=active]:text-brand-primary',
        className
      )}
    >
      {label}
    </button>
  );
}

/**
 * Panel for one `value`. Only the selected panel is mounted (its children stay
 * unmounted otherwise), which is what Radix's `Tabs.Content` does without
 * `forceMount`.
 */
export function TabPanel({ value, children, className }) {
  const { baseId, value: selectedValue } = useTabsContext('TabPanel');
  if (selectedValue !== value) return null;

  return (
    <div
      role="tabpanel"
      id={contentIdOf(baseId, value)}
      aria-labelledby={triggerIdOf(baseId, value)}
      data-state="active"
      data-orientation="horizontal"
      dir="ltr"
      tabIndex={0}
      className={cn('focus-visible:outline-none', className)}
    >
      {children}
    </div>
  );
}
