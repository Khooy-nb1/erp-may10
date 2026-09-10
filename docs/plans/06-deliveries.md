# P6 — Delivery Management

## Objective

Track delivery headers and their state workflow without mutating order-line quantities, deriving order completion, or silently deducting inventory while Q11 remains unresolved.

## Schema blocker to resolve in P0

The schema has giao_hang but no chi_tiet_giao_hang. Therefore, it cannot persist the exact product/quantity content of each delivery.

Before implementing partial delivery, choose one option:

1. MVP whole-order delivery: complete the entire order in one operation.
2. Accept deliveredLines in the request and update cumulative quantities in chi_tiet_don_ban_hang without persistent detail history.
3. Add chi_tiet_giao_hang through an approved migration.

Do not choose option 2 or 3 silently. If undecided, build only list/detail/header workflow and keep quantity updates closed.

## P6.1 — Endpoints

- GET /api/v1/deliveries
- POST /api/v1/deliveries
- GET /api/v1/deliveries/:id
- POST /api/v1/deliveries/:id/start
- POST /api/v1/deliveries/:id/complete
- POST /api/v1/deliveries/:id/fail

## P6.2 — Create delivery

Input:

- orderId;
- warehouseId;
- deliveryDate;
- receiver;
- deliveryAddress;
- transport;
- deliveryPerson;
- note;
- deliveredLines if partial delivery is approved.

Backend-generated:

- ma_giao_hang;
- trang_thai = cho_giao;
- ngay_tao;
- nguoi_tao.

Validate order, warehouse, date, receiver, address, and order state. Do not create a delivery for huy orders or other disallowed states.

## P6.3 — State workflow

- cho_giao → dang_giao through start;
- dang_giao → da_giao through complete;
- dang_giao → that_bai through fail;
- da_giao cannot be completed again;
- that_bai is read-only or creates a new delivery according to policy.

Transitions run in a transaction and lock the delivery row when required.

## P6.4 — Progress strategy (blocked by Q11)

Interim MVP behavior is header-only: do not accept `deliveredLines`, mutate `so_luong_giao`, recalculate line statuses, or transition the order to `da_giao` when a delivery header completes until Q11 approves whole-order versus cumulative line quantities.

If Q11 later approves cumulative progress, then implement and test:

- reject negative delivered quantity;
- reject quantity above the remaining quantity;
- update `so_luong_giao` transactionally;
- derive `chua_giao`, `giao_mot_phan`, and `da_giao_du`;
- set order `da_giao` and `ngay_giao_thuc_te` only when every line is complete.

MVP delivery completion must not deduct inventory.

## P6.5 — Frontend

- DeliveryListPage: code, order, customer, warehouse, date, receiver, and status.
- Create flow from order detail and delivery list.
- Detail shows header and state-based actions.
- Without a delivery detail table, do not create fake line-history UI.
- Show business errors clearly, especially quantity overflow.

## P6.6 — Tests

- valid/invalid order and warehouse;
- start/complete/fail transitions;
- completing twice;
- kho, ban_hang, and admin permissions;
- transaction rollback;
- quantity boundaries and cumulative progress if enabled;
- verify no inventory side effect.

## P6 exit criteria

- Valid delivery header workflow works end to end.
- Illegal header transitions are rejected.
- No inventory change occurs outside scope.
- The schema limitation and Q11 blocker are documented and visible.
- Order completion and line-quantity mutation remain disabled until Q11 is approved; if Q11 is approved, the corresponding cumulative-progress tests and completion rule must pass.

## Suggested commit slices

- feat: add delivery list and header create
- feat: add delivery state transitions
- feat: add delivery screens
- test: cover delivery header workflow and schema limitation
- conditional follow-up after Q11: add cumulative delivery progress and tests

