import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-relay-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { to, subject, html, secret } = req.body || {};
    const headerSecret = req.headers['x-relay-secret'];

    const expectedSecret = process.env.EMAIL_RELAY_SECRET || 'unikart-relay-sec-2026';
    if (secret !== expectedSecret && headerSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Unauthorized email relay request.' });
    }

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const smtpUser = process.env.SMTP_USER || 'hirematex@gmail.com';
    const smtpPassword = (process.env.SMTP_PASSWORD || 'dcpqtclfsxiolloh').replace(/\s+/g, '');
    const smtpFrom = process.env.SMTP_FROM || `UNIKART <${smtpUser}>`;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      html,
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      recipient: to,
    });
  } catch (error) {
    console.error('[Vercel Email Relay Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch email via Gmail SMTP',
    });
  }
}
