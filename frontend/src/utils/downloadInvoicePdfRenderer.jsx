import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { api, assetUrl } from './api';

const theme = {
  primary: '#111827',
  accent: '#4f46e5',
  text: '#111827',
  muted: '#64748b',
  line: '#e5e7eb',
  soft: '#f8fafc',
  panelText: '#f9fafb',
};

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: theme.text,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
    paddingBottom: 18,
    marginBottom: 24,
  },
  brandBlock: {
    width: 190,
    minHeight: 98,
    backgroundColor: theme.primary,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    width: 72,
    height: 44,
    objectFit: 'contain',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  brandSubtle: {
    marginTop: 4,
    color: '#e5e7eb',
    fontSize: 9,
  },
  invoiceMeta: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  invoiceTitle: {
    fontSize: 32,
    letterSpacing: 3,
    fontFamily: 'Helvetica-Bold',
    color: theme.primary,
    marginBottom: 8,
  },
  metaLine: {
    color: theme.muted,
    marginBottom: 3,
  },
  metaStrong: {
    color: theme.text,
    fontFamily: 'Helvetica-Bold',
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 24,
  },
  detailCard: {
    flex: 1,
    backgroundColor: theme.soft,
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
    padding: 12,
    minHeight: 92,
  },
  sectionLabel: {
    color: theme.muted,
    fontSize: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  detailName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  detailText: {
    color: theme.muted,
    marginBottom: 3,
    lineHeight: 1.35,
  },
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    color: '#ffffff',
    paddingVertical: 9,
    paddingHorizontal: 8,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    paddingVertical: 9,
    paddingHorizontal: 8,
    minHeight: 30,
  },
  colIndex: { width: 28 },
  colDescription: { flex: 1, paddingRight: 8 },
  colQty: { width: 42, textAlign: 'center' },
  colRate: { width: 72, textAlign: 'right' },
  colTax: { width: 48, textAlign: 'center' },
  colAmount: { width: 82, textAlign: 'right' },
  bottom: {
    flexDirection: 'row',
    gap: 26,
    alignItems: 'stretch',
    marginTop: 4,
  },
  sidePanel: {
    width: 210,
    backgroundColor: theme.primary,
    color: theme.panelText,
    padding: 18,
    minHeight: 150,
  },
  sideTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sideText: {
    fontSize: 8,
    color: '#e5e7eb',
    lineHeight: 1.35,
    marginBottom: 10,
  },
  summary: {
    flex: 1,
    paddingTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    paddingVertical: 7,
    color: theme.muted,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
    color: theme.text,
  },
  signature: {
    marginTop: 22,
    width: 160,
    borderTopWidth: 1,
    borderTopColor: theme.text,
    paddingTop: 8,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 34,
    right: 34,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
  },
  demoWatermark: {
    position: 'absolute',
    top: 330,
    left: 85,
    fontSize: 64,
    fontFamily: 'Helvetica-Bold',
    color: '#fee2e2',
    transform: 'rotate(-28deg)',
  },
});

export async function downloadInvoicePdf(invoiceId, invoiceNumber) {
  const [invoiceRes, profileRes, settingsRes] = await Promise.all([
    api.get(`/invoices/${invoiceId}`),
    api.get('/business-profile'),
    api.get('/settings'),
  ]);

  const invoice = invoiceRes.invoice;
  const businessProfile = mergeProfile(profileRes.profile, settingsRes.settings);
  const blob = await pdf(<InvoicePdfDocument invoice={invoice} businessProfile={businessProfile} />).toBlob();

  if (!blob || blob.size === 0) {
    throw new Error('Generated an empty PDF file');
  }

  await assertValidPdfBlob(blob);
  triggerDownload(blob, `invoice-${safeFilePart(invoice?.number || invoiceNumber || invoiceId)}.pdf`);
}

