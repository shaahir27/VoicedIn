import { api } from './api';

export async function downloadInvoicePdf(invoiceId, invoiceNumber) {
    const blob = await api.download(`/invoices/${invoiceId}/pdf`, ['application/pdf']);
    if (!blob || blob.size === 0) {
        throw new Error('Received an empty PDF file');
    }

    const pdfBlob = new Blob([blob], { type: blob.type || 'application/pdf' });
    await assertValidPdfBlob(pdfBlob);

    const url = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `invoice-${invoiceNumber || invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

async function assertValidPdfBlob(blob) {
    const header = await blob.slice(0, 5).text();
    if (header !== '%PDF-') {
        throw new Error('Downloaded file is not a valid PDF');
    }
}
