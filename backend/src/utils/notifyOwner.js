import fetch from 'node-fetch';

const CALLMEBOT_ENDPOINT = 'https://api.callmebot.com/whatsapp.php';

const formatCurrency = (value = 0) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return `₹${value}`;
  }
};

export const notifyOwner = async (order) => {
  try {
    const phone = process.env.WHATSAPP_ADMIN_PHONE;
    const apiKey = process.env.WHATSAPP_API_KEY;

    if (!phone || !apiKey) {
      console.warn('⚠️ WhatsApp notification skipped: missing WHATSAPP_ADMIN_PHONE or WHATSAPP_API_KEY');
      return;
    }

    const totalAmount = formatCurrency(order.totalPrice || 0);
    const customerName = order.shippingAddress?.name || 'Customer';
    const message = `New Order: ${order._id}\nCustomer: ${customerName}\nItems: ${order.orderItems?.length || 0}\nTotal: ${totalAmount}`;

    const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+${phone.trim().replace(/[^0-9]/g, '')}`;

    const params = new URLSearchParams({
      phone: normalizedPhone,
      apikey: apiKey,
      text: message
    });

    const response = await fetch(`${CALLMEBOT_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`CallMeBot error: ${response.status} ${body}`);
    }

    console.log('✅ WhatsApp notification sent to store owner');
  } catch (error) {
    console.error('❌ Failed to send WhatsApp notification:', error.message);
  }
};

export const notifyOwnerForMessage = async (message) => {
  try {
    const phone = process.env.WHATSAPP_ADMIN_PHONE;
    const apiKey = process.env.WHATSAPP_API_KEY;

    if (!phone || !apiKey) {
      console.warn('⚠️ WhatsApp notification skipped: missing WHATSAPP_ADMIN_PHONE or WHATSAPP_API_KEY');
      return;
    }

    const customerName = message.name || 'Visitor';
    const subject = message.subject || 'Message';
    const summary = (message.message || '').slice(0, 120).replace(/\n/g, ' ');
    const text = `New Contact Message\nFrom: ${customerName}\nSubject: ${subject}\nEmail: ${message.email || 'N/A'}\nPhone: ${message.phone || 'N/A'}\n---\n${summary}`;

    const normalizedPhone = phone.trim().startsWith('+') ? phone.trim() : `+${phone.trim().replace(/[^0-9]/g, '')}`;

    const params = new URLSearchParams({
      phone: normalizedPhone,
      apikey: apiKey,
      text
    });

    const response = await fetch(`${CALLMEBOT_ENDPOINT}?${params.toString()}`);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`CallMeBot error: ${response.status} ${body}`);
    }

    console.log('✅ WhatsApp notification sent for message');
  } catch (error) {
    console.error('❌ Failed to send WhatsApp notification for message:', error.message);
  }
};
