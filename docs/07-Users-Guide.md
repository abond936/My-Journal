# MY STORIES USER'S GUIDE

This guide helps an author turn a large personal media archive into something family and friends can relive, enjoy, and learn from. It explains a practical method for using the product; it does not replace product truth in `01-Vision-Architecture.md`, `02-Application.md`, or `03-Implementation.md`.

The guide distinguishes three kinds of direction:

- **Rule** — A stable principle that should ordinarily be followed.
- **Default** — A recommended starting choice that works for most archives.
- **Judgment** — A decision that depends on the meaning, sensitivity, or condition of the author's material.

---

## 1. What You Are Building

My Stories is not merely a place to store photographs. It is a way to organize family media, connect it to the stories and context behind it, and deliver those stories privately in a form people can explore and enjoy.

An ordinary photo feed can preserve files and display them by date. My Stories asks the author to do more: identify what the material is about, explain what matters, connect related material, and create useful paths through the archive. That takes judgment. The purpose of the product and this guide is to make that judgment manageable and repeatable rather than leaving every author to invent a method.

### The five parts of an authored archive

- **Media** are the historical evidence: photographs and other source material preserved in one library.
- **Captions** carry concise image-level story: what is shown, why it matters, or what is known about that individual item.
- **Cards** are meaningful units someone may deliberately open. A Card may contain one important image, a sequence of images, or a longer narrative with supporting media.
- **Collections** arrange Cards into authored reading paths without changing or duplicating the Cards themselves.
- **Tags** describe Media and Cards so the same material can be found through Who, What, When, and Where.

**Rule:** Do not ask one part of the system to do another part's job. Tags help people find material; Collections arrange a reading experience; Cards create meaning; captions explain individual Media.

### What the product can and cannot decide

The product can provide import tools, starter vocabulary, filtering, grouping, suggestions, inheritance, and structured authoring surfaces. It can help the author work consistently and can eventually propose more of the organization.

The author remains responsible for deciding which memories matter, what an image or event means, what is uncertain, what is private or sensitive, what deserves its own Card, and what a family member should encounter when reading.

Assistance may suggest, but it must not silently publish, delete, tag, or replace the author's judgment.

### A useful definition of success

A successful archive is not the archive with the most tags, Cards, or written words. It is one in which important material can be found, individual images have enough context to be understood, Cards feel worth opening, related Cards form coherent paths, and another person can navigate and understand the result without the author standing beside them.

---

## 2. Start Small

Do not begin by organizing the entire archive. Begin by completing one meaningful part of it.

Large imports create a natural temptation to design the complete taxonomy first or to classify thousands of items before creating any stories. Both approaches delay the point at which the author learns how Media, captions, Cards, Tags, Collections, and Reader presentation affect one another.

### Choose a learning set

**Default:** Begin with approximately 25–100 related images. Choose a group with boundaries the author already understands, such as one trip, one birthday or holiday, one school year or sports season, one person during a bounded period, or one folder or album whose contents are already reasonably coherent.

Avoid choosing the most confusing box of unidentified photographs as the first exercise. It is useful later, but it teaches uncertainty management before the basic authoring cycle is familiar.

### Complete the whole cycle

Take the learning set through the complete authoring path:

1. Import the Media.
2. Review what source evidence is available.
3. Assign useful Who, What, When, and Where Tags.
4. Add captions where individual images need explanation.
5. Decide which Media belong together in Cards.
6. Write only the Card context the material needs.
7. Arrange related Cards in a Collection when a reading path adds value.
8. Review the result in Reader as though encountering it for the first time.

Only after completing that cycle should the author expand the taxonomy or accelerate work across a much larger population.

### Work in passes

Trying to perfect every image before moving to the next is slow and inconsistent. A staged approach exposes shared facts and reduces repeated decisions.

**Default:** Work in these passes:

