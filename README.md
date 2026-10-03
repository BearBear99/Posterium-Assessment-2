# Posterium — Assessment 2: Web App Development

**Student ID:** U3292103  
**Unit:** Client-side frameworks and dynamic APIs  
**Repository:** https://github.com/BearBear99/Posterium-Assessment-2

Posterium is the Assessment 1 fan layout, but the cards are no longer placeholders. `script.js` calls the NFSA search API from Module 4, groups the posters by decade, and fills the fan, the timeline, and the detail view from that data.

The same fixes are commented in `script.js` and `style.css`, next to the code. This file is the longer version.

Open the folder in VS Code and use Live Server. Do not double-click `index.html`. A `file://` page often blocks `fetch`, and that is also how I hit the loading bug below.

## Files

```
index.html      page structure
style.css       layout from the static build, plus the fixes below
script.js       getData(), decade groups, fan, popup, detail
assets/logo.png brand mark
README.md       this file
```

No framework and no API key. `getData(url)` is used for both `/search` and `/title/:id`.

## What the API returns, and what I throw away

`GET https://api.collection.nfsa.gov.au/search?query=poster&hasMedia=yes&page=n`

A lot of records are not useful as posters. Some titles are just "Untitled" or "Poster". Some `preview` items have a `filePath` but are not images, so the card rendered as an empty gold rectangle (I saw this on a 2011 record in the 2010s). `imageFromPreview()` now only keeps `type === "image"`. If the thumbnail still fails, `img.onerror` calls `dropBroken()` and that record is removed from the decade. That change is commit `c268aa7`.

## Problems I actually had to fix

**The loading screen would not go away.**  
I opened the page by double-clicking the HTML file. The fan was already there, but the loading block stayed on top at 100%, with a second logo. The script was setting `hidden` on the status panel. That did nothing, because `.status` and `.site-header` set `display: grid` and `display: flex`, which override the browser's `[hidden]` rule. I added `[hidden] { display: none !important; }` (`8c058ca`). After that, Live Server is the way to run it.

**The decade menu turned into vertical letters.**  
Hovering 2010s, the names stacked one character per column ("DANCE ACADEMY" reading downwards). `.timeline ul { display: flex }` was also matching `#popup-list`, because that list sits inside the timeline. The buttons then became tiny flex items and `overflow-wrap` broke every letter. I limited the fan-row rule to `.timeline > ul` (`3b61e21`). The menu is a normal list again, and it scrolls.

**The menu closed before I could read it, and 2010s sat higher than the other years.**  
Moving the pointer from the year down into the list crossed a gap, so `mouseleave` hid the popup straight away. I delay the close by 400ms and add an invisible strip above the menu so the pointer can cross the gap (`518a71d`). The active year looked higher because the underline was in normal flow and the row was `align-items: flex-end`. The line is now `position: absolute`, so every decade label stays on the same baseline (`c268aa7`).

**A decade with four posters only showed three.**  
1900s has four posters (Kelly Gang is one of them) but the right side of the fan was empty. The carousel walks offsets from the far left and skips any poster it has already placed, so the wrapped copies never appeared on the right. Short lists now place the centre card first, then the right, then the left, and they do not repeat a poster (`9d980c4`). Longer decades still use the five-card fan.

**On a phone, a tall poster covered the text.**  
Opening *Stir* (1980) filled the screen. The year and the title were under the image and the overlay was `overflow: hidden`, so there was no way to scroll. On small screens the image is capped at about half the viewport and the overlay scrolls (`106096c`). Desktop is unchanged: image and text sit side by side.

**The caption kept moving.**  
On the phone the title started too low, under the cards, then I moved it too high. On the laptop it sat a bit too far under the fan. Those were just `top` / `bottom` changes on `.fan-copy` (`4f69772`, `9120566`, `4fca417`). I also stopped letting a long summary push the fan around: the fan is a fixed stage, and the caption has a fixed height. A very long catalogue title still fits, because that box scrolls instead of growing.

Desktop shows five decade labels. Under about 520px it shows three, with the arrows for the rest (`518a71d`).

## Reflection

The static build already decided the look: a fixed fan, one colour poster in the middle, the rest grey, decades along the top. Assessment 2 was not a new design. It was making that layout survive real records.

I stayed with plain HTML, CSS and JavaScript because that is what Module 4 asks for. A framework would have hidden the part I was supposed to learn, which is `fetch`, reading `results`, and updating the page myself. `getData()` is the only request function. Search and the detail record both go through it. State is one object (`posters`, `groups`, `decade`, `index`). `render()` is the only place that writes the timeline and the fan, so I do not update the DOM in five different functions and then wonder which one is stale.

The API was the part that did not match the poster I had drawn. A result is not a title plus an image. The title is often a catalogue line (`STIR : POSTER, DAYBILL`). `hasMedia=yes` still returns previews that are not images. `filePath` is a path, not a URL, so it has to be joined to `https://media.nfsacollection.net/`. I found that by logging the first response, which is the check in the module notes, and then by opening records that looked wrong on screen. The blank gold card and the "Untitled" cards were the same kind of mistake: I trusted a field name instead of looking at the value.

I also had to stop treating the page like a document that grows. Early on, a longer description pushed the fan up. On the phone, *Stir* filled the detail view and the year was off the bottom. The fan is now a fixed stage. On a phone the detail view scrolls. If the title under the fan is a long catalogue line, that caption scrolls inside its own box, so the fan does not move. That split is what I would keep if I did it again.

What I would still change: 500 posters is a cap I chose so the fan stays usable, not the whole archive. The 400ms popup delay is a guess that works on my laptop and my phone, not something I measured. And a few decades are thin, so the fan looks uneven even after the four-poster fix. None of that is a fetch error. It is the layout meeting a collection that is not evenly spread.

## References

Mozilla. (n.d.). *Using the Fetch API*. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

Mozilla. (n.d.). *The hidden attribute*. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden

National Film and Sound Archive of Australia. (n.d.). *Collection search API*. https://api.collection.nfsa.gov.au/

University of Canberra. (2026). *Module 4: The API* [Unit materials].
