-- Authors
INSERT INTO Authors (author_id, name) VALUES
(1, 'J.K. Rowling'), (2, 'George Orwell'), (3, 'J.R.R. Tolkien'),
(4, 'Harper Lee'), (5, 'F. Scott Fitzgerald'), (6, 'Jane Austen'),
(7, 'Mark Twain'), (8, 'Ernest Hemingway'), (9, 'Leo Tolstoy'),
(10, 'Agatha Christie'), (11, 'Stephen King'), (12, 'C.S. Lewis'),
(13, 'Isaac Asimov'), (14, 'Arthur C. Clarke'), (15, 'Dan Brown'),
(16, 'Suzanne Collins'), (17, 'Rick Riordan'), (18, 'Margaret Atwood'),
(19, 'Kurt Vonnegut'), (20, 'Neil Gaiman');

-- Genres
INSERT INTO Genres (genre_id, genre_name) VALUES
(1, 'Fantasy'), (2, 'Dystopian'), (3, 'Science Fiction'),
(4, 'Adventure'), (5, 'Classic'), (6, 'Mystery'), (7, 'Historical Fiction'),
(8, 'Romance'), (9, 'Horror'), (10, 'Thriller');

-- Books
INSERT INTO Books (book_id, title, publication_year, isbn) VALUES
(1, 'Harry Potter and the Sorcerer''s Stone', 1997, '9780747532699'),
(2, '1984', 1949, '9780451524935'), (3, 'Animal Farm', 1945, '9780451526342'),
(4, 'The Hobbit', 1937, '9780618968633'), (5, 'To Kill a Mockingbird', 1960, '9780061120084'),
(6, 'The Great Gatsby', 1925, '9780743273565'), (7, 'Pride and Prejudice', 1813, '9780141439518'),
(8, 'Adventures of Huckleberry Finn', 1884, '9780142437179'), (9, 'The Old Man and the Sea', 1952, '9780684801223'),
(10, 'War and Peace', 1869, '9780199232765'), (11, 'Murder on the Orient Express', 1934, '9780062073501'),
(12, 'The Shining', 1977, '9780307743657'), (13, 'The Lion, the Witch and the Wardrobe', 1950, '9780064471046'),
(14, 'Foundation', 1951, '9780553293357'), (15, '2001: A Space Odyssey', 1968, '9780451457998'),
(16, 'The Da Vinci Code', 2003, '9780307474278'), (17, 'The Hunger Games', 2008, '9780439023481'),
(18, 'Percy Jackson & The Olympians', 2005, '9780786838653'), (19, 'The Handmaid''s Tale', 1985, '9780385490818'),
(20, 'American Gods', 2001, '9780062472106'), (21, 'Echoes of Tomorrow', 2025, '9781234567890');

-- BookAuthors
INSERT INTO BookAuthors (book_id, author_id) VALUES
(1, 1), (2, 2), (3, 2), (4, 3), (5, 4), (6, 5),
(7, 6), (8, 7), (9, 8), (10, 9), (11, 10), (12, 11),
(13, 12), (14, 13), (15, 14), (16, 15), (17, 16),
(18, 17), (19, 18), (20, 20), (21, 20);

-- BookGenres
INSERT INTO BookGenres (book_id, genre_id) VALUES
(1, 1), (1, 4), (2, 2), (3, 2), (3, 5), (4, 1), (4, 4),
(5, 5), (5, 7), (6, 5), (7, 8), (8, 4), (9, 7), (10, 7),
(11, 6), (12, 9), (13, 1), (14, 3), (15, 3), (16, 10),
(17, 2), (17, 4), (18, 1), (18, 4), (19, 2), (20, 1), (21, 3);
