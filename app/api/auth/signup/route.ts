import { NextRequest, NextResponse } from "next/server";
import { query, type ResultSetHeader } from "@/lib/db/config";
import { sendEmail, generateVerificationEmail } from "@/lib/email";
import crypto from "crypto";
import bcrypt from "bcrypt";

// Starting password for new customer accounts. Set DEFAULT_CUSTOMER_PASSWORD in the
// server environment (Hostinger -> Environment variables); it is not kept in the code.
const DEFAULT_PASSWORD = process.env.DEFAULT_CUSTOMER_PASSWORD || "";

export async function POST(req: NextRequest) {
  try {
    const { email, phoneNumber, firstName, lastName, totalSpent = 0 } = await req.json();

    // Validation
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    console.log(`[Signup] Creating customer account for ${email}`);

    // Check if customer already exists
    const existingCustomer = await query<any[]>(
      "SELECT id FROM customers WHERE email = ?",
      [email]
    );

    if (existingCustomer.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    if (!DEFAULT_PASSWORD) {
      console.error("[Signup] DEFAULT_CUSTOMER_PASSWORD is not set");
      return NextResponse.json({ error: "Sign-up is not configured" }, { status: 500 });
    }

    // Hash the default password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds);

    // Generate customer ID
    const customerId = `cust-${Date.now()}`;
    const fullName = `${firstName} ${lastName}`.trim();

    // Create verification link - use origin from request for better reliability
    const baseUrl = req.headers.get("origin") ||
      (process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_APP_URL || "https://admin.alsubaiha.ae"
        : "http://localhost:3000");

    console.log(`[Signup] Using baseUrl: ${baseUrl}`);

    const verificationLink = `${baseUrl}/api/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    console.log(`[Signup] Verification token generated for ${email}`);
    console.log(`[Signup] Total spent: ${totalSpent}`);

    // Insert customer into database with verified=false
    try {
      await query<ResultSetHeader>(
        `INSERT INTO customers (
          id, name, email, phone, status, verified, verification_token, password_hash, total_orders, total_spent, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
        [
          customerId,
          fullName,
          email,
          phoneNumber || null,
          "active",
          false, // verified=false initially
          verificationToken,
          passwordHash,
          totalSpent || 0
        ]
      );

      console.log(`[Signup] Customer record created: ${customerId}`);
    } catch (dbError: any) {
      console.error("[Signup] Database error:", dbError);

      if (dbError.code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create customer account" },
        { status: 500 }
      );
    }

    // Send verification email
    try {
      const emailContent = generateVerificationEmail(
        fullName,
        email,
        verificationLink,
        DEFAULT_PASSWORD
      );

      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      console.log(`[Signup] Verification email sent to ${email}`);
    } catch (emailError: any) {
      console.error("[Signup] Email sending error:", emailError);
      // Email error is not critical - customer is still created
      // Log it but don't fail the entire signup
    }

    return NextResponse.json({
      success: true,
      customerId,
      email,
      message:
        "Account created successfully! Please check your email for verification link.",
    });
  } catch (error: any) {
    console.error("[Signup] Unexpected error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}

