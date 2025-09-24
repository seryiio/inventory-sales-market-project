// Simple type for class values
type ClassValue = string | number | boolean | undefined | null | ClassValue[]

// Simple implementation to replace clsx
function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = []

  inputs.forEach((input) => {
    if (!input) return

    if (typeof input === "string" || typeof input === "number") {
      classes.push(String(input))
    } else if (Array.isArray(input)) {
      const result = clsx(...input)
      if (result) classes.push(result)
    } else if (typeof input === "object") {
      Object.entries(input).forEach(([key, value]) => {
        if (value) classes.push(key)
      })
    }
  })

  return classes.join(" ")
}

// Simple implementation to replace tailwind-merge
function twMerge(classNames: string): string {
  if (!classNames) return ""

  // Split classes and remove duplicates, keeping the last occurrence
  const classes = classNames.split(" ").filter(Boolean)
  const result: string[] = []
  const seen = new Set<string>()

  // Process classes in reverse to keep the last occurrence
  for (let i = classes.length - 1; i >= 0; i--) {
    const cls = classes[i]
    if (!seen.has(cls)) {
      seen.add(cls)
      result.unshift(cls)
    }
  }

  return result.join(" ")
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}


export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}
