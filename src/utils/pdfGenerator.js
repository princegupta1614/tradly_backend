import PDFDocument from "pdfkit";
import QRCode from "qrcode";

/**
 * Generates an Invoice PDF and returns it as a Buffer
 * @param {Object} invoice - The invoice data (populated with customer)
 * @param {Object} user - The business owner data
 * @returns {Promise<Buffer>} - The PDF buffer
 */
export const generateInvoicePDF = async (invoice, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // --- CONFIGURATION ---
      const primaryColor = "#4f46e5"; // Indigo
      const secondaryColor = "#64748b"; // Slate Gray
      const lineColor = "#e2e8f0"; // Light Gray
      const startX = 50;
      const width = 500; // Content width

      const drawLine = (y) => {
        doc.strokeColor(lineColor).lineWidth(1)
           .moveTo(startX, y).lineTo(startX + width, y).stroke();
      };

      const getStatusColor = (status) => {
        switch (status) {
          case 'Paid': return "#10b981"; // Green
          case 'Overdue': return "#ef4444"; // Red
          case 'Cancelled': return "#94a3b8"; // Gray
          default: return "#f59e0b"; // Orange (Pending)
        }
      };

      // ---------------------------------------------------------
      // 1. HEADER
      // ---------------------------------------------------------
      let currentY = 50;

      // Business Name (Left)
      doc.fontSize(20).font("Helvetica-Bold").fillColor(primaryColor)
         .text(user.businessName.toUpperCase(), startX, currentY);
      
      // INVOICE Label (Right)
      doc.fontSize(24).font("Helvetica-Bold").fillColor(secondaryColor)
         .text("INVOICE", startX, currentY, { align: "right" });

      currentY += 35;

      // Business Info (Left)
      doc.fontSize(10).font("Helvetica").fillColor(secondaryColor)
         .text(user.email, startX, currentY)
         .text(user.businessCategory || "General Merchant", startX, currentY + 15);

      // --- INVOICE META (Right Side) ---
      const metaLabelX = 380;
      const metaValueX = 450;
      
      // 1. Invoice Number
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#000000")
         .text("Invoice #:", metaLabelX, currentY, { width: 60, align: "right" })
         .font("Helvetica")
         .text(invoice._id.toString().slice(-6).toUpperCase(), metaValueX, currentY, { width: 90, align: "right" });
      
      // 2. Date
      doc.font("Helvetica-Bold")
         .text("Date:", metaLabelX, currentY + 15, { width: 60, align: "right" })
         .font("Helvetica")
         .text(new Date(invoice.createdAt).toLocaleDateString(), metaValueX, currentY + 15, { width: 90, align: "right" });

      // 3. Status
      doc.font("Helvetica-Bold").fillColor("#000000")
         .text("Status:", metaLabelX, currentY + 30, { width: 60, align: "right" });
      
      doc.font("Helvetica-Bold").fillColor(getStatusColor(invoice.status))
         .text(invoice.status.toUpperCase(), metaValueX, currentY + 30, { width: 90, align: "right" });

      // 4. Due Date (Optional)
      let headerHeight = 50; 
      if(invoice.dueDate) {
        doc.font("Helvetica-Bold").fillColor("#000000")
           .text("Due Date:", metaLabelX, currentY + 45, { width: 60, align: "right" })
           .font("Helvetica")
           .text(new Date(invoice.dueDate).toLocaleDateString(), metaValueX, currentY + 45, { width: 90, align: "right" });
        headerHeight = 65; 
      }

      currentY += (headerHeight + 20); 
      drawLine(currentY);
      currentY += 20;

      // ---------------------------------------------------------
      // 2. BILL TO
      // ---------------------------------------------------------
      doc.fontSize(10).font("Helvetica-Bold").fillColor(secondaryColor).text("BILL TO", startX, currentY);
      currentY += 15;
      doc.fontSize(12).font("Helvetica-Bold").fillColor("#000000").text(invoice.customer.name, startX, currentY);
      currentY += 20;
      
      doc.fontSize(10).font("Helvetica").fillColor(secondaryColor);
      doc.text(invoice.customer.phone, startX, currentY);
      if (invoice.customer.email) doc.text(invoice.customer.email, startX, currentY + 15);
      
      if (invoice.customer.address) {
         doc.text(invoice.customer.address, startX, currentY + 30, { width: 250 });
      }

      currentY += 60;

      // ---------------------------------------------------------
      // 3. ITEMS TABLE
      // ---------------------------------------------------------
      const colItem = startX; 
      const colQty = 320; 
      const colPrice = 380; 
      const colTotal = 460; 

      // Header Background
      doc.rect(startX, currentY, width, 25).fill(primaryColor);
      
      // Header Text
      const headerY = currentY + 8;
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
      doc.text("ITEM DESCRIPTION", colItem + 10, headerY);
      doc.text("QTY", colQty, headerY, { width: 50, align: "center" });
      doc.text("PRICE", colPrice, headerY, { width: 70, align: "right" });
      doc.text("AMOUNT", colTotal, headerY, { width: 80, align: "right" });

      currentY += 25;

      // Items List
      doc.fillColor("#000000").font("Helvetica").fontSize(10);
      
      invoice.items.forEach((item, i) => {
        // Page Break Logic
        if (currentY > 700) {
            doc.addPage();
            currentY = 50;
        }

        if (i % 2 === 1) {
            doc.rect(startX, currentY, width, 25).fill("#f8fafc");
            doc.fillColor("#000000");
        }

        const rowY = currentY + 8;
        doc.text(item.name, colItem + 10, rowY, { width: 260 });
        doc.text(item.quantity.toString(), colQty, rowY, { width: 50, align: "center" });
        doc.text(item.price.toFixed(2), colPrice, rowY, { width: 70, align: "right" });
        doc.text((item.price * item.quantity).toFixed(2), colTotal, rowY, { width: 80, align: "right" });
        
        currentY += 25;
      });

      drawLine(currentY);
      currentY += 15;

      // ---------------------------------------------------------
      // 4. SUMMARY & QR CODE
      // ---------------------------------------------------------
      
      if (currentY > 600) {
          doc.addPage();
          currentY = 50;
      }

      const summaryStartY = currentY;

      // --- RIGHT SIDE: TOTALS ---
      const labelColX = 340; 
      const valColX = 450;   
      const labelWidth = 100;
      const valWidth = 90;

      doc.font("Helvetica").fontSize(10).fillColor("#000000");
      
      // Subtotal
      doc.text("Subtotal:", labelColX, currentY, { width: labelWidth, align: "right" });
      doc.text(invoice.totalAmount.toFixed(2), valColX, currentY, { width: valWidth, align: "right" });
      currentY += 20;

      // Discount
      if (invoice.discount > 0) {
        doc.fillColor("#ef4444");
        doc.text("Discount:", labelColX, currentY, { width: labelWidth, align: "right" });
        doc.text(`- ${invoice.discount.toFixed(2)}`, valColX, currentY, { width: valWidth, align: "right" });
        doc.fillColor("#000000");
        currentY += 20;
      }

      // Divider
      doc.strokeColor(lineColor).lineWidth(1)
         .moveTo(labelColX, currentY).lineTo(startX + width, currentY).stroke();
      currentY += 10;

      // Grand Total
      doc.fontSize(14).font("Helvetica-Bold").fillColor(primaryColor);
      doc.text("Total:", labelColX, currentY - 2, { width: labelWidth, align: "right" });
      doc.text(`Rs. ${invoice.finalAmount.toFixed(2)}`, valColX, currentY - 2, { width: valWidth, align: "right" });

      // --- LEFT SIDE: QR CODE ---
      // const upiId = user.upiId || "your-upi@okaxis"; 
      // const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(user.businessName)}&am=${invoice.finalAmount}&cu=INR&tn=Invoice-${invoice._id.toString().slice(-4)}`;
      const upiString = `upi://pay?pa=princegupta7698-1@okhdfcbank&pn=Prince%20Gupta&am=${invoice.finalAmount}&cu=INR&aid=uGICAgMDQ4d_yPg&tn=Invoice-${invoice._id.toString().slice(-4)}`;
      
      // Generate QR
      const qrDataUrl = await QRCode.toDataURL(upiString, { margin: 1 });
      const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
      const imgBuffer = Buffer.from(base64Data, 'base64');
      
      doc.image(imgBuffer, startX, summaryStartY, { width: 90, height: 90 });
      doc.fontSize(9).font("Helvetica").fillColor(secondaryColor);
      doc.text("Scan to Pay via UPI", startX, summaryStartY + 95, { width: 90, align: "center" });

      // ---------------------------------------------------------
      // 5. FOOTER
      // ---------------------------------------------------------
      const bottomY = doc.page.height - 50;
      doc.fontSize(8).font("Helvetica").fillColor(secondaryColor);
      doc.text("Thank you for your business!", startX, bottomY - 15, { align: "center", width: width });
      doc.text(`Generated by Tradly | ${user.email}`, startX, bottomY, { align: "center", width: width });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
};