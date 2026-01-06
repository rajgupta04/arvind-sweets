import fetch from 'node-fetch';

function getEnv(name) {
  const v = process.env[name];
  return v != null ? String(v).trim() : '';
}

function normalizeDigits(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

export function normalizeWhatsAppTo(value, { defaultCountryCode = '+91' } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('+')) {
    const digits = normalizeDigits(raw);
    return digits ? `+${digits}` : '';
  }

  const digits = normalizeDigits(raw);
  if (!digits) return '';

  // If user already included country code (e.g. 9199....)
  if (digits.length >= 11) {
    return `+${digits}`;
  }

  // Typical Indian local 10-digit
  if (digits.length === 10) {
    const ccDigits = normalizeDigits(defaultCountryCode);
    if (!ccDigits) return `+${digits}`;
    return `+${ccDigits}${digits}`;
  }

  return `+${digits}`;
}

export function normalizeWhatsAppCloudTo(value, { defaultCountryCode = '+91' } = {}) {
  // WhatsApp Cloud API expects digits only (countrycode + number), no '+'
  const e164 = normalizeWhatsAppTo(value, { defaultCountryCode });
  return normalizeDigits(e164);
}

function maskTo(toDigits) {
  const d = normalizeDigits(toDigits);
  if (d.length <= 4) return d;
  return `${'*'.repeat(Math.max(0, d.length - 4))}${d.slice(-4)}`;
}

