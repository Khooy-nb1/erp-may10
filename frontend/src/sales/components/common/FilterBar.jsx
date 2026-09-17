import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';

/**
 * List-page toolbar: the search field and its submit button on the left, the
 * filter controls on the right, and a reset action that only appears while a
 * filter is applied. Presentation only — the page owns value and submit state.
 *
 * Props (PH1 `FilterBarProps`): label, search, onSubmit, filters, isFiltered,
 * onReset. `search` is `{ label, placeholder, value, onChange, widthClassName }`.
 */
export const FilterBar = ({ label, search, onSubmit, filters, isFiltered, onReset }) => {
  return (
    <form
      onSubmit={onSubmit}
      aria-label={label}
      className="flex w-full flex-wrap items-end justify-between gap-3"
    >
      {search ? (
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label={search.label}
            placeholder={search.placeholder}
            value={search.value}
            onChange={search.onChange}
            className={search.widthClassName ?? 'w-full sm:w-80'}
          />
          <Button type="submit" variant="secondary">
            Tìm kiếm
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        {filters}
        {isFiltered ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<RotateCcw size={14} aria-hidden />}
            onClick={onReset}
          >
            Xóa bộ lọc
          </Button>
        ) : null}
      </div>
    </form>
  );
};
