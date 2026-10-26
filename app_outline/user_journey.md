# User Journey: Book Worm

**What is it:** A book browsing application. User can manage a library, share logs of their readings, and track reading status
**Problem:** Users have no central repository for managing a library digitally and tracking and sharing their reading experiences.
**User:** One Type: A book worm that loves reading and wants to track their history, progress, and share their experience with over book worms.

## The journey

1. Opens the app → lands on Home ( / ). Sees a display of Book covers
2. Taps on a Book → is taken to the details page ( /details/:id )
3. Reads the details of the Book
4. Scrolls through Logs written by other users
5. Taps 'Sign-In' button → Enters Display Name and Password → Authenticated
  - First visit (no credentials): Taps 'Sign-Up' → Enters desired Display Name, Email Address, Password, Confirms Password → Account Created: Authenticated
    - Display Name taken or Email Address already registered → 'Display Name in use' or 'Email Address in use'
6. Taps 'Add to Library'
7. Changes Reading Status Dropdown → 'Finished'
8. Taps 'Write Log' → Write Log modal pops up → Taps 5th Bookmark, Writes {Body} of Log, Taps 'Save'
9. Taps 'Edit Log' → Edit Log modal pops up → Taps 'DELETE'
10. Taps 'Remove from Library'
11. Unknown URL → A friendly 404 page with a link back Home.

## Data Rules
- This is Phase Alpha, there is no Database, No Google Books API, and no backend Authentication
  - Book data is seeded from @./front-end/app_outline/seed.json
  - Because we are seeding book data, we will need to ensure to implement Filter functionality with this data to verify it is working.
   - "id": "m7jaAAAAMAAJ" has been given an additional property "genre": "technology" it is the only title that shows when this filter is in use.
   - "id": "AfyMXnyjTbgC" has been given an additional property "genre": "adventure" it is the only title that shows when this filter is in use.
   - "id": "hLPYAAAAMAAJ" has been given an additional property "genre": "horror" it is the only title that shows when this filter is in use.
   - "id": "G_kBDAAAQBAJ" has been given an additional property "genre": "scifi" it is the only title that shows when this filter is in use.
   - "id": "05KkOP_nYDcC" has been given an additional property "genre": "fiction" it is the only title that shows when this filter is in use.
   - "id": "V8CGDwAAQBAJ" has been given an additional property "genre": "nonfiction" it is the only title that shows when this filter is in use.
  - We will have two seeded Demo Users
    - Display Name: Demo User 1, Email Address: demouser1@gmail.com, Password: Password1!
    - Display Name: Demo User 2, Email Address: demouser2@gmail.com, Password: Password2@
  - Libraries and Logs will be stored locally and reset at page refresh
    - Each user should be seeded with two titles in their library, and a log written for one of those titles