"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

export function ButtonScrollToBottom() {
  return (
    <Button
      variant="outline"
      size="icon"
      className="absolute right-4 top-1 h-8 w-8 rounded-full bg-background transition-opacity duration-300"
      onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  )
} 