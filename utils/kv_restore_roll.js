/**
 * Helper to restore consumed fabric roll weights when cutting records are deleted.
 * @param {object} db - Database pool / runner
 * @param {Array<object>} cuttingRecords - Array of cutting records to restore weights for
 */
async function restoreRollWeightsForCuts(db, cuttingRecords) {
    for (const rec of cuttingRecords) {
        if (!rec || !rec.is_cut_done) continue;

        let snapshot = [];
        try {
            snapshot = typeof rec.selected_roll_ids === 'string'
                ? JSON.parse(rec.selected_roll_ids)
                : (rec.selected_roll_ids || []);
        } catch (e) {
            console.error('[restoreRollWeightsForCuts] Parse error:', e.message);
        }

        if (!Array.isArray(snapshot) || snapshot.length === 0) continue;

        for (const s of snapshot) {
            if (!s.roll_id) continue;

            let rollKgCut = 0;
            if (s.kg_cut !== undefined && s.kg_cut !== null) {
                rollKgCut = Number(s.kg_cut);
            } else if (s.kg_used !== undefined && s.kg_used !== null) {
                rollKgCut = Number(s.kg_used);
            } else if (snapshot.length > 1) {
                // Proportional fallback
                const totalStartWeight = snapshot.reduce((sum, r) => sum + (Number(r.weight) || 0), 0);
                if (totalStartWeight > 0) {
                    const ratio = (Number(s.weight) || 0) / totalStartWeight;
                    rollKgCut = (Number(rec.kg_cut) || 0) * ratio;
                }
            } else {
                rollKgCut = Number(rec.kg_cut) || 0;
            }

            if (rollKgCut > 0) {
                // Restore weight to the roll
                await db.run(
                    `UPDATE kv_rolls SET weight = weight + $1, updated_at = NOW() WHERE id = $2`,
                    [rollKgCut, s.roll_id]
                );
            }
        }
    }
}

module.exports = {
    restoreRollWeightsForCuts
};
