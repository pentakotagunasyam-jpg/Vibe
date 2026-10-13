VIBE / musicvibe2 integration

Files: settings1.html, theme.html, profile.html, notification.html, Index-4.html, vibe-settings.js, Stylel.css, player.css.

The shared JavaScript reuses the Supabase project URL and publishable key already present in Index-4.html and writes settings JSON and profile images into the EXISTING Storage bucket named `musicvibe2`, under `vibe-settings/<browser-id>/`. No new bucket or database table is created.

Important: Supabase Storage must allow the required download/upload operations for this app's users. If the bucket is private, use appropriate authenticated Storage policies; the supplied login page does not currently implement Supabase Auth, so this sample uses a browser-specific ID and is not secure user authentication. Do not expose sensitive personal information in a public bucket.

Put all files in the same folder and open/serve Index-4.html. For local testing, use a local web server rather than file://.
