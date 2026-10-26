# Details page: /details/:id
As any user, I want to see details for the book I selected on the Home page.
    Title, Author(s), Description, Cover Image, Publisher, Published Date, Page Count
As a public user, I want to be able to read logs other users have written about this title.
As an authenticated user, I want to be able to add this title to my library.
As an authenticated user, I want to be able to show my reading status with this title
    Want to read, Reading, Finished
As an authenticated user, I want to be able to write a log for this title, once it is in my library
As an authenticated user, I want to be able to edit a log I have written
As an authenticated user, I want to be able to delete a log I have written
As an authenticated user, if I remove a book from my library, my log should be deleted automatically

## On this Page:
- Sign-In button
  - User can authenticate or create an account from a pop-up
- Display Name button
  - User can click and update password from a pop-up
- Details about the book in :id
  - Title, Author(s), Description, Cover Image, Publisher, Published Date, Page Count
- Reading Status Dropdown
  - Blank, Want to Read, Reading, Finished
- Add to Library // Remove from Library button
  - Should change depending on whether this title is already in the authenticated users library
- Write Log // Edit Log button
  - Should change depending on whether this title already has a log from the authenticated user
- Logs
  - Reviews written by users that have this title in their library
- Load More button

## States:
- Public:
  - Sign-In button in top right
  - Book details on page
  - No Reading Status Dropdown, Add to // Remove from Library, or Write // Edit Log buttons
  - Able to scroll logs and load more
- Authenticated:
  - Display Name button in top right
  - Book details on page
  - Reading Status Dropdown, Add to // Remove from Library, and Write // Edit Log buttons visible
  - Able to scroll logs and load more

## Done When:
- [ ] States behave as detailed
- [ ] Clicking Sign-In brings up a sign-in modal
- [ ] Clicking Display Name brings up a Profile modal
- [ ] The Reading Status dropdown functions as intended for Authenticated users
- [ ] Add to Library // Remove from Library appropriately display depending on status
- [ ] Write Log // Edit Log appropriate display depending on status
- [ ] Authenticated user clicks Write Log // Edit Log and a modal allows them to Create, Read, Update, or Delete their Log
- [ ] Existing Logs from other users display below the details and buttons
- [ ] Clicking Load More, extends the Logs download with more Logs