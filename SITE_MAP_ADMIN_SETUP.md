# Site Map Manager setup

The public Site Map has two sources:

1. **Protected Original** — the files in `static/data/site-map-hotspots.json`, `static/data/tour-minimap.json`, and `static/images/site-map/`.
2. **Published database override** — the current published revision in Supabase.

If no published database revision exists, or an administrator selects **Revert**, visitors automatically receive the protected Original. There is no public Site Map selector or loadout.

## Database

Run the complete [`site_map_tables.sql`](site_map_tables.sql) file in the Supabase SQL editor. It is safe to run again after updates.

The application uses the existing Supabase service-role connection and the same private Storage bucket used by the Virtual Tour Manager (`SUPABASE_VIRTUAL_TOUR_BUCKET`, default `nhcp-virtual-tours`). Browser uploads require `SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_ANON_KEY`.

## Admin workflow

1. Open **Admin → Site Map**.
2. Choose **Customize Original** to copy the packaged Site Map into the first database draft.
3. Upload/replace the aerial image, 2:1 equirectangular 360° image, and English/Tagalog starting narration as needed.
4. Add or edit hotspots. A hotspot can appear in the aerial view, the 360° view, or both. Use **Same hotspot in both views** when both pins represent the same modal content.
5. Save the draft, then publish it. Saving alone never changes the visitor experience.
6. Use **Revert** to delete the database override and uploaded Site Map assets and immediately restore the protected Original.

## Hotspot fields

- English and Tagalog title and description
- Category, enabled state, and regular/main-landmark marker design
- Normalized aerial coordinates and 360° pitch/yaw placement
- Relationship between the aerial and 360° pin
- Optional modal photo and accessible alternative text
- Optional English and Tagalog hotspot narration
- Optional Virtual Tour scene destination
- Optional bilingual custom button and internal/external URL

The editor also supports search, duplicate/delete, default opening view, initial 360° camera direction, and whether hotspots start visible.
