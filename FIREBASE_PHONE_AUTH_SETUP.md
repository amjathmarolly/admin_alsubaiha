# Firebase Phone Authentication Setup Guide

This guide follows the official Firebase Documentation for Phone Authentication: https://firebase.google.com/docs/auth/web/phone-auth

## 1. Enable Phone Number Sign-in in Firebase Console

### Steps:
1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project: **dbxproject-4b1cb**
3. Go to **Authentication** section
4. Click **Sign-in method** tab
5. Look for **Phone** provider in the list
6. **IMPORTANT:** Toggle it **ON** (must be blue/enabled)
7. Save

**Critical:** If Phone provider is disabled (gray), the SMS will NOT be sent.

## 2. Configure SMS Regions

1. In **Authentication** → **Settings** (gear icon)
2. Under "Phone Number Sign-In", set **SMS sender region policy**
3. Default for new projects blocks all regions
4. Add regions where you want to allow SMS:
   - UAE: +971
   - Other countries as needed
5. Save

## 3. Add OAuth Redirect Domain

1. In **Authentication** → **Settings**
2. Under **OAuth redirect domains**, add your domain:
   - Local development: `localhost` (add this)
   - Production: your production domain
   - Vercel deployment: your vercel domain
3. Save

**Important:** `localhost` is typically not allowed, but we use testing mode for local development.

## 4. Set Up Test Phone Numbers (For Development)

### Create Fictional Test Numbers:

1. Go to **Authentication** → **Sign-in method** → **Phone**
2. Scroll to **Phone numbers for testing**
3. Click **+ Add** button
4. Add test entries:
   - Phone: **+1650555343** (US test format)
   - Code: **123456**
   
   OR for UAE:
   - Phone: **+971501234567**
   - Code: **654321**

5. Save

### Using Test Numbers:
- Use these phone numbers in development/testing
- Firebase will NOT send actual SMS
- Use the pre-configured code to verify
- No quota usage with test numbers

## 5. Enable Billing (Required)

Phone Authentication requires billing to be enabled in Firebase:

1. Go to **Project Settings** (gear icon)
2. Click **Billing** or go to [Google Cloud Console Billing](https://console.cloud.google.com/billing)
3. Set up a payment method
4. Enable billing for the project

**Without billing, phone auth will fail with "auth/operation-not-allowed"**

## 6. Local Development Testing

### Option A: Using Test Phone Numbers

Best for development:

```
Phone Number: +1650555343
Test Code: 123456
(No SMS will be sent)
```

### Option B: Using Development Mode

For integration testing:

```javascript
// In development, set this before creating RecaptchaVerifier:
auth.settings.appVerificationDisabledForTesting = true;
```

This disables reCAPTCHA requirement for testing.

## Implementation Details

### reCAPTCHA Verifier

The implementation uses invisible reCAPTCHA v3:

```javascript
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-admin', {
  'size': 'invisible',
  'callback': (response) => {
    // reCAPTCHA solved
  },
  'expired-callback': () => {
    // reCAPTCHA expired - prompt user to try again
  }
});
```

### Phone Sign-In Flow

1. **Send Code:** `signInWithPhoneNumber(auth, phoneNumber, appVerifier)`
   - Returns: `ConfirmationResult` object
   - User receives SMS with code

2. **Verify Code:** `confirmationResult.confirm(code)`
   - Confirms the code
   - User is signed in to Firebase
   - Returns: `UserCredential` with Firebase User

3. **Create Customer Record:** Separate API call to create customer in database

### Error Handling

Common error codes and solutions:

| Error Code | Cause | Solution |
|-----------|-------|----------|
| `auth/invalid-phone-number` | Wrong format | Use +country code format |
| `auth/operation-not-allowed` | Phone auth not enabled | Enable in Firebase Console |
| `auth/too-many-requests` | Rate limited | Wait 1-5 minutes, try again |
| `auth/captcha-check-failed` | reCAPTCHA failed | Refresh page and retry |
| `auth/invalid-verification-code` | Wrong code | Check code and re-enter |
| `auth/code-expired` | Code timed out | Request new SMS |

## Testing Checklist

- [ ] Phone authentication enabled in Firebase Console
- [ ] Billing enabled
- [ ] Test phone number added
- [ ] OAuth redirect domain added
- [ ] reCAPTCHA container exists in DOM (`<div id="recaptcha-admin"></div>`)
- [ ] Test with fictonal phone number first
- [ ] Check browser console for `[v0]` debug logs
- [ ] Verify SMS received on real number (if testing with real number)

## Production Deployment Checklist

- [ ] Firebase Phone authentication enabled
- [ ] Billing active and payment method valid
- [ ] Production domain added to OAuth redirect domains
- [ ] SMS region policy configured for target countries
- [ ] Test phone numbers removed (optional)
- [ ] App verification NOT disabled in production
- [ ] SSL/HTTPS enabled
- [ ] Firebase project properly linked to production domain

## Debugging

### Browser Console Logs

Look for messages starting with `[v0]`:

```
[v0] Formatting phone number: 0501234567
[v0] Formatted phone number: +971501234567
[v0] Creating RecaptchaVerifier...
[v0] RecaptchaVerifier created successfully
[v0] Calling signInWithPhoneNumber...
[v0] signInWithPhoneNumber successful
```

### If SMS Not Sent:

1. **Check Firebase Console:**
   - Is Phone provider enabled? (should be blue)
   - Is billing enabled?
   - Is your region allowed?

2. **Check Browser Console (F12):**
   - Look for error messages with `[v0]` prefix
   - Check for reCAPTCHA errors

3. **Check Network Tab (F12):**
   - Look for failed requests
   - Check reCAPTCHA requests

4. **Try Test Phone Number:**
   - Use test number from Firebase
   - Use the pre-generated test code

## Firebase Documentation

Official Reference: https://firebase.google.com/docs/auth/web/phone-auth

Key sections covered in this implementation:
- Enable Phone Number sign-in ✓
- Set up reCAPTCHA verifier ✓
- Send verification code ✓
- Sign in user with verification code ✓
- Error handling ✓
- Test with fictional phone numbers ✓

