# Firebase Native Authentication Implementation

## Overview

This document describes the **Firebase-native authentication system** for customer registration. The system uses Firebase's built-in capabilities for email and phone verification, eliminating external email services and Firestore storage.

## Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   Admin "Add Customer" Dialog                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
        ┌──────────────────────────────────────┐
        │  Step 1: Enter Customer Information   │
        │  - First Name                         │
        │  - Last Name                          │
        │  - Email                              │
        │  - Phone (+971 format)                │
        └──────────┬───────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────────┐
        │  Check Email Availability             │
        │  /api/auth/send-otp (Firebase check) │
        │  - No OTP sent                        │
        │  - Just validates email not in use    │
        └──────────┬───────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────────┐
        │  Step 2: Phone Verification           │
        │  - Firebase sends SMS OTP             │
        │  - Customer enters 6-digit code       │
        │  - ConfirmationResult verifies client │
        └──────────┬───────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────────┐
        │  Step 3: Account Creation             │
        │  /api/auth/signup                     │
        │  - Firebase user: email + password    │
        │  - Phone linked to Firebase user      │
        │  - MySQL customer record created      │
        │  - Welcome email sent (future)        │
        └──────────┬───────────────────────────┘
                   │
                   ▼
        ┌──────────────────────────────────────┐
        │  Success!                             │
        │  Customer ready to log in             │
        └──────────────────────────────────────┘
```

## System Components

### 1. Firebase Email Check: `/api/auth/send-otp`

**Purpose**: Verify email is available (not already registered)

**Request**:
```json
{
  "email": "customer@example.com"
}
```

**Response** (Success):
```json
{
  "success": true,
  "message": "Email verified. Proceed to phone verification.",
  "email": "customer@example.com"
}
```

**Response** (Error - Email Already Exists):
```json
{
  "error": "Email already registered"
}
```

**Key Points**:
- Uses `adminAuth.getUserByEmail()` to check Firebase
- No email sent
- No OTP storage needed
- Immediate validation

### 2. Phone SMS Verification: Client-Side (Firebase SDK)

**Process**:
1. Client calls `signInWithPhoneNumber()` with formatted phone number
2. Firebase sends SMS with 6-digit OTP to the phone
3. Customer receives SMS and enters code in dialog
4. Client calls `confirmationResult.confirm(code)`
5. Firebase validates the code

**Code Example**:
```typescript
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth"

// Setup reCAPTCHA (invisible)
const recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-admin", {
  size: "invisible"
})

// Send SMS
const confirmationResult = await signInWithPhoneNumber(
  auth,
  "+971501234567",
  recaptchaVerifier
)

// User enters code
const userCredential = await confirmationResult.confirm("123456")
```

**Key Features**:
- Firebase handles SMS delivery
- reCAPTCHA v3 prevents abuse
- Rate limiting built-in
- Code expires after 6 attempts or timeout

### 3. Account Creation: `/api/auth/signup`

**Purpose**: Create Firebase user + MySQL customer record

**Request**:
```json
{
  "email": "customer@example.com",
  "phoneNumber": "+971501234567",
  "firstName": "Ahmed",
  "lastName": "Al Subaiha",
  "emailVerified": true
}
```

**Process**:
1. Validates `emailVerified` flag is true
2. Generates 16-character temporary password
3. Creates Firebase user with `adminAuth.createUser()`
4. Links phone number to Firebase user
5. Creates MySQL customer record
6. Returns success with user UID and customer ID

**Response** (Success):
```json
{
  "success": true,
  "uid": "firebase-user-uid",
  "customerId": "cust-1715847200000",
  "email": "customer@example.com",
  "message": "Account created successfully. Welcome email sent."
}
```

**Key Points**:
- Password generated server-side (not sent from client)
- Email + password auth in Firebase
- Phone linked as secondary auth method
- MySQL record synced automatically
- No Firestore usage

## Client-Side Dialog Flow

### State Management

```typescript
type Step = "info" | "verify-phone" | "success"

