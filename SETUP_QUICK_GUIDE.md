# Quick Setup Guide - Email Verification System

## 5-Minute Setup

### Step 1: Configure Gmail (2 min)

1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the 16-character password
4. Copy this in your env file

### Step 2: Set Environment Variables (1 min)

```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-password-from-step-1
```

### Step 3: Initialize Database (1 min)

Visit: http://localhost:3000/api/setup

This creates all tables with the new verification columns.

### Step 4: Test It! (1 min)

1. Go to Dashboard
2. Click "Add Customer"
3. Fill in customer details
4. Click "Create Account"
5. Check your email for verification link
6. Click link to verify
7. Done! ✅

## What Gets Sent to Customer

### Email 1: Account Verification (Verification Email)

Contains:
- Verification button/link
- Default password: set in DEFAULT_CUSTOMER_PASSWORD (server environment)
- Instructions to change password
- Link expires in 24 hours

### Email 2: Thank You (After Verification)

Contains:
- Confirmation that email is verified
- Ready to use account

## Default Password

**All new customers get:** `<DEFAULT_CUSTOMER_PASSWORD>`

Sent in first email. Customers must change after login.

## Customer Login Details

After verification:
- Email: (their email address)
- Password: <DEFAULT_CUSTOMER_PASSWORD> (then change it)

## Troubleshooting

### Emails not arriving

1. Check spam folder
2. Verify EMAIL_USER and EMAIL_PASSWORD in env
3. Make sure it's Gmail app password (not regular password)
4. Check server console for errors

### Verification link not working

1. Check URL in email is correct
2. Try clicking directly in browser
3. Check if token expired (24 hours)
4. Verify customer in database has verification_token

### Database error

Run: http://localhost:3000/api/setup

This recreates all tables with new schema.

## Environment Variables Checklist

- [ ] EMAIL_USER set (Gmail address)
- [ ] EMAIL_PASSWORD set (16-char app password)
- [ ] MYSQL database configured
- [ ] /api/setup route executed

## Features

✅ No Firebase required  
✅ No billing needed  
✅ Email verification  
✅ Password hashing  
✅ Database stored  
✅ Custom email templates  
✅ Token expiration  
✅ Error handling  

## File Structure

```
components/
  └─ dashboard/
     └─ add-customer-dialog.tsx    (UI)

app/
  └─ api/
     └─ auth/
        ├─ signup/
        │  └─ route.ts            (Create customer)
        └─ verify-email/
           └─ route.ts            (Verify email)

lib/
  ├─ email.ts                       (Email utility)
  └─ db/
     └─ config.ts                  (Database)
```

## Database Schema

```sql
-- New columns in customers table
verified BOOLEAN DEFAULT FALSE
verification_token VARCHAR(255)
password_hash VARCHAR(255)
```

## API Reference

### Create Customer
```
POST /api/auth/signup
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+971501234567"
}
```

### Verify Email
```
GET /api/auth/verify-email?token=XXX&email=john@example.com
```

## Done! 🎉

Your customer registration system is ready to go!

- Admins can create customer accounts
- Customers receive verification emails
- Customers verify their email
- No external dependencies needed
- Complete control over the flow
