# Koshi Province Cafe Explorer

A polished static web app for discovering coffee shops, cafés, and weekend hangout spots across all 14 districts of Koshi Province, Nepal. The experience includes district filtering, wishlist favorites, a weekend roulette, and a soft ambient soundscape.

## Features

- Explore curated cafés across all 14 districts of eastern Nepal
- Filter by district and vibe/mood
- Search by café name, area, specialty, or feature
- Save favorite cafés in local storage
- Open café details with contact, maps, and timings
- Spin a random “weekend roulette” picker with confetti
- Toggle a subtle generated café ambience using the Web Audio API
- Responsive layout for desktop, tablet, and mobile

## Tech Stack

- HTML5
- CSS3
- JavaScript (vanilla)
- Node.js (for testing only)

## Project Structure

```text
.
├── app.js                # main UI logic and interactions
├── data.js              # cafe data and district metadata
├── index.html           # app entry page
├── privacy.html         # privacy notice page
├── security.js          # sanitization and safety helpers
├── security.test.js     # Node security regression tests
├── style.css            # styling and responsive layout
├── README.md            # project documentation
├── SECURITY.md          # security policy and reporting guidance
├── _headers             # Netlify security headers
├── .gitignore           # git exclusions
├── package.json         # project scripts and metadata
├── netlify.toml         # static deployment config
└── LICENSE              # if added by GitHub later
```

## Local Development

This project is a static frontend and does not require a framework build step.

### Option 1: Open directly

- Open `index.html` in a browser.

### Option 2: Run a local static server

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Testing

```bash
npm test
```

This runs the security-focused regression suite from `security.test.js`.

## Environment Variables

This project does not currently require runtime environment variables. Any secrets or API keys should be kept out of the repository and managed in a secure deployment environment if a future backend is added.

## Deployment

### Best-fit free hosting options

This project is a static site, so the best free deployment options are:

- GitHub Pages
- Netlify
- Vercel (works well for static exports, though Netlify is simplest here)

### Netlify deployment

This repo already includes a `netlify.toml` file for static hosting.

- Push the repository to GitHub.
- Import the project in Netlify.
- Use the following configuration if prompted:
  - Build command: `npm test`
  - Publish directory: `.`

### GitHub Pages

Enable GitHub Pages from the repository settings and use the root folder for static hosting.

## Security Notes

- User input is sanitized before rendering.
- External image URLs are restricted to trusted Unsplash hosts.
- Inline handlers and inline styling are avoided.
- A content security policy is defined in `index.html`.

## License

This project is currently distributed without a repository license declaration unless one is added later.

## Screenshots

Add screenshots here after deployment or local capture:

```text
screenshot-1.png
screenshot-2.png
```

## Contributing

1. Create a feature branch.
2. Make focused changes.
3. Run the test suite.
4. Confirm the app still loads correctly in a browser.
5. Submit a pull request with a clear description.

## Important Notes

- No secrets or API keys should be committed.
- Do not include local build folders or environment files in Git.
- Keep the project static unless a real backend is introduced.
