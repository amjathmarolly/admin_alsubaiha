# Testing Email Verification - Updated Guide

## Changes Made

### 1. Fixed Email Credentials
- **Before:** Email showed system email (EMAIL_USER env var)
- **After:** Email now shows customer's actual email address
- **How:** Updated `generateVerificationEmail()` to accept and display `customerEmail` parameter

### 2. Fixed Verification Link & Created Beautiful Page
- **Before:** Link returned JSON response
- **After:** Link redirects to beautiful verification success page
- **How:** Created `/app/auth/verify-email/page.tsx` with 4 states (loading, success, already_verified, error)

## Testing Procedure

### Step 1: Create a Test Customer
1. Open Dashboard
2. Click "Add Customer" button
3. Enter test customer info:
   - First Name: John
   - Last Name: Doe
   - Email: **your-test-email@gmail.com**
   - Phone: +971501234567
4. Click "Create Account"

### Step 2: Check Verification Email

**What you should see in the email:**

```
Your Login Credentials:
Email: your-test-email@gmail.com    ← YOUR EMAIL (not system email)
Default Password: <DEFAULT_CUSTOMER_PASSWORD>
```

**The email should also include a verification link** that looks like:
```
http://localhost:3000/api/auth/verify-email?token=<long-token>&email=your-test-email@gmail.com
```

### Step 3: Test Verification Link

#### Click Link in Email
1. Click the link in the email
2. You should be redirected to a beautiful success page showing:
   - Green checkmark icon
   - "Email Verified!" heading
   - Customer name and email displayed
   - Next steps instructions
   - "Go to Login" button

**The URL will show:**
```
http://localhost:3000/auth/verify-email?status=verified&email=...&name=...
```

### Step 4: Verify Database Changes

Open your database client and run:
```sql
SELECT * FROM customers WHERE email = 'your-test-email@gmail.com';
```

**Check these fields:**
- `verified` = TRUE ✓
- `verification_token` = NULL ✓
- `password_hash` = bcrypt hash ✓

### Step 5: Test Login

1. Click "Go to Login" button on success page OR manually go to /login
2. Enter credentials:
   - Email: your-test-email@gmail.com
   - Password: <DEFAULT_CUSTOMER_PASSWORD>
3. Should log in successfully ✓

## Page States

### 1. Loading State
- Shows spinner with "Verifying your email..."
- Displayed while page loads

### 2. Success State (Green)
- Shows checkmark icon
- "Email Verified!" heading
- Customer details box showing name and email
- "Next Steps" information
- "Go to Login" button
- Congratulatory message

### 3. Already Verified State (Blue)
- Shows checkmark icon
- "Already Verified" heading
- Email address displayed
- "Go to Login" button
- Message: "Your account is active"

### 4. Error State (Red)
- Shows alert icon
- "Verification Failed" heading
- Error message displayed
- Troubleshooting suggestions:
  - Check you copied the entire link
  - Link may have expired (24 hours)
  - Contact support for new link
- "Back to Login" button

## Testing All Scenarios

### Scenario 1: Valid Verification (Happy Path)
1. Create customer
2. Click email link
3. See success page
4. Database updated
5. Can log in

**Expected:** Green success page ✓

### Scenario 2: Already Verified
1. Complete Scenario 1
2. Click the same link again
3. See blue "Already Verified" page
4. Can log in

**Expected:** Blue already verified page ✓

### Scenario 3: Invalid Link
1. Manually visit: `/auth/verify-email?status=error&error=Invalid+or+expired+link`
2. See error page with red alert

**Expected:** Red error page ✓

### Scenario 4: Manual API Call
```bash
curl "http://localhost:3000/api/auth/verify-email?token=fake-token&email=test@example.com"
```

**Expected:** Redirect to error page (invalid token)

## Email Content Verification Checklist

When testing, verify the email contains:

- [ ] Correct subject: "Welcome to Al Subaiha - Verify Your Email"
- [ ] Correct greeting: "Hello [Customer Name]"
- [ ] Verification button: "Verify Email Address"
- [ ] Backup link text with full URL
- [ ] Login credentials section
  - [ ] Email shows customer email (NOT system email)
  - [ ] Password shows: <DEFAULT_CUSTOMER_PASSWORD>
  - [ ] Security note about changing password
- [ ] 24-hour expiration message
- [ ] Professional HTML styling
- [ ] Al Subaiha branding

## Troubleshooting

### Email not received?
1. Check spam/junk folder
2. Verify EMAIL_USER and EMAIL_PASSWORD are set
3. Check server console for errors
4. Test with `/api/setup` endpoint

### Verification link not working?
1. Copy full URL from email
2. Check token is not corrupted
3. Verify within 24 hours
4. Check database for matching token

### Shows error page instead of success?
1. Check customer exists in database
2. Verify token matches in database
3. Check for SQL errors in console
4. Verify email parameter is URL encoded

### Confirmation email not sent?
1. Not critical - verification still succeeds
2. Check EMAIL_USER and EMAIL_PASSWORD
3. Check server logs for email errors

## Database Queries for Testing

### Check verification status:
```sql
SELECT id, name, email, verified, verification_token, created_at 
FROM customers 
WHERE email = 'your-test-email@gmail.com';
```

### Check all unverified customers:
```sql
SELECT id, name, email, verified, created_at 
FROM customers 
WHERE verified = FALSE;
```

### Check verified customers:
```sql
SELECT id, name, email, verified, created_at 
FROM customers 
WHERE verified = TRUE;
```

## Performance Checklist

- [ ] Page loads in < 2 seconds
- [ ] Redirects happen instantly
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Icons render correctly
- [ ] Colors display properly
- [ ] Text is readable
- [ ] Buttons are clickable

