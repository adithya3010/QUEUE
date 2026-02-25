# Migration Guide: New Color Palette Implementation

## Overview
This guide helps you migrate existing components from the old teal/mint color scheme to the professional blue-based design system with full dark mode support.

---

## Quick Start

### 1. Understanding the New System

**Old System:**
- `primary-*` → Teal (#0B8FAC)
- `secondary-*` → Mint (#7BC1B7)
- `light-*` → Seafoam (#D2EBE7)
- `light-blue-*` → Sky (#8ED7F0)
- `success-*` → Green (#129820)

**New System:**
- `brand-*` → Professional blue (light mode: #2563EB, dark mode: #60a5fa)
- `success-*` → Medical green (#10b981)
- `danger-*` → Alert red (#ef4444)
- `warning-*` → Amber (#f59e0b)
- `info-*` → Sky blue (#0ea5e9)
- `neutral-*` → Gray scale (optimized for both modes)

---

## Step-by-Step Migration

### Step 1: Update Backgrounds

#### Before:
```tsx
<div className="bg-[#060c21]">
<div className="bg-white">
```

#### After:
```tsx
<div className="bg-neutral-900 dark:bg-neutral-950">
<div className="bg-white dark:bg-neutral-800">
```

### Step 2: Update Primary Colors

#### Before:
```tsx
<button className="bg-primary-600 hover:bg-primary-700">
<div className="text-primary-500">
<span className="border-primary-400">
```

#### After:
```tsx
<button className="bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600">
<div className="text-brand-600 dark:text-brand-400">
<span className="border-brand-500 dark:border-brand-400">
```

### Step 3: Update Text Colors

#### Before:
```tsx
<h1 className="text-white">
<p className="text-gray-300">
<span className="text-gray-400">
```

#### After:
```tsx
<h1 className="text-neutral-900 dark:text-white">
<p className="text-neutral-600 dark:text-neutral-400">
<span className="text-neutral-500 dark:text-neutral-500">
```

### Step 4: Update Borders

#### Before:
```tsx
<div className="border border-white/10">
<div className="border border-white/20">
```

#### After:
```tsx
<div className="border border-neutral-200 dark:border-neutral-700">
<div className="border border-neutral-300 dark:border-neutral-600">
```

### Step 5: Update Gradients

#### Before:
```tsx
<div className="bg-gradient-to-r from-primary-500 to-light-blue-500">
<div className="bg-gradient-to-br from-secondary-500 to-light-500">
```

#### After:
```tsx
<div className="bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-500 dark:to-brand-600">
<div className="bg-gradient-to-br from-info-500 to-info-600 dark:from-info-400 dark:to-info-500">
```

---

## Component Examples

### Button Component

```tsx
// Primary Button
<button className="
  px-6 py-3 rounded-xl font-semibold
  bg-brand-600 hover:bg-brand-700 
  dark:bg-brand-500 dark:hover:bg-brand-600
  text-white shadow-lg 
  transition-colors duration-200
">
  Primary Action
</button>

// Success Button
<button className="
  px-6 py-3 rounded-xl font-semibold
  bg-success-500 hover:bg-success-600
  text-white shadow-lg
  transition-colors duration-200
">
  Complete
</button>

// Danger Button
<button className="
  px-6 py-3 rounded-xl font-semibold
  bg-danger-500 hover:bg-danger-600
  text-white shadow-lg
  transition-colors duration-200
">
  Delete
</button>

// Secondary/Ghost Button
<button className="
  px-6 py-3 rounded-xl font-semibold
  bg-white hover:bg-neutral-50
  dark:bg-neutral-800 dark:hover:bg-neutral-700
  border border-neutral-200 dark:border-neutral-600
  text-neutral-900 dark:text-neutral-50
  shadow-light dark:shadow-dark
  transition-colors duration-200
">
  Secondary Action
</button>
```

### Card Component

```tsx
<div className="
  bg-white dark:bg-neutral-800
  border border-neutral-200 dark:border-neutral-700
  rounded-2xl p-6 
  shadow-light-md dark:shadow-dark-md
  transition-colors duration-200
">
  <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
    Card Title
  </h3>
  <p className="text-neutral-600 dark:text-neutral-400">
    Card description text that adapts to theme
  </p>
</div>
```

### Form Input Component

```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
    Email Address
  </label>
  <input 
    type="email"
    className="
      w-full px-4 py-3 rounded-lg
      bg-white dark:bg-neutral-800
      border border-neutral-300 dark:border-neutral-600
      text-neutral-900 dark:text-neutral-50
      placeholder-neutral-400 dark:placeholder-neutral-500
      focus:ring-2 focus:ring-brand-600 dark:focus:ring-brand-400
      focus:border-transparent
      transition-colors duration-200
    "
    placeholder="you@example.com"
  />
</div>
```

### Status Badge Component

```tsx
// Available/Online Status
<span className="
  inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold
  bg-success-500 text-white
">
  <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
  Available
</span>

// Busy Status
<span className="
  inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold
  bg-danger-500 text-white
">
  Busy
</span>

// Pending Status
<span className="
  inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold
  bg-warning-500 text-white
">
  Pending
</span>

// Info Badge (Neutral)
<span className="
  px-3 py-1 rounded-full text-sm font-semibold
  bg-neutral-100 dark:bg-neutral-700
  text-neutral-700 dark:text-neutral-300
  border border-neutral-200 dark:border-neutral-600
">
  Info
</span>
```

### Alert/Banner Component

```tsx
// Success Alert
<div className="
  p-4 rounded-xl
  bg-success-50 dark:bg-success-900/20
  border border-success-500/50
  transition-colors duration-200
">
  <p className="text-success-700 dark:text-success-400 font-medium">
    Operation completed successfully!
  </p>
</div>

// Error Alert
<div className="
  p-4 rounded-xl
  bg-danger-50 dark:bg-danger-900/20
  border border-danger-500/50
  transition-colors duration-200
">
  <p className="text-danger-700 dark:text-danger-400 font-medium">
    An error occurred. Please try again.
  </p>
</div>

// Warning Alert
<div className="
  p-4 rounded-xl
  bg-warning-50 dark:bg-warning-900/20
  border border-warning-500/50
  transition-colors duration-200
">
  <p className="text-warning-700 dark:text-warning-400 font-medium">
    Please verify your information.
  </p>
</div>
```

### Navigation Component

```tsx
<nav className="
  bg-white dark:bg-neutral-800
  border-b border-neutral-200 dark:border-neutral-700
  transition-colors duration-200
">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-16">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 dark:from-brand-500 dark:to-brand-600" />
        <span className="font-bold text-xl text-neutral-900 dark:text-white">
          SmartQueue
        </span>
      </div>
      
      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-6">
        <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
          Dashboard
        </a>
        <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
          Patients
        </a>
        <a href="#" className="text-neutral-600 dark:text-neutral-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
          Settings
        </a>
      </div>
      
      {/* Theme Toggle */}
      <ThemeToggle />
    </div>
  </div>
</nav>
```

---

## Color Mapping Reference

| Old Class | New Light Mode | New Dark Mode |
|-----------|---------------|---------------|
| `bg-primary-600` | `bg-brand-600` | `dark:bg-brand-500` |
| `text-primary-500` | `text-brand-600` | `dark:text-brand-400` |
| `border-primary-400` | `border-brand-500` | `dark:border-brand-400` |
| `bg-secondary-500` | `bg-info-500` | `dark:bg-info-400` |
| `bg-light-blue-400` | `bg-info-400` | `dark:bg-info-300` |
| `bg-success-500` | `bg-success-500` | (same) |
| `bg-[#060c21]` | `bg-neutral-900` | `dark:bg-neutral-950` |
| `text-white` | `text-neutral-900` | `dark:text-white` |
| `text-gray-300` | `text-neutral-600` | `dark:text-neutral-400` |
| `text-gray-400` | `text-neutral-500` | `dark:text-neutral-500` |
| `border-white/10` | `border-neutral-200` | `dark:border-neutral-700` |

---

## Common Patterns

### 1. Adaptive Container
```tsx
<div className="
  min-h-screen 
  bg-neutral-50 dark:bg-neutral-900
  transition-colors duration-300
">
  {/* Content */}
</div>
```

### 2. Glass Morphism (Works in both modes)
```tsx
<div className="
  backdrop-blur-xl 
  bg-white/80 dark:bg-neutral-800/80
  border border-neutral-200 dark:border-neutral-700
  rounded-2xl 
  shadow-light-lg dark:shadow-dark-lg
">
  {/* Content */}
</div>
```

### 3. Hover States
```tsx
<button className="
  px-4 py-2 rounded-lg
  bg-brand-600 hover:bg-brand-700
  dark:bg-brand-500 dark:hover:bg-brand-600
  text-white
  transition-colors duration-200
  hover:scale-105 transition-transform
">
  Hover Me
</button>
```

### 4. Active/Selected State
```tsx
<button className={`
  px-4 py-2 rounded-lg
  transition-colors duration-200
  ${isActive 
    ? 'bg-brand-600 dark:bg-brand-500 text-white' 
    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
  }
`}>
  Tab Item
</button>
```

---

## Testing Checklist

After migrating a component, test:

- [ ] Light mode appearance
- [ ] Dark mode appearance  
- [ ] Hover states in both modes
- [ ] Focus states (keyboard navigation)
- [ ] Text readability (contrast)
- [ ] Border visibility
- [ ] Smooth theme transitions
- [ ] Mobile responsiveness

---

## Automated Migration (Optional)

For bulk updates, you can use find-and-replace patterns:

### VS Code Find & Replace (Regex enabled)

**Primary Color Update:**
- Find: `bg-primary-(\d+)`
- Replace: `bg-brand-$1 dark:bg-brand-$1`

**Text Color Update:**
- Find: `text-white(?![\w-])`
- Replace: `text-neutral-900 dark:text-white`

**Note:** Review all automated changes carefully!

---

## Need Help?

- See [COLOR_PALETTE.md](./COLOR_PALETTE.md) for full color system documentation
- Check component examples in `/src/components/examples/` (if available)
- Test in both light and dark modes before committing changes

---

**Migration Version**: 1.0  
**Last Updated**: February 25, 2026
