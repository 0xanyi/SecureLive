import { TransactionalEmailsApi, SendSmtpEmail, TransactionalEmailsApiApiKeys } from '@getbrevo/brevo'

const apiInstance = new TransactionalEmailsApi()
apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)

export interface EmailTemplate {
  to: string
  name: string
  code: string
  type: 'center' | 'individual'
  maxSessions?: number
}

export async function sendAccessCodeEmail({
  to,
  name,
  code,
  type,
  maxSessions = 1,
}: EmailTemplate) {
  const sendSmtpEmail = new SendSmtpEmail()
  
  sendSmtpEmail.subject = 'Your STPPL UK and Europe Access Code'
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>STPPL UK and Europe - Access Code</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">STPPL UK and Europe</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">August 14-17, 2025</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #2563EB; margin-top: 0;">Welcome ${name}!</h2>
        
        <p>Your access code for the STPPL UK and Europe event is ready:</p>
        
        <div style="background: white; border: 2px solid #2563EB; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Your Access Code</p>
          <h3 style="margin: 0; font-size: 32px; color: #2563EB; letter-spacing: 2px; font-family: monospace;">${code}</h3>
        </div>
        
        <div style="background: #e3f2fd; border-left: 4px solid #2563EB; padding: 15px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #1565c0;">Important Information:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Event Dates:</strong> August 14-17, 2025 (Thursday - Sunday)</li>
            <li><strong>Code Type:</strong> ${type === 'center' ? 'Center Code' : 'Individual Code'}</li>
            ${type === 'center' 
              ? '<li><strong>Usage:</strong> This code can only be used at one location at a time</li>'
              : `<li><strong>Concurrent Sessions:</strong> Up to ${maxSessions} device${maxSessions > 1 ? 's' : ''} can use this code simultaneously</li>`
            }
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
             style="background: #2563EB; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Access Event Stream
          </a>
        </div>
        
        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #666;">
          <p><strong>Need Help?</strong></p>
          <p>If you have any issues accessing the stream, please contact our support team.</p>
          <p>Keep this email safe - you'll need your access code to join the event.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  sendSmtpEmail.textContent = `
    STPPL UK and Europe - Access Code
    
    Dear ${name},
    
    Your access code for the STPPL UK and Europe event (August 14-17, 2025) is: ${code}
    
    Code Type: ${type === 'center' ? 'Center Code (single location use)' : `Individual Code (up to ${maxSessions} concurrent sessions)`}
    
    Visit ${process.env.NEXT_PUBLIC_APP_URL} to access the stream.
    
    Keep this email safe - you'll need your access code to join the event.
  `
  
  sendSmtpEmail.sender = {
    name: process.env.BREVO_SENDER_NAME || 'STPPL Events',
    email: process.env.BREVO_SENDER_EMAIL!,
  }
  
  sendSmtpEmail.to = [{ email: to, name }]
  
  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail)
    return {
      success: true,
      messageId: data.body.messageId || 'unknown',
      data
    }
  } catch (error) {
    console.error('Email send error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function sendBulkAccessCodes(emails: EmailTemplate[]) {
  const results = []
  
  for (const emailData of emails) {
    const result = await sendAccessCodeEmail(emailData)
    results.push({
      email: emailData.to,
      code: emailData.code,
      ...result,
    })
    
    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}

export async function logEmailSend(
  codeId: string,
  emailType: string,
  recipientEmail: string,
  status: string,
  messageId?: string
) {
  // This will be implemented when we have the database connection
  // For now, just log to console
  console.log('Email log:', {
    codeId,
    emailType,
    recipientEmail,
    status,
    messageId,
    timestamp: new Date().toISOString(),
  })
}