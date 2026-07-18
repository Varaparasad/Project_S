import nodemailer from 'nodemailer';

const configured = () => process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const transport = () => nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });

export async function sendOrderAlert(order) {
  if (!configured() || !process.env.ADMIN_EMAIL) return;
  const rows = order.items.map(i => `${i.name} × ${i.quantity}`).join(', ');
  const phone = order.customerPhone.replace(/\D/g, '');
  const id = order._id.toString().slice(-6).toUpperCase();
  const whatsappText = `Hello ${order.customerName},\n\nOrder #${id}\nItems: ${rows}\nTotal: ₹${order.totalAmount}\nAdvance to confirm: ₹${order.advanceRequired}\nFulfilment: ${order.fulfilment}\n\nWe will call you to confirm the order details.`;
  const whatsapp = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}`;
  await transport().sendMail({
    from: process.env.SMTP_USER, to: process.env.ADMIN_EMAIL,
    subject: `New order request #${order._id.toString().slice(-6)} — ${order.customerName}`,
    text: `New order request\n\nCustomer: ${order.customerName}\nPhone: ${order.customerPhone}\nItems: ${rows}\nTotal: ₹${order.totalAmount}\nAdvance: ₹${order.advanceRequired}\n\nCall: tel:${order.customerPhone}\nWhatsApp: ${whatsapp}`,
    html: `<h2>New order #${id}</h2><p><b>${order.customerName}</b><br/>${order.customerPhone}<br/>${order.customerEmail}</p><p><b>Items:</b> ${rows}<br/><b>Total:</b> ₹${order.totalAmount}<br/><b>Advance:</b> ₹${order.advanceRequired}<br/><b>Fulfilment:</b> ${order.fulfilment}</p><p><a href="tel:${order.customerPhone}">Call customer</a> &nbsp; <a href="${whatsapp}">Open WhatsApp</a></p>`
  });
}
