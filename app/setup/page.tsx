"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertCircle, Loader2, Database, Crown } from "lucide-react"

type SetupStep = "selection" | "main-setup" | "membership-setup"

export default function SetupPage() {
  const [currentStep, setCurrentStep] = useState<SetupStep>("selection")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")
  const [tables, setTables] = useState<string[]>([])
  const [membershipStatus, setMembershipStatus] = useState("idle")

  const runSetup = async () => {
    setStatus("loading")
    setMessage("Connecting to database and creating tables...")

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setMessage(data.message)
        setTables(data.tables || [])
      } else {
        setStatus("error")
        setMessage(data.error || "Setup failed")
      }
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Failed to connect to setup API")
    }
  }

  const setupMembershipPlans = async () => {
    setMembershipStatus("loading")

    try {
      const response = await fetch("/api/setup/membership-plans", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        setMembershipStatus("success")
      } else {
        setMembershipStatus("error")
      }
    } catch (error) {
      setMembershipStatus("error")
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Step 1: Selection */}
      {currentStep === "selection" && (
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Database Setup</CardTitle>
            <CardDescription>
              Choose what you want to set up
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setCurrentStep("main-setup")} 
              className="w-full h-24 text-lg flex flex-col items-center justify-center"
            >
              <Database className="h-6 w-6 mb-2" />
              Main Database Setup
            </Button>
            <Button 
              onClick={() => setCurrentStep("membership-setup")} 
              variant="outline"
              className="w-full h-24 text-lg flex flex-col items-center justify-center"
            >
              <Crown className="h-6 w-6 mb-2" />
              Membership Plans Setup
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Main Database Setup */}
      {currentStep === "main-setup" && (
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Database Setup</CardTitle>
            <CardDescription>
              Initialize your MySQL database with the required tables and sample data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === "idle" && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>This will create the following:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>12 database tables</li>
                    <li>4 default roles (Admin, Manager, Staff, Viewer)</li>
                    <li>4 default users for testing</li>
                    <li>Sample categories, products, customers, and orders</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep("selection")} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button onClick={runSetup} className="flex-1" size="lg">
                    Run Setup
                  </Button>
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <p className="text-sm text-green-500">{message}</p>
                </div>
                {tables.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Created tables:</p>
                    <div className="flex flex-wrap gap-2">
                      {tables.map((table) => (
                        <span
                          key={table}
                          className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded"
                        >
                          {table}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">Default login credentials:</p>
                  <div className="bg-secondary/50 p-3 rounded-lg text-sm font-mono space-y-1">
                    <p>Admin: admin@alsubaiha.com</p>
                    <p>Manager: manager@alsubaiha.com</p>
                    <p>Staff: staff@alsubaiha.com</p>
                    <p>Viewer: viewer@alsubaiha.com</p>
                    <p className="text-muted-foreground mt-2">Password: admin123 (for all)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep("selection")} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button asChild className="flex-1">
                    <a href="/login">Go to Login</a>
                  </Button>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-500">Setup Failed</p>
                    <p className="text-sm text-red-400 mt-1">{message}</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Please check:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>MySQL server is running</li>
                    <li>Environment variables are correctly set</li>
                    <li>Database user has CREATE TABLE permissions</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep("selection")} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button onClick={runSetup} variant="outline" className="flex-1">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Membership Plans Setup */}
      {currentStep === "membership-setup" && (
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Crown className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl">Membership Plans Setup</CardTitle>
            <CardDescription>
              Initialize the 5-tier membership system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {membershipStatus === "idle" && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-3">
                  <p>This will create the following:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>membership_plans table</li>
                    <li>5 default membership tiers:</li>
                  </ul>
                  <div className="ml-6 space-y-1 text-xs">
                    <p>• Blue: 0-50k AED (0% discount)</p>
                    <p>• Silver: 50k-100k AED (10% discount)</p>
                    <p>• Gold: 100k-200k AED (15% discount)</p>
                    <p>• Platinum: 200k-500k AED (20% discount)</p>
                    <p>• Diamond: 500k+ AED (25% discount)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep("selection")} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button onClick={setupMembershipPlans} className="flex-1" size="lg">
                    Setup Membership Plans
                  </Button>
                </div>
              </div>
            )}

            {membershipStatus === "loading" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                <p className="text-sm text-muted-foreground">Setting up membership plans...</p>
              </div>
            )}

            {membershipStatus === "success" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <p className="text-sm text-green-500">Membership plans setup completed successfully!</p>
                </div>
                <div className="bg-amber-500/10 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-amber-900">5 Default Tiers Created:</p>
                  <div className="text-xs text-amber-800 space-y-1">
                    <p>✓ Blue (0-50k, 0%)</p>
                    <p>✓ Silver (50k-100k, 10%)</p>
                    <p>✓ Gold (100k-200k, 15%)</p>
                    <p>✓ Platinum (200k-500k, 20%)</p>
                    <p>✓ Diamond (500k+, 25%)</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep("selection")} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button asChild className="flex-1">
                    <a href="/dashboard">Go to Dashboard</a>
                  </Button>
                </div>
              </div>
            )}

            {membershipStatus === "error" && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-500">Setup Failed</p>
                    <p className="text-sm text-red-400 mt-1">Could not set up membership plans. Please check your database connection.</p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>Please verify:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>MySQL server is running</li>
                    <li>Database connection is working</li>
                    <li>Database user has proper permissions</li>
                  </ul>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setCurrentStep("selection")} variant="outline" className="flex-1">
                    Back
                  </Button>
                  <Button onClick={setupMembershipPlans} variant="outline" className="flex-1">
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
