import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Invoice } from "../models/invoice.model.js";
import { Product } from "../models/product.model.js";
import { Customer } from "../models/customer.model.js";
import { generateInvoicePDF } from "../utils/pdfGenerator.js";
import { sendEmailWithAttachment } from "../utils/emailService.js";

// 1. CREATE INVOICE
const createInvoice = asyncHandler(async (req, res) => {
  const { customerId, items, discount, status, invoiceDate, dueDate } = req.body;

  if (!customerId || !items || items.length === 0) {
    throw new ApiError(400, "Customer and Items are required");
  }

  // --- ✅ DATE LOGIC START ---
  const iDate = invoiceDate ? new Date(invoiceDate) : new Date();
  const dDate = dueDate ? new Date(dueDate) : null;
  let finalStatus = status || "Pending";

  if (dDate) {
    // Normalize to Midnight (ignore time part for comparison)
    const iTime = new Date(iDate).setHours(0, 0, 0, 0);
    const dTime = new Date(dDate).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);

    // 1. Validation: Due Date cannot be before Invoice Date
    if (dTime < iTime) {
      throw new ApiError(400, "Due Date cannot be earlier than Invoice Date");
    }

    // 2. Auto-Overdue Logic: If Pending AND Due Date has passed
    if (finalStatus === "Pending" && dTime < today) {
      finalStatus = "Overdue";
    }
  }
  // --- ✅ DATE LOGIC END ---

  const customer = await Customer.findOne({ _id: customerId, owner: req.user._id });
  if (!customer) throw new ApiError(404, "Customer not found");

  let totalAmount = 0;
  const invoiceItems = [];

  // Use finalStatus for stock check (Overdue/Pending/Paid all deduct stock, Cancelled does not)
  const shouldDeductStock = finalStatus !== "Cancelled";

  for (const item of items) {
    const product = await Product.findOne({ _id: item.productId, owner: req.user._id });
    if (!product) throw new ApiError(404, `Product ${item.productId} not found`);

    if (shouldDeductStock && product.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}. Available: ${product.stock}`);
    }

    const amount = product.price * item.quantity;
    totalAmount += amount;

    invoiceItems.push({
      product: product._id,
      name: product.name,
      barcode: product.barcode,
      quantity: item.quantity,
      price: product.price
    });

    if (shouldDeductStock) {
      product.stock -= item.quantity;
      await product.save({ validateBeforeSave: false });
    }
  }

  const finalAmount = totalAmount - (discount || 0);

  const invoice = await Invoice.create({
    owner: req.user._id,
    customer: customer._id,
    items: invoiceItems,
    totalAmount,
    discount: discount || 0,
    finalAmount,
    status: finalStatus, // ✅ Use calculated status
    invoiceDate: iDate,
    dueDate: dDate
  });

  return res.status(201).json(new ApiResponse(201, invoice, "Invoice created successfully"));
});

// 2. GET ALL INVOICES
const getMyInvoices = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({ owner: req.user._id }).populate("customer", "name email").sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, invoices, "Invoices fetched successfully"));
});

// 3. GET SINGLE INVOICE
const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id }).populate("customer", "name email phone address");
  if (!invoice) throw new ApiError(404, "Invoice not found");
  return res.status(200).json(new ApiResponse(200, invoice, "Invoice details fetched"));
});

// 4. UPDATE STATUS (With Stock Restoration)
const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const invoice = await Invoice.findOne({ _id: req.params.id, owner: req.user._id });
  if (!invoice) throw new ApiError(404, "Invoice not found");

  // If changing TO Cancelled (and wasn't already), Increase Stock
  if (status === "Cancelled" && invoice.status !== "Cancelled") {
    for (const item of invoice.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save({ validateBeforeSave: false });
      }
    }
  }

  // ✅ Optional: If re-activating a Cancelled invoice (e.g., Cancelled -> Paid), should we decrease stock again?
  // Logic: If status WAS Cancelled AND new status is NOT Cancelled, decrease stock
  if (invoice.status === "Cancelled" && status !== "Cancelled") {
    for (const item of invoice.items) {
      const product = await Product.findById(item.product);
      if (product) {
        if (product.stock < item.quantity) {
          throw new ApiError(400, `Cannot reactivate invoice. Insufficient stock for ${product.name}`);
        }
        product.stock -= item.quantity;
        await product.save({ validateBeforeSave: false });
      }
    }
  }

  invoice.status = status;
  await invoice.save();

  return res.status(200).json(new ApiResponse(200, invoice, "Invoice status updated"));
});

// 5. SEND INVOICE EMAIL
// ------------------------------------------------------------------
const sendInvoiceReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findOne({ _id: id, owner: req.user._id }).populate("customer");

  if (!invoice) throw new ApiError(404, "Invoice not found");
  if (!invoice.customer.email) throw new ApiError(400, "Customer does not have an email address");

  // Reusable PDF generation
  const pdfBuffer = await generateInvoicePDF(invoice, req.user);

  // Email Body (Condensed for brevity)
  const invoiceNo = invoice._id.toString().slice(-6).toUpperCase();
  const date = new Date(invoice.createdAt).toLocaleDateString();
  const amount = invoice.finalAmount.toFixed(2);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      
      <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${req.user.businessName}</h1>
      </div>

      <div style="padding: 30px; background-color: #ffffff;">
        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Dear <strong>${invoice.customer.name}</strong>,</p>
        
        <p style="font-size: 15px; color: #475569; line-height: 1.6;">
          Thank you for your business. Please find attached the invoice for your recent purchase.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 25px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 5px 0; color: #64748b; font-size: 14px;">Invoice No:</td>
              <td style="padding: 5px 0; color: #1e293b; font-weight: bold; text-align: right;">#${invoiceNo}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b; font-size: 14px;">Date:</td>
              <td style="padding: 5px 0; color: #1e293b; font-weight: bold; text-align: right;">${date}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b; font-size: 14px;">Status:</td>
              <td style="padding: 5px 0; color: #1e293b; font-weight: bold; text-align: right;">${invoice.status}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0 0 0; color: #1e293b; font-size: 16px; font-weight: bold; border-top: 1px solid #e2e8f0; margin-top: 10px;">Total Amount:</td>
              <td style="padding: 10px 0 0 0; color: #4f46e5; font-size: 18px; font-weight: bold; text-align: right; border-top: 1px solid #e2e8f0; margin-top: 10px;">Rs. ${amount}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #475569;">
          You can make the payment easily by scanning the <strong>QR Code</strong> inside the attached PDF using any UPI app.
        </p>

        <p style="font-size: 14px; color: #475569;">
          Ignore if already paid.
        </p>

        <p style="font-size: 14px; color: #475569;">
          If you have any questions, feel free to reply to this email.
        </p>

        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            Regards,<br>
            <strong>${req.user.businessName}</strong>
          </p>
        </div>
      </div>
    </div>
  `;

  await sendEmailWithAttachment(
    invoice.customer.email,
    `Invoice #${invoiceNo} from ${req.user.businessName}`,
    emailHtml,
    pdfBuffer,
    `invoice-${invoice._id}.pdf`
  );

  invoice.reminderCount += 1;
  await invoice.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, "Invoice sent successfully"));
});

// ------------------------------------------------------------------
// 6. DOWNLOAD INVOICE (Force Download)
// ------------------------------------------------------------------
const downloadInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findOne({ _id: id, owner: req.user._id }).populate("customer");

  if (!invoice) throw new ApiError(404, "Invoice not found");

  const pdfBuffer = await generateInvoicePDF(invoice, req.user);

  // Set Headers to force browser/client to download
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoice._id}.pdf`);
  res.setHeader("Content-Length", pdfBuffer.length);

  return res.send(pdfBuffer);
});

// ------------------------------------------------------------------
// 7. VIEW INVOICE (View in Browser)
// ------------------------------------------------------------------
const viewInvoice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findOne({ _id: id, owner: req.user._id }).populate("customer");

  if (!invoice) throw new ApiError(404, "Invoice not found");

  const pdfBuffer = await generateInvoicePDF(invoice, req.user);

  // Set Headers to display inline
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename=invoice-${invoice._id}.pdf`);

  return res.send(pdfBuffer);
});

export {
  createInvoice,
  getMyInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  sendInvoiceReminder,
  downloadInvoice,
  viewInvoice
};