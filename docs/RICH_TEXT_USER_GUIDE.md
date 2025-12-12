# Rich Text & Mentions Quick Reference

## 📝 Text Formatting

### Bold Text
```markdown
**your text here**
```
**Result:** **your text here**

**Keyboard Shortcut:** `Ctrl+B` (Windows/Linux) or `Cmd+B` (Mac)

### Italic Text
```markdown
*your text here*
```
**Result:** *your text here*

**Keyboard Shortcut:** `Ctrl+I` (Windows/Linux) or `Cmd+I` (Mac)

### Inline Code
```markdown
`variable_name`
```
**Result:** `variable_name` (red text on light background)

**Keyboard Shortcut:** `Ctrl+K` (Windows/Linux) or `Cmd+K` (Mac)

### Code Block
````markdown
```
function hello() {
  console.log("Hello!");
}
```
````
**Result:** Dark gray code block with syntax

### Links
```markdown
[Click here](https://example.com)
```
**Result:** [Click here](https://example.com) (blue, clickable)

### Lists

**Bulleted List:**
```markdown
- Item 1
- Item 2
- Item 3
```

**Numbered List:**
```markdown
1. First
2. Second
3. Third
```

### Blockquote
```markdown
> This is a quote
> Can span multiple lines
```

**Result:** Indented text with left blue border

### Headings
```markdown
# Heading 1
## Heading 2
### Heading 3
```

---

## 👥 Mentioning Users

### How to Mention Someone

1. **Type `@` character** in the message input
2. **Type the user's name** - suggestions appear as you type
3. **Select from dropdown** using:
   - **Mouse:** Click the user
   - **Keyboard:** Arrow keys to navigate, Enter/Tab to select
4. **Press Esc** to close suggestions

### Example

```
Hey @john, can you review the PR?
```

### Mention Features

✅ **Real-time filtering** - Sees only members in this channel  
✅ **User email preview** - See user's email in dropdown  
✅ **Auto-spacing** - Mention is inserted with proper spacing  
✅ **Auto-notification** - Mentioned user gets notification  
✅ **Styled mentions** - Appears with blue background in message  

---

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| **Send Message** | `Ctrl+Enter` or `Cmd+Enter` |
| **Bold** | `Ctrl+B` or `Cmd+B` |
| **Italic** | `Ctrl+I` or `Cmd+I` |
| **Code** | `Ctrl+K` or `Cmd+K` |
| **Mention Someone** | Type `@` |
| **Navigate Mentions** | `↑` `↓` arrow keys |
| **Select Mention** | `Enter` or `Tab` |
| **Close Suggestions** | `Esc` |

---

## 📝 Complete Message Example

```markdown
**Important:** @john please check this!

Here's the code that needs review:
```python
def calculate_total(items):
    return sum(items)
```

See the [documentation](https://docs.example.com) for details.

- [ ] Task 1
- [ ] Task 2
```

---

## 💡 Pro Tips

1. **Combine Formatting** - `***bold italic***` = ***bold italic***
2. **Format Code in Messages** - Use backticks `` `code` `` for quick syntax highlight
3. **Markdown Tables** - While the editor supports basic markdown, some advanced features may have limited support
4. **New Lines** - Press Enter to go to next line within a message
5. **Multiline Code** - Use triple backticks with optional language:
   ```python
   print("Hello")
   ```

---

## ❌ Common Mistakes

### ❌ Wrong - Extra spaces in bold/italic
```markdown
** text **  # Wrong - won't work
*text *     # Wrong - won't work
```

### ✅ Correct
```markdown
**text**    # Correct
*text*      # Correct
```

### ❌ Wrong - Incomplete formatting
```markdown
*italic text that isn't closed
**bold text
```

### ✅ Correct
```markdown
*italic text*
**bold text**
```

### ❌ Wrong - Mention with space
```markdown
@ john    # Wrong - mention won't work
```

### ✅ Correct
```markdown
@john     # Correct
```

---

## 🔍 Message Rendering Preview

When you send a message with formatting, here's what it looks like:

**Input:**
```
Hey @alice, I **really** like your *design* approach!

Check this `function`:
```js
console.log("Nice!");
```

> This is awesome!
```

**Output:**
> Hey @alice (blue styled), I **really** (bold) like your *design* (italic) approach!
> 
> Check this `function` (red code):
> ```
> console.log("Nice!");
> ```
> 
> > This is awesome! (indented with left border)

---

## 🆘 Troubleshooting

**Q: My formatting isn't showing in the message?**  
A: Make sure the message was sent successfully (check WebSocket connection). Refresh the page if needed.

**Q: The @mention dropdown isn't appearing?**  
A: Make sure you typed `@` (at sign). The list shows members from the current channel only.

**Q: Can I mention someone from a different channel?**  
A: No - you can only mention people who are members of the current channel.

**Q: What if the person's username has special characters?**  
A: The mention system works with letters, numbers, and underscores. If username has special characters, try typing it slowly to see suggestions.

**Q: Can I edit formatting after sending?**  
A: Currently, messages are immutable after sending. Delete and re-send to change formatting.

---

## 📱 Mobile Support

The rich text editor is fully responsive:

✅ Touch-friendly buttons (44px minimum)  
✅ Large textarea for typing  
✅ Dropdown works on mobile  
✅ All keyboard shortcuts work on mobile keyboard  
✅ Formatting toolbar accessible  

**Tip:** On mobile, use keyboard shortcuts like `Cmd+B` (iOS) instead of formatting buttons for faster typing.

---

## 🎨 Styling Reference

| Element | Style |
|---------|-------|
| **Bold** | Font weight 600, darker |
| *Italic* | Font style italic, lighter |
| `Code` | Red text, light gray background |
| Code Block | Dark gray background, monospace font |
| Links | Blue color, underline on hover |
| @Mentions | Blue background, blue text |
| Blockquote | Left blue border, indented |
| Lists | Bullet points or numbers |
| Headings | Larger font, bold |

---

*For more help, contact support or check the main documentation.*
