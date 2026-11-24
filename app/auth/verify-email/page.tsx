"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState, Suspense } from "react"
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Box } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type VerificationStatus = "loading" | "success" | "error" | "already_verified"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<VerificationStatus>("loading")
  const [customerName, setCustomerName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    const token = searchParams.get("token")
    const emailParam = searchParams.get("email")

    if (!token && !emailParam) {
      // Check if we came from redirect with status
      const verifyStatus = searchParams.get("status")
      const name = searchParams.get("name")
      const errorMsg = searchParams.get("error")

      if (verifyStatus === "verified") {
        setStatus("success")
        setEmail(emailParam || "")
        if (name) {
          setCustomerName(decodeURIComponent(name))
        }
      } else if (verifyStatus === "already_verified") {
        setStatus("already_verified")
        setEmail(emailParam || "")
        if (name) {
          setCustomerName(decodeURIComponent(name))
        }
      } else if (verifyStatus === "error") {
        setStatus("error")
        setError(errorMsg || "Verification failed")
        setEmail(emailParam || "")
      } else {
        setStatus("error")
        setError("Invalid verification link")
      }
      return
    }

    setEmail(emailParam || "")

    // The actual verification was already done by the API
    // We just need to display the result based on URL params
    const verifyStatus = searchParams.get("status")
    const name = searchParams.get("name")

    if (name) {
      setCustomerName(decodeURIComponent(name))
    }

    if (verifyStatus === "verified") {
      setStatus("success")
    } else if (verifyStatus === "already_verified") {
      setStatus("already_verified")
    } else if (verifyStatus === "error") {
      setError(searchParams.get("error") || "Verification failed")
      setStatus("error")
    }
  }, [searchParams])

  return (
    <>
      {/* Loading State */}
      {status === "loading" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Verifying your email...</p>
              <p className="text-sm text-muted-foreground">Please wait a moment</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {status === "success" && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-center text-emerald-900">Email Verified!</CardTitle>
            <CardDescription className="text-center text-emerald-700">
              Your email has been successfully verified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 rounded-lg bg-white p-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">NAME</p>
                <p className="font-medium text-foreground">{customerName || "Customer"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">EMAIL</p>
                <p className="font-medium text-foreground break-all">{email}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg bg-white p-4 border border-blue-200">
              <div>
                <p className="text-xs font-semibold text-blue-900">NEXT STEPS</p>
                <ul className="text-sm text-blue-800 space-y-2 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>A confirmation email has been sent</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Your account is now activated</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>You can now log in with your credentials</span>
                  </li>
                </ul>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = "https://alsubaiha.ae"} 
              className="w-full gap-2"
            >
              Continue to Al Subaiha
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Your account has been activated. You will be redirected to our main website.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Already Verified State */}
      {status === "already_verified" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <CheckCircle2 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-center text-blue-900">Already Verified</CardTitle>
            <CardDescription className="text-center text-blue-700">
              This email was previously verified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg bg-white p-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">EMAIL</p>
                <p className="font-medium text-foreground break-all">{email}</p>
              </div>
            </div>

            <Button 
              onClick={() => window.location.href = "https://alsubaiha.ae"} 
              className="w-full gap-2"
            >
              Continue to Al Subaiha
              <ArrowRight className="h-4 w-4" />
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Visit our website to continue shopping.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {status === "error" && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-center text-destructive">Verification Failed</CardTitle>
            <CardDescription className="text-center text-destructive/80">
              We couldn&apos;t verify your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-white p-4 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>

            <div className="space-y-3 rounded-lg bg-white p-4 border border-amber-200 bg-amber-50">
              <p className="text-xs font-semibold text-amber-900">WHAT CAN YOU DO:</p>
              <ul className="text-sm text-amber-800 space-y-2">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Check that you copied the entire link from the email</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>The link may have expired (valid for 24 hours)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Request a new verification email by contacting support</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => window.location.href = "https://alsubaiha.ae"} 
              variant="outline"
              className="w-full"
            >
              Go to Al Subaiha
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function VerifyEmailLoading() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center">
          <p className="font-medium">Loading verification page...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Box className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Al Subaiha</h1>
          <p className="text-sm text-muted-foreground">Email Verification</p>
        </div>

        <Suspense fallback={<VerifyEmailLoading />}>
          <VerifyEmailContent />
        </Suspense>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Al Subaiha | Furniture & Home Decor</p>
        </div>
      </div>
    </div>
  )
}
