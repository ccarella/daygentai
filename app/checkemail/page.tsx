import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Check Your Email - Daygent',
  description: 'We&apos;ve sent you a login link. Check your email to continue.',
}

export default async function CheckEmailPage(props: {
  searchParams: Promise<{ email?: string }>
}) {
  const searchParams = await props.searchParams
  const email = searchParams.email

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 lg:p-8">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Large Mailbox Icon */}
        <div className="mx-auto w-32 h-32 flex items-center justify-center">
          <svg
            className="w-full h-full text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z"
            />
          </svg>
        </div>

        {/* Main Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Check your email to continue
          </h1>
          <p className="text-lg text-muted-foreground">
            We&apos;ve sent a login link to{' '}
            {email ? (
              <span className="font-medium text-foreground">{email}</span>
            ) : (
              'your email address'
            )}
          </p>
        </div>

        {/* Additional Instructions */}
        <div className="bg-muted/30 rounded-lg p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Click the link in your email to log in to Daygent. The link will expire in 1 hour.
          </p>
          
          <div className="pt-2 space-y-2">
            <p className="text-xs text-muted-foreground">
              Can&apos;t find the email? Check your spam folder.
            </p>
            <Link
              href="/"
              className="inline-block text-sm text-primary hover:underline"
            >
              Didn&apos;t receive an email? Try again
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}