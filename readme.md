# Building a Simple Book Catalog Application using React, Redux, and Typescript

### Links

- Live Link: https://bookcatalogs.netlify.app/

- Your Frontend Github Repository Link: https://github.com/ShuvoProgram/Build-a-Simple-Book-Catalog-Application-FrontEnd
- Your Backend Github Repository Link: https://github.com/ShuvoProgram/Build-a-Simple-Book-Catalog-Application-BackEnd

##

Description:
Our Book Catalog Application is a user-friendly web platform that allows book enthusiasts to explore and discover a wide range of books. The application features a clean and intuitive design, ensuring a smooth and engaging user experience. It enables users to browse the top 10 recently added books, search for specific titles, authors, or genres, and access detailed information about each book, including reviews from other readers.

## Authentication and User Management:

Users can create new accounts by providing a unique email and password or login using their existing credentials. For authentication, we offer both custom authentication, ensuring a secure and seamless login experience. Once authenticated, users will see a logout button in the navbar for easy access to log out of the application.

## Landing Page:

The landing page showcases the top 10 recently added books, enticing users to explore further. The header contains navigation links to "All Books," "Sign In," and "Sign Up" pages, ensuring easy access to different parts of the application.

## All Books Page:

This page fetches a list of books from an external API using RTK Query, allowing for efficient and accurate retrieval of book data. The book list can be displayed in either a table or card format, and each book entry includes essential details such as title, author, genre, and publication date. Users can utilize a search bar to find books based on specific criteria and use filtering options to narrow down the list by genre and publication year.

## Adding New Books:

Authenticated users have the privilege to add new books to the catalog using a simple form. After submitting the form, users will receive a notification (e.g., toast) indicating the success or failure of the operation.

## Book Details Page:

Clicking on a book from the list leads users to a detailed view of the book. This view includes essential book information such as title, author, genre, publication date, and reviews. Authenticated users can also leave reviews for books using a submit box provided on the details page.

## Edit and Delete Books:

Authenticated users can edit book information by accessing an edit form. The form is pre-filled with the current data, and upon submission, users receive notifications about the status of their updates. Similarly, users can delete a book by clicking the "Delete" button, which will prompt a confirmation dialog to ensure they want to proceed with the action.

## Wishlist

Users can add books they plan to read in the future to their wishlist, keeping track of their reading goals. Additionally, users can create lists for books they are currently reading or have finished reading. This feature enhances user engagement and personalization of their reading experience.

Our Book Catalog Application aims to provide a seamless and enjoyable platform for book enthusiasts to explore, discover, and engage with a wide variety of books. Whether you are an avid reader or just getting started on your reading journey, our application is designed to meet your needs and enhance your love for books. Happy reading!
