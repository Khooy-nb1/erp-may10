'use strict';

/**
 * Sales -> Finance (PH5) integration service: invoice receivables.
 *
 * This is the **only** place in the Sales module that writes the `cong_no`
 * table. It runs on the caller's transaction client, so the receivable is
 * created (or refreshed) in the very transaction that inserts the invoice -
 * either both land or neither does.
 *
 * One invoice owns exactly one `phai_thu` row: the lookup happens under
 * `FOR UPDATE`, and the partial unique index
 * `uq_cong_no_phai_thu_theo_hoa_don` is the hard backstop if two requests race.
 */

/** `cong_no.bang_hoa_don` discriminator for sales invoices (polymorphic link). */
const BANG_HOA_DON = 'hoa_don_ban_hang';

/** `cong_no.loai_cong_no` for money the customer owes the company. */
const PHAI_THU = 'phai_thu';

/**
 * Derives the receivable status from what was invoiced and what was collected.
 *
 * @param {number} amount
 * @param {number} paid
 * @returns {'da_thanh_toan'|'mot_phan'|'chua_thanh_toan'}
 */
function deriveReceivableStatus(amount, paid) {
  if (paid >= amount) return 'da_thanh_toan';
  return paid > 0 ? 'mot_phan' : 'chua_thanh_toan';
}

/**
 * Creates the receivable for an invoice, or refreshes it when one already
 * exists (the caller may re-run after a retry).
 *
 * @param {import('pg').PoolClient} client
 * @param {object} params
 * @param {object} params.invoice Inserted `hoa_don_ban_hang` row.
 * @param {number|null} params.actorId
 * @returns {Promise<{action: 'created'|'updated', receivable: object}>}
 */
async function syncInvoiceReceivable(client, { invoice, actorId }) {
  const amount = Number(invoice.tong_tien_sau_thue) || 0;
  const paid = Number(invoice.so_tien_da_thu) || 0;
  const outstanding = Math.max(0, amount - paid);
  const status = deriveReceivableStatus(amount, paid);

  const existingResult = await client.query(
    `SELECT id
     FROM cong_no
     WHERE loai_cong_no = $1 AND bang_hoa_don = $2 AND ma_hoa_don = $3
     LIMIT 1
     FOR UPDATE`,
    [PHAI_THU, BANG_HOA_DON, invoice.id]
  );
  const existing = existingResult.rows[0] || null;

  if (existing) {
    const updated = await client.query(
      `UPDATE cong_no
       SET ma_khach_hang = $2,
           so_tien_phat_sinh = $3,
           so_tien_da_thanh_toan = $4,
           so_tien_con_lai = $5,
           ngay_dao_han = $6,
           trang_thai = $7,
           nguoi_cap_nhat = $8,
           ngay_cap_nhat = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        existing.id,
        invoice.ma_khach_hang,
        amount,
        paid,
        outstanding,
        invoice.ngay_dao_han,
        status,
        actorId,
      ]
    );
    return { action: 'updated', receivable: updated.rows[0] };
  }

  const inserted = await client.query(
    `INSERT INTO cong_no (
       loai_cong_no, ma_khach_hang, ma_nha_cung_cap, ma_hoa_don, bang_hoa_don,
       so_tien_phat_sinh, so_tien_da_thanh_toan, so_tien_con_lai,
       ngay_dao_han, trang_thai, nguoi_tao, nguoi_cap_nhat
     ) VALUES (
       $1, $2, NULL, $3, $4,
       $5, $6, $7,
       $8, $9, $10, $10
     )
     RETURNING *`,
    [
      PHAI_THU,
      invoice.ma_khach_hang,
      invoice.id,
      BANG_HOA_DON,
      amount,
      paid,
      outstanding,
      invoice.ngay_dao_han,
      status,
      actorId,
    ]
  );

  return { action: 'created', receivable: inserted.rows[0] };
}

/**
 * Reads the receivable an invoice owns (null when the invoice has none).
 *
 * @param {import('pg').Pool|import('pg').PoolClient} client
 * @param {number} invoiceId
 * @returns {Promise<object|null>}
 */
async function findInvoiceReceivable(client, invoiceId) {
  const result = await client.query(
    `SELECT *
     FROM cong_no
     WHERE loai_cong_no = $1 AND bang_hoa_don = $2 AND ma_hoa_don = $3
     LIMIT 1`,
    [PHAI_THU, BANG_HOA_DON, invoiceId]
  );
  return result.rows[0] || null;
}

module.exports = {
  BANG_HOA_DON,
  PHAI_THU,
  deriveReceivableStatus,
  syncInvoiceReceivable,
  findInvoiceReceivable,
};
