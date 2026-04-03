/**
 * Approval Hierarchy for the entire system
 * 
 * Rules:
 * - part_time, nhan_vien → approved by truong_phong, quan_ly, quan_ly_cap_cao, giam_doc
 * - truong_phong → approved by quan_ly, quan_ly_cap_cao, giam_doc
 * - quan_ly → approved by quan_ly_cap_cao, giam_doc
 * - quan_ly_cap_cao → approved by giam_doc only
 * - giam_doc → auto-approve (no approval needed)
 */

// Role levels (higher = more authority)
const ROLE_LEVEL = {
    part_time: 0,
    nhan_vien: 1,
    truong_phong: 2,
    quan_ly: 3,
    quan_ly_cap_cao: 4,
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
