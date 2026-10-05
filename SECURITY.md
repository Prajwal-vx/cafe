# Security notes

## Application profile

This repository is a client-only static site. It has no backend, authentication, authorization, database, upload endpoint, webhook, payment flow, or server-side secret. Cafe content is checked into `data.js`; favorites and theme choice are stored in the visitor's browser.

## Changes made

- Cafe text is HTML-escaped before rendering; cafe image URLs are limited to HTTPS `images.unsplash.com` URLs, and identifiers are restricted to simple lowercase keys.
- Saved favorites are limited to known cafe identifiers and deduplicated. Invalid favorite changes are ignored.
- Toast content is written as text nodes.
- The roulette celebration is drawn locally, removing the page's third-party JavaScript dependency.
- Local storage failures for preferences are handled without breaking the UI.
- Inline event handlers and style attributes were removed. Both HTML pages now set a restrictive CSP; `_headers` adds `frame-ancestors` and the other response headers on compatible hosts.
- A visitor-facing [privacy notice](privacy.html) describes local storage and third-party requests.

## Hosting requirements

`_headers` is ready for static hosts that support this convention, including Cloudflare Pages and Netlify. It cannot enable HTTPS or configure a host that ignores `_headers`. The repository's Git remote is GitHub, but the deployed platform and domain are not recorded, so deployment of these response headers and HTTPS could not be confirmed. If the site is served directly by GitHub Pages, use a host or proxy that supports response headers to enforce HSTS and `frame-ancestors`; the CSP meta policy still applies, except for `frame-ancestors`.

The CSP allows only local scripts and styles, Google Fonts styles/fonts, and Unsplash images. It uses no `unsafe-inline` allowance. The policy is included in both the index and privacy pages. HSTS is configured with a one-year max-age and no `includeSubDomains` because subdomain HTTPS coverage is unknown.

Google Fonts and Unsplash images remain external requests and can observe visitor IP address and request metadata. Opening a map sends the search query to Google Maps. The privacy notice explains these requests and browser-local preferences; it does not identify a data controller contact because no contact details are present in the project.

## Scope limits

There are no dependency manifests or lockfiles to audit. The unused Leaflet stylesheet was removed; Google Fonts and remote images remain externally hosted. The production host, domain, HTTPS certificate, and response-header behavior still need to be confirmed in the hosting account.
