# Home page: /
As a public user, I want to see a list of books by thumbnail, and be able to click on any one of them to be taken to a details page and see more information.
As a public user, I should see a 'Sign-In' button in the top right, that I can click and authenticate.
   If I do not yet have an account, I can click 'Sign-Up' on this screen, to see a 'Sign-Up' screen to populate my information.
As an authenticated user, I want to be able to also click 'My Library' and see a list of books I have added to my library.

## On this page
- Sign-In button
  - Gives a user the option to authenticate or create an account if desired
- Search bar (Title Only)
  - User can type in part or all of a title to see matching results
- Filters (Genre): (All, Adventure, Technology, Horror, Sci-Fi, Fiction, Non-Fiction) dropdown
  - Once Google Books API is implemented, we will use subject:{genre}
  - Beforehand, we will need to ensure titles are appropriately seeded with genre relating information (see @./front-end/app_outline/seed.json)
- My Library: An Authenticated user should have a My Library button that filters the selection screen only to books stored in their library.
  - My Library should toggle a boolean state, so that Search & Filter functionality perform properly within it.
- Books: A display of books should appear based on search/filter specifications, as cards in rows and columns
- Load More: A Load More button should be present under the selection display, enabling a user to load more titles upon clicking

## States
- Public:
  - Sign-In button in top right
  - No 'My Library' button on page
  - Full functionality otherwise
- Authenticated:
  - Display Name button in top right
  - 'My Library' button on page
  - Full functionality

## Done when
- [ ] States behave as detailed
- [ ] Clicking Sign-In brings up a sign-in modal
- [ ] Clicking Display Name brings up a Profile modal
- [ ] Clicking 'My Library' filters appropriately
- [ ] Search & Filter functionality implemented
- [ ] Clicking a Book navigates to that books Details page
- [ ] Clicking load more, extends the selection downward with more titles