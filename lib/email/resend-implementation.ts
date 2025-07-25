// Email service implementation for workspace invitations
// 
// To enable email sending:
// 1. Install Resend: npm install resend
// 2. Get API key from https://resend.com
// 3. Add RESEND_API_KEY to .env.local
// 4. Uncomment the import and implementation below

// import { Resend } from 'resend'
// const resend = new Resend(process.env['RESEND_API_KEY'])

interface SendInvitationEmailParams {
  to: string
  inviterName: string
  workspaceName: string
  inviteUrl: string
  role: string
  personalMessage?: string
}

export async function sendInvitationEmail({
  to,
  inviterName,
  workspaceName,
  inviteUrl,
  role,
  personalMessage
}: SendInvitationEmailParams) {
  try {
    // Mock implementation - replace with actual email sending when Resend is installed
    console.log(`Would send email to: ${to}`)
    console.log(`From: ${inviterName}`)
    console.log(`Workspace: ${workspaceName}`)
    console.log(`Role: ${role}`)
    console.log(`Invite URL: ${inviteUrl}`)
    if (personalMessage) {
      console.log(`Message: ${personalMessage}`)
    }

    // Return mock success response
    return { 
      success: true, 
      data: { id: 'mock-email-id' } 
    }

    /* 
    // Uncomment this when Resend is installed:
    
    const { data, error } = await resend.emails.send({
      from: 'Daygent <noreply@yourdomain.com>', // Replace with your verified domain
      to: [to],
      subject: \`You've been invited to join \${workspaceName}\`,
      html: \`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Workspace Invitation</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
              }
              .container {
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                overflow: hidden;
              }
              .header {
                background-color: #000;
                color: #fff;
                padding: 30px 40px;
                text-align: center;
              }
              .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
              }
              .content {
                padding: 40px;
              }
              .message-box {
                background-color: #f8f9fa;
                border-left: 4px solid #007bff;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
              }
              .button {
                display: inline-block;
                background-color: #007bff;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                font-weight: 500;
                margin: 20px 0;
              }
              .button:hover {
                background-color: #0056b3;
              }
              .footer {
                padding: 20px 40px;
                background-color: #f8f9fa;
                text-align: center;
                font-size: 14px;
                color: #666;
              }
              .role-badge {
                display: inline-block;
                background-color: #e9ecef;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 14px;
                font-weight: 500;
                color: #495057;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Workspace Invitation</h1>
              </div>
              <div class="content">
                <p>Hi there,</p>
                <p><strong>\${inviterName}</strong> has invited you to join the <strong>\${workspaceName}</strong> workspace as a <span class="role-badge">\${role}</span>.</p>
                
                \${personalMessage ? \`
                  <div class="message-box">
                    <p style="margin: 0;"><strong>Personal message:</strong></p>
                    <p style="margin: 5px 0 0 0;">\${personalMessage}</p>
                  </div>
                \` : ''}
                
                <p>Click the button below to accept the invitation and get started:</p>
                
                <div style="text-align: center;">
                  <a href="\${inviteUrl}" class="button">Accept Invitation</a>
                </div>
                
                <p style="font-size: 14px; color: #666;">
                  Or copy and paste this link into your browser:<br>
                  <a href="\${inviteUrl}" style="color: #007bff; word-break: break-all;">\${inviteUrl}</a>
                </p>
              </div>
              <div class="footer">
                <p>This invitation will expire in 7 days.</p>
                <p>If you don't want to join this workspace, you can safely ignore this email.</p>
              </div>
            </div>
          </body>
        </html>
      \`,
      text: \`
        You've been invited to join \${workspaceName}
        
        \${inviterName} has invited you to join the \${workspaceName} workspace as a \${role}.
        
        \${personalMessage ? \`Personal message:\\n\${personalMessage}\\n\\n\` : ''}
        
        Accept the invitation by clicking this link:
        \${inviteUrl}
        
        This invitation will expire in 7 days. If you don't want to join this workspace, you can safely ignore this email.
      \`
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error }
    }

    return { success: true, data }
    */
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error }
  }
}