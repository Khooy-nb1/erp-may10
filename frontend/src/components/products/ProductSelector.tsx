import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Combobox, type ComboboxItem } from '../ui/Combobox.js';
import { Product } from '../../types/product.js';
import { getProducts } from '../../services/productService.js';

interface ProductSelectorProps {
  onSelect: (product: Product) => void;
  disabled?: boolean;
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
  const [items, setItems] = useState<ComboboxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const productsById = useRef(new Map<string, Product>());

  const runSearch = useCallback(async (query: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    try {
      const res = await getProducts({
        search: query.trim(),
        trang_thai: 'dang_ban', // Strictly sellable only
        pageSize: 10,
      });
      if (controller.signal.aborted) return;
      for (const product of res.products) productsById.current.set(String(product.id), product);
      setItems(
        res.products.map((product) => ({
          id: String(product.id),
          label: describeProduct(product),
          description: describeProduct(product).replace(`${product.ma_san_pham} — `, ''),
        }))
      );
    } catch {
      if (!controller.signal.aborted) setItems([]);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (query: string) => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      if (query.trim() === '') {
        abortRef.current?.abort();
        setItems([]);
        setIsLoading(false);
        return;
      }
      debounceRef.current = window.setTimeout(() => {
        void runSearch(query);
      }, 300);
    },
    [runSearch]
  );

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    },
    []
  );

  return (
    <Combobox
      label="Tìm sản phẩm"
      placeholder="Gõ mã hoặc tên sản phẩm để tìm kiếm..."
      items={items}
      isLoading={isLoading}
      onSearch={handleSearch}
      disabled={disabled}
      emptyMessage="Không tìm thấy sản phẩm phù hợp."
      onSelect={(item) => {
        const product = productsById.current.get(item.id);
        if (product) onSelect(product);
      }}
      className="w-full"
    />
  );
};
