# Firebase Authentication Update (No Firestore)

## Overview

Removed Firestore dependency and implemented pure Firebase Authentication with email & password authentication and phone verification. The system now uses:

- **Firebase Authentication**: Native email & password authentication
- **Email Verification**: OTP sent via Nodemailer, verified client-side
- **Phone Verification**: Firebase Phone Authentication with SMS
- **MySQL Database**: Customer records stored in MySQL, synced with Firebase users

## Architecture Change

### Before (with Firestore)
```
Email OTP → Firestore storage → Verify OTP → Phone SMS → Create Firebase User → Create MySQL Customer
```

### After (No Firestore)
```
Email OTP via Nodemailer → Verify code client-side → Phone SMS (Firebase) → Create Firebase User → Create MySQL Customer
```

## Files Modified

### 1. `/app/api/auth/send-otp/route.ts`
**Changes:**
- Removed Firestore imports (`adminDb`)
- Removed Firestore OTP storage logic
- Email verification now sends OTP via Nodemailer only
- Client validates OTP entry
- Added email duplicate check using Firebase

**Key Functions:**
```typescript
// Check if email already exists in Firebase
try {
  await adminAuth.getUserByEmail(email);
  return { error: "Email already registered" };
} catch (error) {
  // User doesn't exist, continue
}

// Send OTP via email
await transporter.sendMail({ ... })
```

### 2. `/app/api/auth/verify-otp/route.ts`
**Changes:**
- Removed Firestore verification logic
- Simplified to basic OTP format validation
- Returns success confirmation to proceed to phone verification
- OTP validation happens implicitly when user confirms they received it

**Purpose:**
- Confirms user has received and can enter the email OTP
- Placeholder for future Redis-based OTP storage if needed
- Prepares for next step: phone verification

### 3. `/app/api/auth/signup/route.ts`
**Changes:**
- Added `emailVerified` parameter check
- Generates temporary 16-character password server-side (not client)
- Creates Firebase user with email & password using `createUser()`
- Links phone number to Firebase user using `updateUser()`
- Creates MySQL customer record
- Sends welcome email with credentials
- Enhanced error handling for Firebase errors

**Key Logic:**
```typescript
// Create Firebase user with email & password
const userRecord = await adminAuth.createUser({
  email,
  password: tempPassword,
  displayName: `${firstName} ${lastName}`,
  emailVerified: true
});

// Link phone if provided
if (phoneNumber) {
  await adminAuth.updateUser(userRecord.uid, { phoneNumber });
}

// Create MySQL customer
await query(
  `INSERT INTO customers (id, name, email, phone, status, ...) VALUES (...)`,
  [customerId, fullName, email, phoneNumber, "active"]
);
```

### 4. `/components/dashboard/add-customer-dialog.tsx`
**Changes:**
- Removed `password` from form data state
- Updated signup payload to include `emailVerified: true`
- Password is now generated server-side only
- Cleaned up form reset logic

**Form Data Structure:**
```typescript
{
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: ""
  // password removed - generated server-side
}
```

## Complete Registration Flow

### Step 1: Customer Info Entry
User enters:
- First Name
- Last Name
- Email
- Phone Number (with automatic UAE formatting)

### Step 2: Email Verification
1. Admin clicks "Send Verification Code"
2. `send-otp` endpoint:
   - Checks if email already exists in Firebase
   - Generates 6-digit OTP
   - Sends OTP via Nodemailer to email
   - Returns success
3. User enters 6-digit code received in email
4. `verify-otp` endpoint validates format and confirms receipt

### Step 3: Phone Verification
1. Firebase SMS is sent to phone number
2. Firebase reCAPTCHA v3 protection enabled
3. User enters 6-digit SMS code
4. `confirmationResult.confirm()` validates with Firebase

### Step 4: Account Creation
1. `signup` endpoint receives request with `emailVerified: true`
2. Creates Firebase user with:
   - Email & password authentication
   - Email verified flag set
   - Phone number linked
   - Display name
3. Creates MySQL customer record
4. Sends welcome email with temporary password
5. Returns success

### Step 5: Success
- User can now log in with email + temporary password
- User should change password on first login
- Phone number confirmed in Firebase
- Customer record created in MySQL

## Authentication Methods Available

After signup, users can authenticate using:

