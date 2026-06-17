CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- Table for storing book information
CREATE TABLE Books (
    book_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    publication_year INT,
    isbn VARCHAR(13) UNIQUE
);

-- Table for storing author information
CREATE TABLE Authors (
    author_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Junction table for the many-to-many relationship between Books and Authors
CREATE TABLE BookAuthors (
    book_id INT,
    author_id INT,
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES Authors(author_id) ON DELETE CASCADE
);

-- Table for storing genre information
CREATE TABLE Genres (
    genre_id SERIAL PRIMARY KEY,
    genre_name VARCHAR(100) UNIQUE NOT NULL
);

-- Junction table for the many-to-many relationship between Books and Genres
CREATE TABLE BookGenres (
    book_id INT,
    genre_id INT,
    PRIMARY KEY (book_id, genre_id),
    FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES Genres(genre_id) ON DELETE CASCADE
);

-- Table for storing user-created bookshelves
CREATE TABLE Bookshelves (
    bookshelf_id SERIAL PRIMARY KEY,
    user_id INT,
    name VARCHAR(255) NOT NULL,
    is_exclusive BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Junction table for the many-to-many relationship between Bookshelves and Books
CREATE TABLE BookshelfBooks (
    bookshelf_id INT,
    book_id INT,
    PRIMARY KEY (bookshelf_id, book_id),
    FOREIGN KEY (bookshelf_id) REFERENCES Bookshelves(bookshelf_id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE
);-- Table for storing book information

CREATE TABLE Reviews (
     review_id SERIAL PRIMARY KEY,
     book_id INTEGER NOT NULL,
     user_id INTEGER NOT NULL,
     rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
     message TEXT,
     review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (book_id) REFERENCES Books(book_id) ON DELETE CASCADE,     FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
 );