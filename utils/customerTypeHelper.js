/**
 * Helper to build 100% unified & optimized SQL CASE statement for customer_type calculation
 * Ensures DRY principle across kpiKdoanh.js, kpiSale.js, totalSales.js, etc.
 *
 * @param {string} orderAlias - Alias for main dht_orders table (default: 'd')
 * @param {string} customerAlias - Alias for customers table (default: 'c')
 */
function getCustomerTypeSql(orderAlias = 'd', customerAlias = 'c') {
    return `CASE
        WHEN EXISTS (
            SELECT 1 FROM dht_orders d3
            LEFT JOIN order_codes oc3 ON oc3.order_code = d3.order_code
            WHERE (d3.customer_id = ${customerAlias}.id OR oc3.customer_id = ${customerAlias}.id)
              AND COALESCE(d3.is_draft, false) = false
              AND COALESCE(oc3.status, 'active') NOT IN ('cancelled', 'canceled')
              AND (
                  d3.created_at < ${orderAlias}.created_at
                  OR (d3.created_at = ${orderAlias}.created_at AND d3.id < ${orderAlias}.id)
              )
        ) THEN 'cu'
        WHEN ${customerAlias}.customer_type = 'cu' THEN 'cu'
        ELSE 'moi'
    END AS customer_type`;
}

module.exports = { getCustomerTypeSql };
