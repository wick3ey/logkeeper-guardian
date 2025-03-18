
import React from "react";

interface CodePreviewProps {
  code: string;
}

export function CodePreview({ code }: CodePreviewProps) {
  return (
    <pre className="p-4 rounded-md bg-muted font-mono text-sm overflow-x-auto">
      <code>{code}</code>
    </pre>
  );
}
