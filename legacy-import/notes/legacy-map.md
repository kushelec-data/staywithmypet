# StayWithMyPet legacy site map

Reference HTML lives under `legacy-import/` (copied from `reference-old-site/`). Use these files for **structure, copy, form field names, and navigation** — not Bootstrap CSS.

## All old pages found

| Original file | Clean import path | Saved? |
|---------------|-------------------|--------|
| `About _ Stay with my pet.html` | `public-pages/about.html` | Yes |
| `Contact Us _ Stay with my pet.html` | `public-pages/contact.html` | Yes |
| `Article _ Stay with my pet.html` | `public-pages/articles.html` | Yes |
| `How It Works _ Stay with my pet.html` | `public-pages/how-it-works.html` | Yes |
| *(dashboard — no HTML)* | `dashboard-pages/dashboard.html` | Stub only (`michael suvo Dashboard _ …_files/` assets only) |
| `Requests _ Stay with my pet.html` | `dashboard-pages/requests.html` | Yes |
| `Saved _ Stay with my pet.html` | `dashboard-pages/saved.html` | Yes |
| `Manage Membership _ Stay with my pet.html` | `dashboard-pages/membership.html` | Yes |
| `Chnage Password _ Stay with my pet.html` | `dashboard-pages/change-password.html` | Yes |
| `Profile _ Stay with my pet.html` | `profile-pages/profile.html` | Yes |
| `michael suvo's Gallery _ Stay with my pet.html` | `profile-pages/gallery.html` | Yes |
| `michael suvo's Preferences _ Stay with my pet.html` | `profile-pages/preferences.html` | Yes |
| `Search Pet _ Stay with my pet.html` | `search-pages/search-pets.html` | Yes |

Each saved page has a companion `*_files/` folder in `reference-old-site/` (CSS, JS, images). Those are **not** imported into the app.

---

## Public pages

### About (`about.html` → `/about`)

**Purpose:** Brand story — mission, founders/team, values, why choose us.

**Preserve:** Tagline “More love. Less loneliness”; mission copy (Pet Parents ↔ Pet Friends); stats “Pet Comes First”, “Community over numbers”; team (Gerly Kullamaa CEO, Kush Chadha COO); core values cards; why-choose grid.

**Forms:** None (auth modals in footer only).

---

### Contact (`contact.html` → `/contact`)

**Purpose:** Contact form + support info.

**Preserve fields:** `full_name`, `email`, `subject`, `message` (all required).

---

### Articles (`articles.html` → `/articles`)

**Purpose:** Blog index with cards linking to `/articles/{slug}`.

**Preserve:** Article titles, dates, read time, excerpts, slugs:

- `emergency-basics-every-pet-friend-should-know`
- `what-to-do-if-a-pet-gets-homesick`
- `how-to-prepare-your-home-for-a-visiting-pet`
- `pet-routines-that-keep-everyone-happy`
- `understanding-pet-body-language-what-your-pet-is-really-saying`
- `building-trust-as-a-pet-friend-how-to-make-a-great-first-impression`

---

### How It Works (`how-it-works.html` → `/how-it-works`)

**Purpose:** Explains Pet Parent vs Pet Friend flows, steps, FAQs.

**Preserve:** Dual-audience messaging, step cards, CTA to sign up / search.

---

## Dashboard & account (header + sidebar)

**Logged-in header (all account pages):** Requests (bell) → `/requests`, Saved (heart) → `/saved`, My Account → `/dashboard`, Logout.

**Account sidebar (profile-area pages):**

| Label | Legacy URL | Next.js route |
|-------|------------|---------------|
| Dashboard | `/dashboard` | `/dashboard` |
| Edit Profile | `/profile` | `/profile` |
| My Gallery | `/gallery` | `/gallery` |
| My Preference | `/my-preferences` | `/preferences` |
| Manage Membership | `/manage-subscription` | `/membership` |
| Search Pets | `/search/pet` | `/find-pets` |
| Change Password | `/change-password` | `/change-password` |
| Act as Pet Owner | POST `role=pet_owner` | UI toggle (demo) |

---

### Dashboard (`dashboard.html` stub → `/dashboard`)

**Purpose:** Account home (bookings overview, quick stats). **No full HTML export** — reconstruct from nav + booking UX.

**Preserve:** Welcome/summary, upcoming care, links to requests/saved/search.

---

### Requests (`requests.html` → `/requests`)

**Purpose:** Care request inbox — sent and received.

**Preserve sections:**

- “Requests I Sent”
- “Requests I Received”

**Card fields (when populated):** pet/user name, dates, status badges (`pending`, `approved`, `rejected`), action buttons.