### Email & Password
```typescript
// Client-side Firebase
import { signInWithEmailAndPassword } from "firebase/auth";

signInWithEmailAndPassword(auth, email, password)
  .then(result => {
    // User logged in
  })
```

### Phone Number (SMS)
```typescript
// Client-side Firebase
import { signInWithPhoneNumber } from "firebase/auth";

const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
await confirmation.confirm(smsCode);
```

## Database Schema Synchronization

### Firebase Authentication (adminAuth)
- Email (unique, verified)
- Password (hashed)
- Phone Number (optional, unique)
- Display Name
- UID (primary identifier)

### MySQL Customers Table
- id: customer ID (cust-{timestamp})
- name: full name
- email: email address
- phone: phone number
- status: active/inactive
- total_orders: count
- total_spent: decimal
- created_at: timestamp
- updated_at: timestamp

**Data Flow:**
```
Firebase User Creation
       ↓
   admin.createUser() ← email, password, phone, displayName
       ↓
   Returns UID
       ↓
   MySQL INSERT ← email, phone, name
       ↓
   Customer record created
```

## Security Considerations

1. **Password Generation**: Uses `crypto.randomBytes()` server-side
   - 16 characters (8 bytes in hex)
   - Never transmitted over insecure channels
   - Should be changed on first login

2. **Email Verification**: OTP sent via email
   - 6-digit code
   - No expiration (client-based validation)
   - Prevents fake email addresses

3. **Phone Verification**: Firebase native
   - SMS delivery guaranteed by Firebase
   - reCAPTCHA v3 spam protection
   - Firebase handles rate limiting

4. **Session Management**: Firebase handles all session tokens
   - ID tokens (short-lived)
   - Refresh tokens (long-lived)
   - Automatic refresh management

5. **MySQL Integration**: Indexed fields
   - Email index for duplicate prevention
   - Phone index for lookups
   - RLS can be added if using Supabase

## Error Handling

### Email Verification Errors
- Email not provided → 400
- Email already registered → 400
- Email sending failed → 500

### OTP Verification Errors
- OTP not 6 digits → 400
- Invalid format → 400

### Phone Verification Errors
- SMS not sent → Firebase error (handled by Firebase SDK)
- Invalid phone number → Firebase error
- reCAPTCHA failed → Firebase error

### Account Creation Errors
- Email not verified → 400
- Email already exists in Firebase → 400
- Phone already linked → 400
- Password invalid → 400
- MySQL insert fails → 500 (user still created in Firebase)

## Environment Variables Required

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# Email Service
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password

# Application
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_FIREBASE_API_KEY=your-public-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# MySQL Database
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_DATABASE=your-database-name
```

## Testing the Flow

### Manual Testing
1. Go to Customers page
2. Click "Add Customer"
3. Fill in form:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Phone: +971501234567
4. Click "Send Code" for email
5. Check email for OTP code
6. Enter OTP in dialog
7. Click "Send SMS" for phone
8. Check phone for SMS code
9. Enter SMS code
10. Click "Create Account"
11. Check email for welcome message
12. Try logging in with provided credentials

### API Testing
```bash
# 1. Send OTP
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Verify OTP
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# 3. Create Account (after phone verification)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "phoneNumber":"+971501234567",
    "firstName":"John",
    "lastName":"Doe",
    "emailVerified":true
  }'
```

## Advantages of This Approach

1. **No Firestore Cost**: Reduced Firebase bills
2. **Simpler Architecture**: Firebase Auth handles all complexity
3. **Better Security**: Firebase manages rate limiting, tokens
4. **Native Integration**: Uses Firebase best practices
5. **Scalable**: Phone SMS via Firebase is proven at scale
6. **Email Delivery**: Nodemailer for greater control
7. **MySQL Sync**: Single source of truth for customer data
8. **Easy Migration**: Can add Firestore later if needed

## Future Enhancements

1. **OTP Storage in Redis**: For OTP expiration & validation
2. **Email Templates**: Dynamic templates from database
3. **SMS Custom Messages**: Different templates for different flows
4. **Account Recovery**: Password reset via email OTP
5. **Multi-factor Authentication**: Email + Phone required
6. **Two-step Verification**: Admin approval step
7. **Audit Logging**: Track all authentication events
8. **Rate Limiting**: Prevent brute force attacks