export async function sendWhatsAppCloudTemplate({
  to,
  templateName,
  languageCode = 'en_US',
  components,
}) {
  const accessToken = getEnv('WHATSAPP_CLOUD_ACCESS_TOKEN');
  const phoneNumberId = getEnv('WHATSAPP_CLOUD_PHONE_NUMBER_ID');
  const apiVersion = getEnv('WHATSAPP_CLOUD_API_VERSION') || 'v20.0';

  if (!accessToken || !phoneNumberId) {
    console.warn('⚠️ WhatsApp Cloud API skipped: missing WHATSAPP_CLOUD_ACCESS_TOKEN or WHATSAPP_CLOUD_PHONE_NUMBER_ID');
    return { ok: false, skipped: true };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const toDigits = normalizeDigits(to);
  if (!toDigits) {
    console.warn('⚠️ WhatsApp Cloud API skipped: missing recipient number');
    return { ok: false, skipped: true, reason: 'missing_to' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: toDigits,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(Array.isArray(components) && components.length ? { components } : {}),
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = data?.error?.message || `WhatsApp Cloud API error: ${resp.status}`;
    console.error('❌ WhatsApp Cloud template send failed:', message);
    return { ok: false, status: resp.status, data };
  }

  console.log(`✅ WhatsApp Cloud template sent to ${maskTo(toDigits)}`);

  return { ok: true, data };
}

export async function sendWhatsAppCloudText({ to, body, previewUrl = false }) {
  const accessToken = getEnv('WHATSAPP_CLOUD_ACCESS_TOKEN');
  const phoneNumberId = getEnv('WHATSAPP_CLOUD_PHONE_NUMBER_ID');
  const apiVersion = getEnv('WHATSAPP_CLOUD_API_VERSION') || 'v20.0';

  if (!accessToken || !phoneNumberId) {
    console.warn('⚠️ WhatsApp Cloud API skipped: missing WHATSAPP_CLOUD_ACCESS_TOKEN or WHATSAPP_CLOUD_PHONE_NUMBER_ID');
    return { ok: false, skipped: true };
  }

  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const toDigits = normalizeDigits(to);
  if (!toDigits) {
    console.warn('⚠️ WhatsApp Cloud API skipped: missing recipient number');
    return { ok: false, skipped: true, reason: 'missing_to' };
  }

  const payload = {
    messaging_product: 'whatsapp',
    to: toDigits,
    type: 'text',
    text: {
      body,
      preview_url: Boolean(previewUrl),
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const message = data?.error?.message || `WhatsApp Cloud API error: ${resp.status}`;
    console.error('❌ WhatsApp Cloud text send failed:', message);
    return { ok: false, status: resp.status, data };
  }

  console.log(`✅ WhatsApp Cloud text sent to ${maskTo(toDigits)}`);

  return { ok: true, data };
}

export function isWhatsAppCloudEnabled() {
  return getEnv('WHATSAPP_CLOUD_ENABLED').toLowerCase() === 'true';
}

function shouldTemplateThenText() {
  // When using templates for first-touch, you can optionally follow up with a text
  // message after the template is accepted/sent.
  return (getEnv('WHATSAPP_CLOUD_TEMPLATE_THEN_TEXT') || 'false').toLowerCase() === 'true';
}

export function getWhatsAppDefaultCountryCode() {
  return getEnv('WHATSAPP_DEFAULT_COUNTRY_CODE') || '+91';
}

export function getAdminWhatsAppTo() {
  return getEnv('WHATSAPP_ADMIN_TO') || getEnv('WHATSAPP_ADMIN_PHONE');
}

function shouldUseTemplateForAudience(audience) {
  // Global toggle
  const globalUseTemplate = (getEnv('WHATSAPP_CLOUD_USE_TEMPLATE') || 'false').toLowerCase() === 'true';
  if (!globalUseTemplate) return false;

  // By default, keep admin notifications text-only to avoid sending the placeholder
  // Meta "hello_world" template. You can override with:
  //   WHATSAPP_CLOUD_ADMIN_USE_TEMPLATE=true
  if (audience === 'admin') {
    return (getEnv('WHATSAPP_CLOUD_ADMIN_USE_TEMPLATE') || 'false').toLowerCase() === 'true';
  }

  return true;
}

export async function sendWhatsAppCloudOrderPlaced({ order, to, audience }) {
  const templateName = getEnv('WHATSAPP_TEMPLATE_ORDER_PLACED') || getEnv('WHATSAPP_CLOUD_TEMPLATE_NAME') || 'hello_world';
  const languageCode = getEnv('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US';

  // Templates are required for first-touch/outside 24h for users/delivery_boy.
  // For admin, default is text-only unless WHATSAPP_CLOUD_ADMIN_USE_TEMPLATE=true.
  const useTemplate = shouldUseTemplateForAudience(audience);

  if (useTemplate) {
    // If the chosen template has variables, the Cloud API requires parameters.
    // Common admin template layout (as in Meta UI):
    //   Body vars: {{name}}, {{order_id}}, {{total}}, {{delivery_type}}, {{payment_method}}
    // Note: WhatsApp Cloud API parameters are POSITIONAL; "names" in the UI are just labels.
    const customerName =
      safeLine(order?.shippingAddress?.name) ||
      safeLine(order?.user?.name) ||
      'Customer';
    const orderId = String(order?._id || '').trim() || 'NA';
    const totalNumber = Math.round(Number(order?.totalPrice || 0));
    const deliveryType = safeLine(order?.deliveryType) || 'NA';
    const paymentMethod = safeLine(order?.paymentMethod) || 'NA';

    const components = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: customerName },
          { type: 'text', text: orderId },
          { type: 'text', text: String(totalNumber) },
          { type: 'text', text: deliveryType },
          { type: 'text', text: paymentMethod },
        ],
      },
    ];

    const templateResult = await sendWhatsAppCloudTemplate({ to, templateName, languageCode, components });
    if (!shouldTemplateThenText()) return templateResult;

    const msg = buildOrderDetailsText({
      order,
      title: audience === 'admin' ? 'New Order Received' : 'Order Confirmed',
      audience,
    });

    const textResult = await sendWhatsAppCloudText({ to, body: msg });
    return {
      ok: Boolean(templateResult?.ok) && Boolean(textResult?.ok),
      data: {
        template: templateResult?.data || null,
        text: textResult?.data || null,
      },
      status: textResult?.status || templateResult?.status,
    };
  }

  const msg = buildOrderDetailsText({
    order,
    title: audience === 'admin' ? 'New Order Received' : 'Order Confirmed',
    audience,
  });

  return sendWhatsAppCloudText({ to, body: msg });
}

