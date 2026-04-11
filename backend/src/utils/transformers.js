// ── Snake_case DB rows → camelCase frontend JSON ──

export function transformInvoice(row) {
    if (!row) return null;
    return {
        id: row.id,
        number: row.number,
        clientId: row.client_id,
        clientName: row.client_name,
        company: row.company,
        status: row.status,
        date: fmtDate(row.date),
        dueDate: fmtDate(row.due_date),
        paidDate: fmtDate(row.paid_date),
        subtotal: Number(row.subtotal),
        taxTotal: Number(row.tax_total),
        total: Number(row.total),
        notes: row.notes,
        terms: row.terms,
        template: row.template,
        currency: row.currency,
        isDraft: row.is_draft,
        pdfUrl: row.pdf_url,
        items: row.items || [],
        createdAt: row.created_at,
    };
}

export function transformInvoiceItem(row) {
    if (!row) return null;
    return {
        id: row.id,
        description: row.description,
        qty: Number(row.qty),
        rate: Number(row.rate),
        tax: Number(row.tax),
        lineTotal: Number(row.line_total),
    };
}

export function transformClient(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        company: row.company,
        gst: row.gst,
        address: row.address,
        notes: row.notes,
        totalInvoices: Number(row.total_invoices || 0),
        totalRevenue: Number(row.total_revenue || 0),
        outstanding: Number(row.outstanding || 0),
        createdAt: fmtDate(row.created_at),
    };
}

export function transformPayment(row) {
    if (!row) return null;
    return {
        id: row.id,
        invoiceId: row.invoice_id,
        invoiceNumber: row.invoice_number,
        clientName: row.client_name,
        amount: Number(row.amount),
        date: fmtDate(row.date),
        method: row.method,
        status: row.status,
        notes: row.notes,
    };
}

export function transformUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        company: row.business_name || '',
        plan: row.subscription_status || 'demo',
        avatarUrl: row.avatar_url || null,
        authProvider: row.auth_provider,
        demoUsed: row.demo_used,
    };
}

export function transformBusinessProfile(row) {
    if (!row) return null;
    return {
        businessName: row.business_name,
        logoUrl: row.logo_url,
        gst: row.gst_number,
        address: row.business_address,
        email: row.contact_email,
        phone: row.contact_phone,
        website: row.website,
        currency: row.currency,
        invoicePrefix: row.invoice_prefix,
        defaultNotes: row.default_notes,
        defaultTerms: row.default_terms,
        defaultTemplate: row.default_template,
        taxRate: row.tax_rate ? Number(row.tax_rate) : 18,
        panNumber: row.pan_number,
    };
}

export function transformSubscription(row) {
    if (!row) return null;
    return {
        id: row.id,
        plan: row.plan,
        price: Number(row.price),
        status: row.status,
        startDate: fmtDate(row.start_date),
        renewalDate: fmtDate(row.renewal_date),
        expiryDate: fmtDate(row.expiry_date),
    };
}

export function transformBillingPayment(row) {
    if (!row) return null;
    return {
        date: fmtDate(row.date),
        amount: `₹${Number(row.amount)}`,
        status: row.status,
        method: row.method,
    };
}

function fmtDate(d) {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return String(d).split('T')[0];
}
