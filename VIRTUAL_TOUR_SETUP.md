# Virtual Tour admin setup

1. Run `virtual_tour_tables.sql` in the Supabase SQL editor.
2. Create a **private** Supabase Storage bucket named `nhcp-virtual-tours`.
   Set its file-size limit to **30 MB or lower** so oversized direct uploads
   are rejected before the server performs content validation. Draft and
   archived assets stay private; published pages receive time-limited URLs.

   To use another bucket name or URL lifetime, set:

   ```env
   SUPABASE_VIRTUAL_TOUR_BUCKET=nhcp-virtual-tours
   VIRTUAL_TOUR_SIGNED_URL_SECONDS=7200
   ```
3. Add a browser-safe Supabase key for direct signed uploads:

   ```env
   SUPABASE_PUBLISHABLE_KEY=your_publishable_or_anon_key
   ```

   Never expose `SUPABASE_SERVICE_ROLE_KEY`; it remains server-only.

4. For automatic narration, add:

   ```env
   ELEVENLABS_API_KEY=your_server_side_key
   ELEVENLABS_VOICE_ID=the_voice_id_copied_from_my_voices
   ELEVENLABS_MODEL_ID=eleven_multilingual_v2
   ```

   Add “Maria - Soothing, Gentle and Clear” to the ElevenLabs workspace and
   copy its exact voice ID. Display names are not stable API identifiers.

5. Redeploy after changing environment variables or Python dependencies.

The protected Original files remain the fallback when the database is not
configured, when no Original override has been published, or after an admin
uses **Revert Original**.

Archiving removes an environment from new public requests immediately. Any
asset URL already issued to an open visitor session remains usable only until
`VIRTUAL_TOUR_SIGNED_URL_SECONDS` expires (two hours by default).
