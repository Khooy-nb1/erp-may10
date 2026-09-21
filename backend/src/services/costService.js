const { pool } = require('../config/database');

async function read(work) {
  const client = await pool.connect();
  try { await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); const result = await work(client); await client.query('ROLLBACK'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

const joins = `FROM public.chi_tiet_phieu_xuat ct
  JOIN public.phieu_xuat_kho px ON px.id=ct.ma_phieu_xuat_kho
  JOIN public.vat_tu vt ON vt.id=ct.ma_vat_tu
  JOIN public.lenh_san_xuat lsx ON lsx.id=px.ma_lenh_san_xuat
  JOIN public.san_pham sp ON sp.id=lsx.ma_san_pham
  LEFT JOIN public.nguoi_dung u ON u.id=ct.nguoi_tao`;
const productionOnly = `px.loai_xuat='xuat_san_xuat' AND px.trang_thai='da_xuat'`;
const columns = `ct.id, px.id AS phieu_xuat_id, px.ma_phieu_xuat, px.ngay_xuat, px.loai_xuat,
  px.trang_thai, lsx.id AS lenh_san_xuat_id, lsx.ma_lenh_san_xuat,
  sp.id AS san_pham_id, sp.ma_san_pham, sp.ten_san_pham,
  vt.id AS vat_tu_id, vt.ma_vat_tu, vt.ten_vat_tu,
  ct.so_luong_xuat, ct.don_gia_xuat, ct.thanh_tien, ct.ghi_chu,
  u.ho_ten AS nguoi_thuc_hien, 'nguyen_vat_lieu'::text AS nhom_chi_phi`;

function queryParts(params) {
  const values=[]; const conditions=[productionOnly];
  const bind=(value)=>{ values.push(value); return `$${values.length}`; };
  if(params.q){const p=bind(`%${params.q.replace(/[\\%_]/g,'\\$&')}%`);conditions.push(`(px.ma_phieu_xuat ILIKE ${p} OR lsx.ma_lenh_san_xuat ILIKE ${p} OR sp.ma_san_pham ILIKE ${p} OR sp.ten_san_pham ILIKE ${p} OR vt.ma_vat_tu ILIKE ${p} OR vt.ten_vat_tu ILIKE ${p} OR COALESCE(ct.ghi_chu,'') ILIKE ${p})`);}
  if(params.group && params.group!=='nguyen_vat_lieu') conditions.push('FALSE');
  if(params.objectId) conditions.push(`lsx.id=${bind(params.objectId)}`);
  if(params.from) conditions.push(`px.ngay_xuat >= (${bind(params.from)}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
  if(params.to) conditions.push(`px.ngay_xuat < ((${bind(params.to)}::date + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`);
  return { values, where:`WHERE ${conditions.join(' AND ')}`, bind };
}

function listCosts(params) {
  return read(async(client)=>{
    const {values,where,bind}=queryParts(params);
    const summary=(await client.query(`SELECT count(*)::int AS total,coalesce(sum(ct.thanh_tien),0)::text AS total_cost,coalesce(sum(ct.thanh_tien),0)::text AS material_cost ${joins} ${where}`,values)).rows[0];
    const byObject=(await client.query(`SELECT lsx.id,lsx.ma_lenh_san_xuat,sp.ma_san_pham,sp.ten_san_pham,count(*)::int AS count,sum(ct.thanh_tien)::text AS total ${joins} ${where} GROUP BY lsx.id,lsx.ma_lenh_san_xuat,sp.ma_san_pham,sp.ten_san_pham ORDER BY sum(ct.thanh_tien) DESC`,values)).rows;
    const totalPages=Math.max(1,Math.ceil(summary.total/params.pageSize)); const page=Math.min(params.page,totalPages);
    const limit=bind(params.pageSize),offset=bind((page-1)*params.pageSize);
    const data=(await client.query(`SELECT ${columns} ${joins} ${where} ORDER BY px.ngay_xuat DESC,ct.id DESC LIMIT ${limit} OFFSET ${offset}`,values)).rows;
    const hasData=summary.total>0;
    return {data,summary:{...summary,total_cost:hasData?summary.total_cost:null,material_cost:hasData?summary.material_cost:null,
      known_cost_total:hasData?summary.total_cost:null,labor_cost:null,overhead_cost:null,other_cost:null,
      has_data:hasData,data_status:hasData?'partial':'no_data',missing_sources:['nhan_cong_truc_tiep','san_xuat_chung'],
      groups:hasData?[{group:'nguyen_vat_lieu',amount:summary.material_cost,count:summary.total}]:[],by_object:byObject},pagination:{page,pageSize:params.pageSize,total:summary.total,totalPages}};
  });
}

function costFilters(){return read(async(client)=>({groups:['nguyen_vat_lieu'],objects:(await client.query(`SELECT lsx.id,lsx.ma_lenh_san_xuat,sp.ma_san_pham,sp.ten_san_pham
  FROM public.lenh_san_xuat lsx JOIN public.san_pham sp ON sp.id=lsx.ma_san_pham ORDER BY lsx.ma_lenh_san_xuat`)).rows,
  capabilities:{materialSource:true,laborSource:false,overheadSource:false}}));}
function costDetail(id){return read(async(client)=>(await client.query(`SELECT ${columns} ${joins} WHERE ${productionOnly} AND ct.id=$1`,[id])).rows[0]||null);}

module.exports = { listCosts, costFilters, costDetail };
