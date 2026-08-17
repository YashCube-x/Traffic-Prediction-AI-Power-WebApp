// Email delivery for password-reset links.
//
// Behaviour:
//   - SMTP_HOST/SMTP_USER/SMTP_PASS set in backend/.env  → real email is sent.
//   - Not configured (local development)                 → the link is printed
//     to the server console and returned to the API as dev_reset_link.
const nodemailer = require('nodemailer');
require('dotenv').config();

const SMTP_CONFIGURED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
if (SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log(`📧 SMTP mailer configured (${process.env.SMTP_HOST})`);
} else {
  console.log('📧 SMTP not configured — password reset links will be printed to the console (dev mode).');
}

/**
 * Sends the password reset email.
 * @returns {Promise<{sent: boolean}>} sent=false means dev mode (no SMTP).
 */
async function sendPasswordResetEmail(toEmail, resetLink) {
  if (!SMTP_CONFIGURED) {
    console.log(`🔑 [DEV] Password reset link for ${toEmail}: ${resetLink}`);
    return { sent: false };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"TrafficVision AI" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'TrafficVision AI — Password Reset Request',
    text:
      `A password reset was requested for your TrafficVision AI account.\n\n` +
      `Reset your password (link expires in 30 minutes):\n${resetLink}\n\n` +
      `If you did not request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0f172a; margin-top: 0;">🚦 TrafficVision AI</h2>
        <p style="color: #334155; font-size: 14px;">A password reset was requested for your account (<strong>${toEmail}</strong>).</p>
        <p style="margin: 24px 0;">
          <a href="${resetLink}"
             style="background: #ea580c; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
            Reset My Password
          </a>
        </p>
        <p style="color: #64748b; font-size: 12px;">This link expires in 30 minutes. If you did not request this, ignore this email.</p>
      </div>
    `,
  });
  return { sent: true };
}

module.exports = { sendPasswordResetEmail, SMTP_CONFIGURED };
