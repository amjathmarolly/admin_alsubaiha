# Customer Registration & Email Verification System

## Overview

This system handles customer registration and email verification without any external services. All data is stored in MySQL and emails are sent via Gmail SMTP.

**Status:** ✅ Production Ready (No Firebase, No Billing Required)

## Registration Flow

```
1. Admin clicks "Add Customer"
   ↓
2. Admin enters: First Name, Last Name, Email, Phone
   ↓
3. Click "Create Account"
   ↓
4. Backend:
   - Validates customer doesn't exist
   - Creates customer record with verified=FALSE
   - Generates verification token
   - Hashes default password (<DEFAULT_CUSTOMER_PASSWORD>)
   - Sends verification email
   ↓
5. Customer receives email with:
   - Verification link
   - Default password
   - Instructions to change password after login
   ↓
6. Customer clicks verification link in email
   ↓
7. Backend:
   - Verifies token matches email
   - Sets customer verified=TRUE
   - Clears verification token
   - Sends confirmation email
   ↓
8. Customer can now log in with:
   - Email: (their email)
   - Password: <DEFAULT_CUSTOMER_PASSWORD> (then change it)
```

## Database Schema

### Customers Table Additions

```sql
-- Verification and authentication fields
verified BOOLEAN DEFAULT FALSE
verification_token VARCHAR(255)
password_hash VARCHAR(255)

-- Index for queries
INDEX idx_verified (verified)
```

## Configuration

### Required Environment Variables

```bash
# Email credentials (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password    # Not your Gmail password!

# Optional: Set custom app URL for email links
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Database (already configured)
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=yourpassword
MYSQL_DATABASE=furnish_db
```

### Gmail Setup for Email Sending

1. Enable 2-Factor Authentication on Gmail account
2. Create an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Copy the 16-character password
   - Use this as EMAIL_PASSWORD (not your actual Gmail password)

## API Endpoints

### POST /api/auth/signup

Creates a new customer account and sends verification email.

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phoneNumber": "+971501234567"
}
```

**Response:**
```json
{
  "success": true,
  "customerId": "cust-1705123456789",
  "email": "john@example.com",
  "message": "Account created successfully! Please check your email for verification link."
}
```

**Error Responses:**
- 400: Email already registered
- 400: Missing required fields
- 500: Database or email error

### GET /api/auth/verify-email?token=XXX&email=email@example.com

Verifies customer email and marks account as verified.

**Response:**
```json
{
  "message": "Email verified successfully"
}
```

**Error Responses:**
- 400: Invalid or expired verification link
- 400: Email already verified
- 500: Server error

## Email Templates

### Verification Email

Includes:
- Welcome message
- Verification button/link
- Default password in code block
- Warning to change password after first login
- 24-hour expiration notice

### Confirmation Email

Sent after successful verification with:
- Thank you message
- Account activation confirmation
- Encouragement to browse products

## Security Features

1. **Password Hashing**: Bcrypt with 10 salt rounds
2. **Verification Tokens**: Cryptographically random 64-character tokens
3. **Token Expiration**: 24 hours (configurable)
4. **SQL Injection Prevention**: Parameterized queries
5. **Email Validation**: Basic @ check at client and backend
6. **Duplicate Prevention**: Unique email constraint in database

## Component: AddCustomerDialog

Located in `components/dashboard/add-customer-dialog.tsx`

### Features

- Simple single-step form
- Phone number auto-formatting (+971 prefix for UAE)
- Form validation before submission
- Error display and toast notifications
- Loading state during submission
- Success screen with account details
- Clear messaging about what happens next

### Usage

```tsx
import { AddCustomerDialog } from "@/components/dashboard/add-customer-dialog"

export function CustomersPage() {
  return <AddCustomerDialog />
}
```

## Utilities

### lib/email.ts

Email sending utility using nodemailer.

**Functions:**
- `sendEmail(options)` - Send email with HTML and text
- `generateVerificationEmail()` - Create verification email template
- `generateVerificationSuccessEmail()` - Create confirmation email template

**Usage:**
```typescript
import { sendEmail, generateVerificationEmail } from "@/lib/email"

