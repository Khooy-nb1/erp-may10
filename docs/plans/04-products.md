# P4 — Product Lookup

## Objective

Search and select products that are currently for sale during order creation. MVP does not build product master administration.

## P4.1 — Backend

### Endpoints

- GET /api/v1/products
- GET /api/v1/products/:id

### Filters

- search by ma_san_pham and ten_san_pham;
- size;
- mau_sac;
- trang_thai;
- page, pageSize, and whitelist-based sort.

### Rules

- The product selector defaults to trang_thai = dang_ban.
- The response includes code, name, size, color, gia_ban, unit, and status.
- The browser cannot edit gia_ban.
- Do not expose cost price to roles that are not allowed to see it.

## P4.2 — Frontend

- ProductListPage is read-only.
- ProductSelector uses debounced search and bounded results.
- Only sellable products can be selected.
- Display unit and price with shared formatters.
- Do not load the whole catalog when an order form opens.

## P4.3 — Tests

- search by code/name;
- filter by status/size/color;
- missing product;
- ngung_ban products are excluded from the default selector;
- read permissions;
- page-size cap and sort whitelist.

## P4 exit criteria

- The selector finds seed products within a reasonable request limit.
- Displayed price comes from the server.
- P5 can use the selector without N+1 queries.

## Suggested commit slices

- feat: add product lookup API
- feat: add product list and selector
- test: cover product lookup filters

