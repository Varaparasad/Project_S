import nodemailer from 'nodemailer';

const configured = () => process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const transport = () => nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });

export async function sendOrderAlert(order) {
  if (!configured() || !process.env.ADMIN_EMAIL) return;
  const rows = order.items.map(i => `${i.name} × ${i.quantity}`).join(', ');
  await transport().sendMail({
    from: process.env.SMTP_USER, to: process.env.ADMIN_EMAIL,
    subject: `New order request #${order._id.toString().slice(-6)} — ${order.customerName}`,
    text: `New order request\n\nCustomer: ${order.customerName}\nPhone: ${order.customerPhone}\nEmail: ${order.customerEmail}\nFulfilment: ${order.fulfilment}\nAddress: ${order.deliveryAddress || 'Pickup'}\nItems: ${rows}\nTotal: ₹${order.totalAmount}\nAdvance to confirm by phone: ₹${order.advanceRequired}\n\nOpen the admin dashboard to call or WhatsApp the customer and update the status.`
  });
}
