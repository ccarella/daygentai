import { EmailLogin } from '@/components/auth/email-login'
import { redirect } from 'next/navigation'

export default async function Home(props: {
  searchParams: Promise<{ code?: string }>
}) {
  const searchParams = await props.searchParams
  
  // If there's an auth code in the URL, redirect to the callback route
  if (searchParams.code) {
    redirect(`/auth/callback?code=${searchParams.code}`)
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Daygent
          </h1>
          <p className="text-lg text-muted-foreground">
            A Product Management Tool to work with your software developer agents.
          </p>
        </div>
        
        <div className="mt-12">
          <EmailLogin />
        </div>
      </div>
    </div>
  )
}