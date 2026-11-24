"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Mail, Send } from "lucide-react"
import type { Customer } from "@/lib/customers-context"

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer: Customer | null
}

export function SendEmailDialog({ open, onOpenChange, customer }: SendEmailDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const handleSendEmail = async () => {
    if (!customer) return

    if (!subject.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email subject",
        variant: "destructive"
      })
      return
    }

    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email message",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      console.log("[v0] Sending email to:", customer.email)
      
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: customer.email,
          customerName: customer.name,
          subject,
          message
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send email")
      }

      toast({
        title: "Success",
        description: `Email sent successfully to ${customer.email}`
      })

      setSubject("")
      setMessage("")
      onOpenChange(false)
    } catch (error: any) {
      console.error("[v0] Error sending email:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Email
          </DialogTitle>
          <DialogDescription>
            Send an email to <strong>{customer?.name}</strong> ({customer?.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              value={customer?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="Email subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-message">Message</Label>
            <Textarea
              id="email-message"
              placeholder="Write your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={6}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