const emailContent = generateVerificationEmail(
  "John Doe",
  "https://example.com/api/auth/verify-email?token=...",
  "<DEFAULT_CUSTOMER_PASSWORD>"
)

await sendEmail({
  to: "john@example.com",
  subject: emailContent.subject,
  html: emailContent.html,
  text: emailContent.text
})
```

## Database Operations

### Create Customer

```sql
INSERT INTO customers (
  id, name, email, phone, status, verified, 
  verification_token, password_hash
) VALUES (?, ?, ?, ?, 'active', FALSE, ?, ?)
```

### Verify Customer

```sql
UPDATE customers 
SET verified = TRUE, verification_token = NULL 
WHERE id = ?
```

### Check Verification Status

```sql
SELECT verified FROM customers WHERE email = ?
```

## Testing

### 1. Test with Real Email Address

```bash
# Set Gmail credentials
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

Then:
1. Open app dashboard
2. Click "Add Customer"
3. Enter customer details
4. Click "Create Account"
5. Check your email for verification link
6. Click link to verify
7. You'll be redirected to success page

### 2. Test Email Sending Locally

```bash
npm run dev
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phoneNumber": "+971501234567"
  }'
```

### 3. Manually Test Verification

```bash
# Get a customer with verification_token from database
# Then visit this URL in browser:
http://localhost:3000/api/auth/verify-email?token=XXXXXX&email=test@example.com
```

## Default Credentials

**Default Customer Password:** `<DEFAULT_CUSTOMER_PASSWORD>`

Customers receive this password in their verification email and must change it after first login.

## Troubleshooting

### Emails Not Sending

1. Check `EMAIL_USER` and `EMAIL_PASSWORD` are set correctly
2. Verify Gmail app password (not actual password)
3. Check if 2FA is enabled on Gmail account
4. Check server console logs for email errors
5. Verify firewall allows SMTP (port 587)

### Verification Link Not Working

1. Ensure `NEXT_PUBLIC_APP_URL` is set correctly for production
2. Check token exists in database `verification_token` field
3. Verify link has correct format: `/api/auth/verify-email?token=XXX&email=YYY`
4. Check if token has expired (24 hours)

### Database Issues

1. Ensure MySQL is running
2. Check database credentials in `.env`
3. Run `/api/setup` to create tables with new schema
4. Verify customers table has new columns

## Future Enhancements

Possible improvements:

1. **Token Expiration Time**: Make configurable via env var
2. **Custom Email Templates**: Load from files instead of hardcoded
3. **Email Queue**: Use job queue for high volume
4. **Password Reset**: Add forgot password flow
5. **Email Verification Resend**: Allow customers to request new link
6. **Admin Email Notifications**: Notify admin when customer verifies
7. **SMS Verification**: Add phone verification after email
8. **Login Integration**: Create customer login page
9. **Session Management**: Implement customer sessions
10. **API Key Auth**: For third-party integrations

## Architecture Decisions

### Why Not Firebase?

1. No billing required
2. Complete control over authentication
3. Simpler for email verification
4. All data in own database
5. Can implement custom login later
6. Easier to debug and modify

### Why Bcrypt?

1. Industry standard for password hashing
2. Automatic salt handling
3. Slow by design (prevents brute force)
4. Easy to use
5. Works with any backend

### Why Nodemailer with Gmail?

1. Free with Gmail account
2. Reliable email delivery
3. No additional dependencies
4. Works for development and production
5. Can switch to other SMTP providers easily

## File Locations

- **Dialog Component**: `components/dashboard/add-customer-dialog.tsx`
- **Email Utility**: `lib/email.ts`
- **Signup API**: `app/api/auth/signup/route.ts`
- **Verification API**: `app/api/auth/verify-email/route.ts`
- **Database Setup**: `app/api/setup/route.ts`
- **Deprecated Firebase**: `lib/firebase.ts` (kept for compatibility)

## Related Files

- `lib/db/config.ts` - Database connection
- `app/api/setup/route.ts` - Database schema initialization

---

**Status:** ✅ Production Ready  
**Last Updated:** 2024  
**Maintained by:** Development Team