## Production Readiness

Before deploying to production:

- [ ] Test all 4 page states
- [ ] Verify email sending works
- [ ] Database updates correctly
- [ ] Login works after verification
- [ ] Error handling works properly
- [ ] Build succeeds without warnings
- [ ] All links use correct domain
- [ ] NEXT_PUBLIC_APP_URL is set

## Final Test (Complete Flow)

1. Register new customer via dashboard
2. Receive email with correct credentials
3. Click verification link
4. See beautiful success page
5. Database shows verified=TRUE
6. Log in with credentials
7. Access dashboard successfully

**All steps complete = Production Ready ✓**

## Testing Procedure

### Step 1: Create a Test Customer
1. Open Dashboard
2. Click "Add Customer" button
3. Enter test customer info:
   - First Name: John
   - Last Name: Doe
   - Email: **your-test-email@gmail.com**
   - Phone: +971501234567
4. Click "Create Account"

### Step 2: Check Verification Email

**What you should see in the email:**

```
Your Login Credentials:
Email: your-test-email@gmail.com    ← YOUR EMAIL (not system email)
Default Password: <DEFAULT_CUSTOMER_PASSWORD>
```

**The email should also include a verification link** that looks like:
```
http://localhost:3000/api/auth/verify-email?token=<long-token>&email=your-test-email@gmail.com
```

### Step 3: Test Verification Link

#### Option A: Click Link Directly
1. Click the link in the email
2. You should see a JSON response like:
```json
{
  "success": true,
  "status": "verified",
  "email": "your-test-email@gmail.com",
  "customerName": "John Doe",
  "message": "Email verified successfully! You can now log in with your credentials."
}
```

#### Option B: Test via API (Browser Console)
```javascript
fetch('/api/auth/verify-email?token=<TOKEN_FROM_EMAIL>&email=your-test-email@gmail.com')
  .then(r => r.json())
  .then(console.log)
```

### Step 4: Verify in Database

Check the database to confirm changes:

```sql
SELECT id, name, email, verified, verification_token, created_at
FROM customers
WHERE email = 'your-test-email@gmail.com';
```

**Expected result:**
- `verified`: 1 (TRUE)
- `verification_token`: NULL
- Email shows customer's actual email

## What to Verify

### Email Content
- ✓ Customer email shown (not system email)
- ✓ Default password: set in DEFAULT_CUSTOMER_PASSWORD (server environment)
- ✓ Verification link is present
- ✓ Professional formatting with Al Subaiha branding

### Verification Process
- ✓ Link is clickable
- ✓ Link contains token and email parameters
- ✓ Response shows success status
- ✓ Database updated (verified=TRUE, token=NULL)
- ✓ Confirmation email sent after verification

### Error Handling
- ✓ Invalid token → Shows error message
- ✓ Already verified → Shows "already_verified" status
- ✓ Missing parameters → Shows validation error
- ✓ Database errors → Shows appropriate error message

## Common Issues & Solutions

### Issue: Email shows wrong email address
**Solution:** Ensure EMAIL_USER env var is separate from customer email. The function now accepts customerEmail as parameter.

### Issue: Verification link doesn't work
**Solution:** 
1. Check browser console for full URL
2. Verify token is correctly passed in query string
3. Check database for matching token
4. Check server logs for verification endpoint logs

### Issue: Get "invalid or expired verification link"
**Causes:**
- Token doesn't match database token
- Email doesn't match customer email
- Token already used (customer already verified)
- Token has incorrect format

**Solution:** Check database `verification_token` column matches the token in URL

### Issue: Confirmation email not sent
**Solution:** This is not critical - customer is still verified. Check EMAIL_USER/EMAIL_PASSWORD env vars.

## Testing Checklist

- [ ] Email credentials show customer email (not system email)
- [ ] Default password is `<DEFAULT_CUSTOMER_PASSWORD>`
- [ ] Verification link is present in email
- [ ] Link contains proper token
- [ ] Link contains correct email
- [ ] Clicking link returns JSON response
- [ ] Response shows success=true
- [ ] Response shows verified status
- [ ] Database updated after verification
- [ ] verification_token set to NULL
- [ ] verified column set to TRUE
- [ ] Confirmation email received
- [ ] Can now use email to log in (if login implemented)

## Production Notes

For production deployment:

1. Set `NEXT_PUBLIC_APP_URL` to your production domain
2. Gmail app password must be valid
3. Test with real email addresses
4. Monitor verification email delivery
5. Check logs for any verification failures
6. Consider token expiration (currently 24 hours)
7. Implement login page to test credentials

## API Response Examples

### Success Response
```json
{
  "success": true,
  "status": "verified",
  "email": "customer@example.com",
  "customerName": "John Doe",
  "message": "Email verified successfully! You can now log in with your credentials."
}
```

### Already Verified
```json
{
  "message": "Email already verified",
  "status": "already_verified",
  "email": "customer@example.com",
  "customerName": "John Doe"
}
```

### Invalid Link
```json
{
  "error": "Invalid or expired verification link",
  "status": "invalid_link",
  "email": "customer@example.com"
}
```

### Error Response
```json
{
  "error": "Failed to verify email",
  "status": "error"
}
```

## Debugging

Enable detailed logging by checking server console when:
1. Creating customer account (signup endpoint logs)
2. Clicking verification link (verify-email endpoint logs)

Look for `[Verify Email]` and `[Signup]` prefixed logs showing:
- Token generation
- Email sent confirmation
- Database updates
- Error details

## Next Steps

After verification works:
1. Implement login page with email + password
2. Test login with verified credentials
3. Implement password change functionality
4. Add "Resend verification email" option
5. Implement token expiration handling
6. Add rate limiting to prevent abuse
