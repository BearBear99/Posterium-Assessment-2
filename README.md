# Posterium — Assessment 2: Web App Development

**Student ID:** U3292103  
**Unit:** Client-side frameworks and dynamic APIs  
**Type:** Practical build (GitHub repository)

Posterium extends the Assessment 1 static interface (fan of cards, cream/burgundy palette, loading / empty / error states) into a working, data-driven web application. Live records come from the NFSA collection search API taught in Module 4.

## Files

```
index.html      semantic document shell
style.css       Assessment 1 visual system
script.js       getData(url), preview loop, decade grouping, fan carousel
assets/logo.png brand mark
README.md       this file (rationale + references)
```

No build step, no API key, no framework. Open `index.html` through a local static server (VS Code Live Server) so `fetch` is not blocked by `file://`.

## How to run

1. Unzip / clone this folder.
2. In VS Code: open the folder, install Live Server, click **Go Live**.

## How to put this on GitHub

```bash
git init
git add index.html style.css script.js assets README.md
git commit -m "Assessment 2: Posterium NFSA poster archive"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Submit the GitHub repository URL on Canvas.

## NFSA API (Module 4)

Base URL: `https://api.collection.nfsa.gov.au/`

| Endpoint | Used for |
| --- | --- |
| `GET /search?query=poster&hasMedia=yes&page=n` | Fan of posters |
| `GET /title/:id` | Detail overlay |

Images: `https://media.nfsacollection.net/` + `preview[].filePath`.

`getData(url)` is reused for `/search` and `/title/:id`. Untitled / generic titles are dropped.

## Interaction

- The fan shape is a fixed stage; the page does not scroll.
- Centre card in colour; neighbours in greyscale.
- Hover a decade on the timeline for poster names; the footer of that menu shows how many results are in the decade.
- Click the logo to refresh the page.

GitHub: https://github.com/BearBear99/Posterium-Assessment-2

## References

Mozilla. (n.d.). *Using the Fetch API*. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

National Film and Sound Archive of Australia. (n.d.). *Collection search API*. https://api.collection.nfsa.gov.au/

University of Canberra. (2026). *Module 4: The API* [Unit materials].
