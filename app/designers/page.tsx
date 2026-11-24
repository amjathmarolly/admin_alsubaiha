"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeleteDialog } from "@/components/dashboard/delete-dialog";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  X,
  Globe,
  Instagram,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export interface DesignerData {
  id: string;
  name: string;
  image: string;
  short_bio: string;
  inspiration_text: string;
  design_principles: string[];
  notable_works: string[];
  website?: string;
  social_links?: {
    instagram?: string;
    pinterest?: string;
  };
  status: "active" | "inactive";
  sort_order: number;
}

export default function DesignersAdminPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("manage_our_work");

  const [items, setItems] = useState<DesignerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DesignerData | null>(null);
  const [itemToDelete, setItemToDelete] = useState<DesignerData | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [shortBio, setShortBio] = useState("");
  const [inspirationText, setInspirationText] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [pinterest, setPinterest] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [sortOrder, setSortOrder] = useState<number>(0);

  // Dynamic lists states inside the form
  const [designPrinciples, setDesignPrinciples] = useState<string[]>([]);
  const [newPrinciple, setNewPrinciple] = useState("");

  const [notableWorks, setNotableWorks] = useState<any[]>([]);

  // Inventory products association states
  const [assignedDbProducts, setAssignedDbProducts] = useState<any[]>([]);
  const [initialAssignedProducts, setInitialAssignedProducts] = useState<any[]>([]);
  const [allProductsList, setAllProductsList] = useState<any[]>([]);
  const [selectedProductToAssign, setSelectedProductToAssign] = useState<string>("");
  
  // Create new product modal states
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("10");
  const [newProdCategory, setNewProdCategory] = useState("");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImage, setNewProdImage] = useState("");
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isNewProdImageUploading, setIsNewProdImageUploading] = useState(false);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Search query states
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Product creation form state
  const [productTitle, setProductTitle] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [isProductUploading, setIsProductUploading] = useState(false);

  // Media uploading state
  const [isUploading, setIsUploading] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/designers?limit=100");
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
      } else {
        toast.error("Failed to load designers list");
      }
    } catch (error) {
      console.error("Failed to fetch designers", error);
      toast.error("Failed to fetch designers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDesignerProducts = async (designerId?: string) => {
    try {
      const allRes = await fetch("/api/products?limit=1000");
      if (allRes.ok) {
        const allJson = await allRes.json();
        setAllProductsList(allJson.data || []);
      }

      // Fetch categories list
      const catRes = await fetch("/api/categories?limit=100");
      if (catRes.ok) {
        const catJson = await catRes.json();
        setCategoriesList(catJson.data || []);
      }

      if (designerId) {
        const res = await fetch(`/api/products?designerId=${designerId}&limit=1000`);
        if (res.ok) {
          const json = await res.json();
          setAssignedDbProducts(json.data || []);
          setInitialAssignedProducts(json.data || []);
        }
      } else {
        setAssignedDbProducts([]);
        setInitialAssignedProducts([]);
      }
    } catch (err) {
      console.error("Error fetching products/categories for designer:", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenAddDialog = () => {
    setSelectedItem(null);
    setName("");
    setImage("");
    setShortBio("");
    setInspirationText("");
    setWebsite("");
    setInstagram("");
    setPinterest("");
    setStatus("active");
    setSortOrder(items.length + 1);
    setDesignPrinciples([]);
    setNotableWorks([]);
    setNewPrinciple("");
    setProductTitle("");
    setProductImage("");
    setProductCategory("");
    setProductDescription("");
    
    // Reset new product dialog form states
    setNewProdName("");
    setNewProdPrice("");
    setNewProdStock("10");
    setNewProdCategory("");
    setNewProdDescription("");
    setNewProdImage("");
    setProductSearchQuery("");
    
    fetchDesignerProducts();
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (item: DesignerData) => {
    setSelectedItem(item);
    setName(item.name || "");
    setImage(item.image || "");
    setShortBio(item.short_bio || "");
    setInspirationText(item.inspiration_text || "");
    setWebsite(item.website || "");
    setInstagram(item.social_links?.instagram || "");
    setPinterest(item.social_links?.pinterest || "");
    setStatus(item.status || "active");
    setSortOrder(item.sort_order || 0);
    setDesignPrinciples(item.design_principles || []);
    setNotableWorks(item.notable_works || []);
    setNewPrinciple("");
    setProductTitle("");
    setProductImage("");
    setProductCategory("");
    setProductDescription("");

    // Reset new product dialog form states
    setNewProdName("");
    setNewProdPrice("");
    setNewProdStock("10");
    setNewProdCategory("");
    setNewProdDescription("");
    setNewProdImage("");
    setProductSearchQuery("");

    fetchDesignerProducts(item.id);
    setDialogOpen(true);
  };

  const handleNewProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsNewProdImageUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.urls && data.urls[0]) {
        setNewProdImage(data.urls[0]);
        toast.success("Image uploaded successfully");
      } else {
        toast.error("Failed to parse upload result");
      }
    } catch (err) {
      toast.error("Failed to upload image file");
    } finally {
      setIsNewProdImageUploading(false);
    }
  };

  const handleCreateNewProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdPrice || !newProdStock) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsCreatingProduct(true);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: `SKU-${Date.now()}`,
          name: newProdName,
          price: parseFloat(newProdPrice),
          stock: parseInt(newProdStock),
          categoryId: newProdCategory || null,
          designerId: selectedItem?.id || null,
          description: newProdDescription || null,
          image: newProdImage || null,
          status: "active"
        })
      });

      if (res.ok) {
        const json = await res.json();
        const newProduct = json.data || json;

        // Fetch products list again
        const allRes = await fetch("/api/products?limit=1000");
        if (allRes.ok) {
          const allJson = await allRes.json();
          setAllProductsList(allJson.data || []);
        }

        // Add the new product to assigned products in-memory list
        setAssignedDbProducts([...assignedDbProducts, newProduct]);

        // Reset fields
        setNewProdName("");
        setNewProdPrice("");
        setNewProdStock("10");
        setNewProdCategory("");
        setNewProdDescription("");
        setNewProdImage("");
        
        setNewProductDialogOpen(false);
        toast.success("New product created and assigned successfully");
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to create product");
      }
    } catch (err) {
      console.error("Failed to create product:", err);
      toast.error("Error creating new product");
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleOpenDeleteDialog = (item: DesignerData) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  // Add items to dynamic array fields
  const handleAddPrinciple = () => {
    if (newPrinciple.trim() && !designPrinciples.includes(newPrinciple.trim())) {
      setDesignPrinciples([...designPrinciples, newPrinciple.trim()]);
      setNewPrinciple("");
    }
  };

  const handleRemovePrinciple = (indexToRemove: number) => {
    setDesignPrinciples(designPrinciples.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddProduct = () => {
    if (!productTitle.trim()) {
      toast.error("Product title is required");
      return;
    }
    const newProduct = {
      title: productTitle.trim(),
      image: productImage.trim() || undefined,
      category: productCategory.trim() || undefined,
      description: productDescription.trim() || undefined
    };
    setNotableWorks([...notableWorks, newProduct]);
    setProductTitle("");
    setProductImage("");
    setProductCategory("");
    setProductDescription("");
  };

  const handleAssignProduct = () => {
    if (!selectedProductToAssign) return;
    const prod = allProductsList.find(p => p.id === selectedProductToAssign);
    if (prod) {
      if (assignedDbProducts.some(p => p.id === prod.id)) {
        toast.error("Product is already assigned");
        return;
      }
      setAssignedDbProducts([...assignedDbProducts, prod]);
      setSelectedProductToAssign("");
      toast.success(`Assigned ${prod.name}`);
    }
  };

  const handleUnassignProduct = (productId: string) => {
    setAssignedDbProducts(assignedDbProducts.filter(p => p.id !== productId));
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProductUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.urls && data.urls[0]) {
        setProductImage(data.urls[0]);
        toast.success("Product image uploaded successfully");
      } else {
        toast.error("Failed to parse upload result");
      }
    } catch (err) {
      toast.error("Failed to upload product image file");
    } finally {
      setIsProductUploading(false);
    }
  };

  const handleRemoveWork = (indexToRemove: number) => {
    setNotableWorks(notableWorks.filter((_, idx) => idx !== indexToRemove));
  };

  // File upload logic
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.urls && data.urls[0]) {
        setImage(data.urls[0]);
        toast.success("Image uploaded successfully");
      } else {
        toast.error("Failed to parse upload result");
      }
    } catch (err) {
      toast.error("Failed to upload image file");
    } finally {
      setIsUploading(false);
    }
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !image || !shortBio || !inspirationText) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name,
        image,
        shortBio,
        inspirationText,
        designPrinciples,
        notableWorks,
        website: website || undefined,
        socialLinks: {
          instagram: instagram || undefined,
          pinterest: pinterest || undefined,
        },
        status,
        sortOrder,
      };

      const url = selectedItem ? `/api/designers/${selectedItem.id}` : "/api/designers";
      const method = selectedItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const savedDesigner = await res.json();
        const finalId = selectedItem ? selectedItem.id : savedDesigner.id;

        const toAssign = assignedDbProducts.filter(p => !initialAssignedProducts.some(ip => ip.id === p.id));
        const toUnassign = initialAssignedProducts.filter(p => !assignedDbProducts.some(ap => ap.id === p.id));

        const assignPromises = toAssign.map(p => 
          fetch(`/api/products/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ designerId: finalId })
          })
        );
        const unassignPromises = toUnassign.map(p => 
          fetch(`/api/products/${p.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ designerId: null })
          })
        );

        await Promise.all([...assignPromises, ...unassignPromises]);

        toast.success(selectedItem ? "Designer updated successfully" : "Designer added successfully");
        setDialogOpen(false);
        fetchItems();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Failed to save designer record");
      }
    } catch (err) {
      toast.error("Failed to communicate with database API");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/designers/${itemToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Designer deleted successfully");
        setDeleteDialogOpen(false);
        fetchItems();
      } else {
        toast.error("Failed to delete designer record");
      }
    } catch (err) {
      toast.error("Error communicating with delete API");
    } finally {
      setIsSaving(false);
      setItemToDelete(null);
    }
  };


  return (
    <DashboardLayout title="Designers" description="Manage designer portfolio listings">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Designers Portfolio</h1>
            <p className="text-muted-foreground">
              Manage the designers and master works displayed in the website's showcase.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <Button onClick={handleOpenAddDialog}>
                <Plus className="mr-2 h-4 w-4" /> Add Designer
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Inspiring Designers</CardTitle>
            <CardDescription>
              View, edit, or delete designer entries. The order determines their showcase hierarchy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed text-center p-8">
                <p className="text-muted-foreground mb-4">No designers found in the database.</p>
                {canManage && (
                  <Button onClick={handleOpenAddDialog}>
                    <Plus className="mr-2 h-4 w-4" /> Add Designer
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Order</TableHead>
                      <TableHead className="w-[100px]">Portrait</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Bio Excerpt</TableHead>
                      <TableHead>Principles</TableHead>
                      <TableHead>Works</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.sort_order}</TableCell>
                        <TableCell>
                          <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                            <img
                              src={
                                item.image?.startsWith("/")
                                  ? `${process.env.NEXT_PUBLIC_ADMIN_URL || ""}${item.image}`
                                  : item.image
                              }
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">{item.name}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-muted-foreground">
                          {item.short_bio}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.design_principles?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {item.notable_works?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === "active" ? "default" : "destructive"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canManage ? (
                                <>
                                  <DropdownMenuItem onClick={() => handleOpenEditDialog(item)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleOpenDeleteDialog(item)}
                                    className="text-destructive focus:bg-destructive/10"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <DropdownMenuItem disabled>No Permissions</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit Designer Profile" : "Add New Designer"}</DialogTitle>
            <DialogDescription>
              Provide the designer's credentials and work details. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Charlotte Perriand"
                  required
                />
              </div>

              {/* Status & Sort Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>

            {/* Photo / Image */}
            <div className="space-y-3">
              <Label>Portrait Image *</Label>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <Input
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    placeholder="Image URL or upload file"
                    required
                  />
                </div>
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-file-input"
                    disabled={isUploading}
                  />
                  <Label
                    htmlFor="image-file-input"
                    className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer bg-secondary hover:bg-secondary-foreground hover:text-white transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload file
                  </Label>
                </div>
              </div>
              {image && (
                <div className="mt-2 h-24 w-20 overflow-hidden border rounded bg-muted">
                  <img
                    src={image.startsWith("/") ? `${process.env.NEXT_PUBLIC_ADMIN_URL || ""}${image}` : image}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Short Bio */}
            <div className="space-y-2">
              <Label htmlFor="shortBio">Short Biography * (2-4 sentences)</Label>
              <Textarea
                id="shortBio"
                value={shortBio}
                onChange={(e) => setShortBio(e.target.value)}
                placeholder="Charlotte Perriand was a French architect..."
                rows={3}
                required
              />
            </div>

            {/* Inspiration */}
            <div className="space-y-2">
              <Label htmlFor="inspirationText">Inspired Me Because * (Philosophy link)</Label>
              <Textarea
                id="inspirationText"
                value={inspirationText}
                onChange={(e) => setInspirationText(e.target.value)}
                placeholder="Perriand's philosophy that design should be human-centric inspires..."
                rows={3}
                required
              />
            </div>

            {/* Dynamic Principles list */}
            <div className="space-y-3">
              <Label>Key Design Principles</Label>
              <div className="flex gap-2">
                <Input
                  value={newPrinciple}
                  onChange={(e) => setNewPrinciple(e.target.value)}
                  placeholder="e.g. Human-Centric Functionalism"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPrinciple();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddPrinciple} variant="secondary">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {designPrinciples.map((principle, idx) => (
                  <Badge key={idx} variant="secondary" className="flex items-center gap-1.5 py-1 px-2.5">
                    <span>{principle}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePrinciple(idx)}
                      className="rounded-full text-muted-foreground hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>



            {/* Inventory Products Association */}
            <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm">Inventory Products Association</h4>
                  <p className="text-xs text-muted-foreground">Link existing products from your store inventory or add new ones.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewProductDialogOpen(true)}
                  className="text-xs h-8 bg-background border-dashed border-primary/30 hover:border-primary shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
                </Button>
              </div>

              {/* Search-Enabled Product Assignment Input */}
              <div className="relative">
                <div className="flex items-center border rounded-md px-3 bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search inventory products..."
                    value={productSearchQuery}
                    onChange={(e) => {
                      setProductSearchQuery(e.target.value);
                      setIsSearchFocused(true);
                    }}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      // Slight delay so onMouseDown event on options fires before search blurs
                      setTimeout(() => setIsSearchFocused(false), 200);
                    }}
                    className="border-0 bg-transparent p-0 focus:outline-none focus:ring-0 text-xs w-full h-9"
                  />
                  {productSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setProductSearchQuery("")}
                      className="text-muted-foreground hover:text-foreground shrink-0 ml-1.5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {isSearchFocused && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-[220px] overflow-y-auto bg-popover text-popover-foreground border rounded-md shadow-lg p-1">
                    {allProductsList
                      .filter(p => 
                        !assignedDbProducts.some(ap => ap.id === p.id) &&
                        p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
                      )
                      .map((prod) => (
                        <div
                          key={prod.id}
                          onMouseDown={() => {
                            setAssignedDbProducts([...assignedDbProducts, prod]);
                            setProductSearchQuery("");
                            toast.success(`Assigned ${prod.name}`);
                          }}
                          className="flex items-center justify-between px-2.5 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer text-xs"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold">{prod.name}</span>
                            <span className="text-[10px] text-muted-foreground">{prod.category_name || "Uncategorized"}</span>
                          </div>
                          {prod.sku && <span className="text-[10px] text-muted-foreground font-mono">{prod.sku}</span>}
                        </div>
                      ))}
                    {allProductsList.filter(p => 
                      !assignedDbProducts.some(ap => ap.id === p.id) &&
                      p.name.toLowerCase().includes(productSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No matching products found
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Assigned DB Products List */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-muted-foreground">Assigned Inventory Products ({assignedDbProducts.length})</Label>
                {assignedDbProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic p-2.5 border border-dashed rounded text-center bg-background/50">
                    No inventory products assigned to this designer.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {assignedDbProducts.map((prod, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 border rounded bg-background gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-10 w-10 rounded border bg-muted overflow-hidden shrink-0">
                            {prod.image ? (
                              <img
                                src={prod.image.startsWith("/") ? `${process.env.NEXT_PUBLIC_ADMIN_URL || ""}${prod.image}` : prod.image}
                                alt={prod.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[8px] text-muted-foreground bg-muted font-mono leading-none">
                                No Img
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs truncate leading-tight">{prod.name}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none mt-0.5">{prod.category_name || "FURNITURE"}</p>
                            {prod.sku && <p className="text-[9px] text-muted-foreground/80 mt-1 leading-none font-mono">SKU: {prod.sku}</p>}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnassignProduct(prod.id)}
                          className="text-destructive hover:bg-destructive/10 h-7 w-7 p-0 shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Website & Social Links */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-semibold text-sm">External Links & Socials</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website URL</Label>
                  <div className="flex items-center border rounded-md px-3 bg-muted/40">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" />
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://..."
                      className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <div className="flex items-center border rounded-md px-3 bg-muted/40">
                    <Instagram className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" />
                    <Input
                      id="instagram"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="https://instagram.com/..."
                      className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pinterest">Pinterest</Label>
                  <div className="flex items-center border rounded-md px-3 bg-muted/40">
                    <span className="text-[11px] font-bold text-muted-foreground mr-2 shrink-0">PIN</span>
                    <Input
                      id="pinterest"
                      value={pinterest}
                      onChange={(e) => setPinterest(e.target.value)}
                      placeholder="https://pinterest.com/..."
                      className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Designer Profile"
        description={`Are you sure you want to delete ${itemToDelete?.name}? This action cannot be undone.`}
      />

      {/* Add New Product Dialog */}
      <Dialog open={newProductDialogOpen} onOpenChange={setNewProductDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Product to Inventory</DialogTitle>
            <DialogDescription>
              Create a new product in the store inventory and assign it to this designer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNewProductSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-prod-name">Product Name *</Label>
              <Input
                id="new-prod-name"
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="e.g. Chandigarh Easy Chair"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-prod-price">Price ($) *</Label>
                <Input
                  id="new-prod-price"
                  type="number"
                  step="0.01"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-prod-stock">Stock Quantity *</Label>
                <Input
                  id="new-prod-stock"
                  type="number"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  placeholder="10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-prod-category">Category</Label>
              <Select
                value={newProdCategory}
                onValueChange={setNewProdCategory}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select a category..." />
                </SelectTrigger>
                <SelectContent>
                  {categoriesList.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  {categoriesList.length === 0 && (
                    <SelectItem value="none" disabled>No categories found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-prod-desc">Description</Label>
              <Textarea
                id="new-prod-desc"
                value={newProdDescription}
                onChange={(e) => setNewProdDescription(e.target.value)}
                placeholder="Brief product description..."
                rows={3}
              />
            </div>

            {/* Product Image Upload */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="flex gap-2">
                <Input
                  value={newProdImage}
                  onChange={(e) => setNewProdImage(e.target.value)}
                  placeholder="Image URL or upload"
                  className="flex-1"
                />
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleNewProductImageUpload}
                    className="hidden"
                    id="new-product-upload"
                    disabled={isNewProdImageUploading}
                  />
                  <Label
                    htmlFor="new-product-upload"
                    className="flex items-center gap-1.5 px-3 py-2 border rounded-md text-xs cursor-pointer bg-secondary hover:bg-secondary-foreground hover:text-white transition-colors h-10"
                  >
                    {isNewProdImageUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload
                  </Label>
                </div>
              </div>
              {newProdImage && (
                <div className="mt-2 h-16 w-16 overflow-hidden border rounded bg-muted">
                  <img
                    src={newProdImage.startsWith("/") ? `${process.env.NEXT_PUBLIC_ADMIN_URL || ""}${newProdImage}` : newProdImage}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setNewProductDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingProduct}>
                {isCreatingProduct && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Assign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
