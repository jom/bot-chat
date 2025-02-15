"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { SendIcon } from "lucide-react"

interface PromptFormProps {
  input: string
  setInput: (value: string) => void
  handleSubmit: (e: React.FormEvent) => void
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  isLoading: boolean
}

export function PromptForm({
  input,
  setInput,
  handleSubmit,
  handleInputChange,
  isLoading,
}: PromptFormProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        tabIndex={0}
        rows={1}
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Send a message..."
        spellCheck={false}
        className="min-h-[60px] w-full resize-none bg-transparent px-4 py-[1.3rem] focus-within:outline-none sm:text-sm"
      />
      <div className="absolute right-0 top-4 sm:right-4">
        <Button type="submit" size="icon" disabled={isLoading || input.trim().length === 0}>
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
} 