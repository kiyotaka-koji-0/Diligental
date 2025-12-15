"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Copy, Clipboard, Pin, Edit2, Trash2, Reply, MoreHorizontal } from 'lucide-react';

export interface ContextMenuItem {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
}

interface ContextMenuState {
    x: number;
    y: number;
    items: ContextMenuItem[];
    visible: boolean;
}

interface ContextMenuContextType {
    showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
    hideContextMenu: () => void;
}

export const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined);

export function ContextMenuProvider({ children }: { children: ReactNode }) {
    const [menuState, setMenuState] = useState<ContextMenuState>({
        x: 0,
        y: 0,
        items: [],
        visible: false,
    });

    const showContextMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
        // Adjust position to keep menu on screen
        const menuWidth = 200;
        const menuHeight = items.length * 40 + 20;
        
        const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
        const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

        setMenuState({
            x: adjustedX,
            y: adjustedY,
            items,
            visible: true,
        });
    }, []);

    const hideContextMenu = useCallback(() => {
        setMenuState(prev => ({ ...prev, visible: false }));
    }, []);

    // Hide menu on click outside or scroll
    useEffect(() => {
        const handleClick = () => hideContextMenu();
        const handleScroll = () => hideContextMenu();
        const handleResize = () => hideContextMenu();

        if (menuState.visible) {
            document.addEventListener('click', handleClick);
            document.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleResize);
        }

        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [menuState.visible, hideContextMenu]);

    // Prevent default context menu
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Allow default context menu in input fields
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                return;
            }
            
            e.preventDefault();
            
            // Default context menu items
            const defaultItems: ContextMenuItem[] = [];
            
            // Add copy if text is selected
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                defaultItems.push({
                    label: 'Copy',
                    icon: <Copy className="w-4 h-4" />,
                    onClick: () => {
                        navigator.clipboard.writeText(selection.toString());
                    },
                });
            }
            
            // Add paste in editable elements
            if (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                defaultItems.push({
                    label: 'Paste',
                    icon: <Clipboard className="w-4 h-4" />,
                    onClick: async () => {
                        try {
                            const text = await navigator.clipboard.readText();
                            document.execCommand('insertText', false, text);
                        } catch (err) {
                            console.error('Failed to paste:', err);
                        }
                    },
                });
            }
            
            if (defaultItems.length > 0) {
                showContextMenu(e.clientX, e.clientY, defaultItems);
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [showContextMenu]);

    return (
        <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
            {children}
            
            {/* Context Menu UI */}
            {menuState.visible && (
                <div
                    className="fixed z-100 bg-white dark:bg-[#2b2d31] rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-1 min-w-[200px] animate-fade-scale-in origin-top-left"
                    style={{
                        left: `${menuState.x}px`,
                        top: `${menuState.y}px`,
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {menuState.items.map((item, index) => {
                                if (item.divider) {
                            return (
                                <div
                                    key={`separator-${index}`}
                                    className="h-px bg-gray-200 dark:bg-gray-700 my-1"
                                />
                            );
                        }
                        
                        return (
                        <button
                            key={item.label}
                                onClick={() => {
                                    if (!item.disabled) {
                                        item.onClick();
                                        hideContextMenu();
                                    }
                                }}
                                disabled={item.disabled}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-2 text-sm outline-none transition-all duration-150
                                    ${item.disabled 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : item.danger
                                            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:-translate-y-0.5'
                                            : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 hover:-translate-y-0.5'
                                    }
                                `}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </ContextMenuContext.Provider>
    );
}

export function useContextMenu() {
    const context = useContext(ContextMenuContext);
    if (!context) {
        throw new Error('useContextMenu must be used within ContextMenuProvider');
    }
    return context;
}
