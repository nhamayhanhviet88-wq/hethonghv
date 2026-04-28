// ========== CENTRALIZED: Get all department IDs managed by a user ==========
// Logic: departments.head_user_id + user.department_id + recursive children
// This is the SINGLE SOURCE OF TRUTH for department visibility across ALL modules.

async function getManagedDeptIds(db, userId) {
    // 1. Find departments where this user is the head
    const headDepts = await db.all(
        'SELECT id FROM departments WHERE head_user_id = $1 AND status = $2',
        [userId, 'active']
    );

    // 2. Also include user's own department
    const dbUser = await db.get('SELECT department_id FROM users WHERE id = $1', [userId]);

    // 3. BFS to find all children recursively
    const allIds = new Set();
    const queue = headDepts.map(d => d.id);
    if (dbUser && dbUser.department_id) queue.push(dbUser.department_id);

    while (queue.length > 0) {
        const dId = queue.shift();
        if (allIds.has(dId)) continue;
        allIds.add(dId);
        const children = await db.all(
            'SELECT id FROM departments WHERE parent_id = $1 AND status = $2',
            [dId, 'active']
        );
        children.forEach(c => queue.push(c.id));
    }

    return [...allIds];
}

module.exports = { getManagedDeptIds };
