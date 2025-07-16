/**
 * Strips markdown syntax from text and returns plain text
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  let text = markdown;
  
  // Remove headers (e.g., # Header, ## Header)
  text = text.replace(/^#{1,6}\s+/gm, '');
  
  // Remove bold/italic (e.g., **bold**, *italic*, ***both***)
  text = text.replace(/\*{1,3}([^\*]+)\*{1,3}/g, '$1');
  text = text.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
  
  // Remove inline code (e.g., `code`)
  text = text.replace(/`([^`]+)`/g, '$1');
  
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  
  // Remove links but keep the text (e.g., [text](url))
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remove images (e.g., ![alt](url))
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
  
  // Remove blockquotes
  text = text.replace(/^>\s+/gm, '');
  
  // Remove horizontal rules
  text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '');
  
  // Remove unordered list markers
  text = text.replace(/^[\*\-\+]\s+/gm, '');
  
  // Remove ordered list markers
  text = text.replace(/^\d+\.\s+/gm, '');
  
  // Remove strikethrough
  text = text.replace(/~~([^~]+)~~/g, '$1');
  
  // Remove task list markers
  text = text.replace(/^- \[[x\s]\]\s+/gmi, '');
  
  // Remove HTML tags if any
  text = text.replace(/<[^>]*>/g, '');
  
  // Remove multiple line breaks
  text = text.replace(/\n{2,}/g, ' ');
  
  // Remove line breaks and extra spaces
  text = text.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
  
  return text.trim();
}