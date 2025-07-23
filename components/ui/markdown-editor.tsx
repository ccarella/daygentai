"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "Write your description in markdown...",
  className,
  rows = 6,
}: MarkdownEditorProps) {
  const [preview, setPreview] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-md transition-colors",
              !preview
                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={cn(
              "px-3 py-1 text-sm font-medium rounded-md transition-colors",
              preview
                ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            )}
          >
            Preview
          </button>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Markdown supported
        </span>
      </div>

      <div
        className={cn(
          "rounded-md border border-neutral-200 dark:border-neutral-800",
          className
        )}
      >
        {!preview ? (
          <textarea
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-3 py-2 text-sm bg-transparent outline-none resize-none"
          />
        ) : (
          <div
            className="px-3 py-2 text-sm min-h-[inherit]"
            style={{ minHeight: `${rows * 1.5}rem` }}
          >
            {value ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-neutral-400 dark:text-neutral-600 italic">
                Nothing to preview
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}