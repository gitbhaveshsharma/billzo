import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// POST /api/invite/send
// Body: { email, token, storeName, inviterName, roleName }
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            email,
            token,
            storeName = "your store",
            inviterName = "the store admin",
            roleName = "team member",
        }: {
            email: string;
            token: string;
            storeName?: string;
            inviterName?: string;
            roleName?: string;
        } = body;

        if (!email || !token) {
            return NextResponse.json(
                { error: "email and token are required" },
                { status: 400 }
            );
        }

        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const inviteLink = `${appUrl}/invite/accept?token=${token}&email=${encodeURIComponent(email)}`;
        const expiryText = "7 days";

        const { data, error } = await resend.emails.send({
            from: "Billzo <noreply@thebluebe.live>",
            to: email,
            subject: `You've been invited to join ${storeName} on Billzo`,
            html: buildEmailHtml({
                email,
                storeName,
                inviterName,
                roleName,
                inviteLink,
                expiryText,
                appUrl,
            }),
        });

        if (error) {
            console.error("[invite/send] Resend error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data?.id });
    } catch (err) {
        console.error("[invite/send] Unexpected error:", err);
        return NextResponse.json(
            { error: "Failed to send invitation email" },
            { status: 500 }
        );
    }
}

// ============================================================================
// HTML EMAIL TEMPLATE
// ============================================================================

function buildEmailHtml({
    email,
    storeName,
    inviterName,
    roleName,
    inviteLink,
    expiryText,
    appUrl,
}: {
    email: string;
    storeName: string;
    inviterName: string;
    roleName: string;
    inviteLink: string;
    expiryText: string;
    appUrl: string;
}) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to ${storeName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:40px 40px 32px;text-align:center;">
              <img src="https://jffaufecqeompougmqtx.supabase.co/storage/v1/object/public/billzo-logo/billzo-logo.png" alt="Billzo" width="140" style="display:block;margin:0 auto;max-width:140px;height:auto;" />
              <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:12px;">Point of Sale Management</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">You've been invited! 🎉</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                <strong style="color:#374151;">${inviterName}</strong> has invited you to join
                <strong style="color:#374151;">${storeName}</strong> as a
                <strong style="color:#374151;">${roleName}</strong>.
              </p>

              <!-- Invite box -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:28px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">You'll sign in as</p>
                <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${email}</p>
              </div>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}"
                       style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Or copy link -->
              <p style="margin:28px 0 8px;font-size:13px;color:#9ca3af;text-align:center;">Or copy this link into your browser:</p>
              <div style="background:#f3f4f6;border-radius:6px;padding:12px 16px;word-break:break-all;">
                <span style="font-size:12px;color:#6366f1;">${inviteLink}</span>
              </div>

              <!-- Expiry warning -->
              <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
                ⏳ This invitation expires in <strong style="color:#374151;">${expiryText}</strong>.
                <br/>If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent by StorePOS on behalf of ${storeName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
