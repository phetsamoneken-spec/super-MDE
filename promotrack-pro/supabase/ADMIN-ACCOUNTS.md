# Admin-managed MDE sign-ins

This implementation uses Supabase Auth Admin APIs only in `admin-mde-account`, with the server's built-in service-role environment binding. Each request verifies the caller's current Auth session and Admin profile. New sign-ins have a name, sign-in email, Admin-selected password, optional photo, and a required existing B1–B7 MDE group. Existing MDE passwords can be set by Admin. Admin credentials cannot be changed through this endpoint.

Deployment order:

1. Apply `migrations/20261107040000_admin_provision_account.sql` to the existing project. It adds a service-role-only function; it does not change existing accounts or outlet data.
2. Deploy `functions/admin-mde-account` to project `olvteqslbxwzifdfueug`: `supabase functions deploy admin-mde-account --project-ref olvteqslbxwzifdfueug --no-verify-jwt`. JWT verification is performed inside the handler with `auth.getUser`, before any privileged operation. Never expose a service-role key to the frontend.
3. In Supabase Authentication → Sign In / Providers, disable **Allow new users to sign up**. Admin `createUser` continues to work. The frontend sign-in screen has no public registration control.
4. Release the frontend only after deployment succeeds. Test using an explicitly designated test account; do not reset a colleague's password to test.

No invitation or confirmation email is sent by this feature. Admin communicates credentials independently. Passwords are kept only in temporary form state and sent over HTTPS to Supabase; they are never saved to profiles, localStorage or logs. Existing passwords cannot be viewed. The password form sets a new password; it does not forcibly terminate every existing access token.

If profile provisioning fails after Auth creation, the handler deletes the newly created Auth account and reports failure. Provisioning updates the profile and consumes any old pending email assignment in one transaction. Duplicate emails fail rather than resetting an existing password implicitly. Existing Admin/Sales profile editing and outlet RLS remain in effect.

Deployment was blocked on 2026-11-07: the configured management token returned HTTP 403 for both `edge_functions_read` and `edge_functions_write`. The server function and its frontend must remain unreleased until the token is updated in Environment Settings or an authorized operator deploys the function. Do not supply management tokens or service-role credentials in chat.
