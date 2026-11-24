"use client"

import { useState, useEffect, useCallback } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, Loader2, Newspaper, ExternalLink } from "lucide-react"
import { blogsAPI, type Blog } from "@/lib/api-client"
import { BlogDialog } from "@/components/dashboard/blog-dialog"
import { DeleteDialog } from "@/components/dashboard/delete-dialog"
import { useToast } from "@/components/ui/use-toast"
import { normalizeImageUrl } from "@/lib/utils"

export default function BlogsPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)
  const [blogToDelete, setBlogToDelete] = useState<Blog | null>(null)

  const fetchBlogs = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await blogsAPI.list({
        search: searchQuery || undefined,
        limit: 100,
      })
      setBlogs(response.data)
    } catch (error) {
      console.error("Failed to fetch blogs:", error)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchBlogs()
    }, 300)
    return () => clearTimeout(debounce)
  }, [fetchBlogs])

  const handleAddBlog = () => {
    setSelectedBlog(null)
    setDialogOpen(true)
  }

  const handleEditBlog = (blog: Blog) => {
    setSelectedBlog(blog)
    setDialogOpen(true)
  }

  const handleDeleteClick = (blog: Blog) => {
    setBlogToDelete(blog)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (blogToDelete) {
      try {
        await blogsAPI.delete(blogToDelete.id)
        toast({
          title: "Post deleted",
          description: "The blog post has been successfully removed.",
        })
        await fetchBlogs()
      } catch (error) {
        console.error("Failed to delete blog:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete the blog post.",
        })
      }
      setBlogToDelete(null)
    }
    setDeleteDialogOpen(false)
  }

  const handleSaveBlog = async (blogData: Partial<Blog>) => {
    try {
      if (blogData.id) {
        await blogsAPI.update(blogData.id, blogData)
        toast({
          title: "Post updated",
          description: "Your changes have been saved successfully.",
        })
      } else {
        await blogsAPI.create(blogData)
        toast({
          title: "Post published",
          description: "A new blog post has been created.",
        })
      }
      await fetchBlogs()
    } catch (error) {
      console.error("Failed to save blog:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save the blog post.",
      })
    }
  }

  return (
    <DashboardLayout
      title="Blogs"
      description="Create and manage articles for the Al Subaiha Journal."
      requiredPermission="view_blogs"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="gap-2" onClick={handleAddBlog}>
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Journal Articles ({blogs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Article</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blogs.map((blog) => (
                    <TableRow key={blog.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {blog.image ? (
                            <div className="h-10 w-16 rounded overflow-hidden border bg-secondary shrink-0">
                              <img
                                src={normalizeImageUrl(blog.image)}
                                alt={blog.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-16 rounded bg-secondary flex items-center justify-center shrink-0">
                              <Newspaper className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium line-clamp-1">{blog.title}</p>
                            <p className="text-xs text-muted-foreground">/{blog.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-secondary/50">
                          {blog.category || "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{blog.author}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            blog.status === "active"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                              : blog.status === "draft"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/20"
                                : "bg-red-500/20 text-red-400 border-red-500/20"
                          }
                        >
                          {blog.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(blog.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => window.open(`https://alsubaiha.ae/blogs/${blog.slug}`, '_blank')}>
                              <ExternalLink className="h-4 w-4" />
                              View Live
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => handleEditBlog(blog)}>
                              <Pencil className="h-4 w-4" />
                              Edit Post
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(blog)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {blogs.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Newspaper className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-muted-foreground font-medium">No articles found</p>
                          <Button variant="link" onClick={handleAddBlog}>Create your first post</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <BlogDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        blog={selectedBlog}
        onSave={handleSaveBlog}
      />

      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Article"
        description={`Are you sure you want to delete "${blogToDelete?.title}"? This action cannot be undone and the post will be removed from the live site.`}
      />
    </DashboardLayout>
  )
}
