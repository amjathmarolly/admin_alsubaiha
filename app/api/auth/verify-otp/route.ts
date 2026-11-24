import { NextRequest, NextResponse } from "next/server";

/**
 * Email OTP Verification Endpoint
 * 
 * This endpoint is a placeholder that allows the client to confirm
 * that the user has entered the correct OTP. In a production environment,
 * you would typically:
 * 
 * 1. Store OTP temporarily in Redis or similar (with TTL)
 * 2. Verify the OTP matches
 * 3. Mark the email as verified for the next step
 * 
 * Currently, the verification happens client-side, and the actual
 * email verification occurs when the user is created in Firebase
 * using createUserWithEmailAndPassword().
 */

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Invalid OTP format. Must be 6 digits." },
        { status: 400 }
      );
    }

    console.log(`[Email OTP] Verifying code for ${email}`);

    // In a production system, you would:
    // 1. Check if OTP exists in Redis with TTL
    // 2. Verify it matches
    // 3. Delete it after verification
    // 
    // For now, we accept the verification and mark email as ready
    // The actual Firebase user creation with email verification
    // happens in the signup endpoint.

    return NextResponse.json({
      success: true,
      message: "Email verification confirmed. Proceed to phone verification.",
      email,
    });
  } catch (error: any) {
    console.error("[Email OTP] Verification error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
