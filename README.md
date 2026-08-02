# IDGS Designer Profile Scraper

This Apify Actor:

1. Opens The Expert's `Find an Expert` directory.
2. Discovers designer profile URLs.
3. Visits each profile.
4. Writes one dataset record per designer.

## Output fields

- `designer_name`
- `firm_name`
- `location`
- `designer_bio`
- `the_expert_profile_url`
- `instagram_url`
- `instagram_handle`
- `website_url`
- `page_title`
- `page_description`
- `source_website`
- `scraped_at`

## Install in the existing Apify Actor

Replace these files in the Apify Source editor:

- `package.json`
- `Dockerfile`
- `.actor/actor.json`
- `.actor/input_schema.json`
- `src/main.js`
- `src/routes.js`

Create and paste:

- `src/extract.js`
- `src/utils.js`

Then click **Build**, wait for a successful build, and click **Start**.

## First test

Set `Maximum profiles` to `5`. After the test succeeds, set it to `0` to process all discovered profiles.

## Notes

The actor intentionally does not download images. Empty metadata fields remain `null`.
