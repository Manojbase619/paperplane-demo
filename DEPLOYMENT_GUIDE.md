# Deployment Guide: Ultravox Memory Support

**Date:** 2026-02-04
**Project:** intent-capture / Paperplane Travel Agent
**Goal:** Deploy conversation memory system for Ultravox voice agent

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Prerequisites
- ✅ Supabase account and project created
- ✅ Ultravox account with agent configured
- ✅ Anthropic API key (for summary generation)
- ✅ GitHub repository access (BaseThesis/intent-capture)
- ✅ Vercel account (for deployment)

---

## 🔧 STEP 1: Environment Variables

### Create `.env.local` file in project root:

```bash
# ============================================
# SUPABASE (Database)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Get these from: https://app.supabase.com/project/_/settings/api

# ============================================
# ULTRAVOX (Voice AI)
# ============================================
ULTRAVOX_API_KEY=usk_your-ultravox-api-key-here
ULTRAVOX_AGENT_ID=agent_your-agent-id-here

# Get these from: https://app.ultravox.ai
# API Key: Settings → API Keys → Create New Key
# Agent ID: Your agent's page → Agent ID in URL

# ============================================
# ANTHROPIC (Summary Generation)
# ============================================
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Get from: https://console.anthropic.com/settings/keys

# ============================================
# OPTIONAL: Webhook Secret (for production)
# ============================================
# ULTRAVOX_WEBHOOK_SECRET=your-random-secret-string
```

### Vercel Environment Variables

After deploying, set these in Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add all variables from above

---

## 🗄️ STEP 2: Database Setup

### Option A: Run Migration via Supabase SQL Editor

1. Go to: https://app.supabase.com/project/_/sql/new
2. Copy contents of: `migrations/001_add_memory_support.sql`
3. Paste into SQL Editor
4. Click "Run" (or press Cmd+Enter)
5. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
   ```
   Should see: `users`, `calls`, `call_messages`, `call_summaries`

### Option B: Run Migration via CLI (if you have supabase CLI)

```bash
# Install supabase CLI if needed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push migrations/001_add_memory_support.sql
```

---

## 🤖 STEP 3: Ultravox Agent Setup

### 3a. Update System Prompt in Ultravox Dashboard

1. Go to: https://app.ultravox.ai/agents
2. Select your agent (Anna)
3. Edit System Prompt
4. Copy contents from: `ULTRAVOX_SYSTEM_PROMPT.md`
5. **Important:** Update the Mustache variables section at the top to match your needs
6. Save agent

### 3b. Configure Webhooks in Ultravox

1. In your agent settings, go to "Webhooks"
2. Add webhook URL:
   ```
   Production: https://your-domain.vercel.app/api/webhooks/ultravox
   Development: https://your-ngrok-url.ngrok-free.app/api/webhooks/ultravox
   ```
3. Enable events:
   - ☑️ `call.started`
   - ☑️ `call.ended`
4. **Optional:** Add webhook secret for signature verification
5. Test webhook (Ultravox has a test button)

---

## 🚀 STEP 4: Deploy to Vercel

### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel Dashboard after first deploy
```

### Option B: Deploy via Vercel Dashboard

1. Go to: https://vercel.com/new
2. Import your GitHub repository: `BaseThesis/intent-capture`
3. Configure:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
4. Add environment variables (see Step 1)
5. Click "Deploy"

---

## 🧪 STEP 5: Testing

### Test 1: Database Connection

```bash
curl https://your-domain.vercel.app/api/calls/create?phone=+911234567890
```

Expected response:
```json
{
  "hasHistory": false,
  "message": "No history found for this number"
}
```

### Test 2: Create Call (New User)

```bash
curl -X POST https://your-domain.vercel.app/api/calls/create \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+911234567890"}'
```

Expected response:
```json
{
  "ok": true,
  "callId": "...",
  "joinUrl": "...",
  "hasHistory": false,
  "contextType": "none"
}
```

### Test 3: Create Call (Returning User - Same Day)

1. Complete a test call (join via joinUrl, have conversation, hang up)
2. Wait for webhook to process (should see `call.ended` in logs)
3. Create new call with same phone number
4. Verify: Agent should say "Welcome back!"

### Test 4: Memory Tiers

Test different time gaps:

| Time Since Last Call | Expected Behavior |
|---------------------|-------------------|
| < 1 hour | Uses `priorCallId` - exact continuation |
| 1-24 hours | Full transcript injected as `initialMessages` |
| > 24 hours | Summary + `templateContext` injected |

### Test 5: Webhook Processing

Check Vercel logs:
1. Go to Vercel Dashboard → Your Project → Logs
2. Look for webhook events
3. Should see: `📡 Webhook received: call.ended`
4. Check Supabase for stored messages

---

## 🔍 STEP 6: Monitoring & Debugging

