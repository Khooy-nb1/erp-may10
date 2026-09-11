import React, { useCallback, useMemo, useRef } from 'react';
import { Typeahead } from '@astryxdesign/core/Typeahead';
import { TypeaheadItem } from '@astryxdesign/core/Typeahead';
import type { SearchableItem, SearchSource } from '@astryxdesign/core/Typeahead';
import { Product } from '../../types/product.js';
import { getProducts } from '../../services/productService.js';

interface ProductSelectorProps {
  onSelect: (product: Product) => void;
  disabled?: boolean;
}

interface ProductSearchItem extends SearchableItem {
  auxiliaryData: { product: Product };
}

/** Display label: mã + tên, with size/colour when the product carries them. */
function describeProduct(product: Product): string {
  const variant = product.size ? ` (${product.size}${product.mau_sac ? ` / ${product.mau_sac}` : ''})` : '';
  return `${product.ma_san_pham} — ${product.ten_san_pham}${variant}`;
}

/**
 * Order-entry product lookup. Searches the sellable catalogue server-side
 * (`trang_thai: 'dang_ban'`), debounced, and hands the full Product back to the
 * caller so pricing and unit data stay authoritative on the server.
 */
export const ProductSelector: React.FC<ProductSelectorProps> = ({ onSelect, disabled = false }) => {
  const abortRef = useRef<AbortController | null>(null);

  const searchSource = useMemo<SearchSource<ProductSearchItem>>(
    () => ({
      search: async (query: string) => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const res = await getProducts({
            search: query.trim(),
            trang_thai: 'dang_ban', // Strictly sellable only
            pageSize: 10,
          });
          if (controller.signal.aborted) return [];
          return res.products.map(toSearchItem);
        } catch {
          return [];
        }
      },
      bootstrap: () => [],
      cancel: () => abortRef.current?.abort(),
    }),
    []
  );

  const handleChange = useCallback(
    (item: ProductSearchItem | null) => {
      if (!item) return;
      onSelect(item.auxiliaryData.product);
    },
    [onSelect]
  );

  return (
    <Typeahead<ProductSearchItem>
      label="Tìm sản phẩm"
      placeholder="Gõ mã hoặc tên sản phẩm để tìm kiếm..."
      searchSource={searchSource}
      value={null}
      onChange={handleChange}
      hasClear={false}
      maxMenuItems={10}
      minQueryLength={1}
      debounceMs={300}
      isDisabled={disabled}
      emptySearchResultsText="Không tìm thấy sản phẩm phù hợp."
      width="100%"
      renderItem={(item) => {
        const product = item.auxiliaryData.product;
        return (
          <TypeaheadItem
            item={item}
            description={describeProduct(product).replace(`${product.ma_san_pham} — `, '')}
          />
        );
      }}
    />
  );
};

function toSearchItem(product: Product): ProductSearchItem {
  return {
    id: String(product.id),
    label: describeProduct(product),
    auxiliaryData: { product },
  };
}
