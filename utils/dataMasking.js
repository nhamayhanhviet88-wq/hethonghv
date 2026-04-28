/**
 * Centralized data masking utilities for sensitive customer information.
 * Used by all routes to ensure consistent phone/link masking for QL/TP viewing subordinate data.
 */

function maskPhone(phone) {
    if (!phone || phone.length < 5) return phone;
    return phone.substring(0, 3) + '*'.repeat(phone.length - 5) + phone.substring(phone.length - 2);
}

function maskLink(link) {
    if (!link) return link;
    return '****';
}

/**
 * Mask sensitive fields on a customer record in-place.
 * @param {Object} customer - customer object (mutated in-place)
 * @param {Object} [options]
 * @param {boolean} [options.maskAddress=false] - also null out address (for affiliate roles)
 */
function maskCustomerData(customer, options = {}) {
    if (!customer) return customer;

    // Mask all phone fields
    customer.phone = maskPhone(customer.phone);
    if (customer.phone2) customer.phone2 = maskPhone(customer.phone2);
    if (customer.referrer_customer_phone) customer.referrer_customer_phone = maskPhone(customer.referrer_customer_phone);
    if (customer.customer_phone) customer.customer_phone = maskPhone(customer.customer_phone);

    // Mask social links
    if (customer.facebook_link) customer.facebook_link = maskLink(customer.facebook_link);
    if (customer.fb_link) customer.fb_link = maskLink(customer.fb_link);

    // Optional: hide address (for affiliate roles)
    if (options.maskAddress) {
        customer.address = null;
    }

    customer.readonly = true;
    return customer;
}

module.exports = { maskPhone, maskLink, maskCustomerData };
