const { Pool } = require('pg');

const uri = 'postgresql://adminhv:hvadmin2026@192.168.0.201:5555/dongphuchv';
const pool = new Pool({ connectionString: uri });

async function checkOrder() {
    try {
        const orderRes = await pool.query("SELECT * FROM don_gui_ao_mau WHERE sample_order_code = 'VTTI-GUIMAU0002'");
        if (orderRes.rows.length === 0) {
            console.log('Order not found in don_gui_ao_mau');
            return;
        }
        const o = orderRes.rows[0];
        console.log('ORDER:', {
            id: o.id,
            sample_order_code: o.sample_order_code,
            total_amount: o.total_amount,
            deposit_amount: o.deposit_amount,
            remaining_amount: o.remaining_amount,
            shipping_fee: o.shipping_fee,
            shipping_fee_payer: o.shipping_fee_payer,
            shipping_fee_method: o.shipping_fee_method,
            shipping_payment_id: o.shipping_payment_id
        });

        const payRes = await pool.query("SELECT * FROM payment_records WHERE total_order_codes LIKE '%VTTI-GUIMAU0002%' OR order_tt_coc = $1 OR order_ao_mau = $1", [o.sample_order_code]);
        console.log('PAYMENTS:', payRes.rows.map(p => ({
            id: p.id,
            payment_code: p.payment_code,
            amount: p.amount,
            payment_type: p.payment_type,
            money_source: p.money_source,
            transfer_note: p.transfer_note
        })));
        
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

checkOrder();
