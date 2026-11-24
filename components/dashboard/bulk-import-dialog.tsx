"use client"

import { useState, useRef, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, UploadCloud, FileSpreadsheet, AlertCircle, FolderOpen, ImageIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import * as xlsx from "xlsx"
import { productsAPI, categoriesAPI, type Category } from "@/lib/api-client"

interface BulkImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
    const [file, setFile] = useState<File | null>(null)
    const [imageFiles, setImageFiles] = useState<File[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; stage: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [importResults, setImportResults] = useState<{ imported: number; skipped: number; errors?: string[] } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const folderInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            categoriesAPI.list({ flat: true }).then(res => {
                setCategories(res.data)
            }).catch(err => {
                console.error("Failed to fetch categories:", err)
            })
        }
    }, [open])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setError(null)
            setImportResults(null)
        }
    }

    const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        // Filter for images
        const imagesOnly = files.filter(f => f.type.startsWith('image/'))
        setImageFiles(imagesOnly)
        setError(null)
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) {
            if (
                droppedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                droppedFile.type === "text/csv" ||
                droppedFile.name.endsWith(".xlsx") ||
                droppedFile.name.endsWith(".csv")
            ) {
                setFile(droppedFile)
                setError(null)
                setImportResults(null)
            } else {
                setError("Please upload a valid CSV or Excel file.")
            }
        }
    }

    const handleImport = async () => {
        if (!file && imageFiles.length === 0) return

        setIsUploading(true)
        setError(null)
        setImportResults(null)
        setUploadProgress({ current: 0, total: 0, stage: "Preparing import..." })

        try {
            let rawProducts: any[] = []

            if (file) {
                setUploadProgress({ current: 0, total: 0, stage: "Parsing Excel..." })
                const data = await file.arrayBuffer()
                const workbook = xlsx.read(data)
                const worksheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[worksheetName]
                const jsonData = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet)

                if (jsonData.length > 0) {
                    rawProducts = jsonData.map(row => {
                        const mappedRow: Record<string, any> = {}
                        for (const [key, value] of Object.entries(row)) {
                            mappedRow[key.toLowerCase().trim()] = value
                        }

                        const selectedCat = categories.find(c => c.id === selectedCategoryId)
                        return {
                            name: mappedRow["name"] || mappedRow["title"] || mappedRow["product name"],
                            description: mappedRow["description"] || mappedRow["desc"],
                            price: mappedRow["price"] || mappedRow["cost"] || mappedRow["regular price"],
                            comparePrice: mappedRow["compare price"] || mappedRow["sale price"],
                            costPrice: mappedRow["cost price"] || mappedRow["cost per item"],
                            category: mappedRow["category"] || mappedRow["type"] || selectedCat?.name,
                            stock: mappedRow["stock"] || mappedRow["quantity"] || mappedRow["qty"] || 0,
                            imageFilename: mappedRow["image"] || mappedRow["image url"] || mappedRow["picture"] || mappedRow["filename"],
                            sku: mappedRow["sku"] || mappedRow["item code"],
                            barcode: mappedRow["barcode"] || mappedRow["upc"],
                            status: (mappedRow["status"] || "active").toLowerCase(),
                        }
                    })
                }
            } else if (imageFiles.length > 0) {
                // Generate basic product records from images if no Excel is provided
                const selectedCat = categories.find(c => c.id === selectedCategoryId)
                rawProducts = imageFiles.map(f => ({
                    name: f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
                    price: 0,
                    category: selectedCat?.name,
                    imageFilename: f.name,
                    status: "draft"
                }))
            }

            if (rawProducts.length === 0) {
                throw new Error("No products found to import.")
            }

            const finalProducts = []
            const imageMap = new Map<string, File>()
            imageFiles.forEach(f => imageMap.set(f.name.toLowerCase(), f))

            setUploadProgress({ current: 0, total: rawProducts.length, stage: "Matching and uploading images..." })

            for (let i = 0; i < rawProducts.length; i++) {
                const p = rawProducts[i]
                let imageUrl = null

                // If imageFilename looks like a URL, use it directly
                if (typeof p.imageFilename === "string" && (p.imageFilename.startsWith("http") || p.imageFilename.startsWith("/"))) {
                    imageUrl = p.imageFilename
                } else if (p.imageFilename) {
                    // Try to match with uploaded files
                    const filename = String(p.imageFilename).toLowerCase().trim()
                    const matchedFile = imageMap.get(filename) || 
                                      imageFiles.find(f => f.name.toLowerCase().includes(filename))

                    if (matchedFile) {
                        try {
                            const formData = new FormData()
                            formData.append("file", matchedFile)
                            
                            const uploadRes = await fetch("/api/upload", {
                                method: "POST",
                                body: formData
                            })
                            
                            if (uploadRes.ok) {
                                const uploadData = await uploadRes.json()
                                imageUrl = uploadData.urls[0]
                            }
                        } catch (err) {
                            console.error(`Failed to upload ${matchedFile.name}:`, err)
                        }
                    }
                }

                finalProducts.push({
                    name: p.name,
                    description: p.description,
                    price: p.price,
                    comparePrice: p.comparePrice,
                    costPrice: p.costPrice,
                    category: p.category,
                    stock: p.stock,
                    image: imageUrl,
                    sku: p.sku,
                    barcode: p.barcode,
                    status: p.status,
                })

                setUploadProgress(prev => prev ? { ...prev, current: i + 1 } : null)
            }

            setUploadProgress({ current: 0, total: 1, stage: "Saving products..." })
            const response = await productsAPI.bulkCreate(finalProducts)
            setImportResults({
                imported: response.imported,
                skipped: response.skipped,
                errors: response.errors,
            })

            if (response.imported > 0) {
                onSuccess()
            }
        } catch (err: any) {
            setError(err.message || "Failed to parse or import the file.")
        } finally {
            setIsUploading(false)
            setUploadProgress(null)
        }
    }

    const resetState = () => {
        setFile(null)
        setImageFiles([])
        setSelectedCategoryId("")
        setError(null)
        setImportResults(null)
        setUploadProgress(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
        if (folderInputRef.current) {
            folderInputRef.current.value = ""
        }
    }

    const handleClose = (newOpen: boolean) => {
        if (!newOpen) {
            resetState()
        }
        onOpenChange(newOpen)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Bulk Import Products</DialogTitle>
                    <DialogDescription>
                        Upload a CSV or Excel file to import multiple products at once. Columns should
                        ideally include Name, Description, Price, Category, and Stock.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {!importResults && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Default Category (Optional)</Label>
                                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No default category</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                    Products without a category in the Excel file will use this one.
                                </p>
                            </div>

                            <Label>Step 1: Upload Product Data (Excel/CSV)</Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${file ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                                    }`}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    onChange={handleFileChange}
                                />
                                <div className="flex flex-col items-center justify-center gap-2 cursor-pointer">
                                    {file ? (
                                        <>
                                            <FileSpreadsheet className="h-8 w-8 text-primary" />
                                            <p className="text-sm font-medium">{file.name}</p>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm font-medium">Click to upload Excel/CSV</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Label>Step 2: Upload Product Images Folder (Optional)</Label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${imageFiles.length > 0 ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                                    }`}
                                onClick={() => folderInputRef.current?.click()}
                            >
                                <input
                                    ref={folderInputRef}
                                    type="file"
                                    className="hidden"
                                    //@ts-ignore - webkitdirectory is a non-standard attribute but widely supported
                                    webkitdirectory=""
                                    directory=""
                                    multiple
                                    onChange={handleFolderChange}
                                />
                                <div className="flex flex-col items-center justify-center gap-2 cursor-pointer">
                                    {imageFiles.length > 0 ? (
                                        <>
                                            <ImageIcon className="h-8 w-8 text-primary" />
                                            <p className="text-sm font-medium">{imageFiles.length} images selected</p>
                                        </>
                                    ) : (
                                        <>
                                            <FolderOpen className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-sm font-medium">Select Images Folder</p>
                                            <p className="text-xs text-muted-foreground">
                                                Select the folder containing images mentioned in your Excel file
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isUploading && uploadProgress && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                                <span>{uploadProgress.stage}</span>
                                {uploadProgress.total > 0 && (
                                    <span>{uploadProgress.current} / {uploadProgress.total}</span>
                                )}
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                                <div 
                                    className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                                    style={{ 
                                        width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 100}%` 
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {importResults && (
                        <div className="space-y-4">
                            <Alert className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                <AlertTitle>Import Complete</AlertTitle>
                                <AlertDescription>
                                    Successfully imported {importResults.imported} products.
                                    {importResults.skipped > 0 && ` Skipped ${importResults.skipped} products.`}
                                </AlertDescription>
                            </Alert>

                            {importResults.errors && importResults.errors.length > 0 && (
                                <div className="rounded-md bg-muted p-4">
                                    <h4 className="text-sm font-medium mb-2">Warnings & Errors:</h4>
                                    <ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                                        {importResults.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {importResults ? (
                        <Button onClick={() => handleClose(false)}>Close</Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => handleClose(false)} disabled={isUploading}>
                                Cancel
                            </Button>
                            <Button onClick={handleImport} disabled={(!file && imageFiles.length === 0) || isUploading}>
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    "Import Products"
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
