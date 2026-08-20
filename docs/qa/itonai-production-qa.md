# itonai.io production QA

**Tested:** 19 August 2026  
**How:** live browser pass on [itonai.io](https://itonai.io)  
**Accounts:** a new signup (`בודק QA`) and a walkthrough of an existing edition

This report describes problems found while using the production site as a new user. The app is a personal Hebrew newspaper: you talk to an AI reporter, it writes a story, and that story becomes your daily edition.

---

## Summary

The main user journey is broken for a new account. After signup, the homepage asks you to start your first interview. In the interview room, the button **נסחו טיוטה** (write a draft) on an empty chat creates a refusal article (“without a transcript there is no story”). Then the chat is locked. Publishing that draft fails with a generic error. There is no way to throw the interview away and start again. Saving as a draft sends you home, and the homepage still looks empty.

The most serious security problem is on the login page: email and password are already filled in with a real-looking account. Anyone who opens `/login` can sign in as that user.

**What worked well:** the Hebrew right-to-left layout is consistent. Empty-state copy on the homepage is clear. Adding, editing, and deleting a fact in **karteset** (the background file) works. The 404 page is well written. Sign-out returns you to login. A duplicate email with the wrong password correctly says the email is already registered.

---

## 1. Bugs

### Critical

**Login shows a working account.**  
The login form is pre-filled with `omer@example.com` and the password `iton-dev`. Anyone who opens the login page can enter that account. This should never happen in production.

**Signup can log you into someone else’s account.**  
If you try to register with that same email and the matching password, the app does not say “this email is already registered.” It signs you in as that existing user.

**Empty interview becomes a locked “ready” draft.**  
If you click **נסחו טיוטה** before writing anything, the reporter writes a meta-article that says there is no transcript. Then the interview closes. The text box is disabled. Suggested opening lines still look clickable, but they do nothing.

**Publish fails and leaves you stuck.**  
**פרסמו במהדורה** (publish in the edition) on that draft fails. The message is only “something went wrong at the editor’s desk.” There is no retry, no discard, and no clear next step.

**A saved draft disappears from the homepage.**  
The empty edition always wins. After **שמרו כטיוטה** (save as draft), you return to a homepage that still says you have no draft. There is no “continue draft” path.

### Serious

**Passwords are too weak.**  
The password `1` is accepted. There is no strength check, no “type it again” field, no email confirmation, and no “forgot password” link.

**Every story shows a fake image.**  
Articles include a grey box labelled “place for an image / placeholder” and a caption that says a real caption will appear when you upload a photo. Readers see this as unfinished newspaper, not as a product.

**Interview times and labels are messy.**  
Times appear as raw ISO text, for example `2026-08-19T13:33:08.541Z`. The close control shows two labels stuck together: “סגירה וחזרה לעיתוןסגירה”. Grammar is also wrong: “1 עובדות נעולות” (should match singular/plural).

### Smaller bugs

**Archive and empty copy do not match reality.**  
A published story exists, but the archive still says there are no interviews. A returning user still sees “the reporter is waiting for the first interview.”

**Story pages are weak for sharing and SEO.**  
The browser tab title is always “העיתון”. The breadcrumb shows “ידיעה 1” (an internal id), not the headline. The “angle” line (`זווית: …`) is newsroom language that readers do not need.

**Forms keep stale or empty data.**  
Every karteset fact says “recorded just now.” An empty name is sent to the server. After a signup error (“this email is already registered”), the message stays on screen even after you change the email.

---

## 2. Features that do not work

These look finished in the UI, but they fail when you use them.

**Publish** is the main reward of the product, and it can fail with a server error on a draft that the UI already called “ready.”

**Manual edit** of the draft is visible but always disabled. Users cannot fix the text before publishing.

**Interview reminder** shows a fake time (“every day at 21:00”). There is no time picker, and there is no sign that anyone actually receives a reminder.

**Circle search** claims you can search by name, email, or phone. Searching for `omer` and `עומר` returned no readers. You can still send an invite from a typed name with no matched user and no email or phone confirmation.

**Edition name** is shown in profile settings but cannot be changed.

**Notifications** appear as a toggle in the invite dialog, but there is no notification centre in the app, so the toggle has nothing to connect to.

**Edition tag** (`תג מהדורה`) is the only profile setting that clearly works.

These items are in the interface but are still placeholders:

- story images and captions
- manual draft editing
- share-invite link
- resend invitation
- list of sent invitations
- edit profile

**שולחן העורכים פתוח** (“the editor’s desk is open”) looks like a status button. It is only a label. It never changes. **ראיון חי** (“live interview”) stays on even when the chat is locked and nothing is happening.

On karteset, the category **עבודה · 0** filters to a blank list with no empty-state message. On circle, the heading **מוצע מהראיונות שלך** (“suggested from your interviews”) appears with nothing under it.

---

## 3. Buttons that do nothing

| Control | Page | What happens |
| --- | --- | --- |
| עריכת פרטים | Profile | Looks like a button. Click does nothing. URL and screen stay the same. |
| שיתוף קישור הזמנה | Circle (empty) | Click does nothing. No share sheet, no copy to clipboard. |
| הזמנות שנשלחו | Circle | Button has no action. |
| שליחה חוזרת | Circle (pending invite) | Button has no action. |
| עריכה ידנית | Interview draft | Always shown as disabled. |
| שמרו כטיוטה | Interview | Goes home. Does not keep extra state. The empty homepage then hides the draft. |
| Suggested openers (for example “משהו קרה בעבודה”) | Interview after lock | Still look enabled. Clicks do nothing because the interview is closed. |
| שולחן העורכים פתוח | Masthead | Looks like a button. It is only text. |
| שם המהדורה | Profile settings | Looks like a setting you can change. The value is display-only. |

---

## 4. Inconvenient flows

### The first session is a trap

The product copy promises a simple path: tell the reporter what happened → answer follow-up questions → approve a draft.

The real path is harder. You land in a busy interview room. Type, tone, and a draft panel appear before any chat. The text box sits low on the page. **נסחו טיוטה** is easy to click and harmful on an empty chat. After that, you cannot leave in a clean way: publish is broken, and the homepage forgets the draft.

### Extra friction

- Every hard page change flashes a full-screen splash: “the editor’s desk is being prepared.” Opening a story does the same. For a moment it feels as if the app crashed.
- Login uses newspaper language (“open a new edition”) instead of a simple “sign up.” Signup and sign-in share one form. Pre-filled demo details make the site look like a test environment.
- Adding a connection puts search, relation, three privacy toggles, and a note into one dialog before you have found anyone. Send is already enabled from a typed name alone.
- Karteset starter chips insert a prefix such as “name, age and city: ” instead of a finished example. If you change the filter while editing, the edit UI disappears.

### What already feels good

RTL layout is consistent. Empty edition copy is clear. Karteset create / edit / delete of a fact worked. The circle dialog opens and closes. The 404 page (“this page was not published”) is one of the better screens. Sign-out from profile returns to `/login`. Duplicate email with a wrong password correctly says the email is already registered.

The reporter’s refusal to write from an empty chat is honest. The product then treats that refusal as a publishable “ready” story. Honesty without a way out is still a bug.

---

## 5. Places with too much text

**Login hero.** The tagline is a full sentence under a large masthead. That is fine once, but heavy for a form with only two fields.

**Circle invite dialog.** A four-line intro, then three toggles each with a title and a subtitle, plus a privacy note. The main action sits below the fold.

**Karteset intro.** After facts already exist, a long paragraph still explains that every fact goes into later interviews so the reporter will not ask again.

**Briefs intro.** A long sentence about small moments recorded by hour, for a list that may contain only one line.

**Story page.** Placeholder caption, angle line, standfirst, then a long body that repeats the same fact in several ways.

**Interview.** An empty-state essay, suggested openers, type, tone, draft placeholders, and a consent note — all before the user has typed a word.

**Empty front page.** Kicker, title, body, two buttons, empty flashes, and three “what could be here tomorrow” cards. One clear button would be enough.

---

## 6. Features users of this kind of app look for

This product is a personal newspaper / life journal with an AI reporter. People compare it to a diary, a family newspaper, or a simple publishing tool.

### Basic things people expect (missing)

- Edit or delete a published story
- Edit profile: name, photo, city, bio, password, email
- Change the edition name (it is shown, but not editable)
- Forgot password / magic link
- Sign in with Google, Apple, or phone
- Start over / discard an interview
- Edit the draft text before publish
- Upload a photo for a story
- Search the archive
- Share a story (link, WhatsApp, copy)
- Onboarding that is not “click the draft button that looks disabled”

### Next-step features for this product type (missing)

- Read someone else’s edition after they accept you
- Invite by a link that actually copies
- Push / email / WhatsApp reminder: “time to file today”
- Past editions by date, not only “today”
- Hide a story from the circle
- Voice input for the interview
- Export / print today’s paper
- Corrections after publish
- Family vs friends visibility per story
- English UI, or at least no English word “placeholder” in Hebrew copy
- A clear daily limit, explained before you waste it on a stuck session

---

## Notes by page

| Page | Verdict | Note |
| --- | --- | --- |
| `/login` | Unsafe | Demo credentials in production. No password recovery. Error messages stay too long. |
| `/` (empty) | Copy is fine, logic is wrong | Hides in-progress drafts. The empty call-to-action is otherwise clear. |
| `/` (with a story) | Unfinished | Same headline in ticker, lead, and flashes. Placeholder image. |
| `/story/:id` | Readable, not a full product | No edit, share, or real image. Internal id in the breadcrumb. |
| `/briefs` | Thin | One duplicate of the lead. Intro is longer than the list. |
| `/karteset` | Works | Creating, editing, and deleting facts was the most complete feature in this test. |
| `/circle` | Shell | Empty state plus a dead share button. Invite dialog is too large. |
| `/profile` | Mostly display | Dead edit button. Stats. One real toggle. Empty archive. |
| `/interview` | Broken happy path | ISO times, lock after empty draft, failed publish. |
| Unknown URL | Good | 404 copy matches the newspaper voice and offers a way home. |

---

## What to fix first

1. Remove demo credentials from production login.
2. Do not treat an empty-chat draft as “ready.”
3. Add a way to discard an interview and start again.
4. Show an open draft on the empty homepage.
5. Make **עריכת פרטים** work, or remove the button.
6. Hide placeholder images until a real photo exists.

After those changes, the newspaper idea has a chance to feel like a real product.
