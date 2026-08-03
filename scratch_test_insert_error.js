require('dotenv').config();
const Fastify = require('fastify');
const db = require('./db/pool');

async function testPostCategoryError() {
    try {
        const group_type = 'online';
        const name = 'Đồng Phục HV - Đồng Phục Công Ty, Nhà Hàng';
        const parent_id = '1';
        const parentIdNum = Number(parent_id);
        const icon = '🌐';
        const nextOrder = 10;
        const finalLinkedType = 'facebook';
        const finalLinkedName = null;
        const pancake_page_id = null;
        const pancake_page_name = 'Page Công Ty 2';
        const ads_handler_name = 'Giám Đốc';
        const reportersVal = null;
        const cleanAdAccId = null;
        const fb_access_token = null;
        const fb_ad_account_name = null;
        const fb_ad_account_link = null;

        console.time("INSERT");
        const res = await db.get(`
            INSERT INTO mkt_categories (parent_id, group_type, name, icon, sort_order, linked_source_type, linked_source_name, pancake_page_id, pancake_page_name, ads_handler_name, allowed_reporter_names, fb_ad_account_id, fb_access_token, fb_ad_account_name, fb_ad_account_link)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
        `, [
            parentIdNum,
            group_type,
            name.trim(),
            icon || (group_type === 'online' ? '🌐' : '🏢'),
            nextOrder,
            finalLinkedType,
            finalLinkedName,
            pancake_page_id || null,
            pancake_page_name || null,
            ads_handler_name || null,
            reportersVal,
            cleanAdAccId,
            fb_access_token || null,
            fb_ad_account_name || null,
            fb_ad_account_link || null
        ]);
        console.timeEnd("INSERT");
        console.log("INSERT RESULT:", res);
    } catch(e) {
        console.timeEnd("INSERT");
        console.error("INSERT ERROR:", e);
    }
}

testPostCategoryError();
