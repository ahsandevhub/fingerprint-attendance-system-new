"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "cn"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, defaultChecked, onCheckedChange, onChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false)
    const isControlled = checked !== undefined
    const activeChecked = isControlled ? checked : isChecked

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setIsChecked(e.target.checked)
      }
      onCheckedChange?.(e.target.checked)
      onChange?.(e)
    }

    return (
      <span className="relative inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          ref={ref}
          checked={activeChecked}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <span
          className={cn(
            "h-4 w-4 shrink-0 rounded-md border border-slate-300 dark:border-slate-700 bg-background transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20 peer-focus-visible:border-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center text-primary-foreground",
            className
          )}
        >
          {activeChecked && <Check className="h-3 w-3 stroke-[3]" />}
        </span>
      </span>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
