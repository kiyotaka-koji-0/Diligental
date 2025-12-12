"use client";

import ReactMarkdown from "react-markdown";
import { ReactNode } from "react";

interface RichTextRendererProps {
  content: string;
  mentions?: Array<{ id: string; username: string }>;
  className?: string;
}

export function RichTextRenderer({
  content,
  mentions = [],
  className = "",
}: RichTextRendererProps) {
  // Replace @mentions with styled version
  let processedContent = content;
  mentions.forEach((mention) => {
    const regex = new RegExp(`@${mention.username}\\b`, "g");
    processedContent = processedContent.replace(
      regex,
      `[@${mention.username}](mention:${mention.id})`
    );
  });

  return (
    <div className={`prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        components={{
        // Bold
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900 dark:text-white">
            {children}
          </strong>
        ),
        // Italic
        em: ({ children }) => (
          <em className="italic text-gray-800 dark:text-gray-300">
            {children}
          </em>
        ),
        // Code
        code: ({ children, className }) => {
          const isInline = !className?.includes("language-");
          return isInline ? (
            <code className="px-1.5 py-0.5 bg-gray-200/50 dark:bg-white/10 rounded font-mono text-sm text-red-600 dark:text-red-400 border border-gray-200 dark:border-white/20">
              {children}
            </code>
          ) : (
            <pre className="block w-full p-3 bg-gray-100 dark:bg-white/5 rounded-lg font-mono text-sm text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 overflow-x-auto my-2">
              <code>{children}</code>
            </pre>
          );
        },
        // Links and mentions
        a: ({ href, children }) => {
          if (href?.startsWith("mention:")) {
            const userId = href.replace("mention:", "");
            return (
              <span
                className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors"
                title={`User mention`}
              >
                {children}
              </span>
            );
          }

          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {children}
            </a>
          );
        },
        // Paragraph
        p: ({ children }) => (
          <p className="my-0 text-gray-900 dark:text-white leading-relaxed break-words">
            {children}
          </p>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside my-2 space-y-1 text-gray-900 dark:text-white">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside my-2 space-y-1 text-gray-900 dark:text-white">
            {children}
          </ol>
        ),
        li: ({ children }) => <li className="text-gray-900 dark:text-white">{children}</li>,
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-1 my-2 italic text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-950/20 rounded-r">
            {children}
          </blockquote>
        ),
        // Headings
        h1: ({ children }) => (
          <h1 className="text-lg font-bold my-2 text-gray-900 dark:text-white">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-bold my-1.5 text-gray-900 dark:text-white">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-bold my-1 text-gray-900 dark:text-white">
            {children}
          </h3>
        ),
        // Horizontal rule
        hr: () => <hr className="my-2 border-gray-300 dark:border-gray-700" />,
        }}
        skipHtml={true}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
