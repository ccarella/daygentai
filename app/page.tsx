import { EmailLogin } from '@/components/auth/email-login'

export default function Home() {
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