"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth, getRoleLabel, getRoleBadgeColor } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Camera, Shield, Loader2 } from "lucide-react"
import { RolesTab } from "@/components/dashboard/roles-tab"
import { useToast } from "@/hooks/use-toast"
import { useCurrency, type CurrencyCode } from "@/lib/currency-context"
import { GoogleLinkCard } from "@/components/dashboard/google-link-card"

export default function SettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { currency: globalCurrency, setCurrency: setGlobalCurrency } = useCurrency()
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.name?.split(" ")[0] || "",
    lastName: user?.name?.split(" ").slice(1).join(" ") || "",
    email: user?.email || "",
    phone: "+1 (555) 123-4567",
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Store settings state
  const [storeForm, setStoreForm] = useState({
    storeName: "Furnish",
    currency: globalCurrency,
    timezone: "pst",
    language: "en",
    inventoryTracking: true,
    lowStockAlerts: true,
    autoFulfillOrders: false,
  })
  const [isSavingStore, setIsSavingStore] = useState(false)

  // Notification settings state
  const [notificationForm, setNotificationForm] = useState({
    newOrders: true,
    orderUpdates: true,
    customerReviews: true,
    inventoryAlerts: true,
    marketingUpdates: false,
  })
  const [isSavingNotifications, setIsSavingNotifications] = useState(false)

  // Security settings state
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isSavingSecurity, setIsSavingSecurity] = useState(false)

  // Monday.com integration token state (token itself is never sent back to the browser)
  const [mondayStatus, setMondayStatus] = useState<{ configured: boolean; masked: string | null; updatedAt: string | null } | null>(null)
  const [mondayToken, setMondayToken] = useState("")
  const [isSavingMonday, setIsSavingMonday] = useState(false)

  useEffect(() => {
    fetch('/api/settings/integrations/monday')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMondayStatus(d))
      .catch(() => {})
  }, [])

  const handleSaveMondayToken = async () => {
    if (!mondayToken.trim()) return
    setIsSavingMonday(true)
    try {
      const response = await fetch('/api/settings/integrations/monday', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: mondayToken }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to save token')
      setMondayStatus(data)
      setMondayToken("")
      toast({ title: "Monday.com token updated", description: "The tracker will pick it up within about 30 seconds." })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    } finally {
      setIsSavingMonday(false)
    }
  }

  // Fetch profile when user is available
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.email) return
      try {
        const profileResponse = await fetch(`/api/profile?email=${encodeURIComponent(user.email)}`)
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setProfileForm({
            firstName: profileData.firstName || "",
            lastName: profileData.lastName || "",
            email: profileData.email || "",
            phone: profileData.phone || "",
          })
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error)
      }
    }
    fetchProfile()
  }, [user?.email])

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsResponse = await fetch('/api/settings')
        if (settingsResponse.ok) {
          const data = await settingsResponse.json()
          setStoreForm({
            storeName: data.storeName || "Furnish",
            currency: data.currency || "usd",
            timezone: data.timezone || "pst",
            language: data.language || "en",
            inventoryTracking: data.inventoryTracking ?? true,
            lowStockAlerts: data.lowStockAlerts ?? true,
            autoFulfillOrders: data.autoFulfillOrders ?? false,
          })
          setNotificationForm({
            newOrders: data.notificationNewOrders ?? true,
            orderUpdates: data.notificationOrderUpdates ?? true,
            customerReviews: data.notificationCustomerReviews ?? true,
            inventoryAlerts: data.notificationInventoryAlerts ?? true,
            marketingUpdates: data.notificationMarketingUpdates ?? false,
          })
          // Also update global currency
          if (data.currency) {
            setGlobalCurrency(data.currency as CurrencyCode)
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      } finally {
        setIsLoadingSettings(false)
      }
    }
    fetchSettings()
  }, [setGlobalCurrency])

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email, // Use original email to identify user
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phone: profileForm.phone,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save profile')
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved to the database.",
      })
    } catch (error) {
      console.error("Failed to save profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSaveStore = async () => {
    setIsSavingStore(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: storeForm.storeName,
          currency: storeForm.currency,
          timezone: storeForm.timezone,
          language: storeForm.language,
          inventoryTracking: storeForm.inventoryTracking,
          lowStockAlerts: storeForm.lowStockAlerts,
          autoFulfillOrders: storeForm.autoFulfillOrders,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save settings')
      }
      
      // Update global currency
      setGlobalCurrency(storeForm.currency as CurrencyCode)
      toast({
        title: "Store Settings Updated",
        description: "Your store settings have been saved to the database.",
      })
    } catch (error) {
      console.error("Failed to save store settings:", error)
      toast({
        title: "Error",
        description: "Failed to save store settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingStore(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationNewOrders: notificationForm.newOrders,
          notificationOrderUpdates: notificationForm.orderUpdates,
          notificationCustomerReviews: notificationForm.customerReviews,
          notificationInventoryAlerts: notificationForm.inventoryAlerts,
          notificationMarketingUpdates: notificationForm.marketingUpdates,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save notification preferences')
      }
      
      toast({
        title: "Notification Preferences Updated",
        description: "Your notification preferences have been saved to the database.",
      })
    } catch (error) {
      console.error("Failed to save notification preferences:", error)
      toast({
        title: "Error",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSavingNotifications(false)
    }
  }

  const handleSaveSecurity = async () => {
    if (!securityForm.currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password.",
        variant: "destructive",
      })
      return
    }
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }
    if (securityForm.newPassword.length < 10) {
      toast({
        title: "Error",
        description: "New password must be at least 10 characters long.",
        variant: "destructive",
      })
      return
    }
    setIsSavingSecurity(true)
    let error = ""
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: securityForm.currentPassword,
          newPassword: securityForm.newPassword,
        }),
      })
      if (!res.ok) error = (await res.json().catch(() => null))?.error || "Could not change the password."
    } catch {
      error = "Could not reach the server. Please try again."
    }
    setIsSavingSecurity(false)
    if (error) {
      toast({ title: "Password not changed", description: error, variant: "destructive" })
      return
    }
    setSecurityForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully.",
    })
  }

  return (
    <DashboardLayout
      title="Settings"
      description="Manage your account and store preferences."
      requiredPermission="manage_settings"
    >
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and profile picture.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                      {profileForm.firstName && profileForm.lastName 
                        ? `${profileForm.firstName[0]}${profileForm.lastName[0]}`
                        : profileForm.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                    <span className="sr-only">Change avatar</span>
                  </Button>
                </div>
                <div>
                  <p className="font-medium">
                    {profileForm.firstName || profileForm.lastName 
                      ? `${profileForm.firstName} ${profileForm.lastName}`.trim()
                      : "User"}
                  </p>
                  <Badge variant="outline" className={user ? getRoleBadgeColor(user.role) : ""}>
                    {user ? getRoleLabel(user.role) : "User"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="bg-secondary cursor-not-allowed opacity-70"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSavingProfile}>
                  {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSavingProfile ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="store" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Settings</CardTitle>
              <CardDescription>Configure your store details and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input
                    id="storeName"
                    value={storeForm.storeName}
                    onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={storeForm.currency}
                    onValueChange={(value) => setStoreForm({ ...storeForm, currency: value })}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="gbp">GBP (£)</SelectItem>
                      <SelectItem value="aed">AED (د.إ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={storeForm.timezone}
                    onValueChange={(value) => setStoreForm({ ...storeForm, timezone: value })}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pst">Pacific Time (PT)</SelectItem>
                      <SelectItem value="est">Eastern Time (ET)</SelectItem>
                      <SelectItem value="utc">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={storeForm.language}
                    onValueChange={(value) => setStoreForm({ ...storeForm, language: value })}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Inventory Tracking</p>
                    <p className="text-sm text-muted-foreground">Automatically track stock levels</p>
                  </div>
                  <Switch
                    checked={storeForm.inventoryTracking}
                    onCheckedChange={(checked) => setStoreForm({ ...storeForm, inventoryTracking: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Low Stock Alerts</p>
                    <p className="text-sm text-muted-foreground">Get notified when stock is low</p>
                  </div>
                  <Switch
                    checked={storeForm.lowStockAlerts}
                    onCheckedChange={(checked) => setStoreForm({ ...storeForm, lowStockAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Auto-fulfill Orders</p>
                    <p className="text-sm text-muted-foreground">Automatically process paid orders</p>
                  </div>
                  <Switch
                    checked={storeForm.autoFulfillOrders}
                    onCheckedChange={(checked) => setStoreForm({ ...storeForm, autoFulfillOrders: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveStore} disabled={isSavingStore}>
                  {isSavingStore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSavingStore ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <RolesTab />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive notifications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Orders</p>
                    <p className="text-sm text-muted-foreground">Get notified for new orders</p>
                  </div>
                  <Switch
                    checked={notificationForm.newOrders}
                    onCheckedChange={(checked) => setNotificationForm({ ...notificationForm, newOrders: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Order Updates</p>
                    <p className="text-sm text-muted-foreground">Status changes and delivery updates</p>
                  </div>
                  <Switch
                    checked={notificationForm.orderUpdates}
                    onCheckedChange={(checked) => setNotificationForm({ ...notificationForm, orderUpdates: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Customer Reviews</p>
                    <p className="text-sm text-muted-foreground">New product reviews and ratings</p>
                  </div>
                  <Switch
                    checked={notificationForm.customerReviews}
                    onCheckedChange={(checked) => setNotificationForm({ ...notificationForm, customerReviews: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Inventory Alerts</p>
                    <p className="text-sm text-muted-foreground">Low stock and out of stock notifications</p>
                  </div>
                  <Switch
                    checked={notificationForm.inventoryAlerts}
                    onCheckedChange={(checked) => setNotificationForm({ ...notificationForm, inventoryAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Updates</p>
                    <p className="text-sm text-muted-foreground">Tips, news, and promotional ideas</p>
                  </div>
                  <Switch
                    checked={notificationForm.marketingUpdates}
                    onCheckedChange={(checked) => setNotificationForm({ ...notificationForm, marketingUpdates: checked })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
                  {isSavingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSavingNotifications ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <GoogleLinkCard />
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and security preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={securityForm.currentPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                    className="bg-secondary"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">Manage your active login sessions</p>
                  </div>
                  <Button variant="outline">View Sessions</Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity} disabled={isSavingSecurity}>
                  {isSavingSecurity && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSavingSecurity ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Monday.com API token used by the project tracker. Updating it here takes effect without redeploying the tracker.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {mondayStatus?.configured
                  ? `Current token: ${mondayStatus.masked}${mondayStatus.updatedAt ? ` (updated ${new Date(mondayStatus.updatedAt).toLocaleString()})` : ""}`
                  : "No token saved yet."}
              </p>
              <div className="space-y-2">
                <Label htmlFor="mondayToken">New Monday.com API Token</Label>
                <Input
                  id="mondayToken"
                  type="password"
                  autoComplete="off"
                  value={mondayToken}
                  onChange={(e) => setMondayToken(e.target.value)}
                  placeholder="Paste token"
                  className="bg-secondary"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveMondayToken} disabled={isSavingMonday || !mondayToken.trim()}>
                  {isSavingMonday && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSavingMonday ? "Verifying..." : "Save Token"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  )
}