**API pattern:** List + status updates (legacy Laravel routes).

---

### Saved (`saved.html` → `/saved`)

**Purpose:** Favorited pets and Pet Friends.

**Preserve:** Title “My Saved Pets & Pet Friends”; empty state; heart toggle via `POST /save-pet/{id}` and `POST /save-user/{id}`.

---

### Manage Membership (`membership.html` → `/membership`)

**Purpose:** Subscription plans for **Pet Owner** and **Pet Friend (borrower)** roles.

**Preserve:** Role toggle; plan cards with `plan_id` on subscribe:

**Pet Owner:** One Time (€12, plan 6), 3 Month €49 (plan 2), 1 Year €249 (plan 1).

**Pet Friend:** One Time €12 (plan 6), 3 Month €49, 1 Year €249 — feature bullets per card.

**Forms:** `POST /manage-subscription/subscribe` + hidden `plan_id`.

---

### Change Password (`change-password.html` → `/change-password`)

**Purpose:** Update account password (with account sidebar).

**Preserve fields:** `user_current_password`, `user_new_password`, `user_confirm_password`.

---

## Profile area

### Profile (`profile.html` → `/profile`)

**Purpose:** Basic identity + address + languages + bio; profile photo upload.

**Preserve fields:**

- `profile_picture`, `cropped_profile_picture`
- `username` (readonly), `first_name`, `last_name`, `age`, `dob`
- `street_address`, `latitude`, `longitude`, `apartment`, `postal_code`, `region`, `country`
- `email`, phone (intl), `languages[]`, `other_language`, `bio`
- POST `/profile/update/basic`

**Sidebar:** Photo, display name, menu, role switch.

---

### Gallery (`gallery.html` → `/gallery`)

**Purpose:** Public profile photos (up to 6).

**Preserve:** “Your Gallery” copy; “Edit Gallery” → `/edit-gallery` (future); upload slots.

---

### Preferences (`preferences.html` → `/preferences`)

**Purpose:** Pet Friend care preferences for matching.

**Pet comfort:** `pet_types[]`, `pet_sizes[]`, `experience`, `previously_borrowed[]`, `care_conditions[]`

**Home environment:** `home_type`, `has_other_pets`, `has_children`, `has_garden`, `has_nearby_park`

**Availability:** `custom_dates`, `care_location`, `care_types[]`, `availability_notes`

---

## Search

### Search Pets (`search-pets.html` → `/find-pets`)

**Purpose:** Filter Pet Friends / listings on map or grid.

**Preserve filters:**

- `search`, `availability_start`, `availability_end`
- `location`, `pet_latitude`, `pet_longitude`
- `pet_type[]`, `breed[]`, `size[]` (Small/Medium/Large)
- `energy_level[]`, `temperament[]`, `medication`
- `walk_needs[]`, `service[]` (borrower/owner/both)
- `care_type[]`, `languages[]`

**Legacy URL:** `/search/pet?pet_latitude=…&pet_longitude=…`

---

## Auth modals (many pages)

**Signup:** `full_name`, `email`, `password` → OTP `otp`

**Login:** `email`, `password` → optional OTP step

**Forgot password:** `email`

**Next.js:** `/signup`, `/login` (already exist).

---

## Asset folders (reference only)

| Folder | Use |
|--------|-----|
| `legacy-import/forms/` | Reserved for extracted form snippets |
| `legacy-import/assets/`, `images/`, `styles/`, `scripts/` | Reserved; do not ship Bootstrap to production |

---

## Modern frontend mapping summary

| Route | Source of truth |
|-------|-----------------|
| `/` | Home (marketing) |
| `/about` | `public-pages/about.html` |
| `/contact` | `public-pages/contact.html` |
| `/articles` | `public-pages/articles.html` |
| `/how-it-works` | `public-pages/how-it-works.html` |
| `/find-pets` | `search-pages/search-pets.html` |
| `/dashboard` | Sidebar + stub `dashboard.html` |
| `/requests` | `dashboard-pages/requests.html` |
| `/saved` | `dashboard-pages/saved.html` |
| `/membership` | `dashboard-pages/membership.html` |
| `/change-password` | `dashboard-pages/change-password.html` |
| `/profile` | `profile-pages/profile.html` |
| `/gallery` | `profile-pages/gallery.html` |
| `/preferences` | `profile-pages/preferences.html` |
| `/login`, `/signup` | Auth modals in legacy footers |

Implementation: `src/lib/legacy/*` + `DashboardShell` + Tailwind UI; logo `/logo.png`; warm pink/cream/mint palette.
