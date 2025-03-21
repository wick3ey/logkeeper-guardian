
import React from "react";
import { cn } from "@/lib/utils";

interface CodePreviewProps {
  code: string;
  className?: string;
}

export function CodePreview({ code, className }: CodePreviewProps) {
  // Simply escape HTML characters to prevent rendering issues
  const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  return (
    <pre className={cn("p-4 rounded-md bg-muted font-mono text-sm overflow-x-auto whitespace-pre-wrap", className)}>
      <code dangerouslySetInnerHTML={{ __html: escapedCode }} />
    </pre>
  );
}
