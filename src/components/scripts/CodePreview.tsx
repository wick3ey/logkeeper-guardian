
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CodePreviewProps {
  code: string;
  className?: string;
}

export function CodePreview({ code, className }: CodePreviewProps) {
  const preRef = useRef<HTMLPreElement>(null);
  
  useEffect(() => {
    // Implement simple syntax highlighting by directly adding styled spans
    if (preRef.current) {
      const codeElement = preRef.current.querySelector('code');
      if (codeElement) {
        // Replace keywords with highlighted spans
        let html = codeElement.innerHTML;
        
        // Python keywords
        const pythonKeywords = ["import", "from", "def", "class", "if", "elif", "else", "try", "except", "finally", "for", "while", "return", "global", "in", "as", "with", "pass", "break", "continue"];
        
        // Highlight Python keywords using proper HTML structure
        pythonKeywords.forEach(keyword => {
          const regex = new RegExp(`\\b${keyword}\\b`, 'g');
          html = html.replace(regex, `<span class="text-blue-500 dark:text-blue-400">${keyword}</span>`);
        });
        
        // Highlight strings
        html = html.replace(/(["'])(?:\\.|[^\\])*?\1/g, '<span class="text-green-500 dark:text-green-400">$&</span>');
        
        // Highlight comments
        html = html.replace(/(#.*$)/gm, '<span class="text-gray-500 dark:text-gray-400">$1</span>');
        
        // Apply the highlighted HTML - the issue was probably here
        codeElement.innerHTML = html;
      }
    }
  }, [code]);
  
  return (
    <pre ref={preRef} className={cn("p-4 rounded-md bg-muted font-mono text-sm overflow-x-auto whitespace-pre-wrap", className)}>
      <code>{code}</code>
    </pre>
  );
}
