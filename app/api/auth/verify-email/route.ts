import { NextRequest, NextResponse } from "next/server";
import { query, type ResultSetHeader } from "@/lib/db/config";
import { sendEmail, generateVerificationSuccessEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    console.log(`[Verify Email] Attempting to verify email: ${email}`);
    console.log(`[Verify Email] Token received: ${token?.substring(0, 10)}...`);
    console.log(`[Verify Email] Request URL: ${req.url}`);

    if (!token || !email) {
      console.log(`[Verify Email] Missing token or email: token=${!!token}, email=${!!email}`);

      // Redirect to error page
      const baseUrl = req.headers.get("origin") ||
        (process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_APP_URL || "https://admin.alsubaiha.ae"
          : "http://localhost:3000");

      const errorUrl = new URL("/auth/verify-email", baseUrl);
      errorUrl.searchParams.set("status", "error");
      errorUrl.searchParams.set("error", "Invalid verification link - missing token or email");
      errorUrl.searchParams.set("email", email || "");

      return NextResponse.redirect(errorUrl, { status: 302 });
    }

    // Find customer by email and token
    const customers = await query<any[]>(
      "SELECT * FROM customers WHERE email = ? AND verification_token = ?",
      [email, token]
    );

    console.log(`[Verify Email] Database query returned ${customers.length} results`);

    if (customers.length === 0) {
      console.log(`[Verify Email] No matching customer found for email: ${email}`);

      // Redirect to error page
      const baseUrl = req.headers.get("origin") ||
        (process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_APP_URL || "https://admin.alsubaiha.ae"
          : "http://localhost:3000");

      const errorUrl = new URL("/auth/verify-email", baseUrl);
      errorUrl.searchParams.set("status", "error");
      errorUrl.searchParams.set("error", "Invalid or expired verification link");
      errorUrl.searchParams.set("email", email);

      return NextResponse.redirect(errorUrl, { status: 302 });
    }

    const customer = customers[0];
    console.log(`[Verify Email] Customer found: ${customer.id}, verified: ${customer.verified}`);

    if (customer.verified) {
      console.log(`[Verify Email] Customer already verified: ${email}`);

      // Redirect to already verified page
      const baseUrl = req.headers.get("origin") ||
        (process.env.NODE_ENV === "production"
          ? process.env.NEXT_PUBLIC_APP_URL || "https://admin.alsubaiha.ae"
          : "http://localhost:3000");

      const successUrl = new URL("/auth/verify-email", baseUrl);
      successUrl.searchParams.set("status", "already_verified");
      successUrl.searchParams.set("email", email);
      successUrl.searchParams.set("name", customer.name);

      return NextResponse.redirect(successUrl, { status: 302 });
    }

    // Mark customer as verified
    await query<ResultSetHeader>(
      "UPDATE customers SET verified = TRUE, verification_token = NULL WHERE id = ?",
      [customer.id]
    );

    console.log(`[Verify Email] Customer verified successfully: ${email}`);

    // Send confirmation email
    try {
      const emailContent = generateVerificationSuccessEmail(customer.name);
      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log(`[Verify Email] Confirmation email sent to ${email}`);
    } catch (emailError: any) {
      console.error("[Verify Email] Error sending confirmation email:", emailError);
      // Don't fail verification if confirmation email fails to send
    }

    // Redirect to success page
    const baseUrl = req.headers.get("origin") ||
      (process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_APP_URL || "https://admin.alsubaiha.ae"
        : "http://localhost:3000");

    const successUrl = new URL("/auth/verify-email", baseUrl);
    successUrl.searchParams.set("status", "verified");
    successUrl.searchParams.set("email", email);
    successUrl.searchParams.set("name", customer.name);

    return NextResponse.redirect(successUrl, { status: 302 });
  } catch (error: any) {
    console.error("[Verify Email] Error:", error);

    // Redirect to error page
    const baseUrl = req.headers.get("origin") ||
      (process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_APP_URL || "https://admin.alsubaiha.ae"
        : "http://localhost:3000");

    const errorUrl = new URL("/auth/verify-email", baseUrl);
    errorUrl.searchParams.set("status", "error");
    errorUrl.searchParams.set("error", error.message || "Failed to verify email");

    return NextResponse.redirect(errorUrl, { status: 302 });
  }
}
