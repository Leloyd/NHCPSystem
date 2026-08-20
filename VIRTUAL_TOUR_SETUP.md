# Virtual Tour admin setup

This guide connects the Virtual Tour admin module to Supabase Storage and,
optionally, ElevenLabs narration. Complete the sections in order.

## Before you begin

You need:

- access to the Supabase project used by this website;
- access to the website's Vercel project;
- an ElevenLabs account only if automatic voice-over generation is required;
- the latest application code deployed, including `virtual_tour_tables.sql` and
  the Virtual Tour importer.

Do not paste secret keys into source files, Git commits, screenshots, email, or
chat. Store them only in a local ignored `.env` file and in Vercel Environment
Variables.

## 1. Create the Virtual Tour database tables

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and sign in.
2. Select the Supabase project already used by this NHCP website. Check the
   project name carefully; running the SQL in another project will not configure
   the deployed application.
3. In the left sidebar, click **SQL Editor**.
4. Click **New query**.
5. In this repository, open `virtual_tour_tables.sql`.
6. Select all of that file's contents and copy them.
7. Paste the complete SQL into the Supabase query editor.
8. Click **Run**, or press **Ctrl+Enter**/**Cmd+Enter**.
9. Wait for the success result. A result such as "Success. No rows returned" is
   normal because this script creates database objects instead of returning data.

The script is designed to be safe to run again when upgrading an existing setup.
Do not run only a selected part of it unless you understand the table and
function dependencies.

### Verify the database

1. In Supabase, open **Table Editor**.
2. Confirm these four tables exist under the `public` schema:
   - `virtual_tours`
   - `virtual_tour_revisions`
   - `virtual_tour_scenes`
   - `virtual_tour_hotspots`
3. Return to **SQL Editor**, open a new query, and run:

   ```sql
   select routine_name
   from information_schema.routines
   where routine_schema = 'public'
     and routine_name in (
       'publish_virtual_tour_revision',
       'set_virtual_tour_start_scene'
     )
   order by routine_name;
   ```

4. The result should contain both function names.

The tables use Row Level Security without public policies. This is intentional:
public visitors receive sanitized tour configuration from Flask, while database
writes occur only through authenticated admin routes using the server secret.

Supabase's current SQL Editor workflow is documented in
[Database Functions](https://supabase.com/docs/guides/database/functions).

## 2. Create the private Storage bucket

1. In the same Supabase project, click **Storage** in the left sidebar.
2. Click **New bucket**. Depending on the dashboard layout, this may appear as
   **Create bucket**.
3. Enter this exact bucket name:

   ```text
   nhcp-virtual-tours
   ```

4. Keep **Public bucket** switched **off**. The bucket must be private.
5. Set **File size limit** to **30 MB** or lower.
6. Leave **Allowed MIME types** empty/all types. The module stores several kinds
   of validated content in this one bucket:
   - JPEG, PNG, and WebP images;
   - GLB 3D models;
   - MP3, WAV, OGG, and M4A audio.

   Selecting an "images only" restriction would break GLB and voice-over uploads.
7. Click **Create bucket**.

If the bucket already exists, open it, use its settings/configuration menu, and
verify that it is private and has the correct file-size limit.

You do not need to make the bucket public or add an anonymous upload policy. The
Flask server creates short-lived signed upload tokens, and published assets are
served with time-limited signed download URLs. Supabase documents bucket privacy
and signed access in [Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
and confirms that signed-token uploads require no Storage object policy in
[Upload to a signed URL](https://supabase.com/docs/reference/python/storage-from-uploadtosignedurl).

## 3. Copy the Supabase URL and API keys

Keep the Vercel Environment Variables page ready in another tab, but do not share
the copied keys anywhere else.

### Copy the project URL

1. In Supabase, click **Connect** near the top of the project dashboard.
2. Copy the **Project URL**, which resembles:

   ```text
   https://your-project-reference.supabase.co
   ```

3. This will become `SUPABASE_URL`.

If the Connect dialog is unavailable, open **Project Settings → API Keys** and
copy the project URL shown there.

### Copy the browser-safe publishable key

1. Open **Project Settings → API Keys**.
2. Open the **Publishable and secret API keys** tab.
3. If the project does not have the new keys, click **Create new API keys**.
4. Under **Publishable key**, copy the value beginning with
   `sb_publishable_`.
5. This will become `SUPABASE_PUBLISHABLE_KEY`.

For an older Supabase project, the legacy `anon` key can be used as the value of
`SUPABASE_PUBLISHABLE_KEY`, but the new publishable key is preferred.

The publishable key is browser-safe and is used only after an authenticated NHCP
admin requests a signed upload. It is not the key that grants full database
access.

### Copy the server secret key

1. On the same **API Keys** page, find **Secret keys**.
2. Reveal/copy the `sb_secret_...` value. Supabase may ask you to confirm your
   password.
3. Store this value under the variable name:

   ```text
   SUPABASE_SERVICE_ROLE_KEY
   ```

The environment-variable name is retained for compatibility with this codebase;
its value may be Supabase's newer `sb_secret_...` key. For an older project, the
legacy `service_role` key also works, but Supabase recommends migrating to the
new secret keys.

This key bypasses Row Level Security. It must never be placed in HTML,
JavaScript, `Landing.html`, `VirtualTour.html`, or any other committed file.
Supabase explains the new key types in
[Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys).

## 4. Configure ElevenLabs narration (optional)

Skip this section if administrators will always upload their own audio. Scene,
hotspot, image, GLB, subtitle, and manual audio features work without ElevenLabs.

### Add the requested voice

1. Open [ElevenLabs](https://elevenlabs.io/app) and sign in.
2. In the left sidebar, click **Voices**.
3. Open **Explore** or **Voice Library**.
4. Search for **Maria - Soothing, Gentle and Clear**.
5. Play its preview to confirm it is the intended voice.
6. Click the **+**/**Add to My Voices** control.
7. Open **My Voices**.
8. Find Maria, click **More actions** (the three-dot menu), and click
   **Copy voice ID**.
