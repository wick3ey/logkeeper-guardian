
import React from "react";
import { cn } from "@/lib/utils";

interface CodePreviewProps {
  code: string;
  className?: string;
}

export function CodePreview({ code, className }: CodePreviewProps) {
  return (
    <pre className={cn("p-4 rounded-md bg-muted font-mono text-sm overflow-x-auto", className)}>
      <code>{code}</code>
    </pre>
  );
}
