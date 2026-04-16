const db = require('./db/pool');
(async () => {
    const btns = [
        ['cap_cuu_sep','Cấp Cứu Sếp','🚨','#ef4444','white',900,0],
        ['hoan_thanh_cap_cuu','Hoàn Thành Cấp Cứu','🏥','#122546','#fad24c',901,16],
        ['huy','Hủy Khách','❌','#dc2626','white',902,0],
        ['tu_van_lai','Tư Vấn Lại','🔄','#0891b2','white',903,19],
        ['cho_duyet_huy','Chờ Duyệt Hủy','⏳','#6b7280','white',904,17],
        ['duyet_huy','Hủy Khách (Đã Duyệt)','🚫','#dc2626','white',905,18],
        ['pending_emergency','Đang có Cấp Cứu Sếp','🔒','#991b1b','#fecaca',906,15],
    ];
    for (const [k,l,i,co,tc,so,seo] of btns) {
        await db.run(`INSERT INTO consult_type_configs (key,label,icon,color,text_color,is_active,sort_order,section_order,crm_menu,rule_phase)
            VALUES ('${k}','${l}','${i}','${co}','${tc}',true,${so},${seo},'koc_tiktok','huy_capuu')
            ON CONFLICT (key,crm_menu) DO NOTHING`);
    }
    const rules = [
        ['hoan_thanh_cap_cuu','cap_cuu_sep',false,0,1],
        ['pending_emergency','cap_cuu_sep',true,0,1],
        ['duyet_huy','tu_van_lai',true,0,1],
        ['duyet_huy','huy',false,0,2],
        ['tu_van_lai','cap_cuu_sep',false,0,2],
    ];
    for (const [f,t,d,dl,s] of rules) {
        await db.run(`INSERT INTO consult_flow_rules (from_status,to_type_key,is_default,delay_days,sort_order,crm_menu)
            VALUES ('${f}','${t}',${d},${dl},${s},'koc_tiktok')
            ON CONFLICT DO NOTHING`);
    }
    const c = await db.get(`SELECT COUNT(*) as c FROM consult_type_configs WHERE crm_menu='koc_tiktok'`);
    const r = await db.get(`SELECT COUNT(*) as c FROM consult_flow_rules WHERE crm_menu='koc_tiktok'`);
    console.log(`Done: ${c.c} buttons, ${r.c} rules for koc_tiktok`);
    process.exit(0);
})();
