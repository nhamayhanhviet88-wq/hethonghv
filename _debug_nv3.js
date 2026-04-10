const db = require('./db/pool');
(async () => {
    const src = await db.all("SELECT id, name, icon, crm_type, is_active FROM telesale_sources WHERE crm_type = 'tu_tim_kiem' ORDER BY id");
    console.log('CRM Tự Tìm Kiếm sources:', JSON.stringify(src, null, 2));

    // Check the goidien tab CRM config
    const allCrm = await db.all("SELECT DISTINCT crm_type FROM telesale_sources ORDER BY crm_type");
    console.log('\nAll CRM types:', allCrm.map(x => x.crm_type));

    // Check existing task_point_reports table
    const rptCols = await db.all("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='task_point_reports' ORDER BY ordinal_position");
    console.log('\ntask_point_reports columns:');
    rptCols.forEach(c => console.log('  ' + c.column_name + ' (' + c.data_type + ')'));

    // check if self_search_locations already exists
    const tbl = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='self_search_locations'");
    console.log('\nself_search_locations exists?', !!tbl);

    process.exit(0);
})();
