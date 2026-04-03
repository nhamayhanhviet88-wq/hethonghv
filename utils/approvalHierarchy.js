/**
 * Approval Hierarchy for the entire system
 * 
 * Rules:
 * - nhan_vien, truong_phong → approved by quan_ly, pho_giam_doc, trinh, giam_doc
 * - quan_ly → approved by pho_giam_doc, trinh, giam_doc
 * - pho_giam_doc, trinh (QLCC) → approved by giam_doc only
 * - giam_doc → auto-approve (no approval needed)
 */

// Role levels (higher = more authority)
const ROLE_LEVEL = {
    nhan_vien: 1,
    truong_phong: 2,
    quan_ly: 3,
    pho_giam_doc: 4,
    trinh: 4,        // Same level as pho_giam_doc (QLCC)
    giam_doc: 5
};

/**
 * Check if approverRole can approve work submitted by reporterRole
 * @param {string} approverRole - Role of the person trying to approve
 * @param {string} reporterRole - Role of the person who submitted the report
 * @returns {boolean}
 */
function canApproveByRole(approverRole, reporterRole) {
    const approverLevel = ROLE_LEVEL[approverRole] || 0;
    const reporterLevel = ROLE_LEVEL[reporterRole] || 0;
    
    // Must be strictly higher level to approve
    return approverLevel > reporterLevel;
}

/**
 * Check if a role should auto-approve (skip approval)
 * @param {string} role
 * @returns {boolean}
 */
function isAutoApproveRole(role) {
    return role === 'giam_doc';
}

/**
 * Get list of roles that can approve for a given reporter role
 * @param {string} reporterRole
 * @returns {string[]}
 */
function getApproverRoles(reporterRole) {
    const reporterLevel = ROLE_LEVEL[reporterRole] || 0;
    return Object.entries(ROLE_LEVEL)
        .filter(([_, level]) => level > reporterLevel)
        .map(([role]) => role);
}

module.exports = {
    ROLE_LEVEL,
    canApproveByRole,
    isAutoApproveRole,
    getApproverRoles
};
