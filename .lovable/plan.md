
# Send subscriber alerts via Gmail (no DNS required)

Use the Gmail connector to send news alerts from your own Google account. No DNS records, no IT involvement — you sign in with Google once and emails go out from that address.

## What this gives you
- Real authenticated sender (Google handles SPF/DKIM/DMARC).
- From address = the Gmail/Workspace account you connect (e.g. `you@enterprisegroup.com.gh` if Workspace, or a Gmail address).
- ~500 sends/day on personal Gmail, ~2,000/day on Google Workspace — plenty for the current subscriber list.
- Reply-to can be set to a real mailbox so subscribers can reply naturally.
- Zero ongoing cost.

## What I'll build

### 1. Connect Gmail
- Trigger the Gmail connector picker. You sign in with Google in one click and pick which scopes to grant (`gmail.send`).
- Once connected, `GOOGLE_MAIL_API_KEY` becomes available to edge functions automatically.

### 2. New edge function: `send-news-email`
- Single generic sender used for all subscriber alerts.
- Inputs: `subscriber_id`, `article_id` (or batch).
- Builds an RFC 2822 message (HTML + plain text), base64url-encodes it, and POSTs to the Gmail API via the Lovable connector gateway.
- Headers include `List-Unsubscribe` + `List-Unsubscribe-Post` pointing at an unsubscribe link, so Gmail/Outlook show a native unsubscribe button.
- Writes the outcome (sent / failed / skipped) back to `news_subscriber_sends` so your existing **Email Delivery** dashboard keeps working unchanged.
- Throttled: small delay between sends to stay well under Gmail's per-minute caps.

### 3. Branded HTML template
- Match the portal's look: Enterprise Life / Group palette, Fraunces serif headline for the article title, Inter body, theme-aware accent.
- Sections: greeting → article title (linked) → AI insight chip (reuse the regex matcher already in `NewsCard`) → source + date → "Read full article" button → footer with unsubscribe + frequency-change link.
- Plain-text fallback auto-generated from the same data.

### 4. Wire it into the existing flow
- The current `news_subscriber_sends` queue with `pending` rows is already being created by the crawl/digest functions.
- Add a small drainer (called from the existing schedule or on-demand from the admin "Process queue" button) that picks up `pending` rows and invokes `send-news-email` for each.
- Reuse `EmailDeliveryDashboard`, retry buttons, and per-subscriber stats — no UI changes needed.

### 5. Unsubscribe + preferences
- One-click unsubscribe link (`/unsubscribe?token=…`) that flips `is_active = false` on `news_subscribers`.
- Page also lets the subscriber switch frequency (instant ↔ daily) without an account.

### 6. Admin touches in `DataAdmin`
- A "Gmail" status chip on the Email Delivery card showing the connected Google account + daily send count vs. limit.
- "Send test email" button so you can verify end-to-end in 5 seconds.

## What you'll do
1. Approve the connector connection (one Google sign-in popup).
2. Optionally pick which Google account to send from (personal Gmail or a Workspace mailbox like `news@enterprisegroup.com.gh` if you have one).

## What stays the same
- All existing subscriber management, queue, retries, send-log, and admin dashboard.
- If/when IT can add 2 NS records later, we can switch the sender to branded Lovable Email by changing one edge function — no data migration, no template rewrite.

## Technical notes
- Uses `https://connector-gateway.lovable.dev/google_mail/gmail/v1/users/me/messages/send` with `Authorization: Bearer ${LOVABLE_API_KEY}` and `X-Connection-Api-Key: ${GOOGLE_MAIL_API_KEY}`.
- All sends logged to `news_subscriber_sends` with `status`, `attempts`, `error_message` — same schema you already have.
- Rate-limit handling: on Gmail 429/5xx, mark row `pending` with incremented `attempts` so the existing retry UI picks it up.
- Input validation with Zod on the edge function body; admin-token gate on the drainer endpoint.

Ready to proceed?
