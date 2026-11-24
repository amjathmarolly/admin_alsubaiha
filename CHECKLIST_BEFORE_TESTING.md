# Checklist Before Testing Phone Authentication

Before clicking "Verify Phone", complete these Firebase setup steps:

## 1. Firebase Console Configuration (5 min)

### A. Enable Phone Authentication
- [ ] Open [Firebase Console](https://console.firebase.google.com)
- [ ] Go to: Authentication → Sign-in method
- [ ] Find "Phone" in the provider list
- [ ] Toggle it **ON** (must be BLUE)
- [ ] Click Save

### B. Enable Billing
- [ ] Go to: Project Settings (gear icon) → Billing
- [ ] Set up payment method
- [ ] Enable billing for the project
- [ ] **Without this, phone auth will FAIL**

### C. Configure SMS Regions
- [ ] Go to: Authentication → Settings (gear icon)
- [ ] Find "Phone Number Sign-In"
- [ ] Under "SMS sender region policy"
- [ ] Add region: **+971 (UAE)** or your region
- [ ] Save

### D. Add OAuth Redirect Domain
- [ ] Go to: Authentication → Settings
- [ ] Find "OAuth redirect domains"
- [ ] Add: **localhost** (for local development)
- [ ] Save

## 2. Add Test Phone Numbers (2 min)

### Why Test Numbers?
- No actual SMS sent
- No quota usage
- Works consistently for testing

### Setup Test Number
- [ ] Go to: Authentication → Sign-in method → Phone
- [ ] Scroll to "Phone numbers for testing"
- [ ] Click **+ Add**
- [ ] Phone: **+971501234567**
- [ ] Code: **123456** (or any 6 digits)
- [ ] Save

## 3. Browser Console Ready (1 min)

- [ ] Open the app
- [ ] Press **F12** to open Developer Tools
- [ ] Go to **Console** tab
- [ ] Ready to see `[v0]` debug messages

## 4. Ready to Test!

Now you're ready to:
1. Enter customer info (First name, Last name, Email)
2. Enter test phone: **+971501234567**
3. Click **Verify Phone**
4. Wait for "SMS Sent" toast
5. Enter code: **123456**
6. Click **Create Account**

## If It Still Fails

### Check Error Message

If you see "auth/operation-not-allowed":
- Phone auth is NOT enabled
- Go to Firebase Console → Authentication → Sign-in method
- Toggle Phone to ON
- Wait 1 minute
- Try again

If you see "Invalid phone number format":
- Use international format with +
- Example: +971501234567 (not 0501234567)

If you see reCAPTCHA errors:
- Refresh the page
- Clear browser cache
- Try again

### Check Browser Console
- Open F12 → Console tab
- Look for messages starting with `[v0]`
- Copy any error messages
- Search the error in [Firebase docs](https://firebase.google.com/docs/auth/web/phone-auth)

### Check Network Tab
- Open F12 → Network tab
- Click "Verify Phone"
- Look for failed requests (red)
- Check for auth/reCAPTCHA errors

## Quick Fixes

| Problem | Fix |
|---------|-----|
| No SMS sent immediately | Phone auth not enabled in Firebase |
| "Too many requests" | Wait 5 minutes, try different number |
| reCAPTCHA error | Refresh page, clear cache, try again |
| Invalid phone format | Use +country code (e.g., +971501234567) |
| Billing error | Enable billing in Firebase Console |

## Complete Setup (~10 minutes)

1. ✓ Enable Phone auth in Firebase Console
2. ✓ Enable billing
3. ✓ Configure SMS region
4. ✓ Add OAuth domain
5. ✓ Add test phone number and code
6. ✓ Open browser console (F12)
7. ✓ Test with app

Now test the full flow!
