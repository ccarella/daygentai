'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, X, Loader2 } from 'lucide-react'

interface AvatarUploadProps {
  currentAvatar?: string
  onUpload?: (file: File) => void
  maxSizeMB?: number
}

export function AvatarUpload({ 
  currentAvatar, 
  onUpload,
  maxSizeMB = 5 
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const maxSize = maxSizeMB * 1024 * 1024

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`)
      return
    }

    // Validate file size
    if (file.size > maxSize) {
      setError(`File too large. Maximum size: ${maxSizeMB}MB`)
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Trigger upload
    if (onUpload) {
      handleUpload(file)
    }
  }

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Upload failed')
        setPreview(null)
      } else {
        // Success - in a real app, you'd update the user's avatar URL
        console.log('Upload successful:', result)
        if (onUpload) {
          onUpload(file)
        }
      }
    } catch (error) {
      setError('Network error. Please try again.')
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const clearSelection = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          ref={fileInputRef}
          type="file"
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        {preview ? (
          <div className="relative w-32 h-32">
            <img
              src={preview}
              alt="Avatar preview"
              className="w-full h-full rounded-full object-cover border-2 border-gray-200"
            />
            {!uploading && (
              <button
                onClick={clearSelection}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}
          </div>
        ) : currentAvatar ? (
          <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-4xl">
            {currentAvatar}
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        variant="outline"
        size="sm"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Choose Avatar
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <p className="text-xs text-gray-500">
        Allowed formats: JPEG, PNG, GIF, WebP. Max size: {maxSizeMB}MB
      </p>
    </div>
  )
}