function InvoicePdfDocument({ invoice, businessProfile }) {
  const items = invoice?.items || [];
  const businessName = businessProfile.businessName || businessProfile.name || '';
  const clientCompany = invoice?.clientCompanyName || invoice?.company || invoice?.clientDetails?.companyName || '';
  const clientGst = invoice?.clientGstNumber || invoice?.clientDetails?.gstNumber || '';
  const clientAddress = invoice?.clientAddress || invoice?.clientDetails?.address || '';
  const includeBankDetails = invoice?.includeBankDetails ?? businessProfile.includeBankDetails;
  const currency = invoice?.currency || businessProfile.currency || 'INR';
  const isDemo = Boolean(invoice?.isDemo || businessProfile?.isDemo);
  const logoSrc = getPdfLogoSource(businessProfile.logoUrl);
  const showSidePanel = Boolean(
    invoice?.notes ||
    invoice?.terms ||
    (includeBankDetails && hasBankDetails(businessProfile))
  );

  return (
    <Document
      title={`Invoice ${invoice?.number || ''}`}
      author={businessName || 'VoicedIn'}
      subject="Invoice"
    >
      <Page size="A4" style={styles.page} wrap>
        {isDemo ? <Text style={styles.demoWatermark} fixed>DEMO - NOT VALID</Text> : null}
        <View style={styles.header} fixed>
          <View style={styles.brandBlock}>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            {businessName ? <Text style={styles.brandName}>{businessName}</Text> : null}
            <Text style={styles.brandSubtle}>Invoice</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            {invoice?.number ? <Text style={[styles.metaLine, styles.metaStrong]}>{invoice.number}</Text> : null}
            {invoice?.date ? <Text style={styles.metaLine}>Date: {invoice.date}</Text> : null}
            {invoice?.dueDate ? <Text style={styles.metaLine}>Due: {invoice.dueDate}</Text> : null}
            {invoice?.status ? <Text style={styles.metaLine}>Status: {invoice.status}</Text> : null}
            <Text style={styles.metaLine}>Currency: {currency}</Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.sectionLabel}>From</Text>
            {businessName ? <Text style={styles.detailName}>{businessName}</Text> : null}
            {businessProfile.address ? <Text style={styles.detailText}>{businessProfile.address}</Text> : null}
            {businessProfile.email || businessProfile.phone ? (
              <Text style={styles.detailText}>{[businessProfile.email, businessProfile.phone].filter(Boolean).join(' | ')}</Text>
            ) : null}
            {businessProfile.gst || businessProfile.panNumber ? (
              <Text style={styles.detailText}>{[
                businessProfile.gst ? `GST: ${businessProfile.gst}` : '',
                businessProfile.panNumber ? `PAN: ${businessProfile.panNumber}` : '',
              ].filter(Boolean).join(' | ')}</Text>
            ) : null}
          </View>

          <View style={styles.detailCard}>
            <Text style={styles.sectionLabel}>Billed To</Text>
            {invoice?.clientName ? <Text style={styles.detailName}>{invoice.clientName}</Text> : null}
            {clientCompany ? <Text style={styles.detailText}>{clientCompany}</Text> : null}
            {clientGst ? <Text style={styles.detailText}>GST: {clientGst}</Text> : null}
            {clientAddress ? <Text style={styles.detailText}>{clientAddress}</Text> : null}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={styles.colIndex}>#</Text>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Rate</Text>
            <Text style={styles.colTax}>Tax</Text>
            <Text style={styles.colAmount}>Amount</Text>
          </View>
          {items.length ? items.map((item, index) => (
            <View key={`${item.id || item.description || 'item'}-${index}`} style={styles.tableRow} wrap={false}>
              <Text style={styles.colIndex}>{index + 1}</Text>
              <Text style={styles.colDescription}>{item.description || ''}</Text>
              <Text style={styles.colQty}>{formatNumber(item.qty)}</Text>
              <Text style={styles.colRate}>{formatMoney(item.rate, currency)}</Text>
              <Text style={styles.colTax}>{formatNumber(item.tax)}%</Text>
              <Text style={styles.colAmount}>{formatMoney(lineAmount(item), currency)}</Text>
            </View>
          )) : (
            <View style={styles.tableRow}>
              <Text style={styles.colDescription}>No invoice items</Text>
            </View>
          )}
        </View>

        <View style={styles.bottom} wrap={false}>
          {showSidePanel ? (
            <View style={styles.sidePanel}>
              {includeBankDetails && hasBankDetails(businessProfile) ? (
                <BankDetails businessProfile={businessProfile} />
              ) : null}
              {invoice?.notes ? (
                <>
                  <Text style={styles.sideTitle}>Notes</Text>
                  <Text style={styles.sideText}>{invoice.notes}</Text>
                </>
              ) : null}
              {invoice?.terms ? (
                <>
                  <Text style={styles.sideTitle}>Terms</Text>
                  <Text style={styles.sideText}>{invoice.terms}</Text>
                </>
              ) : null}
            </View>
          ) : null}

          <View style={styles.summary}>
            <View style={styles.totalRow}>
              <Text>Subtotal:</Text>
              <Text>{formatMoney(invoice?.subtotal, currency)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Tax:</Text>
              <Text>{formatMoney(invoice?.taxTotal, currency)}</Text>
            </View>
            <View style={styles.grandTotal}>
              <Text>Total ({currency}):</Text>
              <Text>{formatMoney(invoice?.total, currency)}</Text>
            </View>
            <Text style={styles.signature}>Authorized Signatory</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function BankDetails({ businessProfile }) {
  return (
    <>
      <Text style={styles.sideTitle}>Payment Info</Text>
      {businessProfile.bankAccountName ? <Text style={styles.sideText}>Account: {businessProfile.bankAccountName}</Text> : null}
      {businessProfile.bankName ? <Text style={styles.sideText}>Bank: {businessProfile.bankName}</Text> : null}
      {businessProfile.bankAccountNumber ? <Text style={styles.sideText}>A/C No: {businessProfile.bankAccountNumber}</Text> : null}
      {businessProfile.bankIfsc ? <Text style={styles.sideText}>IFSC: {businessProfile.bankIfsc}</Text> : null}
      {businessProfile.bankUpi ? <Text style={styles.sideText}>UPI: {businessProfile.bankUpi}</Text> : null}
    </>
  );
}

function mergeProfile(profile = {}, settings = {}) {
  return {
    ...settings,
    ...profile,
    gst: profile?.gst || settings?.gst || '',
    panNumber: profile?.panNumber || settings?.panNumber || '',
    bankAccountName: profile?.bankAccountName || settings?.bankAccountName || '',
    bankName: profile?.bankName || settings?.bankName || '',
    bankAccountNumber: profile?.bankAccountNumber || settings?.bankAccountNumber || '',
    bankIfsc: profile?.bankIfsc || settings?.bankIfsc || '',
    bankUpi: profile?.bankUpi || settings?.bankUpi || '',
    includeBankDetails: profile?.includeBankDetails ?? settings?.includeBankDetails ?? false,
  };
}

function hasBankDetails(profile = {}) {
  return Boolean(profile.bankAccountName || profile.bankName || profile.bankAccountNumber || profile.bankIfsc || profile.bankUpi);
}

function getPdfLogoSource(logoUrl) {
  if (!logoUrl || /\.svg($|\?)/i.test(logoUrl)) return '';
  return assetUrl(logoUrl);
}

function lineAmount(item) {
  const qty = Number(item?.qty || 0);
  const rate = Number(item?.rate || 0);
  const tax = Number(item?.tax || 0);
  return qty * rate * (1 + tax / 100);
}

function formatMoney(amount, currency = 'INR') {
  const safeCurrency = ['INR', 'USD', 'EUR'].includes(currency) ? currency : 'INR';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : String(number.toFixed(2)).replace(/\.?0+$/, '');
}

function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

async function assertValidPdfBlob(blob) {
  const header = await blob.slice(0, 5).text();
  if (header !== '%PDF-') {
    throw new Error('Generated file is not a valid PDF');
  }
}

function safeFilePart(value) {
  return String(value || Date.now()).replace(/[^a-zA-Z0-9._-]/g, '-');
}
