import express from 'express';

import { protect, admin } from '../middleware/authMiddleware.js';
import {
  isWhatsAppCloudEnabled,
  normalizeWhatsAppCloudTo,
  buildOrderDetailsText,
  sendWhatsAppCloudTemplate,
  sendWhatsAppCloudText,
  sendWhatsAppCloudOrderPlaced,
} from '../utils/whatsappCloud.js';

import Order from '../models/Order.js';

const router = express.Router();

// Admin-only debug endpoint.
// Example:
//   GET /api/debug/whatsapp/hello?to=8340252219&mode=text
//   GET /api/debug/whatsapp/hello?to=8340252219&mode=template
router.get('/hello', protect, admin, async (req, res) => {
  if (!isWhatsAppCloudEnabled()) {
    return res.status(400).json({
      ok: false,
      message: 'WhatsApp Cloud is disabled. Set WHATSAPP_CLOUD_ENABLED=true',
    });
  }

  const mode = String(req.query.mode || 'text').toLowerCase();
  const toRaw = String(req.query.to || '').trim() || '8340252219';
  const to = normalizeWhatsAppCloudTo(toRaw);

  if (!to) {
    return res.status(400).json({ ok: false, message: 'Missing or invalid to' });
  }

  try {
    const body = String(req.query.body || 'hello from website').trim();

    let result;
    if (mode === 'template') {
      result = await sendWhatsAppCloudTemplate({
        to,
        templateName: 'hello_world',
        languageCode: 'en_US',
      });
    } else if (mode === 'combo') {
      const templateResult = await sendWhatsAppCloudTemplate({
        to,
        templateName: 'hello_world',
        languageCode: 'en_US',
      });
      const textResult = await sendWhatsAppCloudText({ to, body });
      result = {
        ok: Boolean(templateResult?.ok) && Boolean(textResult?.ok),
        data: {
          template: templateResult?.data || null,
          text: textResult?.data || null,
        },
        status: textResult?.status || templateResult?.status,
      };
    } else {
      result = await sendWhatsAppCloudText({ to, body });
    }

    return res.status(result?.ok ? 200 : 502).json({
      ok: Boolean(result?.ok),
      mode,
      toRaw,
      toNormalized: to,
      meta: result?.data || null,
      status: result?.status || null,
      skipped: Boolean(result?.skipped),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      message: err?.message || 'Failed to send WhatsApp message',
    });
  }
});

export default router;

// Send actual formatted order-details message (admin-only)
// Example:
//   GET /api/debug/whatsapp/order/ORDER_ID?to=8340252219&audience=admin
router.get('/order/:id', protect, admin, async (req, res) => {
  if (!isWhatsAppCloudEnabled()) {
    return res.status(400).json({
      ok: false,
      message: 'WhatsApp Cloud is disabled. Set WHATSAPP_CLOUD_ENABLED=true',
    });
  }

  const orderId = String(req.params.id || '').trim();
  const audience = String(req.query.audience || 'admin').trim();
  const mode = String(req.query.mode || 'text').toLowerCase();
  const toRaw = String(req.query.to || '').trim();
  const to = normalizeWhatsAppCloudTo(toRaw);

  if (!orderId) return res.status(400).json({ ok: false, message: 'Missing order id' });
  if (!to) return res.status(400).json({ ok: false, message: 'Missing or invalid to' });

  try {
    const order = await Order.findById(orderId).populate('user', 'name email');
    if (!order) return res.status(404).json({ ok: false, message: 'Order not found' });

    let result;
    if (mode === 'template') {
      result = await sendWhatsAppCloudTemplate({ to, templateName: 'hello_world', languageCode: 'en_US' });
    } else if (mode === 'combo') {
      result = await sendWhatsAppCloudOrderPlaced({ order, to, audience });
    } else {
      // text-only (no hello_world) - works once the 24h session is open
      const msg = buildOrderDetailsText({
        order,
        title: audience === 'admin' ? 'New Order Received' : 'Order Confirmed',
        audience,
      });
      result = await sendWhatsAppCloudText({ to, body: msg });
    }

    return res.status(result?.ok ? 200 : 502).json({
      ok: Boolean(result?.ok),
      orderId,
      audience,
      mode,
      toRaw,
      toNormalized: to,
      meta: result?.data || null,
      status: result?.status || null,
      skipped: Boolean(result?.skipped),
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err?.message || 'Failed to send order WhatsApp message' });
  }
});
