# Customer Registration System - Testing Guide

## Quick Test Checklist

### Prerequisites
- [ ] Firebase project with Phone Auth enabled
- [ ] reCAPTCHA v3 configured in Firebase
- [ ] Gmail account with app-specific password
- [ ] MySQL database with customers table
- [ ] Firestore database initialized
- [ ] All env vars set (see CUSTOMER_REGISTRATION_IMPLEMENTATION.md)

### Test Flow

#### Step 1: Navigate to Customers Page
```
1. Go to http://localhost:3000/customers
2. You should see "Add Customer" button in top right
3. Click the button
```

#### Step 2: Fill Customer Information
```
Dialog appears with 4 fields:
- First Name: Enter a first name (e.g., "John")
- Last Name: Enter a last name (e.g., "Doe")
- Email: Enter a test email you control (e.g., "test@example.com")
- Phone: Enter a UAE number (e.g., "0501234567" or "+971501234567")
- Password: Leave empty (auto-generated)

Click "Continue to Verification"
```

#### Step 3: Email Verification
```
Expected:
1. Email verification dialog appears
2. Check your email inbox (usually within 30 seconds)
3. Look for email from "Al Subaiha <your-gmail@gmail.com>"
4. Subject: "Your Verification Code"
5. Extract the 6-digit code (e.g., "123456")

Action:
6. Enter the 6-digit code in the dialog
7. Click "Verify Email"

Success:
- Toast appears: "Verified: Email verified successfully"
- Dialog moves to phone verification step
```

#### Step 4: Phone Verification
```
Expected:
1. Phone verification dialog appears
2. Shows "Verify {phoneNumber} via SMS"
3. Button says "Send Verification SMS"

Action:
4. Click "Send Verification SMS"
5. You should receive SMS on the phone number entered
6. SMS contains a 6-digit code

Verification:
7. Enter the 6-digit SMS code in the input field
8. Click "Finish & Create Account"

Success:
- Toast appears: "Success: Customer account created successfully"
- Dialog shows success screen with account details
```

#### Step 5: Verify in Backend Systems
```
Check Firebase Console:
1. Go to your Firebase project
2. Navigate to Authentication > Users
3. Search for the email you used
4. Verify:
   - Email: Your test email
   - Phone: Your formatted phone number
   - Email verified: Yes
   - Created: Just now

Check MySQL Database:
1. Query customers table
2. Look for most recent customer record
3. Verify:
   - name: "John Doe"
   - email: "test@example.com"
   - phone: "+971501234567"
   - status: "active"
   - created_at: Just now

Check Email:
1. Check inbox for welcome email from "Al Subaiha"
2. Subject: "Welcome to Al Subaiha - Your Account is Ready"
3. Contains:
   - Greeting with customer name
   - Login email
   - Login phone (if provided)
   - Temporary password
   - Link to login page
```

## Debug Mode Testing

### Enable Console Logging
The implementation includes `console.log("[v0] ...")` statements for debugging.

Check browser console for:
```
[v0] User data received:...
[Signup] Confirming phone OTP...
[Signup] Phone verified successfully
[Signup] Creating customer account...
[Signup] Customer created successfully: cust-XXXX
```

Check server logs for:
```
[OTP] Generating code for {email}
[OTP] Stored in Firestore for {email}
[OTP] Attempting to send email...
[OTP] Email sent successfully to {email}
[Signup] Customer record created for {email}
[Signup] Welcome email sent to {email}
```

### Test Error Cases

#### Test 1: Invalid Email
```
1. In "Customer Information" step
2. Leave email empty or enter invalid value
3. Click "Continue to Verification"
4. Expected: Toast "Invalid Email: Please enter a valid email address"
```

#### Test 2: Missing Phone
```
1. In "Customer Information" step
2. Leave phone number empty
3. Click "Continue to Verification"
4. Expected: Toast "Invalid Input: Please enter phone number"
```

#### Test 3: Duplicate Email
```
1. Use email from previously created customer
2. Complete full flow
3. Expected at "Finish & Create Account": 
   Toast "Creation Failed: Email already registered"
```

#### Test 4: Invalid OTP
```
1. Receive email OTP
2. Enter wrong 6-digit code
3. Click "Verify Email"
4. Expected: Toast "Verification Failed: Invalid or expired email code"
```

#### Test 5: Expired OTP
```
1. Receive email OTP
2. Wait 10+ minutes
3. Enter the original code
4. Click "Verify Email"
5. Expected: Toast "Verification Failed: Invalid or expired email code"
```

