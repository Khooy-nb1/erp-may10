import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { controlBorderClass, controlClass, statusTextClass, type FieldStatus } from './Input.js';

export interface ComboboxItem {
  id: string;
  label: string;
  description?: string;
}

export interface ComboboxProps {
  label: string;
  placeholder?: string;
  items: ComboboxItem[];
  isLoading?: boolean;
  /** Async search hook; the caller owns debouncing and cancellation. */
  onSearch: (query: string) => void;
  onSelect: (item: ComboboxItem) => void;
  status?: FieldStatus;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}

/**
 * Async single-select built on the WAI-ARIA combobox pattern: one text input
 * owns focus, the popup is a listbox, and the active option is tracked with
 * aria-activedescendant.
 */
export const Combobox: React.FC<ComboboxProps> = ({
  label,
  placeholder,
  items,
  isLoading = false,
  onSearch,
  onSelect,
  status,
  disabled = false,
  emptyMessage = 'Không tìm thấy kết quả',
  className,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeOptionRef = useRef<HTMLLIElement | null>(null);
  const id = React.useId();
  const listboxId = `${id}-listbox`;

  useEffect(() => {
    activeOptionRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const optionId = (index: number) => `${id}-option-${index}`;

  const select = (item: ComboboxItem) => {
    setQuery(item.label);
    setIsOpen(false);
    onSelect(item);
  };

  const isDismissed = () => {
    const active = document.activeElement;
    return active !== null && containerRef.current !== null && !containerRef.current.contains(active);
  };

  return (
    <div ref={containerRef} className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-invalid={status?.type === 'error' || undefined}
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
            onSearch(event.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            if (isDismissed()) setIsOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex((index) => Math.min(index + 1, items.length - 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === 'Enter') {
              if (isOpen && activeIndex >= 0 && items[activeIndex]) {
                event.preventDefault();
                select(items[activeIndex]);
              }
            } else if (event.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          className={cn(controlClass, 'h-10 pr-9', controlBorderClass(status))}
        />
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 my-auto text-subtle-foreground"
        />
        {isOpen ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-control border border-border bg-surface py-1 shadow-raised"
          >
            {isLoading ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">Đang tải</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">{emptyMessage}</li>
            ) : (
              items.map((item, index) => (
                <li
                  key={item.id}
                  id={optionId(index)}
                  ref={index === activeIndex ? activeOptionRef : undefined}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(item)}
                  className={cn(
                    'cursor-pointer px-3 py-2',
                    index === activeIndex ? 'bg-primary-soft' : 'hover:bg-surface-muted'
                  )}
                >
                  <span className="block text-sm font-medium text-foreground">{item.label}</span>
                  {item.description ? (
                    <span className="block text-xs text-muted-foreground">{item.description}</span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
      {status?.message ? (
        <p className={cn('text-sm', statusTextClass(status))}>{status.message}</p>
      ) : null}
    </div>
  );
};