export async function sendWhatsAppCloudOrderCancelled({ order, to, audience }) {
  const templateName = getEnv('WHATSAPP_TEMPLATE_ORDER_CANCELLED') || getEnv('WHATSAPP_CLOUD_TEMPLATE_NAME') || 'hello_world';
  const languageCode = getEnv('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US';
  const useTemplate = shouldUseTemplateForAudience(audience);

  if (useTemplate) {
    const templateResult = await sendWhatsAppCloudTemplate({ to, templateName, languageCode });
    if (!shouldTemplateThenText()) return templateResult;

    const reasonLabel = order?.cancellation?.reasonLabel || 'Cancelled';
    const extra = (order?.cancellation?.message || '').trim();

    const msg =
      buildOrderDetailsText({
        order,
        title: audience === 'admin' ? 'Order Cancelled' : 'Order Cancelled',
        audience,
        extraTopLines: [`Reason: ${reasonLabel}`, ...(extra ? [`Message: ${extra}`] : [])],
      }) + (audience === 'user' ? '\n\nIf this was a mistake, please contact the shop.' : '');

    const textResult = await sendWhatsAppCloudText({ to, body: msg });
    return {
      ok: Boolean(templateResult?.ok) && Boolean(textResult?.ok),
      data: {
        template: templateResult?.data || null,
        text: textResult?.data || null,
      },
      status: textResult?.status || templateResult?.status,
    };
  }

  const reasonLabel = order?.cancellation?.reasonLabel || 'Cancelled';
  const extra = (order?.cancellation?.message || '').trim();

  const msg =
    buildOrderDetailsText({
      order,
      title: audience === 'admin' ? 'Order Cancelled' : 'Order Cancelled',
      audience,
      extraTopLines: [
        `Reason: ${reasonLabel}`,
        ...(extra ? [`Message: ${extra}`] : []),
      ],
    }) +
    (audience === 'user' ? '\n\nIf this was a mistake, please contact the shop.' : '');

  return sendWhatsAppCloudText({ to, body: msg });
}

export async function sendWhatsAppCloudDeliveryAssigned({ order, deliveryBoy, to }) {
  const templateName = getEnv('WHATSAPP_TEMPLATE_DELIVERY_ASSIGNED') || getEnv('WHATSAPP_CLOUD_TEMPLATE_NAME') || 'hello_world';
  const languageCode = getEnv('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US';
  const useTemplate = (getEnv('WHATSAPP_CLOUD_USE_TEMPLATE') || 'false').toLowerCase() === 'true';

  if (useTemplate) {
    const templateResult = await sendWhatsAppCloudTemplate({ to, templateName, languageCode });
    if (!shouldTemplateThenText()) return templateResult;

    const shopName = getEnv('SHOP_NAME') || 'Arvind Sweets';
    const msg = buildOrderDetailsText({
      order,
      title: 'New Delivery Assigned',
      audience: 'delivery_boy',
      extraTopLines: [
        `Pickup: ${shopName}`,
        ...(deliveryBoy?.name ? [`Assigned to: ${deliveryBoy.name}`] : []),
      ],
    });

    const textResult = await sendWhatsAppCloudText({ to, body: msg });
    return {
      ok: Boolean(templateResult?.ok) && Boolean(textResult?.ok),
      data: {
        template: templateResult?.data || null,
        text: textResult?.data || null,
      },
      status: textResult?.status || templateResult?.status,
    };
  }

  const shopName = getEnv('SHOP_NAME') || 'Arvind Sweets';
  const msg = buildOrderDetailsText({
    order,
    title: 'New Delivery Assigned',
    audience: 'delivery_boy',
    extraTopLines: [
      `Pickup: ${shopName}`,
      ...(deliveryBoy?.name ? [`Assigned to: ${deliveryBoy.name}`] : []),
    ],
  });

  return sendWhatsAppCloudText({ to, body: msg });
}

function formatInr(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '₹0';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
}

function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function safeLine(s) {
  // Avoid breaking WhatsApp formatting with weird whitespace
  return normalizeSpaces(s).replace(/\n+/g, ' ');
}

function buildAddressLines(shipping) {
  const s = shipping || {};
  const lines = [];

  const name = safeLine(s.name);
  const phone = safeLine(s.phone);
  if (name) lines.push(`Name: ${name}`);
  if (phone) lines.push(`Phone: ${phone}`);

  const street = safeLine(s.street);
  const city = safeLine(s.city);
  const state = safeLine(s.state);
  const pincode = safeLine(s.pincode);

  const addrParts = [street, [city, state].filter(Boolean).join(', '), pincode].filter(Boolean);
  if (addrParts.length) {
    lines.push(`Address: ${addrParts.join(' ')}`.replace(/\s+,/g, ','));
  }

  return lines;
}

function buildItemsLines(order, { maxItems = 8 } = {}) {
  const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
  if (items.length === 0) return ['(No items)'];

  const lines = [];
  const take = Math.min(items.length, maxItems);
  for (let i = 0; i < take; i += 1) {
    const it = items[i] || {};
    const name = safeLine(it.name || 'Item');
    const qty = Number(it.quantity) || 0;
    const unit = Number(it.price) || 0;
    const lineTotal = unit * qty;
    lines.push(`${i + 1}. ${name} ×${qty} — ${formatInr(lineTotal)}`);
  }

  if (items.length > take) {
    lines.push(`…and ${items.length - take} more item(s)`);
  }

  return lines;
}

function truncateMessage(msg, maxChars) {
  const s = String(msg || '');
  if (s.length <= maxChars) return s;
  return `${s.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function buildOrderDetailsText({ order, title, audience, extraTopLines = [] }) {
  const shopName = getEnv('SHOP_NAME') || 'Arvind Sweets';
  const id = order?._id ? String(order._id) : '';
  const status = safeLine(order?.orderStatus || '');
  const paymentMethod = safeLine(order?.paymentMethod || '');
  const deliveryType = safeLine(order?.deliveryType || '');

  const customerName = safeLine(order?.shippingAddress?.name || order?.user?.name || 'Customer');

  const itemsPrice = order?.itemsPrice ?? null;
  const deliveryCharge = order?.deliveryCharge ?? null;
  const discountAmount = order?.coupon?.discountAmount ?? 0;
  const totalPrice = order?.totalPrice ?? null;

  const lines = [];
  lines.push(`*${safeLine(title)}*`);
  lines.push(shopName ? `*${safeLine(shopName)}*` : '');
  if (id) lines.push(`Order ID: ${id}`);
  if (status) lines.push(`Status: ${status}`);
  if (audience !== 'delivery_boy') lines.push(`Customer: ${customerName}`);

  for (const l of extraTopLines) {
    const v = safeLine(l);
    if (v) lines.push(v);
  }

  lines.push('');
  lines.push('*Items*');
  lines.push(...buildItemsLines(order, { maxItems: 8 }));

  lines.push('');
  lines.push('*Summary*');
  if (itemsPrice != null) lines.push(`Items: ${formatInr(itemsPrice)}`);
  if (deliveryCharge != null) lines.push(`Delivery: ${formatInr(deliveryCharge)}`);
  if (Number(discountAmount) > 0) lines.push(`Discount: -${formatInr(discountAmount)}`);
  if (totalPrice != null) lines.push(`Total: *${formatInr(totalPrice)}*`);

  if (paymentMethod) lines.push(`Payment: ${paymentMethod}`);
  if (deliveryType) lines.push(`Type: ${deliveryType}`);

  const addressLines = buildAddressLines(order?.shippingAddress);
  if (addressLines.length) {
    lines.push('');
    lines.push('*Delivery Details*');
    lines.push(...addressLines);
  }

  const msg = lines.filter(Boolean).join('\n');

  // WhatsApp text max is ~4096 chars.
  return truncateMessage(msg, 3900);
}
