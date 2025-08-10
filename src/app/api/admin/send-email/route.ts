import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin';

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { templateId, recipients, subject, customVariables } = body;

    if (!templateId || !recipients || !subject) {
      return NextResponse.json(
        { error: 'Template ID, recipients, and subject are required' },
        { status: 400 }
      );
    }

    // Parse recipients
    const recipientList = recipients.split(',').map((email: string) => email.trim()).filter(Boolean);
    
    if (recipientList.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid recipient is required' },
        { status: 400 }
      );
    }

    // Use environment variables for Brevo configuration
    const brevoApiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME;

    if (!brevoApiKey) {
      return NextResponse.json(
        { error: 'Brevo API key not configured' },
        { status: 500 }
      );
    }

    // Get template content (in a real implementation, fetch from database)
    const defaultTemplates = [
      {
        id: '1',
        name: 'Access Code Distribution',
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Your Access Code for STPPL Event</h2>
                <p>Hello {{name}},</p>
                <p>You have been granted access to the STPPL live streaming event. Please use the access code below to join:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <h3 style="margin: 0; font-size: 24px; color: #1f2937;">{{accessCode}}</h3>
                </div>
                <p>Event Details:</p>
                <ul>
                  <li><strong>Event:</strong> {{eventName}}</li>
                  <li><strong>Date:</strong> {{eventDate}}</li>
                  <li><strong>Access URL:</strong> <a href="{{accessUrl}}">{{accessUrl}}</a></li>
                </ul>
                <p>Please keep this code secure and do not share it with others.</p>
                <p>Best regards,<br>STPPL Team</p>
              </div>
            </body>
          </html>
        `,
        textContent: `Your Access Code for STPPL Event

Hello {{name}},

You have been granted access to the STPPL live streaming event. Please use the access code below to join:

Access Code: {{accessCode}}

Event Details:
- Event: {{eventName}}
- Date: {{eventDate}}
- Access URL: {{accessUrl}}

Please keep this code secure and do not share it with others.

Best regards,
STPPL Team`
      }
    ];

    const template = defaultTemplates.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Replace variables in template (basic implementation)
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    // Replace common variables with defaults or custom values
    const variables = {
      name: 'Participant',
      accessCode: 'SAMPLE-CODE',
      eventName: 'STPPL Live Event',
      eventDate: new Date().toLocaleDateString(),
      accessUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      ...customVariables
    };

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
      textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
    });

    // Send emails via Brevo
    const emailPromises = recipientList.map(async (email) => {
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
          to: [{ email, name: variables.name }],
          subject,
          htmlContent,
          textContent,
        }),
      });

      if (!brevoResponse.ok) {
        const errorData = await brevoResponse.json();
        throw new Error(`Failed to send to ${email}: ${errorData.message}`);
      }

      return await brevoResponse.json();
    });

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Emails sent: ${successful} successful, ${failed} failed`,
      details: {
        total: recipientList.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Error sending emails:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}