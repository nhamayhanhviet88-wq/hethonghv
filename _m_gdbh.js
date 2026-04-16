const db = require('./db/pool');
(async () => {
    const btns = [
        ['cap_cuu_sep','C\u1ea5p C\u1ee9u S\u1ebfp','\ud83d\udea8','#ef4444','white',900,0],
        ['hoan_thanh_cap_cuu','Ho\u00e0n Th\u00e0nh C\u1ea5p C\u1ee9u','\ud83c\udfe5','#122546','#fad24c',901,16],
        ['huy','H\u1ee7y Kh\u00e1ch','\u274c','#dc2626','white',902,0],
        ['tu_van_lai','T\u01b0 V\u1ea5n L\u1ea1i','\ud83d\udd04','#0891b2','white',903,19],
        ['cho_duyet_huy','Ch\u1edd Duy\u1ec7t H\u1ee7y','\u23f3','#6b7280','white',904,17],
        ['duyet_huy','H\u1ee7y Kh\u00e1ch (\u0110\u00e3 Duy\u1ec7t)','\ud83d\udeab','#dc2626','white',905,18],
        ['pending_emergency','\u0110ang c\u00f3 C\u1ea5p C\u1ee9u S\u1ebfp','\ud83d\udd12','#991b1b','#fecaca',906,15],
    ];
    for (const [k,l,i,co,tc,so,seo] of btns) {
        await db.run("INSERT INTO consult_type_configs (key,label,icon,color,text_color,is_active,sort_order,section_order,crm_menu,rule_phase) VALUES ('"+k+"','"+l+"','"+i+"','"+co+"','"+tc+"',true,"+so+","+seo+",'goi_ban_hang','huy_capuu') ON CONFLICT (key,crm_menu) DO NOTHING");
    }
    const rules = [['hoan_thanh_cap_cuu','cap_cuu_sep',false,0,1],['pending_emergency','cap_cuu_sep',true,0,1],['duyet_huy','tu_van_lai',true,0,1],['duyet_huy','huy',false,0,2],['tu_van_lai','cap_cuu_sep',false,0,2]];
    for (const [f,t,d,dl,s] of rules) {
        await db.run("INSERT INTO consult_flow_rules (from_status,to_type_key,is_default,delay_days,sort_order,crm_menu) VALUES ('"+f+"','"+t+"',"+d+","+dl+","+s+",'goi_ban_hang') ON CONFLICT DO NOTHING");
    }
    const c = await db.get("SELECT COUNT(*) as c FROM consult_type_configs WHERE crm_menu='goi_ban_hang'");
    const r = await db.get("SELECT COUNT(*) as c FROM consult_flow_rules WHERE crm_menu='goi_ban_hang'");
    console.log('Done: '+c.c+' buttons, '+r.c+' rules');
    process.exit(0);
})();
