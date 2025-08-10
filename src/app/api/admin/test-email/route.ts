import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { testEmail, settings } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Use environment variables for Brevo configuration
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME;

    if (!brevoApiKey) {
      return NextResponse.json(
        { error: 'Brevo API key not configured in environment variables' },
        { status: 500 }
      );
    }

    // Send test email via Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        sender: {
          name: senderName || 'STPPL Live Stream Portal',
          email: senderEmail || 'noreply@example.com',
        },
        to: [
          {
            email: testEmail,
            name: 'Test Recipient',
          },
        ],
        subject: 'Test Email - STPPL Live Stream Portal',
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">🎉 Email Configuration Test Successful!</h2>
                
                <p>Congratulations! Your Brevo email configuration is working correctly.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1f2937;">Test Details:</h3>
                  <ul style="margin: 0;">
                    <li><strong>Sent to:</strong> ${testEmail}</li>
                    <li><strong>Sent from:</strong> ${senderEmail}</li>
                    <li><strong>Service:</strong> Brevo Email API</li>
                    <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
                  </ul>
                </div>
                
                <p>Your live streaming portal is now ready to send:</p>
                <ul>
                  <li>Access code notifications</li>
                  <li>Event announcements</li>
                  <li>System alerts</li>
                  <li>Admin notifications</li>
                </ul>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <p style="font-size: 14px; color: #6b7280;">
                  This is an automated test email from your STPPL Live Stream Portal admin panel.
                  <br>
                  If you received this email unexpectedly, please contact your system administrator.
                </p>
              </div>
            </body>
          </html>
        `,
        textContent: `
Email Configuration Test Successful!

Congratulations! Your Brevo email configuration is working correctly.

Test Details:
- Sent to: ${testEmail}
- Sent from: ${senderEmail}
- Service: Brevo Email API
- Time: ${new Date().toLocaleString()}

Your live streaming portal is now ready to send access code notifications, event announcements, system alerts, and admin notifications.

This is an automated test email from your STPPL Live Stream Portal admin panel.
        `,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json();
      console.error('Brevo API error:', errorData);
      return NextResponse.json(
        { error: `Brevo API error: ${errorData.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const result = await brevoResponse.json();
    console.log('Test email sent successfully:', result);

    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent successfully',
      messageId: result.messageId 
    });

  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}