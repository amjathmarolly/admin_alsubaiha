"use client"

import * as React from "react"
import {
  useAuth,
  type RoleDefinition,
  type TeamMember,
  type Permission,
  ALL_PERMISSIONS,
  ROLE_COLORS,
  getRoleBadgeColor,
} from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Users,
  UserPlus,
  Mail,
  Search,
  Check,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function RolesTab() {
  const {
    roles,
    teamMembers,
    addRole,
    updateRole,
    deleteRole,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
  } = useAuth()
  const { toast } = useToast()

  // Role management state
  const [roleDialogOpen, setRoleDialogOpen] = React.useState(false)
  const [roleDialogMode, setRoleDialogMode] = React.useState<"create" | "edit">("create")
  const [selectedRole, setSelectedRole] = React.useState<RoleDefinition | null>(null)
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = React.useState(false)
  const [roleToDelete, setRoleToDelete] = React.useState<RoleDefinition | null>(null)

  // Team management state
  const [teamDialogOpen, setTeamDialogOpen] = React.useState(false)
  const [teamDialogMode, setTeamDialogMode] = React.useState<"invite" | "edit">("invite")
  const [selectedMember, setSelectedMember] = React.useState<TeamMember | null>(null)
  const [deleteMemberDialogOpen, setDeleteMemberDialogOpen] = React.useState(false)
  const [memberToDelete, setMemberToDelete] = React.useState<TeamMember | null>(null)
  const [teamSearchQuery, setTeamSearchQuery] = React.useState("")

  // Role form state
  const [roleForm, setRoleForm] = React.useState({
    name: "",
    description: "",
    color: "blue",
    permissions: [] as Permission[],
  })

  // Team form state
  const [teamForm, setTeamForm] = React.useState({
    name: "",
    email: "",
    role: "viewer",
  })

  const filteredTeamMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(teamSearchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(teamSearchQuery.toLowerCase())
  )

  const handleCreateRole = () => {
    setRoleDialogMode("create")
    setRoleForm({
      name: "",
      description: "",
      color: "blue",
      permissions: ["view_dashboard"],
    })
    setRoleDialogOpen(true)
  }

  const handleEditRole = (role: RoleDefinition) => {
    setRoleDialogMode("edit")
    setSelectedRole(role)
    setRoleForm({
      name: role.name,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions],
    })
    setRoleDialogOpen(true)
  }

  const handleDuplicateRole = (role: RoleDefinition) => {
    setRoleDialogMode("create")
    setRoleForm({
      name: `${role.name} (Copy)`,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions],
    })
    setRoleDialogOpen(true)
  }

  const handleSaveRole = () => {
    if (!roleForm.name.trim()) {
      toast({
        title: "Error",
        description: "Role name is required.",
        variant: "destructive",
      })
      return
    }

    if (roleDialogMode === "create") {
      addRole(roleForm)
      toast({
        title: "Role Created",
        description: `${roleForm.name} has been created successfully.`,
      })
    } else if (selectedRole) {
      updateRole(selectedRole.id, roleForm)
      toast({
        title: "Role Updated",
        description: `${roleForm.name} has been updated successfully.`,
      })
    }

    setRoleDialogOpen(false)
  }

  const handleDeleteRoleClick = (role: RoleDefinition) => {
    setRoleToDelete(role)
    setDeleteRoleDialogOpen(true)
  }

  const handleConfirmDeleteRole = () => {
    if (roleToDelete) {
      deleteRole(roleToDelete.id)
      toast({
        title: "Role Deleted",
        description: `${roleToDelete.name} has been deleted.`,
      })
    }
    setDeleteRoleDialogOpen(false)
    setRoleToDelete(null)
  }

  const handleInviteMember = () => {
    setTeamDialogMode("invite")
    setTeamForm({
      name: "",
      email: "",
      role: "viewer",
    })
    setTeamDialogOpen(true)
  }

  const handleEditMember = (member: TeamMember) => {
    setTeamDialogMode("edit")
    setSelectedMember(member)
    setTeamForm({
      name: member.name,
      email: member.email,
      role: member.role,
    })
    setTeamDialogOpen(true)
  }

  const handleSaveMember = () => {
    if (!teamForm.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required.",
        variant: "destructive",
      })
      return
    }

    if (teamDialogMode === "invite") {
      addTeamMember({
        name: teamForm.name || teamForm.email.split("@")[0],
        email: teamForm.email,
        role: teamForm.role,
        status: "invited",
      })
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${teamForm.email}.`,
      })
    } else if (selectedMember) {
      updateTeamMember(selectedMember.id, {
        name: teamForm.name,
        email: teamForm.email,
        role: teamForm.role,
      })
      toast({
        title: "Member Updated",
        description: `${teamForm.name}'s profile has been updated.`,
      })
    }

    setTeamDialogOpen(false)
  }

  const handleRemoveMemberClick = (member: TeamMember) => {
    setMemberToDelete(member)
    setDeleteMemberDialogOpen(true)
  }

  const handleConfirmRemoveMember = () => {
    if (memberToDelete) {
      removeTeamMember(memberToDelete.id)
      toast({
        title: "Member Removed",
        description: `${memberToDelete.name} has been removed from the team.`,
      })
    }
    setDeleteMemberDialogOpen(false)
    setMemberToDelete(null)
  }

  const togglePermission = (permission: Permission) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }))
  }

  const toggleAllPermissions = (category: string) => {
    const categoryPermissions = ALL_PERMISSIONS.filter((p) => p.category === category).map(
      (p) => p.key
    )
    const allSelected = categoryPermissions.every((p) => roleForm.permissions.includes(p))

    setRoleForm((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !categoryPermissions.includes(p))
        : [...new Set([...prev.permissions, ...categoryPermissions])],
    }))
  }

  const permissionsByCategory = ALL_PERMISSIONS.reduce(
    (acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    },
    {} as Record<string, typeof ALL_PERMISSIONS>
  )

  const getStatusBadge = (status: TeamMember["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Active
          </Badge>
        )
      case "invited":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            Invited
          </Badge>
        )
      case "inactive":
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            Inactive
          </Badge>
        )
    }
  }

  return (
    <Tabs defaultValue="roles" className="space-y-6">
      <TabsList className="bg-secondary">
        <TabsTrigger value="roles" className="gap-2">
          <Shield className="h-4 w-4" />
          Roles
        </TabsTrigger>
        <TabsTrigger value="team" className="gap-2">
          <Users className="h-4 w-4" />
          Team Members
        </TabsTrigger>
      </TabsList>

      {/* Roles Tab */}
      <TabsContent value="roles" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Roles & Permissions</h3>
            <p className="text-sm text-muted-foreground">
              Manage roles and their access permissions
            </p>
          </div>
          <Button onClick={handleCreateRole} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        </div>

        <div className="grid gap-4">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full",
                        ROLE_COLORS.find((c) => c.value === role.color)?.class || "bg-gray-500"
                      )}
                    />
                    <CardTitle className="text-base">{role.name}</CardTitle>
                    {role.isSystem && (
                      <Badge variant="outline" className="text-xs">
                        System
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditRole(role)} className="gap-2">
                      <Pencil className="h-4 w-4" />
                      Edit Role
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicateRole(role)} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    {!role.isSystem && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteRoleClick(role)}
                          className="gap-2 text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 8).map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {ALL_PERMISSIONS.find((p) => p.key === permission)?.label || permission}
                    </Badge>
                  ))}
                  {role.permissions.length > 8 && (
                    <Badge variant="secondary" className="text-xs">
                      +{role.permissions.length - 8} more
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {teamMembers.filter((m) => m.role === role.id).length} team member
                    {teamMembers.filter((m) => m.role === role.id).length !== 1 ? "s" : ""}
                  </span>
                  <span>Created {role.createdAt}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Team Members Tab */}
      <TabsContent value="team" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Team Members</h3>
            <p className="text-sm text-muted-foreground">
              Manage team members and their roles
            </p>
          </div>
          <Button onClick={handleInviteMember} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search team members..."
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className="pl-9 bg-secondary"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredTeamMembers.map((member) => {
                const memberRole = roles.find((r) => r.id === member.role)
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-6 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            ROLE_COLORS.find((c) => c.value === memberRole?.color)?.class ||
                              "bg-gray-500"
                          )}
                        />
                        <span className="text-sm">{memberRole?.name || member.role}</span>
                      </div>
                      {getStatusBadge(member.status)}
                      {member.lastActive && (
                        <span className="text-sm text-muted-foreground hidden md:block">
                          {member.lastActive}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditMember(member)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Member
                          </DropdownMenuItem>
                          {member.status === "invited" && (
                            <DropdownMenuItem className="gap-2">
                              <Mail className="h-4 w-4" />
                              Resend Invitation
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMemberClick(member)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
              {filteredTeamMembers.length === 0 && (
                <div className="px-6 py-8 text-center text-muted-foreground">
                  No team members found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {roleDialogMode === "create" ? "Create New Role" : "Edit Role"}
            </DialogTitle>
            <DialogDescription>
              {roleDialogMode === "create"
                ? "Define a new role with specific permissions."
                : "Modify role details and permissions."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="roleName">Role Name</Label>
                <Input
                  id="roleName"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g., Marketing Manager"
                  className="bg-secondary"
                  disabled={selectedRole?.isSystem}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleColor">Color</Label>
                <Select
                  value={roleForm.color}
                  onValueChange={(value) => setRoleForm({ ...roleForm, color: value })}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-3 w-3 rounded-full", color.class)} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Describe what this role can do..."
                className="bg-secondary resize-none"
                rows={2}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Permissions</Label>
                <span className="text-sm text-muted-foreground">
                  {roleForm.permissions.length} of {ALL_PERMISSIONS.length} selected
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(permissionsByCategory).map(([category, permissions]) => {
                  const allSelected = permissions.every((p) =>
                    roleForm.permissions.includes(p.key)
                  )
                  const someSelected =
                    !allSelected && permissions.some((p) => roleForm.permissions.includes(p.key))

                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            ref={(ref) => {
                              if (ref) {
                                ;(ref as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
                              }
                            }}
                            onCheckedChange={() => toggleAllPermissions(category)}
                          />
                          <span className="font-medium text-sm">{category}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {permissions.filter((p) => roleForm.permissions.includes(p.key)).length}/
                          {permissions.length}
                        </span>
                      </div>
                      <div className="ml-6 grid gap-2 sm:grid-cols-2">
                        {permissions.map((permission) => (
                          <div key={permission.key} className="flex items-center gap-2">
                            <Checkbox
                              id={permission.key}
                              checked={roleForm.permissions.includes(permission.key)}
                              onCheckedChange={() => togglePermission(permission.key)}
                            />
                            <Label
                              htmlFor={permission.key}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>
              {roleDialogMode === "create" ? "Create Role" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Member Dialog */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {teamDialogMode === "invite" ? "Invite Team Member" : "Edit Team Member"}
            </DialogTitle>
            <DialogDescription>
              {teamDialogMode === "invite"
                ? "Send an invitation to join your team."
                : "Update team member details."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {teamDialogMode === "edit" && (
              <div className="space-y-2">
                <Label htmlFor="memberName">Name</Label>
                <Input
                  id="memberName"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                  placeholder="Full name"
                  className="bg-secondary"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Email</Label>
              <Input
                id="memberEmail"
                type="email"
                value={teamForm.email}
                onChange={(e) => setTeamForm({ ...teamForm, email: e.target.value })}
                placeholder="email@example.com"
                className="bg-secondary"
                disabled={teamDialogMode === "edit"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memberRole">Role</Label>
              <Select
                value={teamForm.role}
                onValueChange={(value) => setTeamForm({ ...teamForm, role: value })}
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            ROLE_COLORS.find((c) => c.value === role.color)?.class || "bg-gray-500"
                          )}
                        />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTeamDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMember}>
              {teamDialogMode === "invite" ? "Send Invitation" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation */}
      <AlertDialog open={deleteRoleDialogOpen} onOpenChange={setDeleteRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{roleToDelete?.name}" role? Team members with
              this role will need to be reassigned to another role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={deleteMemberDialogOpen} onOpenChange={setDeleteMemberDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToDelete?.name} from the team? They will lose
              access to the dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  )
}
