"use client";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
export function MarkdownEditor({ value, onChange, placeholder = "Write your description in markdown...", className, rows = 6, }) {
    const [preview, setPreview] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    useEffect(() => {
        setLocalValue(value);
    }, [value]);
    const handleChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
    };
    return (<div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button type="button" onClick={() => setPreview(false)} className={cn("px-3 py-1 text-sm font-medium rounded-md transition-colors", !preview
            ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200")}>
            Write
          </button>
          <button type="button" onClick={() => setPreview(true)} className={cn("px-3 py-1 text-sm font-medium rounded-md transition-colors", preview
            ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
            : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200")}>
            Preview
          </button>
        </div>
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          Markdown supported
        </span>
      </div>

      <div className={cn("rounded-md border border-neutral-200 dark:border-neutral-800", className)}>
        {!preview ? (<textarea value={localValue} onChange={handleChange} placeholder={placeholder} rows={rows} className="w-full px-3 py-2 text-sm bg-transparent outline-none resize-none"/>) : (<div className="px-3 py-2 text-sm min-h-[inherit]" style={{ minHeight: `${rows * 1.5}rem` }}>
            {localValue ? (<div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {localValue}
                </ReactMarkdown>
              </div>) : (<p className="text-neutral-400 dark:text-neutral-600 italic">
                Nothing to preview
              </p>)}
          </div>)}
      </div>
    </div>);
}
