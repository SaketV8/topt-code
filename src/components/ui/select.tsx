import * as React from 'react'
import {Select as SelectPrimitive} from '@base-ui/react/select'
import {Check, ChevronDown} from 'lucide-react'

import {cn} from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  id?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

// A small convenience wrapper over Base UI's Select parts, styled to match the
// rest of the shadcn/new-york components. We only ever need a short enum list,
// so a single component (rather than the full set of exported parts) keeps the
// three advanced-option dropdowns tidy.
function Select({
  value,
  onValueChange,
  options,
  id,
  disabled,
  className,
  ...props
}: SelectProps) {
  const labelFor = (val: string) =>
    options.find((option) => option.value === val)?.label ?? val

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(next) => onValueChange(next as string)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        id={id}
        data-slot="select-trigger"
        className={cn(
          'border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'data-[popup-open]:border-ring disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        <SelectPrimitive.Value>
          {(val: string) => labelFor(val)}
        </SelectPrimitive.Value>
        <SelectPrimitive.Icon className="text-muted-foreground">
          <ChevronDown className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          sideOffset={4}
          alignItemWithTrigger={false}
          className="z-[60]"
        >
          <SelectPrimitive.Popup className="bg-popover text-popover-foreground max-h-[var(--available-height)] min-w-[var(--anchor-width)] overflow-y-auto rounded-md border p-1 shadow-md">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm select-none outline-none',
                  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground'
                )}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export {Select}
