import React from 'react';
import { Card } from '@astryxdesign/core/Card';
import { VStack } from '@astryxdesign/core/Stack';
import { Toolbar } from '@astryxdesign/core/Toolbar';
import { Table, type TableColumn } from '@astryxdesign/core/Table';
import { Pagination } from '@astryxdesign/core/Pagination';
import { AsyncPanel } from './AsyncPanel.js';

export interface DataTableCardProps<T extends Record<string, unknown>> {
  /** Accessible name for the toolbar region and the table. */
  label: string;
  data: T[];
  columns: TableColumn<T>[];
  idKey: (keyof T & string) | ((item: T) => string | number);
  /** Search / filter controls rendered in the card header toolbar. */
  toolbar?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  errorCode?: string;
  onRetry?: () => void;
  /** Live-region caption shown while the table loads. */
  loadingMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  /** Server pagination. Omit to render an unpaginated table. */
  pagination?: {
    page: number;
    totalPages: number;
    totalItems: number;
    pageSize?: number;
    onChange: (page: number) => void;
  };
  density?: 'compact' | 'balanced' | 'spacious';
  hasHover?: boolean;
  /** Row offset for aria-rowindex so assistive tech reads position in the full dataset. */
  rowIndexStart?: number;
  rowCount?: number;
}

/**
 * Card-framed data table: toolbar slot, overflow-safe table body, and server
 * pagination. Owns its loading / error / empty states so a failing list never
 * blanks the rest of the page.
 */
export function DataTableCard<T extends Record<string, unknown>>({
  label,
  data,
  columns,
  idKey,
  toolbar,
  toolbarEnd,
  isLoading = false,
  error,
  errorCode,
  onRetry,
  loadingMessage,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Hiện tại chưa có bản ghi nào để hiển thị.',
  emptyAction,
  pagination,
  density = 'balanced',
  hasHover = true,
  rowIndexStart,
  rowCount,
}: DataTableCardProps<T>) {
  return (
    <VStack gap={4} width="100%">
      <Card padding={0}>
        <VStack gap={0}>
          {toolbar || toolbarEnd ? (
            <Toolbar label={label} startContent={toolbar} endContent={toolbarEnd} dividers={['bottom']} gap={2} />
          ) : null}
          <AsyncPanel
            isLoading={isLoading}
            error={error}
            errorCode={errorCode}
            onRetry={onRetry}
            loadingMessage={loadingMessage}
            isEmpty={data.length === 0}
            emptyTitle={emptyTitle}
            emptyDescription={emptyDescription}
            emptyAction={emptyAction}
          >
            <Table
              data={data}
              columns={columns}
              idKey={idKey}
              density={density}
              hasHover={hasHover}
              isStriped
              rowIndexStart={rowIndexStart}
              rowCount={rowCount}
            />
          </AsyncPanel>
        </VStack>
      </Card>

      {pagination && !isLoading && !error && data.length > 0 ? (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onChange={pagination.onChange}
          variant="pages"
        />
      ) : null}
    </VStack>
  );
}