1. **Understand** — Identify the batch, source, approximate period, and obvious shared context.
2. **Classify** — Apply broad shared Tags in bulk.
3. **Refine** — Add exceptions, specific identities, captions, and more detailed Tags only where useful.
4. **Author** — Form Cards and write their necessary context.
5. **Arrange** — Add Cards to Collections where an intentional reading order helps.
6. **Read** — Inspect the result in Reader and correct confusion, fragmentation, or excess.

**Rule:** Do not treat import as completion. Imported Media become useful only as the author progressively understands, describes, connects, and presents them.

### Preserve uncertainty

The author does not need to resolve every fact before making progress. The current product treats `Unknown` and `N/A` as intentional dimensional answers, not as blanks:

- **Unknown** means that the dimension applies but the answer is not currently known.
- **N/A** means that the dimension is not meaningfully applicable to the item.
- **Blank** means that the dimension has not yet been reviewed.

**Rule:** Do not convert a guess into confirmed archive truth merely to make an item look complete.

---

## 3. Design Your Tags

Tags create the common descriptive language used by both Media and Cards. A useful taxonomy contains enough detail to retrieve meaningful material without attempting to encode every fact or relationship.

The four dimensions are:

- **Who** — Stable people and named animals shown in or central to the material.
- **What** — Events, activities, topics, objects, and reflections.
- **When** — Sortable chronology at the level actually known or useful.
- **Where** — Geographic places and meaningful venues.

### Begin with retrieval, not description

Before creating a Tag, ask: **Will I or a reader use this distinction to find, filter, group, understand, or author material differently?**

If the answer is no, the fact may belong in a caption or Card narrative rather than in the taxonomy.

**Rule:** Create a Tag because it improves repeated use of the archive, not merely because a detail can be named.

### Start broad and earn detail

**Default:** Begin with stable parent concepts and add children only when the archive contains enough material to make the distinction useful.

For example, `Baseball` may initially be sufficient. Add a team, season, league, field, or tournament only when that distinction helps retrieve or present a meaningful population. A taxonomy designed for hypothetical future material becomes harder to understand and apply consistently.

Useful child Tags should represent distinctions the author expects to assign directly or use as filters. Purely navigational parents may organize the hierarchy, but unnecessary layers add authoring burden without improving the Reader experience.

### Use one stable identity

Who represents stable people and named animals used as subjects. A person should not become several unrelated identities because photographs use married names, maiden names, nicknames, initials, or imported variants. Names and variants describe one identity; they should not silently fragment that person's archive.

The Who hierarchy may use meaningful branches such as Family or Friends and may preserve useful nested name variants. Parent, spouse, cousin, grandmother, and similar perspective-relative relationships are not assignable identity Tags. They depend on the viewer's perspective and belong in optional relationship facts rather than in the descriptive taxonomy.

**Rule:** One real subject should have one stable identity even when that subject has multiple names.

Employers, schools, teams, clubs, and other named organizations do not become Who Tags merely because they matter to a story. Use the person's Who Tag, add a reusable broad What concept when it improves retrieval, and preserve the organization's specific name in the Card title, caption, or narrative.

For example, a Card about Alan's time at McKesson can use `Who > Alan` and `What > Topics > Business`. If the story is specifically about Alan's working life, `What > Life > Career` may also be useful. `McKesson` belongs in the title or narrative unless repeated archive use later proves that a dedicated concept materially improves retrieval.

### Use a compact What vocabulary

Start with six broad What branches:

- **Life** — Childhood, Parenthood, Education, Career, and Marriage. Education may use Preschool, Elementary, Middle School, High School, College, and Graduate children when useful.
- **Events** — Birth, Birthday, Engagement, Wedding, Anniversary, Graduation, Funeral, Reunion, Party, and Holidays. Holidays is assignable and may contain useful named holidays.
- **Activities** — Sports, Hobbies, Clubs, Travel, Recreation, Performing, and Building. Sports is assignable and may contain useful individual sports.
- **Topics** — Business, Culture, Technology, Politics, Music, Books, Movies, Television, Food, and Ancestry.
- **Objects** — Homes, Vehicles, Clothing, and Machinery.
- **Reflections** — Outcomes, Lessons, Superlatives, and Future.

