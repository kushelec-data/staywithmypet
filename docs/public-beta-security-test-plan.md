# Public beta security test plan (User A vs User B)

Use two separate accounts in two browsers (or normal + incognito): **User A** and **User B**.

## Setup

1. Apply migrations: `supabase db push` (includes `20260604100000_public_beta_security.sql`).
2. User A: public profile, at least one public pet with photos.
3. User B: public profile, Pet Friend role (or both).

## 1. Middleware / auth gates

| Step | Actor | Expected |
|------|-------|----------|
| Open `/dashboard` logged out | — | Redirect to `/login?next=/dashboard` |
| Open `/messages`, `/requests`, `/bookings`, `/pets/new`, `/membership`, `/profile/edit` logged out | — | Redirect to `/login` |
| Open `/`, `/find-pets`, `/find-care`, `/users/{id}`, `/pet/{id}` logged out | — | Page loads (public) |
| Log in as User A, open protected routes | A | Pages load |

## 2. Profiles & private fields (RLS + sanitization)

| Step | Actor | Expected |
|------|-------|----------|
| User B views User A public profile `/users/{A}` | B | Sees name, bio, area — **no** phone, email, street address, emergency contact |
| User B runs Supabase client `profiles.select('*').eq('id', A)` in browser console | B | Only public-safe columns returned; no `phone`, `address`, `emergency_*` |
| User A views own profile in account settings | A | Full phone / emergency fields visible |
| User B sets profile `is_public = false` | B | User A cannot see B on search; direct URL shows not public |

## 3. Pets & photos

| Step | Actor | Expected |
|------|-------|----------|
| User A lists pet as public | A | User B sees pet on `/find-pets` and pet page |
| User A sets pet `is_public = false` | A | User B gets 404 / not listed |
| Set `pet_photos.is_approved = false` on A's photo (SQL) | — | Photo hidden on public pet page; owner still sees it |
| User B uploads to `pet-photos` path `B/petId/...` | B | OK |
| User B uploads to `A/...` path | B | Storage RLS denies |

## 4. Requests & bookings

| Step | Actor | Expected |
|------|-------|----------|
| User B sends care request to User A's pet | B | Success; `sender_id` = B's auth id |
| Tamper `senderId` in client to User A's id | B | Server rejects / RLS blocks insert |
| User A lists requests | A | Sees request; not other users' requests |
| User B lists requests | B | Sees only own threads |
| Accept request → booking | A or B | Both see booking; third user C does not |

## 5. Messages

| Step | Actor | Expected |
|------|-------|----------|
| Open conversation as participant | A or B | Messages visible |
| User C queries `messages` for A–B conversation id | C | Empty / RLS denied |
| Rapid-send 70+ messages in 1 minute | B | Rate limit message shown |

## 6. Memberships & payments

| Step | Actor | Expected |
|------|-------|----------|
| User B `insert` into `user_memberships` via client | B | RLS denied |
| Complete Stripe checkout | B | Webhook (service role) creates row; B sees own membership |
| User B reads User A `user_memberships` | B | Denied |

## 7. API routes

| Step | Actor | Expected |
|------|-------|----------|
| `POST /api/stripe/create-checkout-session` with another user's `userId` | B | 403 User mismatch |
| `GET /api/pets/{publicPetId}/booked-dates` | anon | Dates only, no PII |
| `POST /api/emails/send` without `x-email-internal-secret` | — | 401 |

## 8. Storage limits

| Step | Actor | Expected |
|------|-------|----------|
| Upload 4 MB avatar | A | Client validation error (3 MB max) |
| Upload `.gif` to avatars | A | Rejected (jpg/png/webp only) |

## 9. Error messages

| Step | Actor | Expected |
|------|-------|----------|
| Trigger invalid request (e.g. blocked user) | B | Friendly message; no raw Postgres text in production UI |

## 10. Environment

Confirm `.env.local` has **no** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or `RESEND_API_KEY` prefixed with `NEXT_PUBLIC_`.