### Vercel Logs

Real-time logs: https://vercel.com/dashboard/intent-capture/logs

Look for:
- `📞 Call creation request for phone: ...`
- `👤 User: ...`
- `📋 Last call: ...`
- `🔄 Tier X: ...` - Which memory tier was used
- `✅ Call created: ...`

### Supabase Table Viewer

Check data: https://app.supabase.com/project/_/editor

Run queries:
```sql
-- Check users
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- Check calls
SELECT * FROM calls ORDER BY started_at DESC LIMIT 10;

-- Check messages
SELECT * FROM call_messages ORDER BY created_at DESC LIMIT 20;

-- Check summaries
SELECT * FROM call_summaries ORDER BY created_at DESC LIMIT 10;
```

### Ultravox Call Logs

1. Go to: https://app.ultravox.ai/calls
2. See all calls with transcripts
3. Verify joinUrl matches your database

---

## ⚠️ TROUBLESHOOTING

### Issue: "ULTRAVOX_API_KEY not set"

**Fix:** Check environment variables in Vercel Dashboard
1. Go to Settings → Environment Variables
2. Verify `ULTRAVOX_API_KEY` exists
3. Redeploy if you added it after initial deployment

### Issue: "Failed to create call" (401 from Ultravox)

**Fix:** Verify API key is valid
1. Check Ultravox Dashboard → Settings → API Keys
2. Ensure key is active and has correct permissions
3. Regenerate key if needed

### Issue: "Phone number required"

**Fix:** Frontend not passing phone number
1. Check browser console for errors
2. Verify localStorage has phone number
3. Check Network tab for request payload

### Issue: Webhook not firing

**Fix:** Check webhook configuration
1. Verify webhook URL in Ultravox dashboard
2. Test webhook using ngrok (local development)
3. Check Vercel logs for incoming requests

### Issue: Messages not stored in database

**Fix:** Check webhook processing
1. Look for `Fetched N messages from Ultravox` in logs
2. Verify `ULTRAVOX_API_KEY` has read permissions
3. Check Ultravox API response format

### Issue: "No history" on returning call

**Fix:** Check database for previous calls
```sql
-- Run this in Supabase SQL Editor
SELECT
  c.call_id,
  c.started_at,
  c.status,
  COUNT(cm.message_id) as message_count
FROM calls c
LEFT JOIN call_messages cm ON cm.call_id = c.call_id
WHERE c.phone_number = '+911234567890'
GROUP BY c.call_id, c.started_at, c.status
ORDER BY c.started_at DESC;
```

### Issue: priorCallId not working

**Fix:** Verify call age is < 1 hour
```sql
-- Check last call timestamp
SELECT
  call_id,
  started_at,
  EXTRACT(EPOCH FROM (NOW() - started_at)) / 3600 as hours_ago
FROM calls
WHERE phone_number = '+911234567890'
ORDER BY started_at DESC
LIMIT 1;
```

---

## 📊 PRODUCTION READINESS

### Before Going Live:

- [ ] All environment variables set in Vercel
- [ ] Database migration run successfully
- [ ] Webhook configured in Ultravox dashboard
- [ ] System prompt updated with Mustache variables
- [ ] Tested all three memory tiers
- [ ] Verified webhook processing
- [ ] Set up monitoring (Vercel Analytics)
- [ ] Set up error tracking (Sentry - optional)

### Performance Targets:

- Call creation: < 500ms (p95)
- Webhook response: < 200ms (p95)
- Database queries: < 100ms each

### Scaling Considerations:

- Supabase free tier: 60 concurrent connections
- If hitting limits: Enable connection pooling or upgrade to Pro
- Ultravox: Pay-per-minute, no concurrency limits

---

## 📝 POST-DEPLOYMENT

### Day 1 Operations:

1. Monitor first 10 calls
2. Check all three memory tiers working
3. Verify summaries are generating
4. Fix any immediate issues

### Week 1 Optimizations:

1. Add error tracking (Sentry)
2. Add performance monitoring
3. Review conversation summaries quality
4. Tune system prompt based on real conversations

### Month 1 Enhancements:

1. Add conversation compression for long calls
2. Implement RAG for complex queries
3. Add multi-language support
4. Optimize for mobile users

---

## 🆘 SUPPORT

### Documentation:
- Ultravox Docs: https://docs.ultravox.ai
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs

### Common Issues:
- See "Troubleshooting" section above
- Check GitHub Issues: https://github.com/BaseThesis/intent-capture/issues

---

## ✅ DEPLOYMENT COMPLETE

Once all steps are done, your system will:

✅ Remember users across calls
✅ Handle dropped calls gracefully
✅ Maintain conversation context
✅ Provide personalized experience
✅ Scale to production traffic

**Ready to go live! 🚀**