These are useful starting points, not boxes that must all be filled. Meaningful parents such as Education, Holidays, Sports, and Reflections are assignable. Add a child only when the narrower population will be repeatedly useful.

### Allow controlled multiple What Tags

Use one primary What subject. Most items should need one to three What Tags, normally no more than one from the same branch. A child already contributes to its parent when descendant filtering is used, so do not assign both simply to reproduce the hierarchy.

Multiple What Tags are appropriate when they describe independent, reusable facets. A college-football engagement might use `Life > Education > College`, `Activities > Sports > Football`, and `Events > Engagement`. The university, team, date, and other occurrence-specific detail can remain in the title, caption, When, or Where.

**Rule:** Tag for repeated retrieval; write the particulars into the story.

### Distinguish assignment from subject

A Card or Media item can have several Tags in a dimension. A **subject** marks which assigned Tag or Tags deserve emphasis; it is not a fifth dimension and it does not replace ordinary assignments.

For example, a photograph may include several people while principally being about one person. Assign the people who are meaningfully present, then mark the principal person as the Who subject when that distinction improves presentation or filtering.

**Default:** Use subjects deliberately. Do not mark every assigned Tag as a subject merely because the control is available.

### Media truth and Card truth are different

Media Tags describe what is true of an individual image. Card Tags describe what is true of the authored story or Gallery as a whole.

A photograph of Alan at a baseball game may accurately carry Alan, Baseball, a date, and a ballpark. A Card using that photograph to tell a broader story about fatherhood may need additional or different What Tags because the story's meaning is not fully visible in the image.

Gallery inheritance can roll confirmed Media Tags into selected Card dimensions, but each dimension requires an explicit author choice and existing Card assignments remain protected. Inheritance accelerates repeated truth; it does not eliminate Card-level judgment.

**Rule:** Do not change source-Media truth merely to make a Card easier to classify.

### Use Unknown, N/A, and blank consistently

Each dimension needs three distinct states:

- use a known Tag when the answer is known;
- use the dimension's `Unknown` Tag when an answer exists but is not known;
- use the dimension's `N/A` Tag when the dimension does not meaningfully apply;
- leave the dimension blank only while it remains unreviewed.

This distinction allows Complete and Incomplete workflows to reflect real authoring progress without disguising uncertainty.

### What not to encode as Tags

Avoid creating Tags for temporary workflow states such as `Needs review` when the product already tracks completeness; cover, body, or Gallery placement, which are Media relationships; one-time observations better expressed in a caption; arbitrary combinations of people, which filters or Collections can assemble; perspective-relative family roles used as identities; or distinctions so fine that the author cannot apply them consistently.

### Use Tag Set 0 as a starting point

Tag Set 0 is an optional, additive starter vocabulary. It provides common family roles, topics, dates, and United States locations without assigning anything automatically. It is conflict-safe and removable by its install identity.

**Default:** A new author should inspect Tag Set 0 before designing a taxonomy from scratch, retain the concepts that fit the archive, and extend it only in response to real material.

The starter set is not a finished taxonomy for every family. Its purpose is to reduce blank-page design work while preserving author control.

### Review the taxonomy before scaling

After completing the first learning set, review Tags that were difficult to choose between, Tags never assigned, branches with only one useful child, identities that may be duplicated under different names, details repeatedly placed in captions instead of Tags, and searches or groupings the author expected but could not perform.

Only then expand the taxonomy for the next body of material.

---

## Next Chapters

The next guide slices will cover:

4. Import and Prepare Media
5. Tag Effectively
6. Turn Media Into Cards
7. Build Collections
8. Review the Reader Experience
9. Maintain the Archive
10. Worked Examples
