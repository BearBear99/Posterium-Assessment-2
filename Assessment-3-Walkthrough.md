# Technical Walkthrough: Posterium

**Student ID:** U3292103  
**Assessment 3:** Web App Technical Evaluation  
**Application:** Posterium (Assessment 2)  
**Repository:** https://github.com/BearBear99/Posterium-Assessment-2

## Introduction

Posterium is the Assessment 2 version of the fan drawn in Assessment 1. The screen still shows one colour poster in the centre, grey posters beside it, and a row of decades. The cards are no longer placeholders. `script.js` calls the National Film and Sound Archive (NFSA) search API, groups the records by decade, and draws the fan from that list.

This walkthrough covers three decisions. `getData()` and `loadArchive()` turn a failed request into a visible error. `imageFromPreview()` and `dropBroken()` keep a bad file off the fan. `addSlot()`, inside `renderFan()`, places a short decade without repeating a poster. The demonstration covers the first two, which have a visible error state. The third is a structural choice, so it is discussed here.

I stayed with one HTML file, one CSS file, and one JavaScript file, as in Module 4 (University of Canberra, 2026). A framework would have hidden the request, the list, and the function that draws the screen.

## Fetching the archive

`getData(url)` is the only function that calls `fetch`. The search address is `/search?query=poster&hasMedia=yes&page=n`. The detail address is `/title/` plus the record id. I did not write two request functions. Both need the same test, and a second copy would be an easy place to fix one and forget the other.

The test is `if (!response.ok) throw`. This is the check I would most expect someone to miss. `fetch` rejects when the browser cannot reach a server. It does not reject when the server answers with 404 or 500 (Mozilla, n.d.-a). If that line is missing, the code continues into `response.json()`, the JSON step fails for a different reason, and the user sees a blank page instead of Retry. Status 429 uses the same `throw`, with a different message. A 429 from this archive means “slow down”, not “the URL is wrong”.

`loadArchive()` requests page 1, reads `meta.count.total`, and then requests the remaining pages with `Promise.all`. Duplicates are dropped, and the list stops at 500. The first response is logged with `console.log`. Module 4 asks for that log so `results`, `preview`, and `meta` can be checked before any field is trusted (University of Canberra, 2026).

If `getData()` throws, the `catch` in `loadArchive()` calls `showStatus("error", ...)`. The heading is “Something went wrong”, and the button is Retry. Retry calls `loadArchive()` again. In the demonstration I pointed `fetch` at a nonexistent address, reloaded, and that error state appeared. I then restored `fetch(url)`. The edit was there to show a state that is already in the file.

I considered a `for` loop that waits for each page. It is easier to read, and kinder to a rate limit, but the loader would sit for a long time. Loading the next page only when the decade changes would make the first paint faster, and the decade row incomplete. I wait until the capped list is in memory so that row shows the spread of the archive. The cost is the wait, and the chance of a 429.

## Keeping a bad file off the fan

`hasMedia=yes` looks like a promise that every hit is a poster. It is not. A `preview` entry can have a `filePath` whose `type` is not `image`. `imageFromPreview()` keeps an entry only when `type === "image"` and `filePath` is present. The picture URL is `https://media.nfsacollection.net/` plus that path. The API does not return a full image address (National Film and Sound Archive of Australia, n.d.).

I found the hole with a 2011 record. It had a path, so an earlier version drew a card, and the card was an empty gold rectangle. Filtering on `type` removes it before `mapResult()` can turn it into a card. Hiding it after the user has seen the blank would have been worse.

A path can still 404. The fan image sets `onerror` to `dropBroken(id)`. That function removes the id from `state.posters` and from the decade map, then calls `render()`. The line that is easy to leave out is `if (state.failed[id]) return`. Without it, `onerror` fires, the fan is drawn again, the same image fails, and the page does not settle. `state.failed` makes the removal happen once.

I could have left a grey fallback card so the counts would not change. I did not. A blank rectangle in the colour slot breaks the rule that the centre card is a poster.

Titles use the same kind of gate. Catalogue lines such as `STIR : POSTER, DAYBILL`, or the word `Untitled`, are stripped or dropped. A record is not placed on the fan only because the API returned it.

## A short decade in the fan

`renderFan()` does not print the whole decade. It places a centre card and a few neighbours. `addSlot(offset)` turns an offset into an index and refuses an index it has already used.

