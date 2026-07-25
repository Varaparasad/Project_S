import nodemailer from "nodemailer";

/* ------------------------------------------------------------------ */
/*  Config / transport helpers                                        */
/* ------------------------------------------------------------------ */

const configured = () =>
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.ADMIN_EMAIL
  );

const transport = () => {
  const port = Number(process.env.SMTP_PORT || 465);
  const isSecure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : (port === 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                */
/* ------------------------------------------------------------------ */

const getOrderId = (order) => order._id.toString().slice(-6).toUpperCase();

const formatMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const formatItemsPlain = (items = []) =>
  items.map((i) => `• ${i.name} × ${i.quantity}`).join("\n");

const formatItemsHtml = (items = []) =>
  items
    .map(
      (i) =>
        `<li>${i.name} × ${i.quantity}${
          i.unit ? ` ${i.unit}` : ""
        }${i.price ? ` — ${formatMoney(i.price)}` : ""}</li>`
    )
    .join("");

const normalizePhone = (phone = "") => {
  const digits = String(phone).replace(/\D/g, "");
  return digits.startsWith("91") ? digits : `91${digits}`;
};

const isDelivery = (order) =>
  String(order.fulfilment).toLowerCase() === "delivery";

/* ------------------------------------------------------------------ */
/*  Message builders                                                  */
/* ------------------------------------------------------------------ */

const getCleanMapsUrl = (rawAddress = '', lat = null, lng = null) => {
  if (lat && lng) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (!rawAddress) return '';
  // Strip label prefix like "Home: ", "Work: ", etc. to get exact street line, city & pincode
  const clean = String(rawAddress)
    .replace(/^[^:]+:\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
};

function buildWhatsAppMessage(order, id) {
  const delivery = isDelivery(order);

  const lines = [
    `Hello ${order.customerName},`,
    ``,
    `Thank you for ordering from ${process.env.STORE_NAME || "our store"}.`,
    ``,
    `Order ID:`,
    id,
    ``,
    `Items:`,
    formatItemsPlain(order.items),
    ``,
    `Total:`,
    formatMoney(order.totalAmount),
    ``,
    `Fulfilment:`,
    delivery ? "Delivery" : "Pickup",
  ];

  if (delivery) {
    lines.push(``, `Delivery Address:`, order.deliveryAddress || "-");
  }

  lines.push(``, `We will contact you shortly.`, ``, `Thank you.`);

  return lines.join("\n");
}

function buildTelegramMessage(order, id) {
  const delivery = isDelivery(order);

  const lines = [
    `🛒 NEW ORDER #${id}`,
    ``,
    `👤 Customer`,
    order.customerName,
    ``,
    `📞 Phone`,
    order.customerPhone,
    ``,
    `📧 Email`,
    order.customerEmail || "-",
    ``,
    `🍔 Items`,
    ``,
    formatItemsPlain(order.items),
    ``,
    `💰 Total`,
    formatMoney(order.totalAmount),
    ``,
    `📦 Fulfilment`,
    delivery ? "Delivery" : "Pickup",
  ];

  if (delivery && order.deliveryAddress) {
    const cleanUrl = getCleanMapsUrl(order.deliveryAddress, order.latitude, order.longitude);
    lines.push(
      ``,
      `📍 Delivery Address`,
      order.deliveryAddress,
      ``,
      `🗺️ Exact GPS Pin / Maps Link:`,
      cleanUrl
    );
  }

  return lines.join("\n");
}

function buildEmailHtml(order, id, whatsappUrl, mapsUrl) {
  const delivery = isDelivery(order);
  const store = process.env.STORE_NAME || "Store";

  const greyBox = (content) => `
    <div style="border:1px solid #ccc;background:#f5f5f5;border-radius:6px;padding:10px 14px;margin:8px 0;">
      ${content}
    </div>`;

  const buttonsHtml = `
    <div style="margin-top:20px;">
      <a href="${whatsappUrl}" style="display:inline-block;background:#25D366;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;margin-right:10px;">
        💬 Open WhatsApp
      </a>
      ${
        delivery && mapsUrl
          ? `<a href="${mapsUrl}" target="_blank" style="display:inline-block;background:#4285F4;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:bold;">
              📍 Open Google Maps Pin
            </a>`
          : ""
      }
    </div>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#222;">
    <h2 style="margin-bottom:4px;">🛒 New Order #${id}</h2>
    <p style="color:#666;margin-top:0;">${store}</p>

    <p><b>Customer:</b> ${order.customerName}<br/>
    <b>Email:</b> ${order.customerEmail || "-"}</p>

    ${greyBox(
      `<b>📞 Phone</b><br/><a href="tel:${order.customerPhone}" style="color:#222;text-decoration:none;">${order.customerPhone}</a>`
    )}

    <p><b>🍔 Items</b></p>
    <ul style="padding-left:20px;margin-top:0;">
      ${formatItemsHtml(order.items)}
    </ul>

    <p>
      <b>💰 Total:</b> ${formatMoney(order.totalAmount)}<br/>
      <b>📦 Fulfilment:</b> ${delivery ? "Delivery" : "Pickup"}
    </p>

    ${
      delivery
        ? greyBox(
            `<b>📍 Delivery Address</b><br/>${(
              order.deliveryAddress || "-"
            ).replace(/\n/g, "<br/>")}`
          )
        : ""
    }

    ${buttonsHtml}
  </div>`;
}

/* ------------------------------------------------------------------ */
/*  Telegram                                                           */
/* ------------------------------------------------------------------ */

async function sendTelegramMessage(text, replyMarkup) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.log("⚠️ Telegram is not configured.");
    return;
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text,
          reply_markup: replyMarkup,
        }),
      }
    );

    const data = await res.json();

    if (data.ok) {
      console.log("✅ Telegram notification sent");
    } else {
      console.error("❌ Telegram failed", data);
    }
  } catch (err) {
    console.error("❌ Telegram failed", err);
  }
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export async function sendOrderAlert(order) {
  const id = getOrderId(order);
  const delivery = isDelivery(order);

  const waPhone = normalizePhone(order.customerPhone);
  const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(
    buildWhatsAppMessage(order, id)
  )}`;

  const mapsUrl = delivery ? getCleanMapsUrl(order.deliveryAddress, order.latitude, order.longitude) : null;

  /* ---------------- Telegram (primary) ---------------- */

  const inlineKeyboard = [
    [{ text: "💬 WhatsApp Customer", url: whatsappUrl }],
  ];

  if (delivery && mapsUrl) {
    inlineKeyboard.push([{ text: "📍 Open Maps", url: mapsUrl }]);
  }

  await sendTelegramMessage(buildTelegramMessage(order, id), {
    inline_keyboard: inlineKeyboard,
  });

  /* ---------------- Email (backup) ---------------- */

  if (!configured()) {
    console.log("⚠️ SMTP not configured.");
    return;
  }

  try {
    await transport().sendMail({
      from: `"${process.env.STORE_NAME || "Store"}" <${process.env.SMTP_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🛒 NEW ORDER #${id}`,
      text: buildWhatsAppMessage(order, id),
      html: buildEmailHtml(order, id, whatsappUrl, mapsUrl),
    });

    console.log("✅ Email sent");
    await sendTelegramMessage(`✅ Backup email sent for order #${id}`);
  } catch (err) {
    console.error("❌ Email failed", err);
    await sendTelegramMessage(`❌ Backup email FAILED for order #${id}: ${err.message}`);
  }
}

