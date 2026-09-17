import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Combobox } from '../ui/Combobox.jsx';
import { getProducts } from '../../services/productService.js';

/** Display label: mã + tên, with size/colour when the product carries them. */
function describeProduct(product) {
  const variant = product.size ? ' (' + product.size + (product.mau_sac ? ' / ' + product.mau_sac : '') + ')' : '';
  return product.ma_san_pham + ' — ' + product.ten_san_pham + variant;
}

/**
 * Order-entry product lookup. Searches the sellable catalogue server-side
 * (\`trang_thai: 'dang_ban'\`), debounced, and hands the full Product back to the
 * caller so pricing and unit data stay authoritative on the server.
 * (Ported 1:1 from PH1 \`components/products/ProductSelector.tsx\`.)
 */
export function ProductSelector({ onSelect, disabled = false }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const productsById = useRef(new Map());

  const runSearch = useCallback(async (query) => {
    if (abortRef.current) abortRef.current.abort();
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
          description: describeProduct(product).replace(product.ma_san_pham + ' — ', ''),
        }))
      );
    } catch {
      if (!controller.signal.aborted) setItems([]);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(
    (query) => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      if (query.trim() === '') {
        if (abortRef.current) abortRef.current.abort();
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
      if (abortRef.current) abortRef.current.abort();
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
}
