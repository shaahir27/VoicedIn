import { AppError, ValidationError } from './errors.js';

export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) throw new ValidationError('Invalid email address');
    return email.toLowerCase().trim();
}

export function validateRequired(fields, body) {
    for (const f of fields) {
        if (!body[f] && body[f] !== 0 && body[f] !== false) {
            throw new ValidationError(`${f} is required`);
        }
    }
}

export function validateGST(gst) {
    if (!gst) return null;
    const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    if (!re.test(gst.toUpperCase())) throw new ValidationError('Invalid GST number format');
    return gst.toUpperCase();
}

export function validatePhone(phone) {
    if (!phone) return null;
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.length < 10) throw new ValidationError('Invalid phone number');
    return phone.trim();
}

export function validatePositive(value, fieldName) {
    const num = Number(value);
    if (isNaN(num) || num < 0) throw new ValidationError(`${fieldName} must be a positive number`);
    return num;
}

export function validateDate(dateStr, fieldName) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) throw new ValidationError(`${fieldName} is not a valid date`);
    return dateStr;
}

export function validateInvoiceItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new ValidationError('At least one line item is required');
    }
    for (const item of items) {
        if (!item.description) throw new ValidationError('Each item must have a description');
        if (!item.qty || item.qty <= 0) throw new ValidationError('Quantity must be positive');
        if (item.rate === undefined || item.rate < 0) throw new ValidationError('Rate must be non-negative');
        if (item.tax === undefined || item.tax === null || item.tax === '' || item.tax < 0) {
            throw new ValidationError('Each item must have a GST rate');
        }
    }
    return items;
}
