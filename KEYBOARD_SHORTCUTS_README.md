# Keyboard Shortcuts

Global keyboard shortcuts for fast navigation across the StorePOS platform. All shortcuts are **role-aware** — users only see and can use shortcuts for pages they have access to.

---

## How It Works

1. Press a shortcut combination (e.g., `Alt+P`) from any page
2. A **toast notification** appears confirming the target page
3. The app navigates to the target page instantly

Shortcuts are **suppressed** when:
- Typing in an input field, textarea, or content-editable area
- A dialog or modal is open (e.g., the search palette)

---

## Shortcut Reference

### System Tools

| Shortcut | Action | Roles |
|----------|--------|-------|
| `Ctrl+K` | Open search palette | All |
| `Ctrl+B` | Toggle sidebar | All |
| `Alt+Q` | Open OCR Text Extractor | All |

### Navigation

| Shortcut | Action | Roles |
|----------|--------|-------|
| `Alt+D` | Dashboard (role-specific) | All |

### Sales & POS

| Shortcut | Action | Roles |
|----------|--------|-------|
| `Alt+P` | Open POS | Cashier, Manager, Store Admin, Super Admin |
| `Alt+S` | New Sale | Cashier, Manager, Store Admin, Super Admin |
| `Alt+O` | View Orders | Cashier, Manager, Store Admin, Super Admin |
| `Alt+R` | Process Refund | Manager, Store Admin, Super Admin |
| `Alt+U` | Purchases | Store Admin, Super Admin |

### Inventory

| Shortcut | Action | Roles |
|----------|--------|-------|
| `Alt+I` | Inventory Dashboard | Inventory Manager, Manager, Store Admin, Super Admin |
| `Alt+G` | All Products | Inventory Manager, Manager, Store Admin, Super Admin |
| `Alt+L` | Low Stock Alerts | Inventory Manager, Manager, Store Admin, Super Admin |
| `Alt+V` | Suppliers | Inventory Manager, Manager, Store Admin, Super Admin |

### Customers & Finance

| Shortcut | Action | Roles |
|----------|--------|-------|
| `Alt+C` | Customer Management | Cashier, Manager, Store Admin, Super Admin |
| `Alt+F` | Accountant Dashboard | Accountant, Store Admin, Super Admin |
| `Alt+X` | All Transactions | Accountant, Store Admin, Super Admin |

### Reports & Settings

| Shortcut | Action | Roles |
|----------|--------|-------|
| `Alt+T` | Sales Report | Manager, Store Admin, Super Admin |
| `Alt+,` | Store Settings | Store Admin, Super Admin |
| `Alt+H` | Hardware Settings | Cashier, Manager, Store Admin, Super Admin |
| `Alt+E` | All Employees | Manager, Store Admin, Super Admin |

---

## Architecture

### Files

| File | Purpose |
|------|---------|
| `src/config/shortcuts.config.ts` | Shortcut types, parser, matcher, and suppression logic |
| `src/hooks/use-keyboard-shortcuts.ts` | Global hook — derives shortcuts from search index, filters by role |
| `src/components/layout/search/search-config.ts` | Source of truth — `shortcut` property on `SearchItem` entries |
| `src/components/layout/conditional-layout.tsx` | Integrates the hook into the layout system |

### Design Principles

- **Single source of truth**: Shortcuts are defined on `SearchItem` entries in `search-config.ts`. The hook reads them automatically — no duplication.
- **Config-driven**: Add a `shortcut: "Alt+X"` property to any `SearchItem` and it becomes a working shortcut instantly.
- **Role-aware**: Shortcuts are filtered by the current user's role and permissions at runtime.
- **Non-conflicting**: Uses `Alt+key` combinations to avoid collisions with browser defaults (`Ctrl+S` = save, `Ctrl+P` = print, etc.).
- **Toast feedback**: Every shortcut shows a brief toast via `react-hot-toast` confirming navigation.
- **Input-safe**: Automatically suppressed when typing in form fields or when dialogs are open.

### Adding a New Shortcut

1. Open `src/components/layout/search/search-config.ts`
2. Find or add the `SearchItem` for the target page
3. Add the `shortcut` property:

```typescript
{
  id: "my-page",
  name: "My Page",
  description: "Navigate to my page",
  category: "navigation",
  icon: SomeIcon,
  href: "/my-page",
  keywords: ["my", "page"],
  priority: "high",
  roles: ["store_admin"],
  shortcut: "Alt+M",  // ← This is all you need
}
```

The shortcut will automatically:
- Appear in the search dialog's command palette
- Be wired up as a global keyboard listener
- Show toast feedback on activation
- Be filtered by role/permissions

### Shortcut Format

Shortcuts use the format `Modifier+Key`:

- `Alt+P` → Alt key + P key
- `Ctrl+K` → Ctrl key + K key  
- `Ctrl+Shift+K` → Ctrl + Shift + K key

Supported modifiers: `Alt`, `Ctrl`, `Shift`, `Cmd` (treated as `Ctrl` on Windows/Linux).