9. Save that ID as `ELEVENLABS_VOICE_ID`. Copy the ID, not the display name.

Voice Library availability can change. If that exact Maria voice is unavailable,
choose another female multilingual voice, add it to **My Voices**, and copy its
voice ID using the same steps. Voice Library voices are not available through the
API on the ElevenLabs free tier; a plan that permits API use of the selected voice
may be required. See the current [Voice Library guide](https://elevenlabs.io/docs/eleven-creative/voices/voice-library).

### Create an API key

1. In ElevenLabs, click **Developers** in the left sidebar.
2. Select the **API Keys** tab.
3. Click **Create API Key**.
4. Give it a recognizable name such as `NHCP Virtual Tour Production`.
5. Keep the key restricted and enable **Text to Speech** permission. A monthly
   credit/character limit is recommended to prevent unexpected usage.
6. Create the key and copy it immediately. ElevenLabs displays the complete key
   only once.
7. Save it as `ELEVENLABS_API_KEY`.

Never put this API key in browser code. This application sends narration requests
from Flask on the server. See ElevenLabs'
[API key security guide](https://elevenlabs.io/docs/overview/administration/workspaces/api-keys).

Use this model ID:

```text
eleven_multilingual_v2
```

It supports both English and Filipino and is used as
`ELEVENLABS_MODEL_ID`. The current model list is available in the
[ElevenLabs models documentation](https://elevenlabs.io/docs/overview/models).

## 5. Add the variables to Vercel

1. Open [Vercel Dashboard](https://vercel.com/dashboard) and sign in.
2. Use the team/account switcher to select the owner of the deployed NHCP site.
3. Open the NHCP project.
4. Click **Settings**.
5. Click **Environment Variables**.
6. Click **Add Environment Variable** and add each entry below.

### Required variables

| Name | Value | Secret? |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase Project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase `sb_secret_...` or legacy `service_role` key | **Yes** |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase `sb_publishable_...` or legacy `anon` key | No |
| `SUPABASE_VIRTUAL_TOUR_BUCKET` | `nhcp-virtual-tours` | No |
| `VIRTUAL_TOUR_SIGNED_URL_SECONDS` | `7200` | No |

### Optional narration variables

| Name | Value | Secret? |
| --- | --- | --- |
| `ELEVENLABS_API_KEY` | The ElevenLabs API key | **Yes** |
| `ELEVENLABS_VOICE_ID` | The copied Maria/selected voice ID | No |
| `ELEVENLABS_MODEL_ID` | `eleven_multilingual_v2` | No |

For each variable:

1. Enter the name exactly as shown; environment-variable names are
   case-sensitive.
2. Paste only the value. Do not include quotation marks or `NAME=` in the value
   field.
3. Select **Production**. Select **Preview** too only if preview deployments
   should use this same production Supabase database and Storage bucket.
4. Mark the Supabase server secret and ElevenLabs API key as sensitive when
   Vercel offers that option.
5. Click **Save**.

Environment-variable changes do not affect an existing deployment. Vercel applies
them only to a new deployment, as described in
[Vercel Environment Variables](https://vercel.com/docs/environment-variables).

## 6. Redeploy the application

If the latest code, including the yaw normalization fix, has not been pushed yet,
commit and push it before redeploying.

1. In the Vercel project, click **Deployments**.
2. Find the latest deployment from the `main` branch.
3. Click its three-dot menu.
4. Click **Redeploy**.
5. Keep **Use existing Build Cache** enabled unless you are diagnosing a
   dependency-installation issue.
6. Confirm the redeployment.
7. Wait until the deployment status becomes **Ready**.

If Vercel shows a banner after saving the environment variables, its **Redeploy**
button performs the same operation.

## 7. Configure local development (optional)

For local testing, create or update `.env` in the repository root. This project
already ignores `.env`; never force-add it to Git.

```env
SUPABASE_URL=https://your-project-reference.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_secret_key
SUPABASE_PUBLISHABLE_KEY=your_browser_safe_publishable_key
SUPABASE_VIRTUAL_TOUR_BUCKET=nhcp-virtual-tours
VIRTUAL_TOUR_SIGNED_URL_SECONDS=7200

# Optional automatic narration
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_selected_voice_id
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

Restart Flask after changing `.env`; a running Python process does not reload
environment variables automatically.

## 8. Test the complete admin workflow

1. Open the deployed website and sign in to the admin dashboard.
2. Open **360° Virtual Tours**.
3. Confirm that the page no longer displays **Supabase is not configured** or
   **Setup required**.
4. On the Original card, click **Customize Original**.
5. Wait until the page reports that the Original scenes and hotspots are ready.
6. Click **Import as editable draft**.
7. The import should create the private database draft and redirect to the full
   editor. It does not change the public Original yet.
8. Confirm the editor shows:
   - the scene library;
   - **Add** scene;
   - **Replace 360°**, **Set as start**, and **Delete** scene controls;
   - **Item hotspot** and **Navigation** controls;
   - Edit and delete controls on existing hotspots.
9. Open one scene and confirm its panorama loads in Pannellum.
10. Add or edit a test hotspot. Save it, but do not publish until its content and
    navigation have been reviewed.
11. For automatic voice-over, save an item hotspot with subtitle text, then use
    **Generate EN voice** or **Generate TL voice** on its hotspot card.
12. When the draft is ready, click **Publish** and confirm the publication dialog.
13. Open the public **Interactive** page, choose the environment, and test it on
    both desktop and mobile.

The protected packaged Original remains available when the database is not
configured, when no Original override has been published, or after an admin uses
**Revert Original**.

## Panorama requirements

Uploaded panorama scenes must meet all of these requirements:

- JPEG, PNG, or WebP;
- a full equirectangular panorama with a `2:1` aspect ratio;
- at least `2048 × 1024` pixels;
- no larger than `4096 × 2048` pixels;
- no larger than the configured upload limit;
- decodable and loadable by the browser/Pannellum preview.

The server downloads and validates the actual stored file before accepting it;
changing a filename extension does not bypass validation.

## Common errors

### `Supabase is not fully configured`

- Confirm `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` exist in Vercel.
- Confirm they were added to **Production**.
- Redeploy after saving them.

### `Direct upload is not configured`

- Add `SUPABASE_PUBLISHABLE_KEY`.
- Make sure it contains the publishable/anon key, not the server secret.
- Redeploy and refresh the admin editor.

### `relation ... does not exist` or `function ... does not exist`

- Run the complete `virtual_tour_tables.sql` file in the same Supabase project
  identified by `SUPABASE_URL`.

### `Bucket not found`

- Confirm the bucket is named exactly `nhcp-virtual-tours`.
- Confirm `SUPABASE_VIRTUAL_TOUR_BUCKET` uses that exact name.
- Confirm the bucket and tables are in the same Supabase project.

### Upload receives `401`, `403`, or an RLS error

- Confirm the server uses the secret/service-role key and the browser uses the
  publishable key; do not swap them.
- Confirm the bucket is still private and was not renamed.
- Do not create a public anonymous policy as a workaround.

### `Yaw must be between -180 and 180`

- Deploy the latest importer fix, then retry **Import as editable draft**.
- Equivalent packaged angles such as `248°` and `-200°` are normalized by the
  latest server code without moving the hotspots.

### ElevenLabs returns `401` or `403`

- Confirm the API key is correct and has **Text to Speech** permission.
- Confirm the selected voice is available to the account through the API.
- Confirm the account has sufficient credits and a plan that supports API use of
  Voice Library voices.
- After replacing the key, redeploy before trying again.

### ElevenLabs says the voice was not found

- Return to **Voices → My Voices**.
- Use the voice's three-dot menu and copy its current voice ID again.
- Update `ELEVENLABS_VOICE_ID` in Vercel and redeploy.

## Privacy and lifecycle behavior

- Draft and archived assets remain in the private bucket.
- Public tour pages receive signed asset URLs rather than public bucket URLs.
- `VIRTUAL_TOUR_SIGNED_URL_SECONDS=7200` makes a generated asset URL usable for
  two hours.
- Archiving removes an environment from new public requests immediately. A URL
  already issued to an open visitor session remains usable only until it expires.
- **Revert Original** deletes the database-backed Original override and restores
  the protected packaged scenes and hotspots as the public Original.