const [step, setStep] = useState<Step>("info")
const [formData, setFormData] = useState({
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: ""
})
const [phoneOtp, setPhoneOtp] = useState("")
const [confirmationResult, setConfirmationResult] = useState(null)
```

### Step-by-Step Process

**1. Info Step** - Get Customer Details
```
- Validate all fields filled
- Call /api/auth/send-otp to check email
- Move to verify-phone step
```

**2. Verify-Phone Step** - Phone SMS OTP
```
- Call Firebase signInWithPhoneNumber()
- Show SMS input field
- Customer enters 6-digit code
- Call confirmationResult.confirm(code)
- Move to signup
```

**3. Signup Step** - Create Account
```
- Call /api/auth/signup
- Firebase creates user + MySQL record
- Move to success step
```

**4. Success Step** - Confirmation
```
- Show success message
- Close dialog
- Refresh customers list
```

## API Endpoints

### POST /api/auth/send-otp

Checks if email is available in Firebase.

**Validation**:
- Email format validation
- Firebase email availability check

**Errors**:
- 400: Email already registered
- 400: Invalid email format
- 500: Firebase or server error

### POST /api/auth/verify-otp

Placeholder endpoint for potential server-side validation.

**Current Usage**: Logs phone verification status

**Future Enhancement**: Could validate OTP against Redis or in-memory store

### POST /api/auth/signup

Creates Firebase user and MySQL customer record.

**Validation**:
- `emailVerified` must be true
- Email must be provided
- Phone (optional) linked to user

**Process**:
1. Create Firebase user with email + password
2. Link phone number (if provided)
3. Create MySQL customer record
4. Return success with UID and customer ID

**Errors**:
- 400: Email already exists
- 400: Phone already linked to another account
- 400: Email not verified
- 500: Firebase or database error

## Firebase Configuration

### Required Environment Variables

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Firebase Console Setup

1. **Authentication > Sign-in Method**
   - Enable Email/Password
   - Enable Phone

2. **Phone Authentication**
   - Ensure reCAPTCHA is enabled
   - Configure for Web platform

3. **Email Templates** (Optional)
   - Customize verification email templates
   - Customize password reset emails

## Security Considerations

### Email Verification
- Email availability checked against Firebase
- No OTP transport needed
- Fire and forget validation

### Phone Verification
- SMS delivered by Firebase (encrypted)
- 6-digit OTP with expiration
- reCAPTCHA v3 prevents bot abuse
- Rate limiting: 6 failed attempts = timeout

### Password Management
- 16-character random passwords generated server-side
- Temporary password in welcome email
- Customers must change on first login
- Firebase handles password hashing (bcrypt)

### Account Creation
- Email verified before account creation
- Phone verified before account creation
- MySQL record synced with Firebase user
- UID used as reference in MySQL

## Testing Guide

### Test 1: Email Already Registered

**Steps**:
1. Create first customer with email: test@example.com
2. Try creating second customer with same email
3. Should fail with "Email already registered"

**Expected**: Second customer creation fails at email check step

### Test 2: Successful Registration

**Steps**:
1. Enter: First Name, Last Name, Email, Phone
2. Click "Continue" (email check)
3. Receive SMS on phone
4. Enter 6-digit code
5. Account created successfully

**Expected**: Customer appears in customers list, can log in with email + temp password

### Test 3: Invalid Phone Format

**Steps**:
1. Enter invalid phone (no +971 prefix)
2. Click "Continue"
3. Enter phone verification
4. Enter OTP

**Expected**: Phone formatted automatically to +971XXXXXXXXX

### Test 4: SMS Timeout

**Steps**:
1. Request SMS
2. Wait >5 minutes
3. Try entering old code

**Expected**: Code rejected, need to request new SMS

### Test 5: Wrong OTP Code

**Steps**:
1. Request SMS
2. Enter wrong 6-digit code
3. Try confirming

**Expected**: Firebase rejects with error, can retry

## Troubleshooting

### Email Check Fails

**Issue**: "Email check failed"

**Solutions**:
- Verify Firebase admin credentials
- Check internet connection
- Check Firebase project ID in env vars

### SMS Not Received

**Issue**: "SMS Sent" shows but no SMS arrives

**Solutions**:
- Verify phone number format (+971 for UAE)
- Check reCAPTCHA is enabled in Firebase
- Verify phone is not blacklisted
- Check Firebase Phone Authentication enabled

### Account Creation Fails

**Issue**: "Failed to create account" after phone verification

**Solutions**:
- Verify MySQL credentials
- Check email not duplicated in Firebase
- Check phone not duplicated in Firebase
- Verify temporary password policy

### reCAPTCHA Error

**Issue**: "reCAPTCHA error" or invisible reCAPTCHA not working

**Solutions**:
- Verify reCAPTCHA site key in env vars
- Check domain is registered in reCAPTCHA console
- Verify reCAPTCHA enabled in Firebase

## Future Enhancements

1. **Email Verification Link**
   - Send Firebase email verification link
   - Customer clicks link to verify email
   - More secure than OTP

2. **SMS OTP with Redis**
   - Store OTP in Redis with TTL
   - Validate server-side
   - Add rate limiting

3. **Multi-factor Authentication**
   - Add TOTP/authenticator app support
   - Add backup codes

4. **Social Authentication**
   - Add Google, Apple, Facebook login
   - Link with existing accounts

5. **Custom Email Templates**
   - Branded welcome emails
   - Custom verification flow

## File Changes Summary

| File | Changes |
|------|---------|
| `app/api/auth/send-otp/route.ts` | Firebase email availability check (no OTP) |
| `app/api/auth/verify-otp/route.ts` | Phone SMS verification logging |
| `app/api/auth/signup/route.ts` | Removed Nodemailer, Firebase user + phone linking |
| `components/dashboard/add-customer-dialog.tsx` | Simplified flow: email check → phone SMS → signup |

## References

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Phone Authentication](https://firebase.google.com/docs/auth/web/phone-auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [JavaScript Auth SDK](https://firebase.google.com/docs/auth/web/start)
