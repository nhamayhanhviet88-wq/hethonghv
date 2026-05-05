const db = require('./db/pool');
(async () => {
  const dupes = await db.all(`
    SELECT c.phone, COUNT(DISTINCT c.id) as customer_count, 
           array_agg(DISTINCT c.id ORDER BY c.id) as customer_ids,
           array_agg(DISTINCT c.customer_name ORDER BY c.customer_name) as names
    FROM consultation_logs cl
    JOIN customers c ON cl.customer_id = c.id
    WHERE cl.log_type = 'hoan_thanh'
      AND c.phone IS NOT NULL AND c.phone != ''
      AND COALESCE(c.cancel_approved, 0) != 1
    GROUP BY c.phone
    HAVING COUNT(DISTINCT c.id) > 1
    ORDER BY customer_count DESC
    LIMIT 20
  `);
  console.log('=== Phones with multiple customer_ids (hoan_thanh) ===');
  dupes.forEach(d => console.log(`Phone: ${d.phone}, Customers: ${d.customer_count}, IDs: [${d.customer_ids}], Names: [${d.names}]`));
  console.log('Total phones with returning:', dupes.length);

  const statsRows = await db.all(`
    SELECT 
      COUNT(*) as total_logs,
      COUNT(DISTINCT cl.customer_id) as unique_customers,
      COUNT(DISTINCT c.phone) as unique_phones
    FROM consultation_logs cl
    JOIN customers c ON cl.customer_id = c.id
    WHERE cl.log_type = 'hoan_thanh'
      AND c.phone IS NOT NULL AND c.phone != ''
      AND COALESCE(c.cancel_approved, 0) != 1
  `);
  const stats = statsRows[0];
  console.log('=== Overall Stats ===');
  console.log(`Total hoan_thanh logs: ${stats.total_logs}`);
  console.log(`Unique customer_ids: ${stats.unique_customers}`);
  console.log(`Unique phones: ${stats.unique_phones}`);
  console.log(`Duplicate logs (same customer): ${stats.total_logs - stats.unique_customers}`);
  console.log(`Returning phones (same phone diff customer): ${stats.unique_customers - stats.unique_phones}`);

  process.exit(0);
})();
