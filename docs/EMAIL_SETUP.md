# Email Setup Guide

This guide explains how to set up email sending for workspace invitations in Daygent.

## Current Status

The invite system is fully functional but email sending is currently disabled. When invitations are created, the system logs the invite URL to the console instead of sending emails.

## Email Service Options

### 1. Resend (Recommended)
- **Best for**: Modern Next.js applications
- **Pros**: Simple API, great DX, built for transactional emails
- **Free tier**: 100 emails/day
- **Setup time**: ~10 minutes

### 2. SendGrid
- **Best for**: High volume, established businesses
- **Pros**: Feature-rich, reliable, good analytics
- **Free tier**: 100 emails/day
- **Setup time**: ~20 minutes

### 3. AWS SES
- **Best for**: Cost-effective at scale
- **Pros**: Very cheap, reliable, AWS integration
- **Cons**: More complex setup, requires domain verification
- **Cost**: $0.10 per 1000 emails
- **Setup time**: ~30 minutes

### 4. Postmark
- **Best for**: Transactional email focus
- **Pros**: Great deliverability, simple API
- **Free tier**: 100 emails/month
- **Setup time**: ~15 minutes

## Setting Up Resend (Recommended)

### Step 1: Install Resend

```bash
npm install resend
```

### Step 2: Get API Key

1. Sign up at [resend.com](https://resend.com)
2. Create an API key in the dashboard
3. Add to your `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

### Step 3: Verify Your Domain (Optional but Recommended)

1. Add your domain in Resend dashboard
2. Add the DNS records provided
3. Wait for verification (usually ~5 minutes)

### Step 4: Enable Email Sending

In `/app/api/invitations/send/route.ts`, uncomment the email sending code:

```typescript
// Change this:
// import { sendInvitationEmail } from '@/lib/email/resend-implementation'

// To this:
import { sendInvitationEmail } from '@/lib/email/resend-implementation'

// And uncomment the email sending block
const emailResult = await sendInvitationEmail({
  to: email,
  inviterName: inviter.name || inviter.email || 'A team member',
  workspaceName: workspace.name,
  inviteUrl,
  role,
  personalMessage
})

if (!emailResult.success) {
  console.error('Failed to send invitation email:', emailResult.error)
}
```

### Step 5: Update From Address

In `/lib/email/resend-implementation.ts`, update the from address:

```typescript
from: 'Daygent <noreply@yourdomain.com>', // Replace with your verified domain
```

## Testing Email Sending

1. Send a test invitation from the workspace settings
2. Check the recipient's inbox (and spam folder)
3. Verify the invitation link works
4. Check Resend dashboard for delivery status

## Customizing Email Templates

The email template is in `/lib/email/resend-implementation.ts`. You can customize:

- Colors and styling
- Logo/branding
- Message content
- Call-to-action buttons

## Using Other Email Services

If you prefer a different email service:

1. Install the service's SDK
2. Create a new implementation file (e.g., `/lib/email/sendgrid-implementation.ts`)
3. Follow the same interface as the Resend implementation
4. Update the import in the API route

Example for SendGrid:

```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export async function sendInvitationEmail(params) {
  // Implementation here
}
```

## Troubleshooting

### Emails not sending
- Check API key is correctly set in `.env.local`
- Verify domain if using custom from address
- Check service dashboard for errors

### Emails going to spam
- Verify your domain with SPF/DKIM records
- Use a subdomain for transactional emails
- Avoid spam trigger words
- Include unsubscribe information

### Rate limiting
- Most services have rate limits on free tiers
- Implement queuing for bulk invitations
- Consider upgrading if hitting limits

## Production Checklist

- [ ] Email service API key in production environment
- [ ] Domain verified with email service
- [ ] SPF/DKIM records configured
- [ ] From address uses verified domain
- [ ] Error handling for failed emails
- [ ] Monitoring/alerting for delivery issues
- [ ] Email templates tested across clients
- [ ] Unsubscribe mechanism (if needed)