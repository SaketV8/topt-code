import * as React from 'react'
import {Menu as MenuPrimitive} from '@base-ui/react/menu'

import {cn} from '@/lib/utils'

const DropdownMenu = MenuPrimitive.Root
const DropdownMenuTrigger = MenuPrimitive.Trigger

function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> & {
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        sideOffset={sideOffset}
        className="z-[60]"
      >
        <MenuPrimitive.Popup
          className={cn(
            'bg-popover text-popover-foreground min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md outline-none',
            'data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-100',
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
  variant?: 'default' | 'destructive'
}) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
        "[&>svg]:size-4 [&>svg]:shrink-0",
        variant === 'destructive' &&
          'text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive',
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
}
