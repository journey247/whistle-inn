# Provisioning owners

Stage 2 #7 of `AUTOMATION_PLAN.md`: one command gives a new owner a working site, and
one command keeps every site's database up to date.

Each owner gets their own Neon project and their own Vercel project, both built from
this repository's `main`. Nothing is shared between owners except the code and the
platform's Stripe and Resend accounts.

## Setup (once)

1. Copy `.env.provision.example` to `.env.provision.local` (gitignored) and fill it in:
   - **Vercel:** a token with access to the team, and the team id.
   - **Neon:** an API key.
   - **Resend:** the platform API key, and a default sender on a verified domain.
   - **Stripe:** the *platform* account's keys. Each owner later connects their own
     account in the admin panel.
2. Make sure the Vercel GitHub app can see `PROVISION_GIT_REPO`.

The scripts read only `PROVISION_`-prefixed names for shared keys. The site's own `.env`
holds the Whistle Inn's keys, which Prisma loads into every script, so plain names
like `STRIPE_SECRET_KEY` would silently copy them into a new owner's site.

## Provision an owner

Always do a dry run first. It creates nothing and shows the full plan, with secrets masked:

```bash
npm run provision -- --id pine-lodge --name "Pine Lodge" --owner-name "Sam Rivera" --owner-email sam@example.com --phone "(530) 555-0142" --domain pinelodge.com --dry-run
```

Then run the same command without `--dry-run`. In order, it:

1. creates the Neon project `stay-pine-lodge` and applies every migration;
2. seeds the property profile and the owner's admin account. The profile is the neutral
   template plus the owner's name and contact details, so the site never shows another
   owner's property. The admin account gets a random password nobody knows;
3. creates two Stripe webhook endpoints on the platform account, one for its own events
   and one for Connect events;
4. creates the Vercel project with its full environment. That environment includes
   fresh secrets, `ADMIN_REQUIRE_2FA=true` and `NEXT_PUBLIC_PROPERTY_ID=template`;
5. adds the domain and prints the DNS records it needs;
6. creates and connects a Blob store for photo uploads;
7. deploys `main` to production and checks `/api/settings/public` responds;
8. emails the owner a password-setup link. This is the password-reset email, and the
   link is valid for 1 hour.

It refuses to run if the Vercel project already exists. If a step fails, it stops and
lists what it had created, so you can delete those and run it again.

### After provisioning

- **The owner** sets a password from the email, sets up 2FA at first sign-in, then works
  through **Settings → Property**. Until they finish, the site is kept out of search
  results.
- **Online checkout** stays paused until the launch gate opens. The gate needs permits,
  occupancy tax turned on, and the owner's Stripe account able to take charges. Until
  then guests send requests the owner approves.
- **Expired invite:** if the link expires, or the domain's DNS wasn't ready when it was
  sent, resend it:

  ```bash
  npm run fleet -- invite pine-lodge
  ```

## Run the fleet

```bash
npm run fleet -- list
npm run fleet -- health
npm run fleet -- migrate --dry-run
npm run fleet -- migrate
```

- `health` shows, for every site, its latest production deployment, whether the site
  answers and how fast, and whether its database has pending migrations.
- `migrate` applies pending migrations site by site, and stops at the first failure so
  a bad migration can't roll across every owner.

Sites are the Vercel projects named with `PROVISION_PROJECT_PREFIX`, plus those listed
in `FLEET_EXTRA_PROJECTS`. Each site's database URL is read from its own Vercel
environment, so there's no separate list of owners to keep up to date.

## Known gaps

- **Homepage copy** still has the Whistle Inn's text as fallbacks: the hero, the
  skiing, fishing and train sections. A new owner should edit that in
  **Settings → Website** before launch. Making it per-property is the next step.
- **No invite email of its own:** the owner receives the password-reset email.
- **Owner billing** (Stage 2 #8) isn't set up by this script.
