// ─────────────────────────────────────────────────────────────
//  Email Templates  –  ShopNest
//  All emails use table-based HTML so they render correctly in
//  Gmail, Outlook, Apple Mail, and mobile clients.
//  Brand name / support email can be changed in the BRAND object.
// ─────────────────────────────────────────────────────────────

const BRAND = {
  name: "ShopNest",
  supportEmail: "support@shopnest.com",
  primaryColor: "#4F46E5",   // indigo
  headerBg: "#1E1B4B",       // deep indigo
  successColor: "#16A34A",   // green
  dangerColor: "#DC2626",    // red
  warningColor: "#D97706",   // amber
};

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background-color:${BRAND.headerBg};padding:28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                      🛍️ ${BRAND.name}
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:12px;color:#A5B4FC;">Your trusted store</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── CONTENT ── -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none;border-top:1px solid #E2E8F0;margin:0;" />
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color:#F8FAFC;padding:24px 40px;border-radius:0 0 12px 12px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 6px;font-size:13px;color:#64748B;font-weight:600;">
                      ${BRAND.name} Team
                    </p>
                    <p style="margin:0 0 4px;font-size:12px;color:#94A3B8;">
                      Questions? Write to us at
                      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primaryColor};text-decoration:none;">
                        ${BRAND.supportEmail}
                      </a>
                    </p>
                    <p style="margin:8px 0 0;font-size:11px;color:#CBD5E1;">
                      You received this email because you have an account with ${BRAND.name}.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string, color: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
    <tr>
      <td align="center" style="border-radius:8px;background-color:${color};">
        <a href="${href}"
          style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;
                 color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;padding:4px 12px;border-radius:20px;
    background-color:${color}20;color:${color};font-size:12px;font-weight:600;
    letter-spacing:0.5px;text-transform:uppercase;">${text}</span>`;
}

function orderIdRow(orderId: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#F8FAFC;border-radius:8px;margin:20px 0;border:1px solid #E2E8F0;">
    <tr>
      <td style="padding:16px 20px;">
        <p style="margin:0;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">
          Order Reference
        </p>
        <p style="margin:4px 0 0;font-size:15px;color:#1E293B;font-weight:700;font-family:monospace;">
          #${orderId.toUpperCase().slice(0, 8)}
        </p>
      </td>
    </tr>
  </table>`;
}

// ─────────────────────────────────────────────────────────────
//  1. WELCOME EMAIL
// ─────────────────────────────────────────────────────────────
export function welcomeEmail(firstName: string): string {
  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:#6366F1;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
      Welcome aboard
    </p>
    <h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#1E293B;line-height:1.3;">
      Hey ${firstName}, welcome to ${BRAND.name}! 🎉
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
      We're thrilled to have you with us. Your account is all set up and ready to go.
      Start exploring thousands of products handpicked just for you.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#EEF2FF;border-radius:10px;margin:24px 0;border-left:4px solid ${BRAND.primaryColor};">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#3730A3;">
            Here's what you can do:
          </p>
          <p style="margin:0 0 8px;font-size:14px;color:#4338CA;">
            🛒 &nbsp; Browse and add products to your cart
          </p>
          <p style="margin:0 0 8px;font-size:14px;color:#4338CA;">
            💳 &nbsp; Checkout securely with Razorpay
          </p>
          <p style="margin:0;font-size:14px;color:#4338CA;">
            📦 &nbsp; Track your orders in real time
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#64748B;line-height:1.7;">
      If you have any questions, our support team is always here to help at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primaryColor};font-weight:600;text-decoration:none;">
        ${BRAND.supportEmail}
      </a>.
    </p>`;

  return baseLayout(content);
}

// ─────────────────────────────────────────────────────────────
//  2. ORDER PAID
// ─────────────────────────────────────────────────────────────
export function orderPaidEmail(orderId: string): string {
  const content = `
    ${badge("Payment Successful", BRAND.successColor)}
    <h1 style="margin:16px 0 12px;font-size:26px;font-weight:800;color:#1E293B;">
      Your order is confirmed ✅
    </h1>
    <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.7;">
      Great news! We've received your payment and your order is now being processed.
      You'll receive another update once your order is shipped.
    </p>

    ${orderIdRow(orderId)}

    <p style="margin:0;font-size:14px;color:#64748B;line-height:1.6;">
      Thank you for shopping with <strong>${BRAND.name}</strong>.
      If you have any questions about your order, don't hesitate to reach out.
    </p>`;

  return baseLayout(content);
}

// ─────────────────────────────────────────────────────────────
//  3. ORDER CANCELLED
// ─────────────────────────────────────────────────────────────
export function orderCancelledEmail(orderId: string): string {
  const content = `
    ${badge("Order Cancelled", BRAND.dangerColor)}
    <h1 style="margin:16px 0 12px;font-size:26px;font-weight:800;color:#1E293B;">
      Your order has been cancelled
    </h1>
    <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.7;">
      We're sorry to inform you that your order has been cancelled. This can happen
      if the payment window expired or if the payment was not completed.
    </p>

    ${orderIdRow(orderId)}

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#FEF2F2;border-radius:10px;margin:20px 0;border-left:4px solid ${BRAND.dangerColor};">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:#991B1B;line-height:1.6;">
            If any amount was charged, it will be automatically refunded within
            <strong>5–7 business days</strong>. No action is needed from your side.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#64748B;">
      Want to try again? Simply place a new order on our platform.
    </p>`;

  return baseLayout(content);
}

