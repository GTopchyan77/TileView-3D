# Database Setup

## Supabase Setup

1. Create a new Supabase project.
2. Open the SQL editor in Supabase.
3. Run the migration from:
   - `supabase/migrations/001_initial_schema.sql`

## Storage Bucket

Create a public storage bucket named:

- `tile-images`

This demo currently assumes the bucket is public so uploaded tile images can be used directly in the frontend.

## Local Environment Variables

Create a local `.env.local` file using:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Only use the anon key in the frontend.
Do not use a `service_role` key in the browser.

## Vercel Environment Variables

Add the same values in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Test Admin Cloud Save

1. Start the app locally.
2. Open `/admin`.
3. Import a tile locally.
4. Click `Save to Cloud`.
5. Confirm a tile record appears in the `tiles` table.
6. Confirm the uploaded image appears in the `tile-images` bucket.
7. Refresh the app and confirm the cloud tile appears in the merged catalog.

## Test Scene Save / Load

1. Open the main visualizer.
2. Change room type, surface tiles, and object transforms.
3. Click `Save Scene to Cloud`.
4. Confirm a record appears in the `scenes` table.
5. Click `Load Latest Cloud Scene`.
6. Confirm the last saved room state is restored.

## Security Notes

- This setup is simplified for demo use.
- Row Level Security policies in the migration are intentionally permissive for quick testing.
- Before production, RLS policies must be hardened and scoped properly.
- Do not commit real environment variable values.
