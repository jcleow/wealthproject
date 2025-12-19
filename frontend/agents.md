# Package Manager

**Use pnpm only.** Do not use npm or yarn.

- Lockfiles are gitignored (`pnpm-lock.yaml`, `package-lock.json`)
- Install: `pnpm install`
- Add package: `pnpm add <package>`
- Run script: `pnpm run <script>`

---

# Frontend Reusable Components

## CollapsibleSection (`src/components/dashboard/FinancialDataManagement/components/CollapsibleSection.tsx`)

A reusable collapsible section component system with three exports:

### `CollapsibleSection`
Container component for collapsible content with a clickable header.

**Props:**
- `title: string` - Section title (displayed uppercase)
- `total: number` - Total amount to display (formatted as currency)
- `totalSuffix?: string` - Optional suffix (e.g., `/mo`, `/yr`)
- `defaultCollapsed?: boolean` - Initial collapsed state (default: `true`)
- `children: ReactNode` - Content to show when expanded

**Usage:**
```tsx
<CollapsibleSection title="Bank Accounts" total={43000}>
  {/* Items here */}
</CollapsibleSection>
```

### `CollapsibleItem`
A row component for items inside CollapsibleSection with click-to-select behavior.

**Props:**
- `id: string` - Unique identifier for the item
- `name: string` - Display name
- `amount: number` - Amount to display
- `amountSuffix?: string` - Optional suffix (e.g., `/mo`, `/yr`, `%`)
- `formatAsCurrency?: boolean` - Whether to format as currency (default: `true`, auto-disabled for `%` suffix)
- `isSelected: boolean` - Whether item is currently selected
- `onSelect: (id: string) => void` - Selection handler
- `onEdit?: () => void` - Optional edit handler (shows edit button when selected)
- `onDelete?: () => void` - Optional delete handler (shows delete button when selected)

**Usage:**
```tsx
<CollapsibleItem
  id="item-1"
  name="Savings Account"
  amount={25000}
  isSelected={selectedId === 'item-1'}
  onSelect={handleSelect}
  onEdit={() => handleEdit(item)}
  onDelete={() => handleDelete(item.id)}
/>
```

### `useCollapsibleSelection`
A hook for managing selection state with click-outside handling.

**Returns:**
- `selectedId: string | null` - Currently selected item ID
- `handleSelect: (id: string) => void` - Toggle selection handler
- `sectionRef: RefObject<HTMLDivElement>` - Ref to attach to container for click-outside detection

**Usage:**
```tsx
function MySection() {
  const { selectedId, handleSelect, sectionRef } = useCollapsibleSelection()

  return (
    <div ref={sectionRef}>
      <CollapsibleSection title="Items" total={1000}>
        {items.map(item => (
          <CollapsibleItem
            key={item.id}
            id={item.id}
            name={item.name}
            amount={item.amount}
            isSelected={selectedId === item.id}
            onSelect={handleSelect}
          />
        ))}
      </CollapsibleSection>
    </div>
  )
}
```

---

## GroupedItemsSection (`src/components/dashboard/FinancialDataManagement/components/CategoryCard.tsx`)

A component that groups financial items by their `category` field and renders each group as a CollapsibleSection.

**Features:**
- Automatically groups items by `item.category`
- Hides categories with $0 total
- Sorts categories alphabetically (with "Other" at the end)
- Formats category names (e.g., `bank_account` → "Bank Accounts")

**Props:**
- `items: TimelineItem[]` - Items to group and display
- `financialCategory: FinancialCategory` - The financial type ('asset' | 'liability' | 'income' | 'expense')
- `summarizeAmount: (item: TimelineItem) => number` - Function to get display amount
- `selectedItemId`, `onSelectItem`, `onEditItem`, `onDeleteItem`, etc. - Standard item interaction handlers

**Usage:**
```tsx
<GroupedItemsSection
  items={assets}
  financialCategory="asset"
  summarizeAmount={summarizeAmount}
  selectedItemId={selectedItemId}
  onSelectItem={onSelectItem}
  onEditItem={onEditItem}
  onDeleteItem={onDeleteItem}
  // ... other props
/>
```

### `formatCategoryName` (internal helper)

Converts category field values to display names:
- `bank_account` → "Bank Accounts"
- `real_estate` → "Real Estate"
- `cpf` → "CPF"
- Unknown categories: converts snake_case/camelCase to Title Case

---

## Category Name Mappings

The following category values are mapped to friendly display names:

| Category Value | Display Name |
|---------------|--------------|
| `bank_account` | Bank Accounts |
| `bank` | Bank Accounts |
| `savings` | Savings |
| `cash` | Cash |
| `property` | Property |
| `real_estate` | Real Estate |
| `vehicle` | Vehicles |
| `other` | Other Assets |
| `investment` | Investments |
| `cpf` | CPF |
| `stocks` | Stocks |
| `bonds` | Bonds |
| `crypto` | Crypto |
