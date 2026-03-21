# WhatsApp Auto-Messaging Setup Guide

## Implementation Complete ✅

The WhatsApp auto-messaging feature has been implemented. Follow these steps to configure and activate it.

---

## Step 1: Configure Supabase Edge Function Secrets

Go to your **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**

Add the following secrets:

| Secret Name | Description |
|-------------|-------------|
| `WHATSAPP_PHONE_NUMBER_ID` | Your WhatsApp Phone Number ID from Facebook Developer Console |
| `WHATSAPP_ACCESS_TOKEN` | Your permanent access token from Facebook Developer Console |
| `WHATSAPP_ADMIN_PHONE` | Admin phone number to receive notifications (format: 973XXXXXXXX) |

---

## Step 2: Deploy the Edge Function

Run this command from your project root:

```bash
npx supabase functions deploy send-whatsapp --project-ref YOUR_PROJECT_REF
```

Or deploy via Supabase Dashboard by uploading the function.

---

## Step 3: Create Message Templates in Facebook Business Manager

You need to create **3 approved message templates** in your WhatsApp Business Manager:

### Template 1: `purchase_confirmation`
```
Hello {{1}}, your booking has been confirmed!
📅 Date: {{2}}
⏰ Time: {{3}}
💰 Amount: {{4}} BHD
Reference: {{5}}
```

### Template 2: `job_created`
```
Job {{1}} has been scheduled.
Customer: {{2}}
Date: {{3}}
Address: {{4}}
```

### Template 3: `contact_report`
```
New contact received from {{1}}.
Email: {{2}}
Phone: {{3}}
Message: {{4}}
```

**Note:** Template names must match exactly. Wait for Facebook approval before testing.

---

## Step 4: Test the Integration

1. **Test Purchase Notification**: Complete a booking on `/hourlybooking`
2. **Test Job Created**: Create a job from Admin Dashboard
3. **Test Contact Report**: Submit a contact form

Check browser console for success/error logs.

---

## Trigger Points

| Trigger | File | When |
|---------|------|------|
| Purchase | `HourlyBookingPage.jsx` | After successful `createPurchase()` |
| Job Created | `AdminCreateJobPage.jsx` | After successful job insert |
| Contact Report | `Contact.jsx` | After successful form submission |

---

## Files Created/Modified

### New Files:
- `supabase/functions/send-whatsapp/index.ts` - Edge function
- `src/lib/whatsappService.js` - Client utility

### Modified Files:
- `src/pages/HourlyBookingPage.jsx` - Added purchase notification
- `src/pages/AdminCreateJobPage.jsx` - Added job notification
- `src/components/Contact.jsx` - Added contact notification

---

## Troubleshooting

### "WhatsApp credentials not configured"
- Ensure all 3 secrets are set in Supabase Edge Function settings

### "Template not found"
- Verify template names match exactly in Facebook Business Manager
- Ensure templates are approved (not pending)

### "Invalid phone number"
- Phone numbers should be in format: `973XXXXXXXX` (no + or spaces)
- The system auto-formats most common formats

### Messages not sending
- Check browser console for errors
- Check Supabase Edge Function logs
- Verify access token hasn't expired

---

## Security Notes

- Access tokens are stored securely in Supabase secrets
- WhatsApp notifications are non-blocking (won't break main functionality if they fail)
- All errors are logged but don't interrupt user flow
