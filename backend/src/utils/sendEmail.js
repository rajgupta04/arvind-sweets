import nodemailer from 'nodemailer';

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error('Missing EMAIL_USER or EMAIL_PASS for Nodemailer');
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });

  return transporter;
};

const buildOrderHtml = (order) => {
  const items = (order.orderItems || [])
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 8px;border:1px solid #eee;">${item.name}</td>
          <td style="padding:6px 8px;border:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:6px 8px;border:1px solid #eee;text-align:right;">₹${item.price}</td>
        </tr>`
    )
    .join('');

  const shipping = order.shippingAddress || {};

  return `
    <div style="font-family:Arial,sans-serif;">
      <h2>New Order Received</h2>
      <p><strong>Order ID:</strong> ${order._id}</p>
      <p><strong>Customer:</strong> ${shipping.name || 'N/A'} (${shipping.phone || 'N/A'})</p>
      <p><strong>Total:</strong> ₹${order.totalPrice}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      <p><strong>Delivery Type:</strong> ${order.deliveryType}</p>
      <h3>Shipping Address</h3>
      <p>
        ${shipping.street || ''}<br/>
        ${shipping.city || ''}, ${shipping.state || ''} ${shipping.pincode || ''}
      </p>
      <h3>Items</h3>
      <table style="border-collapse:collapse;width:100%;font-size:14px;">
        <thead>
          <tr>
            <th style="padding:6px 8px;border:1px solid #eee;text-align:left;">Item</th>
            <th style="padding:6px 8px;border:1px solid #eee;text-align:center;">Qty</th>
            <th style="padding:6px 8px;border:1px solid #eee;text-align:right;">Price</th>
          </tr>
        </thead>
        <tbody>${items}</tbody>
      </table>
    </div>
  `;
};

export const sendOrderEmail = async (order) => {
  try {
    if (process.env.EMAIL_NOTIFICATIONS !== 'true') {
      return;
    }

    const user = process.env.EMAIL_USER;
    const toAddress = process.env.NOTIFY_EMAIL || user;

    if (!user || !toAddress) {
      console.warn('⚠️ Email notification skipped: missing EMAIL_USER/NOTIFY_EMAIL');
      return;
    }

    const transporterInstance = getTransporter();
    const html = buildOrderHtml(order);

    await transporterInstance.sendMail({
      from: `Arvind Sweets <${user}>`,
      to: toAddress,
      subject: `New Order Received - ${order._id}`,
      html
    });

    console.log('📧 Order email notification sent');
  } catch (error) {
    console.error('❌ Failed to send email notification:', error.message);
  }
};

