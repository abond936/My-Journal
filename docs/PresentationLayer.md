Thank you, yes, the app has now reached a reasonably stable, operational state. Thank you to you and all of your 
predecessors for their help in getting to this stage. 

As I have worked through the app, it's content and navigation, I have begun to see entries and albums as just different 'shapes' or presentations of similar concepts and in terms of navigation, we have a heirarchical tag system that will allow free flowing consumption, but I also see the need for a curated table of contents navigation.  

I also envision a way to nest content. For example, I can imagine a record titled The World in 1959. It contains records called Politics, Science, Economy and Culture. Each of those records contain records. Cards would be scrolled with sticky titles.

Cards would be styled and navidated based on type. A story/question card would be clicked to read. A gallery card could be horizontally scrolled or clicked for a gallery view, with or without text. A quote card would not be clickable.

This entatils:
- Unifying the Content
- Simplifying the backend
- Devsiing the frontend

**Unifying the Content**
Combine entries and albums into a single, flexible collection type called 'cards'.

A `card` would have a set of core properties:

*   `type`: `story`, `qa`, `quote`, `callout`, `gallery`.
*   `coverImage`: Image for card.
*   `title`: The main heading (e.g., "The Day We Landed on the Moon", "What was your first car?", "A Quote by Einstein").
*   `content`?: The RTE text/images combination.  
*   `media`?: An array of media objects. 
*   `tagsDirect`: An array of directly assigned tags. 
*   `tagsIndirect`: An array of indirectly assigned tags from the ancestors of the direct tags.
*   `childrenIds`: An ordered array of child cards
*   `parentIds:`: An array of parent cards.

**Simplifying the Backend**
API -  A new API endpoint, `/api/collections/[slug]`, that fetches this collection data.

**Devising the Frontend**
Everything is presented as a card in an integrated theme of grid (multi-sized boxes) and color to create interest and signify content. 

UI - A new page, `/collections/[slug]`
    *   Fetch the collection data.
    *   Render the sticky headers.
    *   Render the content.

- `StoryCard` - Cover image and title. Perhaps a excerpt/teaser, inviting the user to click to read more.
  - clicking navigates to `Story View`.
- `GalleryCard` - Cover image and title. Horizontal scroll or click to open the full gallery view.
  - clicking navigates to `Album View`
- `QACard`- Cover image and question. 
  - clicking navigates to `Story View` 
- `QuoteCard` :** A generic photo background, stylized font for the quote, with the author below. The card itself *is* the full content. 
  - No click-through needed.


Detail Types

Variable based on content.

- title - required
- cover image - required
- text (starter block/read more...) - optional
  - are embedded images clickable?
  - can cards be embedded?
- gallery, captions - optional, click open to full view 

- related (end of story/mobile, sidebar.other) - optional/auto-generated?

