import { useContext } from "react";
import { Message, User } from "@/lib/api";
import api from "@/lib/api";
import { ContextMenuContext, ContextMenuItem } from "@/contexts/context-menu-context";

interface UseMessageContextMenuProps {
  message: Message;
  currentUser: User | null;
  channelId: string;
  onPin?: () => void;
  onUnpin?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReply?: () => void;
}

export function useMessageContextMenu({
  message,
  currentUser,
  channelId,
  onPin,
  onUnpin,
  onEdit,
  onDelete,
  onReply,
}: UseMessageContextMenuProps) {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useMessageContextMenu must be used within ContextMenuProvider');
  }
  const { showContextMenu } = context;

  const isOwnMessage = currentUser?.id === message.user_id;
  const isAdmin = currentUser?.is_admin || false;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [];

    // Copy message text
    items.push({
      label: "Copy Text",
      onClick: () => {
        navigator.clipboard.writeText(message.content);
      },
    });

    // Reply
    if (onReply) {
      items.push({
        label: "Reply in Thread",
        onClick: onReply,
      });
    }

    // Pin/Unpin
    if (message.is_pinned) {
      items.push({
        label: "Unpin Message",
        onClick: async () => {
          try {
            await api.unpinMessage(channelId, message.id);
            onUnpin?.();
          } catch (error) {
            console.error("Failed to unpin message:", error);
          }
        },
      });
    } else {
      items.push({
        label: "Pin Message",
        onClick: async () => {
          try {
            await api.pinMessage(channelId, message.id);
            onPin?.();
          } catch (error) {
            console.error("Failed to pin message:", error);
          }
        },
      });
    }

    // Edit (only own messages)
    if (isOwnMessage && onEdit) {
      items.push({
        label: "Edit Message",
        onClick: onEdit,
        divider: true,
      });
    }

    // Delete (own messages or admin)
    if ((isOwnMessage || isAdmin) && onDelete) {
      items.push({
        label: "Delete Message",
        onClick: onDelete,
        danger: true,
      });
    }

    showContextMenu(e.clientX, e.clientY, items);
  };

  return { handleContextMenu };
}
