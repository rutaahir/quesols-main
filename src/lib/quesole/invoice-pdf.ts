import jsPDF from "jspdf";

export interface InvoiceData {
  invoiceNumber?: string | undefined;
  date?: string | undefined;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string | undefined;
  city?: string | undefined;
  country?: string | undefined;

  // Corporate Billing & Invoice details requested by user
  billingName?: string | undefined;
  billingAddress?: string | undefined;
  billerEmail?: string | undefined;
  contactPerson?: string | undefined;
  contactPhone?: string | undefined;
  gstNumber?: string | undefined;
  furtherInstructions?: string | undefined;

  // Plan timing details
  planTiming?: {
    termLabel?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    renewalDate?: string | undefined;
  } | undefined;

  branchesCount?: number | undefined;
  branches?: Array<{
    name: string;
    mode?: string | undefined;
    operatorQty?: number | undefined;
    kioskQty?: number | undefined;
    serviceQty?: number | undefined;
    channel_type?: string | undefined;
  }> | undefined;
  durationMonths: number;
  itemized: {
    branches_subtotal?: number | undefined;
    online_subtotal?: number | undefined;
    operators_subtotal?: number | undefined;
    services_subtotal?: number | undefined;
    kiosks_subtotal?: number | undefined;
    delivery_subtotal?: number | undefined;
    [key: string]: any;
  };
  monthlyTotal: number;
  contractSubtotal: number;
  discountPercent?: number | undefined;
  discountAmount?: number | undefined;
  gstPercent: number;
  gstAmount: number;
  grandTotal: number;
}

