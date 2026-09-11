import React, { useState, useEffect } from 'react';
import { Product } from '../../types/product.js';
import { getProducts } from '../../services/productService.js';

interface ProductSelectorProps {
  onSelect: (product: Product) => void;
  disabled?: boolean;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({ onSelect, disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getProducts({
          search: searchTerm.trim(),
          trang_thai: 'dang_ban', // Strictly sellable only
          pageSize: 10,
        });
        setResults(res.products);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectProduct = (product: Product) => {
    onSelect(product);
    setSearchTerm('');
    setResults([]);
    setIsOpen(false);
  };

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        placeholder="Gõ mã hoặc tên sản phẩm để tìm kiếm..."
        value={searchTerm}
        disabled={disabled}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        style={{
          width: '100%',
          padding: '0.6rem 0.75rem',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          fontSize: '0.875rem',
          boxSizing: 'border-box',
          outline: 'none',
        }}
      />

      {loading && (
        <span
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '0.75rem',
            color: '#64748b',
          }}
        >
          Đang tìm...
        </span>
      )}

      {isOpen && results.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            maxHeight: '240px',
            overflowY: 'auto',
            margin: '0.25rem 0 0 0',
            padding: 0,
            listStyle: 'none',
          }}
        >
          {results.map((product) => (
            <li
              key={product.id}
              onClick={() => handleSelectProduct(product)}
              style={{
                padding: '0.65rem 0.85rem',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.875rem',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              <div>
                <span style={{ fontWeight: 600, color: '#0f172a', marginRight: '0.5rem' }}>
                  {product.ma_san_pham}
                </span>
                <span style={{ color: '#334155' }}>{product.ten_san_pham}</span>
                {product.size && (
                  <span style={{ marginLeft: '0.5rem', color: '#64748b', fontSize: '0.75rem' }}>
                    ({product.size} {product.mau_sac ? `/ ${product.mau_sac}` : ''})
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: '#2563eb' }}>{formatCurrency(product.gia_ban)}</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.25rem' }}>
                  / {product.ten_don_vi || 'Cái'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
