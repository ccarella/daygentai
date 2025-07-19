'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PromptDisplayProps {
  prompt: string;
  className?: string;
}

export function PromptDisplay({ prompt, className = '' }: PromptDisplayProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      // Clear any existing timeout
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      // Set new timeout
      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  if (!prompt) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <h3 className="text-sm font-medium text-gray-900">AI Prompt</h3>
      </div>
      
      <div className="relative group">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 pr-12">
          <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
            {prompt}
          </pre>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="absolute top-2 right-2 h-8 w-8 p-0 opacity-70 hover:opacity-100 transition-opacity"
          title="Copy prompt"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <p className="text-xs text-gray-500">
        This prompt was generated to help AI agents understand and implement this issue.
      </p>
    </div>
  );
}