// Professional ISO currency formatter (avoids non-ASCII/Helvetica encoding corruption in jsPDF)
function formatINR(val: number | string | undefined | null): string {
  const num = Number(val || 0);
  return `INR ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function generateAndDownloadInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = 0;

  // 1. Top Enterprise Header Banner
  doc.setFillColor(15, 23, 42); // Deep Slate #0F172A
  doc.rect(0, 0, pageWidth, 30, "F");

  // Accent gradient line underneath banner
  doc.setFillColor(99, 102, 241); // Indigo-500 #6366F1
  doc.rect(0, 29, pageWidth, 1.2, "F");

  // Header Brand Logo / Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("QUESOLE", margin, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254);
  doc.text("ENTERPRISE QUEUE INTELLIGENCE & SAAS SUITE", margin, 19);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("GSTIN: 24AAACQ9876Q1Z8  ·  support@quesole.com", margin, 24.5);

  // Invoice / Proforma Header (Right side of banner)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PROFORMA INVOICE", pageWidth - margin, 12, { align: "right" });

  const invNumber = data.invoiceNumber || `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(224, 231, 255);
  doc.text(`Doc Ref: ${invNumber}`, pageWidth - margin, 17.5, { align: "right" });

  const todayStr = data.date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  doc.text(`Issue Date: ${todayStr}`, pageWidth - margin, 22, { align: "right" });

  doc.setTextColor(165, 180, 252);
  doc.text("Payment Terms: Net 15 / Due on Receipt", pageWidth - margin, 26.5, { align: "right" });

  y = 36;

  // 2. Dual Columns Info Card: Billed To (Left) & Plan Timing & Subscription (Right)
  // (Upper warning box removed as per user request to provide a clean SaaS enterprise look)
  const colWidth = (contentWidth - 6) / 2; // ~88mm
  const cardHeight = 44;

  // Left Card: Billed To
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, y, colWidth, cardHeight, 2, 2, "FD");

  doc.setTextColor(79, 70, 229); // indigo-600
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("BILLED TO / CORPORATE DETAILS", margin + 4, y + 6);

  const billingLegalName = data.billingName || data.companyName || "Client Organization";
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(billingLegalName.length > 30 ? `${billingLegalName.slice(0, 30)}...` : billingLegalName, margin + 4, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const contactPerson = data.contactPerson || data.contactName || "Authorized Admin";
  doc.text(`Attn: ${contactPerson.length > 32 ? `${contactPerson.slice(0, 32)}...` : contactPerson}`, margin + 4, y + 19);

  const emailStr = data.billerEmail || data.email || "—";
  doc.text(`Email: ${emailStr.length > 34 ? `${emailStr.slice(0, 34)}...` : emailStr}`, margin + 4, y + 24);

  const phoneStr = data.contactPhone || data.phone || "—";
  doc.text(`Phone: ${phoneStr}`, margin + 4, y + 29);

  const gstStr = data.gstNumber ? `GSTIN / Tax ID: ${data.gstNumber.toUpperCase()}` : "GSTIN: Unregistered / Not Applicable";
  doc.setFont("helvetica", data.gstNumber ? "bold" : "normal");
  doc.setTextColor(data.gstNumber ? 15 : 100, data.gstNumber ? 23 : 116, data.gstNumber ? 42 : 139);
  doc.text(gstStr, margin + 4, y + 34);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const addrStr = data.billingAddress || data.address || `${data.city || ""}, ${data.country || "India"}`;
  doc.text(`Address: ${addrStr.length > 36 ? `${addrStr.slice(0, 36)}...` : addrStr}`, margin + 4, y + 39);

  // Right Card: Plan Timing & Subscription
  const rightColX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, y, colWidth, cardHeight, 2, 2, "FD");

  doc.setTextColor(79, 70, 229);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("SUBSCRIPTION TIMING & ACCESS", rightColX + 4, y + 6);

  // Plan duration and timing calculations
  const durationMonths = data.durationMonths || 1;
  const termLabel = data.planTiming?.termLabel || (
    durationMonths === 1 ? "1 Month (Monthly Subscription)" :
    durationMonths === 3 ? "3 Months (Quarterly · 5% Discount)" :
    durationMonths === 6 ? "6 Months (Semi-Annual · 10% Discount)" :
    "12 Months (Annual Commitment · 20% Discount)"
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(termLabel.length > 32 ? `${termLabel.slice(0, 32)}...` : termLabel, rightColX + 4, y + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const startDate = data.planTiming?.startDate || todayStr;
  const renewalDate = data.planTiming?.endDate || (
    (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + durationMonths);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    })()
  );

  doc.text(`Activation Term: ${durationMonths} Month${durationMonths > 1 ? "s" : ""}`, rightColX + 4, y + 19);
  doc.text(`Effective Period: ${startDate} to ${renewalDate}`, rightColX + 4, y + 24);
  doc.text(`Next Billing / Renewal: ${renewalDate}`, rightColX + 4, y + 29);
  doc.text(`Currency: INR  ·  Settlement: Corporate Wire`, rightColX + 4, y + 34);
  doc.text(`Platform Provider: Quesole Technologies Pvt. Ltd.`, rightColX + 4, y + 39);

  y += cardHeight + 6;

  // 3. Itemized Commercial Table Header
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7.5, "FD");

  doc.setTextColor(51, 65, 85);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("ITEM / ARCHITECTURE SPECIFICATION", margin + 4, y + 5);
  doc.text("QTY", pageWidth - margin - 64, y + 5, { align: "center" });
  doc.text("RATE / MO", pageWidth - margin - 36, y + 5, { align: "right" });
  doc.text("SUBTOTAL (INR)", pageWidth - margin - 4, y + 5, { align: "right" });

  y += 7.5;

  // Build items list
  const items: Array<{ name: string; qty: string; rate: string; subtotal: number | string }> = [];

  const branchesCount = data.branches?.length || data.branchesCount || 1;
  if (data.itemized.branches_subtotal !== undefined) {
    items.push({
      name: `Branch Locations Setup (${branchesCount} location${branchesCount > 1 ? "s" : ""})`,
      qty: String(branchesCount),
      rate: formatINR(Math.round(Number(data.itemized.branches_subtotal) / branchesCount)),
      subtotal: Number(data.itemized.branches_subtotal),
    });
  }

  if (Number(data.itemized.online_subtotal) > 0) {
    items.push({
      name: "Online Booking & Customer Web Appointment Portal",
      qty: "1 Module",
      rate: formatINR(Number(data.itemized.online_subtotal)),
      subtotal: Number(data.itemized.online_subtotal),
    });
  }

  if (Number(data.itemized.operators_subtotal) > 0) {
    const totalOps = data.branches?.reduce((a, b) => a + (b.operatorQty || 0), 0) || 1;
    items.push({
      name: `Operator Desks & Counter Workstations`,
      qty: `${totalOps} Seats`,
      rate: formatINR(Math.round(Number(data.itemized.operators_subtotal) / totalOps)),
      subtotal: Number(data.itemized.operators_subtotal),
    });
  }

  if (Number(data.itemized.services_subtotal) > 0) {
    const totalServices = data.branches?.reduce((a, b) => a + (b.serviceQty || 0), 0) || 1;
    items.push({
      name: `Service Queuing Categories`,
      qty: `${totalServices} Queues`,
      rate: formatINR(Math.round(Number(data.itemized.services_subtotal) / totalServices)),
      subtotal: Number(data.itemized.services_subtotal),
    });
  }

  if (Number(data.itemized.kiosks_subtotal) > 0) {
    const totalKiosks = data.branches?.reduce((a, b) => a + (b.kioskQty || 0), 0) || 1;
    items.push({
      name: `Display Units & Self-Service Kiosks`,
      qty: `${totalKiosks} Units`,
      rate: formatINR(Math.round(Number(data.itemized.kiosks_subtotal) / totalKiosks)),
      subtotal: Number(data.itemized.kiosks_subtotal),
    });
  }

  items.push({
    name: "Self-Ticketing QR Display Poster Kit",
    qty: "Included",
    rate: "FREE",
    subtotal: "FREE",
  });

  if (Number(data.itemized.delivery_subtotal) > 0) {
    items.push({
      name: "Multi-Channel Notification Gateway (WhatsApp / SMS Delivery)",
      qty: "1 Addon",
      rate: formatINR(Number(data.itemized.delivery_subtotal)),
      subtotal: Number(data.itemized.delivery_subtotal),
    });
  }

  // Draw Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  items.forEach((item, idx) => {
    const rowY = y + idx * 6.8;
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, rowY, contentWidth, 6.8, "F");
    }

    doc.setTextColor(30, 41, 59);
    doc.text(item.name, margin + 4, rowY + 4.6);
    doc.text(item.qty, pageWidth - margin - 64, rowY + 4.6, { align: "center" });
    doc.text(item.rate, pageWidth - margin - 36, rowY + 4.6, { align: "right" });

    if (typeof item.subtotal === "number") {
      doc.text(formatINR(item.subtotal), pageWidth - margin - 4, rowY + 4.6, { align: "right" });
    } else {
      doc.setTextColor(16, 185, 129); // emerald-600
      doc.setFont("helvetica", "bold");
      doc.text(item.subtotal, pageWidth - margin - 4, rowY + 4.6, { align: "right" });
      doc.setFont("helvetica", "normal");
    }
  });

  y += items.length * 6.8 + 3;

  // Divider Line
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  // 4. Totals Breakdown (Right-aligned Professional Box)
  const totalsBoxX = pageWidth - margin - 104;
  const totalsBoxWidth = 104;

  const totals = [
    { label: "Base Monthly Rate:", val: `${formatINR(data.monthlyTotal)} / mo` },
    ...(data.discountPercent && data.discountPercent > 0 ? [
      { label: `Duration Discount (${data.discountPercent}% off):`, val: `-${formatINR(data.discountAmount || 0)}`, green: true }
    ] : []),
    { label: `Contract Subtotal (${data.durationMonths} mo):`, val: formatINR(data.contractSubtotal) },
    { label: `GST (${data.gstPercent}%):`, val: formatINR(data.gstAmount) },
    { label: "Grand Total (INR):", val: formatINR(data.grandTotal), bold: true },
  ];

  totals.forEach((row) => {
    if (row.bold) {
      doc.setFillColor(238, 242, 255); // Indigo 50
      doc.setDrawColor(199, 210, 254);
      doc.roundedRect(totalsBoxX - 2, y, totalsBoxWidth + 2, 8, 1.5, 1.5, "FD");
      doc.setTextColor(67, 56, 202); // Indigo 700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(row.green ? 16 : 71, row.green ? 185 : 85, row.green ? 129 : 105);
    }

    doc.text(row.label, totalsBoxX + 2, y + 5.2);
    doc.text(row.val, pageWidth - margin - 4, y + 5.2, { align: "right" });
    y += row.bold ? 9.5 : 5.8;
  });

  y += 4;

  // 5. Further Instructions / Purchase Order Section (if present)
  if (data.furtherInstructions && data.furtherInstructions.trim()) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 15, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("CUSTOMER PURCHASE ORDER / FURTHER INSTRUCTIONS:", margin + 4, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const notesStr = data.furtherInstructions.trim();
    doc.text(notesStr.length > 115 ? `${notesStr.slice(0, 115)}...` : notesStr, margin + 4, y + 10.5);

    y += 18;
  }

  // 6. Payment & Bank Remittance Instructions Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text("OFFLINE PAYMENT & WIRE SETTLEMENT DETAILS", margin + 4, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const bankLeft = margin + 4;
  doc.text("• Beneficiary: Quesole Technologies Private Limited", bankLeft, y + 11);
  doc.text("• Bank Name: HDFC Bank Ltd  ·  A/C: 50200088910411", bankLeft, y + 15.5);
  doc.text("• IFSC Code: HDFC0000240  ·  Account Type: Current Account", bankLeft, y + 20);

  const bankRight = pageWidth / 2 + 5;
  doc.text("• Remittance Note: Please quote Invoice Ref above", bankRight, y + 11);
  doc.text("• Submit UTR / Payment Proof: billing@quesole.com", bankRight, y + 15.5);
  doc.text("• Corporate Hotline: +91 98765 43210 (Mon-Sat 9AM-7PM IST)", bankRight, y + 20);

  // 7. Bottom Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    "Quesole Smart Queuing & Enterprise Operations — Computer-Generated Proforma Invoice. No physical signature required.",
    pageWidth / 2,
    286,
    { align: "center" }
  );

  const safeFilename = (billingLegalName || "Company").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`Quesole_Proforma_${safeFilename}.pdf`);

  return doc;
}
