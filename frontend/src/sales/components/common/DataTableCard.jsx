import React from 'react';
import { Card } from '../ui/Card.jsx';
import { Table, proportional, pixel } from '../ui/Table.jsx';
import { Pagination } from '../ui/Pagination.jsx';
import { AsyncPanel } from './AsyncPanel.jsx';

/**
 * Card-framed data table: toolbar slot, overflow-safe table body, and server
 * pagination. Owns its loading / error / empty states so a failing list never
 * blanks the rest of the page.
 *
 * Props (PH1 `DataTableCardProps`): label, data, columns, idKey, toolbar,
 * toolbarEnd, isLoading, error, errorCode, onRetry, loadingMessage, emptyTitle,
 * emptyDescription, emptyAction, pagination, density, hasHover, rowIndexStart,
 * rowCount. `idKey` is a key of the row or a `(item) => id` function, and
 * `pagination` is `{ page, totalPages, totalItems, pageSize?, onChange }`.
 *
 * The shorter names `title`, `filters`, `actions`, `loading` and `emptyMessage`
 * resolve to `label`, `toolbar`, `toolbarEnd`, `isLoading` and `emptyTitle` —
 * the same additive aliases the ui/Table and ui/Pagination ports accept.
 */
export function DataTableCard({
  label,
  title,
  data,
  columns,
  idKey,
  toolbar,
  filters,
  toolbarEnd,
  actions,
  isLoading,
  loading,
  error,
  errorCode,
  onRetry,
  loadingMessage,
  emptyTitle,
  emptyMessage,
  emptyDescription = 'Hiện tại chưa có bản ghi nào để hiển thị.',
  emptyAction,
  pagination,
  density = 'balanced',
  hasHover = true,
  rowIndexStart,
  rowCount,
}) {
  const regionLabel = label ?? title;
  const headerStart = toolbar ?? filters;
  const headerEnd = toolbarEnd ?? actions;
  const isLoadingNow = isLoading ?? loading ?? false;
  const emptyTitleNow = emptyTitle ?? emptyMessage ?? 'Không có dữ liệu';

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col">
          {headerStart || headerEnd ? (
            <div
              role="group"
              aria-label={regionLabel}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border p-4"
            >
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{headerStart}</div>
              <div className="flex flex-wrap items-center gap-2">{headerEnd}</div>
            </div>
          ) : null}
          <AsyncPanel
            isLoading={isLoadingNow}
            error={error}
            errorCode={errorCode}
            onRetry={onRetry}
            loadingMessage={loadingMessage}
            isEmpty={data.length === 0}
            emptyTitle={emptyTitleNow}
            emptyDescription={emptyDescription}
            emptyAction={emptyAction}
          >
            <Table
              data={data}
              columns={columns}
              idKey={idKey}
              label={regionLabel}
              density={density}
              hasHover={hasHover}
              rowIndexStart={rowIndexStart}
              rowCount={rowCount}
            />
          </AsyncPanel>
        </div>
      </Card>

      {pagination && !isLoadingNow && !error && data.length > 0 ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onChange={pagination.onChange}
        />
      ) : null}
    </div>
  );
}
