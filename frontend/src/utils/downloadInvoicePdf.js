export async function downloadInvoicePdf(...args) {
    const { downloadInvoicePdf: renderInvoicePdf } = await import('./downloadInvoicePdfRenderer.jsx');
    return renderInvoicePdf(...args);
}
