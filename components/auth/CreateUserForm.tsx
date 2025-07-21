'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const AVATAR_OPTIONS = [
  '🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🐸', '🦁', 
  '🐵', '🦄', '🐙', '🦋', '🌟', '🎨', '🚀', '🌈'
]

const formSchema = z.object({
  name: z.string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "Name must be less than 50 characters" }),
  avatar: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

export default function CreateUserForm() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      avatar: ''
    }
  })

  const onSubmit = async (values: FormData) => {
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          name: values.name,
          avatar_url: values.avatar || '👤'
        })

      if (insertError) {
        throw insertError
      }

      router.push('/CreateWorkspace')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      form.handleSubmit(onSubmit)()
    }
  }

  return (
    <Card className="p-4 md:p-6 lg:p-8 max-w-md w-full" onKeyDown={handleKeyDown}>
      <h1 className="text-2xl font-bold text-center mb-8">Complete Your Profile</h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="avatar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose an Avatar</FormLabel>
                <FormDescription>
                  Select an avatar to personalize your profile (optional)
                </FormDescription>
                <FormControl>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-3">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <button
                        key={avatar}
                        type="button"
                        onClick={() => field.onChange(avatar)}
                        className={`min-h-[44px] min-w-[44px] p-2 md:p-3 text-2xl rounded-lg border-2 transition-all ${
                          field.value === avatar
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-border'
                        }`}
                      >
                        {avatar}
                      </button>
                    ))}
                  </div>
                </FormControl>
                {field.value && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {field.value}
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your name"
                    autoComplete="name"
                    autoCapitalize="words"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </Form>
    </Card>
  )
}