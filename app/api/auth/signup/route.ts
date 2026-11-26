import { NextRequest, NextResponse } from "next/server";
import { query, type ResultSetHeader } from "@/lib/db/config";
import { sendEmail, generateVerificationEmail } from "@/lib/email";
import crypto from "crypto";
import bcrypt from "bcrypt";

import { ensureCustomerColumns, temporaryPassword } from "@/lib/customer-accounts";
import { normalizePhone, isPlausiblePhone } from "@/lib/phone";
import { hasStaffSession } from "@/lib/integration-token";

// Each new customer gets their own random temporary password (sent in the welcome
// email) and must choose a new one at first sign-in. A starting spend is taken
// only from staff; otherwise it comes from orders and the client list.

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail, phoneNumber, firstName, lastName, totalSpent } = await req.json();
    // A starting spend is accepted only from staff (Admin -> Customers -> Add customer).
    const startingSpend = (await hasStaffSession()) ? Math.max(0, Number(totalSpent) || 0) : 0;
    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const phone = phoneNumber ? normalizePhone(phoneNumber) : "";
    if (phone && !isPlausiblePhone(phone)) {
      return NextResponse.json({ error: "Please enter the mobile number with its country code" }, { status: 400 });
    }

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

    await ensureCustomerColumns();

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

    if (phone) {
      const samePhone = await query<any[]>("SELECT id FROM customers WHERE phone_normalized = ?", [phone]);
      if (samePhone.length > 0) {
        return NextResponse.json({ error: "This mobile number is already registered" }, { status: 400 });
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const DEFAULT_PASSWORD = temporaryPassword();

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

    // Insert customer into database with verified=false
    try {
      await query<ResultSetHeader>(
        `INSERT INTO customers (
          id, name, email, phone, phone_normalized, status, verified, verification_token, password_hash,
          must_change_password, total_orders, total_spent, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, NOW(), NOW())`,
        [
          customerId,
          fullName,
          email,
          phoneNumber || null,
          phone || null,
          "active",
          false, // verified=false initially
          verificationToken,
          passwordHash,
          startingSpend,
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
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

