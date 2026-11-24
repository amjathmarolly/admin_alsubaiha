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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Copy, Sparkles, CheckCircle2 } from "lucide-react"
import { generateHtmlDescription } from "@/lib/utils/generate-html-description"

interface GenerateDescriptionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function GenerateDescriptionDialog({ open, onOpenChange }: GenerateDescriptionDialogProps) {
    const [input, setInput] = useState("")
    const [output, setOutput] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false)

    const handleGenerate = () => {
        setIsGenerating(true)
        // Simulate network delay for "AI" generation
        setTimeout(() => {
            const generated = generateHtmlDescription(input)
            setOutput(generated)
            setIsGenerating(false)
        }, 800)
    }

    const handleCopy = async () => {
        if (!output) return
        try {
            await navigator.clipboard.writeText(output)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error("Failed to copy text: ", err)
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset state when closing
            setTimeout(() => {
                setInput("")
                setOutput("")
                setCopied(false)
            }, 300)
        }
        onOpenChange(newOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Generate Render Description
                    </DialogTitle>
                    <DialogDescription>
                        Convert plain text product descriptions into properly formatted, HTML-ready content.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="input-text">Original Description</Label>
                        <Textarea
                            id="input-text"
                            placeholder="Paste your plain text description here..."
                            className="min-h-[120px] max-h-[300px] overflow-y-auto bg-secondary resize-none"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-center">
                        <Button
                            onClick={handleGenerate}
                            disabled={!input.trim() || isGenerating}
                            className="w-full sm:w-auto gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            {isGenerating ? "Generating..." : "Generate HTML"}
                        </Button>
                    </div>

                    {output && (
                        <div className="grid gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="output-html">Generated HTML</Label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="h-8 gap-2 text-xs"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            Copy HTML
                                        </>
                                    )}
                                </Button>
                            </div>
                            <Textarea
                                id="output-html"
                                readOnly
                                value={output}
                                className="min-h-[150px] max-h-[300px] overflow-y-auto bg-muted font-mono text-xs resize-none"
                            />
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
