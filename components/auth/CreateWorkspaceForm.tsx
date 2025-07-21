'use client'

import { useState, useEffect } from 'react'
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

const WORKSPACE_AVATARS = [
  '🏢', '🚀', '💼', '🎯', '🌟', '💡', '🔧', '🎨',
  '📊', '🌐', '⚡', '🔥', '🌈', '🎪', '🏗️', '🎭'
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

const formSchema = z.object({
  name: z.string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "Name must be less than 50 characters" }),
  slug: z.string()
    .min(3, { message: "URL must be at least 3 characters long" })
    .max(50, { message: "URL must be less than 50 characters" })
    .regex(/^[a-z0-9-]+$/, { message: "URL can only contain lowercase letters, numbers, and hyphens" })
    .regex(/^[^-].*[^-]$/, { message: "URL cannot start or end with a hyphen" }),
  avatar: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

export default function CreateWorkspaceForm() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      slug: '',
      avatar: ''
    }
  })

  const watchName = form.watch('name')

  useEffect(() => {
    if (!form.formState.dirtyFields.slug) {
      if (watchName) {
        const generatedSlug = generateSlug(watchName)
        form.setValue('slug', generatedSlug)
      } else {
        form.setValue('slug', '')
      }
    }
  }, [watchName, form])

  const onSubmit = async (values: FormData) => {
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/')
        return
      }

      // Check if slug is already taken
      const { data: existingWorkspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', values.slug)
        .single()

      if (existingWorkspace) {
        setError('This workspace URL is already taken. Please choose a different one.')
        return
      }

      // Create workspace
      const { data: newWorkspace, error: insertError } = await supabase
        .from('workspaces')
        .insert({
          name: values.name,
          slug: values.slug,
          avatar_url: values.avatar || '🏢',
          owner_id: user.id
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      // Add user as owner in workspace_members
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: newWorkspace.id,
          user_id: user.id,
          role: 'owner'
        })

      if (memberError) {
        console.error('Error adding user to workspace_members:', memberError)
        // Don't throw here as workspace is already created
      }

      router.push(`/${values.slug}`)
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
      <h1 className="text-2xl font-bold text-center mb-8">Create Your Workspace</h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="avatar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Choose a Workspace Avatar</FormLabel>
                <FormDescription>
                  Select an avatar to represent your workspace (optional)
                </FormDescription>
                <FormControl>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-3">
                    {WORKSPACE_AVATARS.map((avatar) => (
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
                <FormLabel>Workspace Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="My Awesome Workspace"
                    autoComplete="organization"
                    autoCapitalize="words"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Workspace URL</FormLabel>
                <div className="flex items-center">
                  <span className="text-muted-foreground text-sm mr-1">daygent.ai/</span>
                  <FormControl>
                    <Input
                      placeholder="workspace-url"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toLowerCase())}
                    />
                  </FormControl>
                </div>
                <FormDescription>
                  {field.value && !form.formState.errors.slug && (
                    <span className="text-green-600">
                      Your workspace will be available at: daygent.ai/{field.value}
                    </span>
                  )}
                </FormDescription>
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
            {form.formState.isSubmitting ? 'Creating...' : 'Next'}
          </Button>
        </form>
      </Form>
    </Card>
  )
}