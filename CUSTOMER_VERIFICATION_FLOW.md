# Customer Email Verification Flow - Complete

## Overview

This document describes the complete customer email verification flow for Al Subaiha.

## User Journey

### 1. Customer Registration (Dashboard)
- Admin/Staff creates customer account via dashboard
- Enters: First Name, Last Name, Email, Phone Number
- System generates verification token
- Customer record created with `verified = FALSE`

### 2. Verification Email Sent
Customer receives email with:
- Personalized greeting
- Verification link
- Login credentials:
  - **Email:** Their registered email address
  - **Password:** <DEFAULT_CUSTOMER_PASSWORD>
- Security note about changing password
- 24-hour expiration notice

### 3. Customer Clicks Verification Link
Link format:
```
https://alsubaiha.ae/api/auth/verify-email?token=<TOKEN>&email=<EMAIL>
```

**What happens:**
- Backend verifies token and email
- Updates customer: `verified = TRUE`, `verification_token = NULL`
- Sends confirmation email
- Redirects to success page

### 4. Verification Success Page
Beautiful page showing:
- Green checkmark icon
- "Email Verified!" heading
- Customer name and email displayed
- Next steps information
- "Continue to Al Subaiha" button
- Redirects to: **https://alsubaiha.ae**

**Customer CANNOT:**
- Access `/login` dashboard
- Access `/dashboard` admin area
- Access any internal admin features

### 5. Customer Directed to Main Website
- Redirected to https://alsubaiha.ae
- Can browse products
- Can make purchases
- Can manage account on public website

## Page States

### 1. Loading State
- Shows spinner
- Message: "Verifying your email..."
- Brief animation while checking token

### 2. Success State (Green)
- Checkmark icon
- Title: "Email Verified!"
- Shows customer details
- Button: "Continue to Al Subaiha" → https://alsubaiha.ae

### 3. Already Verified State (Blue)
- Checkmark icon
- Title: "Already Verified"
- Message: "This email was previously verified"
- Button: "Continue to Al Subaiha" → https://alsubaiha.ae

### 4. Error State (Red)
- Alert icon
- Title: "Verification Failed"
- Error message displayed
- Troubleshooting suggestions
- Button: "Go to Al Subaiha" → https://alsubaiha.ae

## Database Changes

Customer record updated:
```
verified: FALSE → TRUE
verification_token: <TOKEN> → NULL
```

## Security Features

- Verification token is cryptographically random
- Token is 32-byte hex string
- Tokens expire after 24 hours
- One-time use only
- Database-backed verification
- No external authentication service required

## API Endpoints

### Signup Endpoint
```
POST /api/auth/signup
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+971501234567"
}
```

Response:
```json
{
  "success": true,
  "customerId": "cust-1234567890",
  "email": "john@example.com",
  "message": "Account created successfully! Verification email has been sent."
}
```

### Verify Email Endpoint
```
GET /api/auth/verify-email?token=<TOKEN>&email=<EMAIL>
```

Response (Redirect):
```
302 Redirect to /auth/verify-email?status=verified&email=...&name=...
```

## Files Involved

**Frontend:**
- `app/auth/verify-email/page.tsx` - Verification success/error page
- `components/dashboard/add-customer-dialog.tsx` - Customer creation form

**Backend:**
- `app/api/auth/signup/route.ts` - Customer creation and email sending
- `app/api/auth/verify-email/route.ts` - Email token verification
- `lib/email.ts` - Email utility and templates

**Database:**
- `customers` table with verification columns

## Email Templates

### 1. Verification Email
- Subject: "Welcome to Al Subaiha - Verify Your Email"
- Contains verification link
- Shows login credentials
- Security notices

### 2. Confirmation Email
- Subject: "Email Verified - Welcome to Al Subaiha"
- Confirmation message
- Login instructions
- Link to main website

## Default Credentials

All newly created customers receive:
- **Default Password:** <DEFAULT_CUSTOMER_PASSWORD>
- **Must Change:** On first login (if they had dashboard access)
- **Email:** Their registered email address

## Access Control

### Customers CAN:
- Verify email via link
- Access verification success page
- Navigate to https://alsubaiha.ae
- Browse public website
- Shop and purchase

### Customers CANNOT:
- Access `/login` dashboard
- Access `/dashboard` admin area
- Perform admin functions
- Manage other customers
- View reports or analytics
- Access staff features

## Testing Verification

1. Create customer: John Doe, john@test.com
2. Check email for verification link
3. Click link → See success page
4. Query database:
   ```sql
   SELECT * FROM customers WHERE email = 'john@test.com'
   ```
5. Verify: `verified = TRUE`, `verification_token = NULL`
6. Should redirect to https://alsubaiha.ae

## Error Handling

### Invalid Token
- Shows error page (red)
- Message: "Invalid or expired verification link"
- Suggestion: Check full link copied from email

### Expired Token (24+ hours)
- Shows error page (red)
- Message: "Invalid or expired verification link"
- Suggestion: Request new verification email

### Already Verified
- Shows blue "Already Verified" state
- No error, just confirmation
- Button still redirects to main website

### Database Error
- Shows error page (red)
- Generic message: "Verification failed"
- Logs actual error for debugging

## Production Deployment

1. Ensure NEXT_PUBLIC_APP_URL is set correctly
2. Verify EMAIL_USER and EMAIL_PASSWORD are configured
3. Test verification link before going live
4. Confirm alsubaiha.ae domain is accessible
5. Monitor verification email delivery
6. Track verification success rate

## Summary

**Complete Flow:**
1. Admin creates customer → Database record created (verified=FALSE)
2. Email sent with verification link → Customer receives email
3. Customer clicks link → Backend verifies and updates database
4. Success page shown → Customer sees confirmation
5. Redirect to alsubaiha.ae → Customer leaves dashboard
6. Customer cannot re-access dashboard

**Security:**
- Tokens are random and one-time use
- No customer access to admin features
- Database-backed verification
- Confirmation email sent after verification