The obvious loop starts at the far left. I tried that. It skips a poster it has already placed. The 1900s shelf has four posters. Those four were used up before the right-hand slots were filled, so the right side stayed empty. `addSlot(0)` now runs first, which is the centre. The loop then places the right neighbour, then the left. Ghost cards are added only when the decade is longer than the fan, so a short decade does not repeat a poster.

Repeating posters until the fan looked full would have made a thin shelf look like every other decade, and the colour card could match a grey one. Four real posters is the clearer result.

## Where I asked for help, and what I kept

The fan, the decade row, and the NFSA poster search were mine, from Assessment 1 and Module 4. I used Grok when the running page did not match that plan. I described the symptom and asked why that part was failing. I did not keep a suggestion until I had reloaded and seen it.

Three checks came out of that, and I kept them. A failed search was not reaching Retry because `fetch` does not throw on an HTTP error status (Mozilla, n.d.-a). I kept `response.ok`, the 429 message, and the `catch` in `loadArchive()`. The gold card was a 2011 record with a path and the wrong `type`, so I kept `type === "image"`. After a 404 the page would not settle, because `onerror` runs again after every `render()`. The `failed` id stops that.

The 1900s case was the same kind of check. The loop was skipping duplicates too early, and the centre-first order is what I shipped. A layout suggestion beside it was wrong for this interface: a long caption changed the page height and the fan moved. I rejected that. The fan stays in a fixed box. A long title scrolls inside the caption. The cards do not move with the text.

What I would change now is not those guards. `displayTitle()` still lets a long catalogue sentence through, which is why the caption scrolls. I would also stop firing every search page at once. Parallel requests are why a 429 has to be handled at all.

## What I left unresolved

The 500-poster cap is a scope choice. The search can return more than the fan can hold. I stopped at 500 so the first paint and the decade row stayed predictable. Copying the whole archive was not the brief.

The decade menu waits 400 milliseconds before it closes, so the pointer can cross the gap into the list. I did not measure that delay. It worked on my laptop and my phone. More timing would not have changed the data model, so I left it.

Some decades are still thin. That is the collection, not a fetch bug. Filling 1900s with invented cards would have been a worse falsehood than an uneven fan.

`showStatus()` still builds the error screen with `innerHTML`. The strings are mine, not record titles, so it is safe here. It would be a poor habit if a later change inserted a title into that HTML. I left it because the error state already worked.

## Recommendations

Four changes, in this order.

First, request two or three pages at a time instead of all of them. Keep `getData()` as the only fetch. Retry and the 429 message can stay. The loader would be slightly slower, and a 429 would be rarer.

Second, if a cleaned name is still a catalogue sentence, use a related title on the fan and keep the full line for the detail view. The year would then sit under a short heading.

Third, build the error screen with `createElement` rather than `innerHTML`. It would look the same, and a later edit would be less likely to drop a raw title into a string.

Fourth, keep the note on `addSlot()` that the centre is placed before either side, and add a check with four fake posters, so a later cleanup cannot restore the empty right side.

None of these changes the Assessment 1 layout. They make the same screen less dependent on a lucky response.

## Conclusion

The application is one list in memory, drawn by `render()` and filled by one fetch function. The decisions that matter refuse a bad response: `response.ok`, `type === "image"`, the `failed` id, and the centre-first fan. Each followed a result that looked wrong on the page. The 500-record cap and the menu delay keep that fan in place.

## References

Mozilla. (n.d.-a). *Using the Fetch API*. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

Mozilla. (n.d.-b). *Response: ok property*. MDN Web Docs. https://developer.mozilla.org/en-US/docs/Web/API/Response/ok

National Film and Sound Archive of Australia. (n.d.). *Collection search API*. https://api.collection.nfsa.gov.au/

University of Canberra. (2026). *Module 4: The API* [Unit materials].

## GenAI acknowledgement

I have used the following Generative Artificial Intelligence (GenAI) tools/services in the preparation of this assessment:

- **GenAI service name and version:** Grok (xAI)
- **Link to the GenAI service:** https://grok.com
- **Ways this GenAI service was used:** I asked why particular results were wrong on the running page: a failed search that did not reach Retry, a blank gold card, an image error that redrew the fan, and a short decade that hid a poster. I checked those explanations against the app and kept or rejected the change myself. I also used it to check grammar in this walkthrough. The layout, the choice of API, and which fixes stayed in the file were my decisions.

I confirm that I have not used GenAI in the preparation of this assessment for any purpose other than what I have acknowledged above.
