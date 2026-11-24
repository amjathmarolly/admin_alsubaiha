"use client"

import { useState } from "react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
    Loader2, 
    UserPlus,
    Mail, 
    Phone, 
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    Crown,
    DollarSign
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type Step = "info" | "success"

interface MembershipTier {
  id: string
  name: string
  discount_percentage: number
  color: string
}

export function AddCustomerDialog() {
    const { toast } = useToast()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<Step>("info")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [assignedMembership, setAssignedMembership] = useState<MembershipTier | null>(null)

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        billAmount: ""
    })

    const resetForm = () => {
        setStep("info")
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            phoneNumber: "",
            billAmount: ""
        })
        setError("")
        setAssignedMembership(null)
    }

    const formatPhone = (phone: string) => {
        let p = phone.replace(/\s/g, "");
        if (p.startsWith("0")) p = "+971" + p.substring(1);
        if (!p.startsWith("+")) p = "+971" + p;
        return p;
    }

    const validateForm = () => {
        if (!formData.firstName.trim()) {
            setError("Please enter first name")
            return false
        }
        if (!formData.lastName.trim()) {
            setError("Please enter last name")
            return false
        }
        if (!formData.email.includes("@")) {
            setError("Please enter a valid email address")
            return false
        }
        if (!formData.phoneNumber.trim()) {
            setError("Please enter phone number")
            return false
        }
        if (!formData.billAmount.trim()) {
            setError("Please enter bill amount")
            return false
        }
        const billAmount = parseFloat(formData.billAmount)
        if (isNaN(billAmount) || billAmount < 0) {
            setError("Please enter a valid bill amount")
            return false
        }
        return true
    }

    const handleCreateAccount = async () => {
        setError("")

        if (!validateForm()) {
            return
        }

        setLoading(true)

        try {
            console.log("[v0] Creating customer account for:", formData.email)

            const phoneNumber = formatPhone(formData.phoneNumber)
            const billAmount = parseFloat(formData.billAmount)
            console.log("[v0] Formatted phone:", phoneNumber)
            console.log("[v0] Bill amount:", billAmount)

            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    phoneNumber,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    totalSpent: billAmount
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Failed to create account")
            }

            console.log("[v0] Customer created successfully:", data.customerId)

            // Auto-assign membership based on bill amount
            if (data.customerId) {
                try {
                    console.log("[v0] Assigning membership tier for customer:", data.customerId)
                    const tierRes = await fetch(`/api/membership-plans/assign/${data.customerId}`, {
                        method: "POST"
                    })
                    
                    const tierData = await tierRes.json()
                    if (tierData.success && tierData.membershipTier) {
                        setAssignedMembership(tierData.membershipTier)
                        console.log("[v0] Membership assigned:", tierData.membershipTier.name)
                    }
                } catch (tierErr) {
                    console.error("[v0] Error assigning membership:", tierErr)
                    // Don't fail the whole operation if membership assignment fails
                }
            }

            toast({
                title: "Success",
                description: "Customer account created! Verification email has been sent."
            })

            resetForm()
            setStep("success")

        } catch (err: any) {
            console.error("[v0] Error creating account:", err)
            const errorMsg = err.message || "Failed to create account"
            setError(errorMsg)
            toast({
                title: "Error",
                description: errorMsg,
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => { 
            setOpen(val)
            if (!val) resetForm()
        }}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Customer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {step === "success" ? (
                            <>
                                <CheckCircle2 className="text-emerald-500 h-5 w-5" />
                                Customer Created
                            </>
                        ) : (
                            <>
                                <UserPlus className="text-primary h-5 w-5" />
                                New Customer
                            </>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-6">
                    {step === "info" && (
                        <div className="space-y-4">
                            {error && (
                                <div className="bg-destructive/10 border border-destructive text-destructive text-sm p-3 rounded flex gap-2">
                                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input 
                                        id="firstName"
                                        placeholder="John" 
                                        value={formData.firstName} 
                                        onChange={e => setFormData({...formData, firstName: e.target.value})}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastName">Last Name</Label>
                                    <Input 
                                        id="lastName"
                                        placeholder="Doe" 
                                        value={formData.lastName} 
                                        onChange={e => setFormData({...formData, lastName: e.target.value})}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    Email Address
                                </Label>
                                <Input 
                                    id="email"
                                    type="email" 
                                    placeholder="john@example.com" 
                                    value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    disabled={loading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    Phone Number
                                </Label>
                                <Input 
                                    id="phone"
                                    placeholder="+971 50 000 0000" 
                                    value={formData.phoneNumber} 
                                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground">International format with country code</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="billAmount" className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4" />
                                    Total Bill Amount (AED)
                                </Label>
                                <Input 
                                    id="billAmount"
                                    type="number"
                                    placeholder="50000"
                                    min="0"
                                    step="0.01"
                                    value={formData.billAmount} 
                                    onChange={e => setFormData({...formData, billAmount: e.target.value})}
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground">Enter the customer's total purchase amount to determine membership tier</p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                                <p className="font-medium text-blue-900 mb-1">What happens next:</p>
                                <ul className="text-blue-800 space-y-1 text-xs">
                                    <li>✓ Account created with default password</li>
                                    <li>✓ Verification email sent to customer</li>
                                    <li>✓ Customer verifies email to activate account</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="space-y-6 text-center">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                                    <CheckCircle2 size={48} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-lg font-bold">Account Created!</p>
                                <p className="text-sm text-muted-foreground">
                                    A verification email has been sent to {formData.email}. 
                                    The customer must verify their email to activate their account.
                                </p>
                            </div>

                            <div className="bg-muted p-4 rounded-lg text-left space-y-2 text-sm">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground">NAME</p>
                                    <p className="font-medium">{formData.firstName} {formData.lastName}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground">EMAIL</p>
                                    <p className="font-medium">{formData.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground">PHONE</p>
                                    <p className="font-medium">{formData.phoneNumber}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground">BILL AMOUNT</p>
                                    <p className="font-medium">AED {parseFloat(formData.billAmount).toLocaleString('en-AE', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                                </div>
                                {assignedMembership && (
                                    <div className="pt-2 border-t">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                            <Crown className="h-3 w-3" />
                                            MEMBERSHIP TIER
                                        </p>
                                        <div className="flex items-center gap-2 p-2 rounded bg-background">
                                            <div 
                                                className="h-4 w-4 rounded-full"
                                                style={{ backgroundColor: assignedMembership.color }}
                                            ></div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{assignedMembership.name}</p>
                                                <p className="text-xs text-muted-foreground">{assignedMembership.discount_percentage}% Discount</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="pt-2 border-t">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">DEFAULT PASSWORD</p>
                                    <p className="text-xs bg-background px-2 py-1 rounded">The standard starting password (sent in the welcome email)</p>
                                    <p className="text-xs text-muted-foreground mt-1">Customer must change password after first login</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex-row justify-between sm:justify-between items-center border-t pt-4">
                    {step === "info" && (
                        <>
                            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleCreateAccount} 
                                disabled={loading}
                                className="gap-2"
                            >
                                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                Create Account
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    {step === "success" && (
                        <Button className="w-full" onClick={() => {
                            setOpen(false)
                            resetForm()
                        }}>
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