#### Test 6: SMS Without Permission
```
1. Try to verify phone without sending SMS
2. Leave SMS code empty
3. Click "Finish & Create Account"
4. Expected: Button disabled (6-digit requirement not met)
```

## API Testing with cURL

### Test Email OTP Endpoint
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Expected Response:
# { "success": true, "message": "OTP sent successfully" }
```

### Test Email Verification Endpoint
```bash
# First, get the OTP from your email/logs
# Then run:
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'

# Expected Response:
# { "success": true, "message": "Email verified successfully" }
```

### Test Signup Endpoint
```bash
# Note: Phone verification must be done via Firebase client SDK
# So this test is for API validation only
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phoneNumber": "+971501234567",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Expected Response:
# { 
#   "success": true, 
#   "uid": "firebase-uid-xxx", 
#   "customerId": "cust-1234567890",
#   "email": "test@example.com"
# }
```

## Performance Testing

### Load Test Multiple Registrations
```
1. Create 5-10 test customers in sequence
2. Measure time for each step:
   - Email OTP send: Should be < 5 seconds
   - Email OTP verify: Should be < 3 seconds
   - SMS send: Should be < 10 seconds
   - SMS verify: Should be < 5 seconds
   - Account creation: Should be < 5 seconds
   - Total flow: Should complete in < 2 minutes
```

### Concurrent Registration Test
```
1. Open multiple browser tabs to customer registration
2. Simultaneously complete flows with different emails
3. Verify all customers created correctly in database
4. Check for any race condition issues
```

## Security Testing

### Test Invalid Phone Format
```
1. Enter invalid phone formats:
   - "abc123def" → Should show error
   - "12345" → Should show "invalid phone number" error
   - "+1234567890123456" → Should be rejected

2. Expected: All invalid formats either rejected or auto-corrected
```

### Test OTP Brute Force Protection
```
1. Attempt to verify with 10 wrong OTP codes in succession
2. Firebase and Firestore should rate limit
3. Expected: Error after several failed attempts
```

### Test Email Uniqueness
```
1. Create customer with email "user@example.com"
2. Try to create another customer with same email
3. Expected Error: "Email already registered"
```

### Test reCAPTCHA Verification
```
1. Open browser DevTools
2. Check Network tab for reCAPTCHA request
3. Should see POST to Firebase with recaptchaToken
4. Expected: reCAPTCHA score > 0.5 (not bot-like)
```

## Troubleshooting

### Email OTP not received
**Solution:**
- Check spam/junk folder
- Verify EMAIL_USER and EMAIL_PASSWORD are correct
- Check Gmail app-specific passwords are enabled
- Check server logs for SMTP errors
- Try with different email address

### SMS not received
**Solution:**
- Verify phone number format is correct
- Check Firebase has SMS credits/quota
- Verify reCAPTCHA is initialized properly
- Check Firebase project has Phone Authentication enabled
- Verify phone number is not in Firebase's block list

### Account not created in MySQL
**Solution:**
- Verify database connection is working
- Check DATABASE_URL env var is correct
- Verify customers table exists
- Check server logs for SQL errors
- Ensure MySQL user has INSERT permissions

### Firebase user created but no MySQL record
**Solution:**
- This is a known fallback behavior
- Firebase user is still created successfully
- Manual database entry may be needed
- Check server logs for database error details
- Run manual INSERT to sync database

### Welcome email not received
**Solution:**
- Check spam/junk folder
- Verify Nodemailer SMTP settings
- Check server logs for mail transport errors
- Email is non-critical, account creation succeeds anyway
- Can resend manually from admin panel if added

## Success Criteria

✅ Customer Registration is successful when:
1. Form validation prevents empty/invalid fields
2. Email OTP received and verified
3. SMS code received and verified
4. Firebase user created with both email and phone
5. MySQL customer record created
6. Welcome email sent with temporary password
7. Success dialog shows account details
8. Customer can login with provided credentials
9. All data synced across Firebase and MySQL

## Post-Implementation Verification

Run this final checklist after implementation:
- [ ] Email OTP system working
- [ ] SMS verification functional
- [ ] Firebase user creation successful
- [ ] MySQL customer record created
- [ ] Welcome email delivered
- [ ] All error cases handled gracefully
- [ ] Phone numbers formatted correctly
- [ ] Success message displays accurate info
- [ ] Data consistent between Firebase and MySQL
- [ ] Admin can see new customer in customers page
