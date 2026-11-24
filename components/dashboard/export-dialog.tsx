"use client"

import * as React from "react"
import { Download, FileSpreadsheet, FileText, FileJson } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface ExportField {
  key: string
  label: string
  default: boolean
}

interface ExportDialogProps {
  title: string
  data: Record<string, unknown>[]
  fields: ExportField[]
  filename?: string
}

export function ExportDialog({ title, data, fields, filename = "export" }: ExportDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [format, setFormat] = React.useState<"csv" | "json" | "xlsx">("csv")
  const [selectedFields, setSelectedFields] = React.useState<string[]>(
    fields.filter((f) => f.default).map((f) => f.key)
  )
  const [dateRange, setDateRange] = React.useState("all")
  const [isExporting, setIsExporting] = React.useState(false)

  const toggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    )
  }

  const selectAll = () => {
    setSelectedFields(fields.map((f) => f.key))
  }

  const deselectAll = () => {
    setSelectedFields([])
  }

  const generateCSV = (exportData: Record<string, unknown>[]) => {
    const headers = selectedFields.join(",")
    const rows = exportData.map((row) =>
      selectedFields
        .map((field) => {
          const value = row[field]
          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`
          }
          return value ?? ""
        })
        .join(",")
    )
    return [headers, ...rows].join("\n")
  }

  const generateJSON = (exportData: Record<string, unknown>[]) => {
    const filteredData = exportData.map((row) => {
      const filtered: Record<string, unknown> = {}
      for (const field of selectedFields) {
        filtered[field] = row[field]
      }
      return filtered
    })
    return JSON.stringify(filteredData, null, 2)
  }

  const handleExport = async () => {
    if (selectedFields.length === 0) return
    
    setIsExporting(true)
    
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500))
    
    let content: string
    let mimeType: string
    let extension: string

    switch (format) {
      case "json":
        content = generateJSON(data)
        mimeType = "application/json"
        extension = "json"
        break
      case "xlsx":
        // For xlsx, we'll just use CSV as a fallback since we can't generate real xlsx without a library
        content = generateCSV(data)
        mimeType = "text/csv"
        extension = "csv"
        break
      case "csv":
      default:
        content = generateCSV(data)
        mimeType = "text/csv"
        extension = "csv"
        break
    }

    // Create and trigger download
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setIsExporting(false)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export {title}</DialogTitle>
          <DialogDescription>
            Choose your export format and select the fields to include.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Format Selection */}
          <div className="grid gap-3">
            <Label>Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "csv" | "json" | "xlsx")}
              className="grid grid-cols-3 gap-4"
            >
              <Label
                htmlFor="csv"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-secondary/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
              >
                <RadioGroupItem value="csv" id="csv" className="sr-only" />
                <FileSpreadsheet className="h-6 w-6" />
                <span className="text-sm font-medium">CSV</span>
              </Label>
              <Label
                htmlFor="json"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-secondary/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
              >
                <RadioGroupItem value="json" id="json" className="sr-only" />
                <FileJson className="h-6 w-6" />
                <span className="text-sm font-medium">JSON</span>
              </Label>
              <Label
                htmlFor="xlsx"
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border p-4 hover:bg-secondary/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
              >
                <RadioGroupItem value="xlsx" id="xlsx" className="sr-only" />
                <FileText className="h-6 w-6" />
                <span className="text-sm font-medium">Excel</span>
              </Label>
            </RadioGroup>
          </div>

          {/* Date Range */}
          <div className="grid gap-3">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Field Selection */}
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label>Fields to Export</Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => toggleField(field.key)}
                  />
                  <Label
                    htmlFor={field.key}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-secondary/50 p-3 text-sm">
            <p className="text-muted-foreground">
              Exporting <span className="font-medium text-foreground">{data.length}</span> records 
              with <span className="font-medium text-foreground">{selectedFields.length}</span> fields
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={selectedFields.length === 0 || isExporting}
          >
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
