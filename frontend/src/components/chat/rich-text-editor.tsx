"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Code, Link as LinkIcon, AtSign } from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onTyping?: () => void;
  placeholder?: string;
  users?: User[];
  isUploading?: boolean;
  children?: React.ReactNode;
}

export function RichTextEditor({
  value,
  onChange,
  onSubmit,
  onTyping,
  placeholder = "Type a message...",
  users = [],
  isUploading = false,
  children,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle @ mention detection
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    // Check if @ was found and is at start OR preceded by whitespace
    if (
      lastAtPos !== -1 &&
      (lastAtPos === 0 || /\s/.test(textBeforeCursor[lastAtPos - 1]))
    ) {
      // Get text after @ and before cursor
      const afterAt = textBeforeCursor.substring(lastAtPos + 1);
      
      // Only show suggestions if:
      // 1. No space after @ (typing mention)
      // 2. Characters after @ are word characters or empty
      if (!/\s/.test(afterAt) && /^[\w]*$/.test(afterAt)) {
        const query = afterAt.toLowerCase();
        
        // Filter users by username
        const filtered = users.filter((u) =>
          u.username.toLowerCase().includes(query)
        );
        
        setMentionStart(lastAtPos);
        setMentionQuery(query);
        setMentionSuggestions(filtered);
        setSelectedSuggestion(0);
      } else {
        setMentionStart(-1);
        setMentionSuggestions([]);
      }
    } else {
      setMentionStart(-1);
      setMentionSuggestions([]);
    }
  }, [value, users]);

  // Handle text changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    onTyping?.();
  };

  // Handle keyboard shortcuts for formatting
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Handle mention suggestion navigation
    if (mentionStart !== -1) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((prev) =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (mentionSuggestions[selectedSuggestion]) {
          insertMention(mentionSuggestions[selectedSuggestion]);
        }
        return;
      }
      if (e.key === "Escape") {
        setMentionStart(-1);
        setMentionSuggestions([]);
        return;
      }
    }

    // Ctrl/Cmd + Enter to submit
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit();
      return;
    }

    // Ctrl/Cmd + B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      insertFormatting("**", "**", "bold");
      return;
    }

    // Ctrl/Cmd + I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      insertFormatting("*", "*", "italic");
      return;
    }

    // Ctrl/Cmd + K for code
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      insertFormatting("`", "`", "code");
      return;
    }
  };

  // Insert formatting markers
  const insertFormatting = (before: string, after: string, type: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || type;

    const newValue =
      value.substring(0, start) +
      before +
      selected +
      after +
      value.substring(end);

    onChange(newValue);

    // Move cursor to correct position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd =
        start + before.length + selected.length;
    }, 0);
  };

  // Insert mention
  const insertMention = (user: User) => {
    if (mentionStart === -1) return;

    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const beforeMention = value.substring(0, mentionStart);
    const afterMention = value.substring(cursorPos);

    const mention = `@${user.username}`;
    const newValue = beforeMention + mention + " " + afterMention;

    onChange(newValue);
    setMentionStart(-1);
    setMentionSuggestions([]);
    setMentionQuery("");

    // Move cursor after mention
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newCursorPos = beforeMention.length + mention.length + 1;
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      }
    }, 0);
  };

  // Auto-resize textarea
  const handleInput = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  };

  useEffect(() => {
    handleInput();
  }, [value]);

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <div className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            disabled={isUploading}
            className="flex-1 min-h-[44px] max-h-[200px] w-full px-4 py-2 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-zinc-400 resize-none"
            style={{ scrollbarWidth: "thin" }}
          />

          {/* Mention suggestions dropdown */}
          {mentionStart !== -1 && mentionSuggestions.length > 0 && (
            <div
              ref={menuRef}
              className="absolute bottom-full left-0 mb-1 w-full min-w-[200px] max-w-xs bg-white dark:bg-[#1e1f22] border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto"
            >
              {mentionSuggestions.map((user, idx) => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    idx === selectedSuggestion
                      ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-gray-200"
                  }`}
                >
                  <AtSign className="w-4 h-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {user.username}
                    </div>
                    <div className="text-xs opacity-70 truncate">{user.email}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Formatting toolbar */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => insertFormatting("**", "**", "bold")}
            title="Bold (Ctrl+B)"
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting("*", "*", "italic")}
            title="Italic (Ctrl+I)"
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => insertFormatting("`", "`", "code")}
            title="Code (Ctrl+K)"
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-1 text-[10px] text-gray-500 dark:text-gray-500">
        <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">
          @
        </kbd>{" "}
        to mention •{" "}
        <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">
          Ctrl+B
        </kbd>{" "}
        bold •{" "}
        <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">
          Ctrl+I
        </kbd>{" "}
        italic •{" "}
        <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">
          Ctrl+K
        </kbd>{" "}
        code
      </div>

      {children}
    </div>
  );
}
