import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAuth } from '@/lib/auth/admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // For now, return default templates since we don't have a templates table yet
    const defaultTemplates = [
      {
        id: '1',
        name: 'Access Code Distribution',
        subject: 'Your STPPL Event Access Code',
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
STPPL Team`,
        variables: ['name', 'accessCode', 'eventName', 'eventDate', 'accessUrl'],
        category: 'access-code',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Event Reminder',
        subject: 'Reminder: STPPL Event Starting Soon',
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #059669;">Event Reminder</h2>
                <p>Hello {{name}},</p>
                <p>This is a friendly reminder that the STPPL event you're registered for is starting soon:</p>
                <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #065f46;">{{eventName}}</h3>
                  <p style="margin: 0;"><strong>Start Time:</strong> {{eventDate}}</p>
                  <p style="margin: 5px 0 0 0;"><strong>Your Access Code:</strong> {{accessCode}}</p>
                </div>
                <p>Join the event: <a href="{{accessUrl}}" style="color: #2563eb;">{{accessUrl}}</a></p>
                <p>We look forward to seeing you there!</p>
                <p>Best regards,<br>STPPL Team</p>
              </div>
            </body>
          </html>
        `,
        textContent: `Event Reminder

Hello {{name}},

This is a friendly reminder that the STPPL event you're registered for is starting soon:

{{eventName}}
Start Time: {{eventDate}}
Your Access Code: {{accessCode}}

Join the event: {{accessUrl}}

We look forward to seeing you there!

Best regards,
STPPL Team`,
        variables: ['name', 'eventName', 'eventDate', 'accessCode', 'accessUrl'],
        category: 'event',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Welcome Message',
        subject: 'Welcome to STPPL Events',
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #7c3aed;">Welcome to STPPL Events!</h2>
                <p>Hello {{name}},</p>
                <p>Welcome to the STPPL live streaming platform! We're excited to have you join our community.</p>
                <div style="background-color: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin: 0 0 10px 0; color: #581c87;">Getting Started</h3>
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Check your email for event notifications</li>
                    <li>Use your access code to join events</li>
                    <li>Bookmark our portal: {{portalUrl}}</li>
                  </ul>
                </div>
                <p>If you have any questions, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>STPPL Team</p>
              </div>
            </body>
          </html>
        `,
        textContent: `Welcome to STPPL Events!

Hello {{name}},

Welcome to the STPPL live streaming platform! We're excited to have you join our community.

Getting Started:
- Check your email for event notifications
- Use your access code to join events
- Bookmark our portal: {{portalUrl}}

If you have any questions, please don't hesitate to contact our support team.

Best regards,
STPPL Team`,
        variables: ['name', 'portalUrl'],
        category: 'notification',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return NextResponse.json({ templates: defaultTemplates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { name, subject, htmlContent, textContent, category, isActive, variables } = body;

    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Name, subject, and HTML content are required' },
        { status: 400 }
      );
    }

    // For now, just return success since we don't have a templates table
    // In a real implementation, you would save to database
    const newTemplate = {
      id: Date.now().toString(),
      name,
      subject,
      htmlContent,
      textContent: textContent || '',
      variables: variables || [],
      category: category || 'notification',
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ template: newTemplate }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}