// ─────────────────────────────────────────────────────────────
//  4. REFUND SUCCESSFUL
// ─────────────────────────────────────────────────────────────
export function refundSuccessEmail(orderId: string): string {
  const content = `
    ${badge("Refund Processed", BRAND.successColor)}
    <h1 style="margin:16px 0 12px;font-size:26px;font-weight:800;color:#1E293B;">
      Your refund has been processed 💰
    </h1>
    <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.7;">
      Good news! Your refund request has been successfully processed by our system.
      The amount will reflect in your original payment method.
    </p>

    ${orderIdRow(orderId)}

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#F0FDF4;border-radius:10px;margin:20px 0;border-left:4px solid ${BRAND.successColor};">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#166534;">Refund Timeline</p>
          <p style="margin:0;font-size:14px;color:#15803D;line-height:1.6;">
            💳 &nbsp;<strong>Credit/Debit Card:</strong> 5–7 business days<br/>
            🏦 &nbsp;<strong>Net Banking / UPI:</strong> 2–3 business days<br/>
            👛 &nbsp;<strong>Wallet:</strong> Within 24 hours
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#64748B;line-height:1.6;">
      If you don't see the refund after the mentioned period, please contact us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primaryColor};font-weight:600;text-decoration:none;">
        ${BRAND.supportEmail}
      </a>.
    </p>`;

  return baseLayout(content);
}

// ─────────────────────────────────────────────────────────────
//  5. REFUND FAILED / DELAYED
// ─────────────────────────────────────────────────────────────
export function refundFailedEmail(refundId: string): string {
  const content = `
    ${badge("Refund Delayed", BRAND.warningColor)}
    <h1 style="margin:16px 0 12px;font-size:26px;font-weight:800;color:#1E293B;">
      Your refund is taking a little longer
    </h1>
    <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.7;">
      We encountered a temporary issue while processing your refund. Don't worry —
      our system is automatically retrying and no action is needed from your side.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#FFFBEB;border-radius:10px;margin:20px 0;border-left:4px solid ${BRAND.warningColor};">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:12px;color:#92400E;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">
            Refund Reference
          </p>
          <p style="margin:0;font-size:14px;color:#78350F;font-weight:700;font-family:monospace;">
            #${refundId.toUpperCase().slice(0, 8)}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:14px;color:#64748B;line-height:1.6;">
      Our system will continue retrying the refund automatically. If the issue
      persists beyond <strong>3 business days</strong>, please reach out to us and
      we'll resolve it manually.
    </p>

    <p style="margin:0;font-size:14px;color:#64748B;">
      Contact us:
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primaryColor};font-weight:600;text-decoration:none;">
        ${BRAND.supportEmail}
      </a>
    </p>`;

  return baseLayout(content);
}

// ─────────────────────────────────────────────────────────────
//  6. PAYMENT FAILED
// ─────────────────────────────────────────────────────────────
export function paymentFailedEmail(orderId: string): string {
  const content = `
    ${badge("Payment Failed", BRAND.dangerColor)}
    <h1 style="margin:16px 0 12px;font-size:26px;font-weight:800;color:#1E293B;">
      Your payment could not be processed
    </h1>
    <p style="margin:0 0 8px;font-size:15px;color:#475569;line-height:1.7;">
      Unfortunately, we were unable to process your payment. Your order has been
      cancelled and no amount has been charged to your account.
    </p>

    ${orderIdRow(orderId)}

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#FEF2F2;border-radius:10px;margin:20px 0;border-left:4px solid ${BRAND.dangerColor};">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#991B1B;">Common reasons for failure:</p>
          <p style="margin:0;font-size:14px;color:#B91C1C;line-height:1.7;">
            • Insufficient balance in your account<br/>
            • Transaction declined by your bank<br/>
            • Payment session timed out<br/>
            • Incorrect card details entered
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#64748B;line-height:1.6;">
      You can place a new order anytime. If the issue persists, contact your bank
      or write to us at
      <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primaryColor};font-weight:600;text-decoration:none;">
        ${BRAND.supportEmail}
      </a>.
    </p>`;

  return baseLayout(content);
}

// ─────────────────────────────────────────────────────────────
//  7. PASSWORD RESET
// ─────────────────────────────────────────────────────────────
export function resetPasswordEmail(resetLink: string): string {
  const content = `
    ${badge("Password Reset", BRAND.primaryColor)}
    <h1 style="margin:16px 0 12px;font-size:26px;font-weight:800;color:#1E293B;">
      Reset your password 🔐
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.7;">
      We received a request to reset the password for your ${BRAND.name} account.
      Click the button below to create a new password.
    </p>

    ${ctaButton("Reset My Password", resetLink, BRAND.primaryColor)}

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#EEF2FF;border-radius:10px;margin:24px 0;border-left:4px solid ${BRAND.primaryColor};">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:13px;color:#3730A3;line-height:1.6;">
            ⏱️ &nbsp;This link is valid for <strong>15 minutes</strong> only.<br/>
            🔒 &nbsp;If you didn't request a password reset, you can safely ignore this email —
            your account is secure.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
      If the button above doesn't work, copy and paste this link into your browser:<br/>
      <a href="${resetLink}" style="color:${BRAND.primaryColor};word-break:break-all;font-size:12px;">
        ${resetLink}
      </a>
    </p>`;

  return baseLayout(content);
}