export async function sendTestEmail(toEmail) {
  if (!configured()) {
    throw new Error('SMTP environment variables are missing (SMTP_HOST, SMTP_USER, SMTP_PASS, ADMIN_EMAIL).');
  }
  const recipient = toEmail || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const info = await transport().sendMail({
    from: `"${process.env.STORE_NAME || "Reddy's Home Foods"}" <${process.env.SMTP_USER}>`,
    to: recipient,
    subject: `⚡ Test Email from ${process.env.STORE_NAME || "Reddy's Home Foods"}`,
    text: `Hello! This is a test email sent from your website via Port 465 SSL. If you received this, email delivery is working 100% on Render!`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px;border:1px solid #16a34a;border-radius:10px;background:#f0fdf4;">
        <h2 style="color:#15803d;margin:0 0 10px;">✅ Email Delivery Test Successful!</h2>
        <p style="color:#1e293b;font-size:14px;">This test email was sent successfully via <b>Port 465 (Implicit SSL)</b> on <b>${process.env.STORE_NAME || "Reddy's Home Foods"}</b>.</p>
        <p style="color:#64748b;font-size:12px;margin-top:15px;">Recipient: ${recipient}</p>
      </div>`
  });
  console.log('✅ Test email sent successfully:', info.messageId);
  return info;
}