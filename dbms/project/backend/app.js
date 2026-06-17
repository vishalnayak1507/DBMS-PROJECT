const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const cors = require("cors");
const { Pool } = require("pg");
const app = express();
const port = 4000;

// PostgreSQL connection
// NOTE: use YOUR postgres username and password here
const pool = new Pool({
  user: 'test',
  host: 'localhost',
  database: 'ecommerce',
  password: 'test',
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// CORS: Give permission to localhost:3000 (ie our React app)
// to use this backend API
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Session information
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

/////////////////////////////////////////////////////////////
// Authentication APIs
// Signup, Login, IsLoggedIn and Logout

// TODO: Implement authentication middleware
// Redirect unauthenticated users to the login page with respective status code
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
      return next();
  } else {
      return res.status(401).json({ message: "Unauthorized: Please log in first." });
  }
}


// TODO: Implement user signup logic
// return JSON object with the following fields: {username, email, password}
// use correct status codes and messages mentioned in the lab document
app.post("/signup", async (req, res) => {
  try {
      const { username, email, password } = req.body;

      // Check if all required fields are provided
      if (!username || !email || !password) {
          return res.status(400).json({ message: "Error: All fields are required." });
      }

      // Check if the email already exists
      const existingUser = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);
      if (existingUser.rows.length > 0) {
          return res.status(400).json({ message: "Error: Email is already registered." });
      }

      // Hash the password before storing it
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Insert new user into the database
      await pool.query(
          "INSERT INTO Users (username, email, password_hash) VALUES ($1, $2, $3)",
          [username, email, hashedPassword]
      );

      res.status(200).json({ message: "User Registered Successfully" });
  } catch (error) {
      console.error("Signup Error:", error);
      res.status(500).json({ message: "Error signing up" });
  }
});


// TODO: Implement user signup logic
// return JSON object with the following fields: {email, password}
// use correct status codes and messages mentioned in the lab document
app.post("/login", async (req, res) => {
  try {
      const { email, password } = req.body;

      // Check if all required fields are provided
      if (!email || !password) {
          return res.status(400).json({ message: "Error: All fields are required." });
      }

      // Check if the user exists
      const userQuery = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);
      if (userQuery.rows.length === 0) {
          return res.status(400).json({ message: "Invalid credentials" });
      }

      const user = userQuery.rows[0];

      // Compare the provided password with the stored hashed password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
          return res.status(400).json({ message: "Invalid credentials" });
      }

      // Create a new session
      req.session.userId = user.user_id;
      res.status(200).json({ message: "Login successful" });
  } catch (error) {
      console.error("Login Error:", error);
      res.status(500).json({ message: "Error logging in" });
  }
});


// TODO: Implement API used to check if the client is currently logged in or not.
// use correct status codes and messages mentioned in the lab document
app.get("/isLoggedIn", async (req, res) => {
  try {
      if (!req.session.userId) {
          return res.status(400).json({ message: "Not logged in" });
      }

      // Fetch username from the database
      const userQuery = await pool.query("SELECT username FROM Users WHERE user_id = $1", [req.session.userId]);
      
      if (userQuery.rows.length === 0) {
          return res.status(400).json({ message: "User not found" });
      }

      const username = userQuery.rows[0].username;
      res.status(200).json({ message: "Logged in", username });
  } catch (error) {
      console.error("Error checking login status:", error);
      res.status(500).json({ message: "Server error" });
  }
});


// TODO: Implement API used to logout the user
// use correct status codes and messages mentioned in the lab document
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to log out" });
    }
    res.status(200).json({ message: "Logged out successfully" });
  });
});





////////////////////////////////////////////////////

app.get("/search-suggestions", isAuthenticated, async (req, res) => {
  const { query, type } = req.query;

  if (!query || !["book", "author"].includes(type)) {
    return res.status(400).json({ message: "Invalid query or type" });
  }

  const searchSQL =
    type === "book"
      ? `
        SELECT b.book_id, b.title, a.name AS author_name
        FROM Books b
        JOIN BookAuthors ba ON b.book_id = ba.book_id
        JOIN Authors a ON ba.author_id = a.author_id
        WHERE LOWER(b.title) LIKE LOWER('%' || $1 || '%')
        ORDER BY b.title ASC
        LIMIT 4;
      `
      : `
        SELECT b.book_id, b.title, a.name AS author_name
        FROM Books b
        JOIN BookAuthors ba ON b.book_id = ba.book_id
        JOIN Authors a ON ba.author_id = a.author_id
        WHERE LOWER(a.name) LIKE LOWER('%' || $1 || '%')
        ORDER BY a.name ASC
        LIMIT 4;
      `;

  try {
    const result = await pool.query(searchSQL, [query]);
    res.status(200).json({ books: result.rows });
  } catch (err) {
    console.error("Search suggestion error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


app.get("/recommendations", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;

    const query = `
      WITH UserShelfBooks AS (
        SELECT bbs.book_id
        FROM BookshelfBooks bbs
        JOIN Bookshelves bs ON bbs.bookshelf_id = bs.bookshelf_id
        WHERE bs.user_id = $1
      ),
      UserShelfAuthors AS (
        SELECT DISTINCT ba.author_id
        FROM BookAuthors ba
        WHERE ba.book_id IN (SELECT book_id FROM UserShelfBooks)
      ),
      UserShelfGenres AS (
        SELECT DISTINCT bg.genre_id
        FROM BookGenres bg
        WHERE bg.book_id IN (SELECT book_id FROM UserShelfBooks)
      )
      SELECT 
        b.book_id,
        b.title,
        b.publication_year,
        b.isbn,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('author_id', a.author_id, 'name', a.name))
          FILTER (WHERE a.author_id IS NOT NULL), '[]'
        ) AS authors,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('genre_id', g.genre_id, 'genre_name', g.genre_name))
          FILTER (WHERE g.genre_id IS NOT NULL), '[]'
        ) AS genres
      FROM Books b
      LEFT JOIN BookAuthors ba ON b.book_id = ba.book_id
      LEFT JOIN Authors a ON ba.author_id = a.author_id
      LEFT JOIN BookGenres bg ON b.book_id = bg.book_id
      LEFT JOIN Genres g ON bg.genre_id = g.genre_id
      WHERE b.book_id NOT IN (SELECT book_id FROM UserShelfBooks)
        AND (
          b.book_id IN (
             SELECT DISTINCT b2.book_id
             FROM Books b2
             JOIN BookAuthors ba2 ON b2.book_id = ba2.book_id
             WHERE ba2.author_id IN (SELECT author_id FROM UserShelfAuthors)
          )
          OR
          b.book_id IN (
             SELECT DISTINCT b3.book_id
             FROM Books b3
             JOIN BookGenres bg3 ON b3.book_id = bg3.book_id
             WHERE bg3.genre_id IN (SELECT genre_id FROM UserShelfGenres)
          )
        )
      GROUP BY b.book_id
      LIMIT 4;
    `;

    const result = await pool.query(query, [userId]);
    res.status(200).json({ message: "Recommendations fetched successfully", recommendations: result.rows });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ message: "Error fetching recommendations" });
  }
});

// Create a bookshelf
// Create a new bookshelf
// app.post("/bookshelves", isAuthenticated, async (req, res) => {
//   try {
//     const { name } = req.body;
//     const userId = req.session.userId;
//     const result = await pool.query(
//       "INSERT INTO Bookshelves (user_id, name) VALUES ($1, $2) RETURNING *",
//       [userId, name]
//     );
//     res.status(200).json({ message: "Bookshelf created", bookshelf: result.rows[0] });
//   } catch (error) {
//     console.error("Create shelf error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });

app.post("/bookshelves", isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.session.userId;

    // Check if bookshelf with same name already exists for this user
    const existing = await pool.query(
      "SELECT * FROM Bookshelves WHERE user_id = $1 AND LOWER(name) = LOWER($2)",
      [userId, name]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Bookshelf with this name already exists" });
    }

    // Insert new shelf
    const result = await pool.query(
      "INSERT INTO Bookshelves (user_id, name) VALUES ($1, $2) RETURNING *",
      [userId, name]
    );

    res.status(200).json({ message: "Bookshelf created", bookshelf: result.rows[0] });
  } catch (error) {
    console.error("Create shelf error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Get all bookshelves for the user (with books inside each shelf)
app.get("/bookshelves", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const shelfRes = await pool.query("SELECT * FROM Bookshelves WHERE user_id = $1", [userId]);

    const bookshelves = await Promise.all(
      shelfRes.rows.map(async (shelf) => {
        const booksRes = await pool.query(
          `SELECT b.* FROM Books b
           JOIN BookshelfBooks bb ON b.book_id = bb.book_id
           WHERE bb.bookshelf_id = $1`,
          [shelf.bookshelf_id]
        );
        return { ...shelf, books: booksRes.rows };
      })
    );

    res.status(200).json({ bookshelves });
  } catch (error) {
    console.error("Fetch shelves error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get books in a bookshelf
app.get("/bookshelves/:bookshelf_id/books", isAuthenticated, async (req, res) => {
  try {
    const { bookshelf_id } = req.params;
    const result = await pool.query(
      `SELECT b.* FROM Books b
       JOIN BookshelfBooks bb ON b.book_id = bb.book_id
       WHERE bb.bookshelf_id = $1`,
      [bookshelf_id]
    );
    res.status(200).json({ books: result.rows });
  } catch (error) {
    console.error("Fetch books in shelf error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a book to a bookshelf
app.post("/bookshelves/:bookshelf_id/books", isAuthenticated, async (req, res) => {
  try {
    const { bookshelf_id } = req.params;
    const { book_id } = req.body;
    const user_id = req.session.userId;

    const check = await pool.query(
      "SELECT * FROM Bookshelves WHERE bookshelf_id = $1 AND user_id = $2",
      [bookshelf_id, user_id]
    );
    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Unauthorized or bookshelf not found" });
    }

    await pool.query(
      `INSERT INTO BookshelfBooks (bookshelf_id, book_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [bookshelf_id, book_id]
    );

    res.status(200).json({ message: "Book added to bookshelf" });
  } catch (error) {
    console.error("Add book error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search books by title or author
app.get("/search-books", isAuthenticated, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Query required" });

    const result = await pool.query(
      `SELECT DISTINCT b.book_id, b.title, b.publication_year, b.isbn
       FROM Books b
       LEFT JOIN BookAuthors ba ON b.book_id = ba.book_id
       LEFT JOIN Authors a ON ba.author_id = a.author_id
       WHERE LOWER(b.title) LIKE LOWER('%' || $1 || '%')
          OR LOWER(a.name) LIKE LOWER('%' || $1 || '%')
       ORDER BY b.title ASC
       LIMIT 20`,
      [query]
    );

    res.status(200).json({ books: result.rows });
  } catch (error) {
    console.error("Search books error:", error);
    res.status(500).json({ message: "Server error" });
  }
});


app.get("/default-genres", isAuthenticated, async (req, res) => {
  try {
    const genreQuery = await pool.query(
      `SELECT * FROM Genres ORDER BY RANDOM() LIMIT 2`
    );

    const books_by_genre = {};
    for (const genre of genreQuery.rows) {
      const books = await pool.query(
        `SELECT b.book_id, b.title, b.publication_year FROM Books b
         JOIN BookGenres bg ON b.book_id = bg.book_id
         WHERE bg.genre_id = $1`,
        [genre.genre_id]
      );
      books_by_genre[genre.genre_name] = books.rows;
    }

    res.status(200).json({ genres: genreQuery.rows, books_by_genre });
  } catch (error) {
    console.error("Error fetching default genres:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Search for genre and return its books
app.get("/search-genre", isAuthenticated, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Query required" });

    const genreResult = await pool.query(
      `SELECT * FROM Genres WHERE LOWER(genre_name) LIKE LOWER('%' || $1 || '%') LIMIT 1`,
      [query]
    );

    if (genreResult.rows.length === 0) {
      return res.status(404).json({ message: "Genre not found" });
    }

    const genre = genreResult.rows[0];
    const booksResult = await pool.query(
      `SELECT b.book_id, b.title, b.publication_year FROM Books b
       JOIN BookGenres bg ON b.book_id = bg.book_id
       WHERE bg.genre_id = $1`,
      [genre.genre_id]
    );

    res.status(200).json({ genre, books: booksResult.rows });
  } catch (error) {
    console.error("Error searching genre:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/genre-suggestions", isAuthenticated, async (req, res) => {
  try {
    const query = req.query.query || "";
    const result = await pool.query(
      `SELECT DISTINCT genre_name FROM Genres WHERE LOWER(genre_name) LIKE LOWER($1) LIMIT 5`,
      [`%${query}%`]
    );
    res.json({ suggestions: result.rows.map(row => row.genre_name) });
  } catch (err) {
    console.error("Genre suggestion error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// New Releases - Books from past year or latest 10
app.get("/new-releases", isAuthenticated, async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const result = await pool.query(
      `SELECT * FROM Books
       WHERE publication_year >= $1
       ORDER BY publication_year DESC, book_id DESC
       LIMIT 10`,
      [currentYear - 1]
    );

    res.status(200).json({ books: result.rows });
  } catch (error) {
    console.error("Error fetching new releases:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Choice Awards - High-rated books with enough reviews
app.get("/choice-awards", isAuthenticated, async (req, res) => {
  try {
    const query = `
      SELECT b.book_id, b.title, b.publication_year,
             COUNT(r.review_id) AS review_count,
             AVG(r.rating) AS avg_rating
      FROM Books b
      JOIN Reviews r ON b.book_id = r.book_id
      GROUP BY b.book_id
      HAVING COUNT(r.review_id) > 10 AND AVG(r.rating) > 4.5
      ORDER BY avg_rating DESC, review_count DESC
      LIMIT 10;
    `;
    const result = await pool.query(query);

    // Convert avg_rating to a number using parseFloat
    const books = result.rows.map(book => ({
      ...book,
      avg_rating: book.avg_rating ? parseFloat(book.avg_rating) : null
    }));

    res.status(200).json({ books });
  } catch (error) {
    console.error("Error fetching choice awards:", error);
    res.status(500).json({ message: "Server error" });
  }
});



// Get book detail and author info + rating status for current user
// GET: Fetch book details with author and user rating info
// GET: Fetch book details with author and user rating info
// GET: Fetch book details with author and user review info (rating and message)
// GET: Fetch book details with author, user review, and review summaries
// --- GET /book/:bookId ---

// --- GET /book/:bookId ---
app.get("/book/:bookId", isAuthenticated, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    const userId = req.session.userId;
    if (isNaN(bookId)) {
      return res.status(400).json({ message: "Invalid book ID" });
    }

    // 1) fetch book + author
    const bookRes = await pool.query(
      `SELECT b.*, a.name AS author_name
         FROM Books b
    LEFT JOIN BookAuthors ba ON ba.book_id = b.book_id
    LEFT JOIN Authors     a  ON a.author_id = ba.author_id
        WHERE b.book_id = $1
        LIMIT 1`,
      [bookId]
    );
    if (!bookRes.rows.length) {
      return res.status(404).json({ message: "Book not found" });
    }
    const book = bookRes.rows[0];

    // 2) this user's review (if any)
    const userRev = await pool.query(
      "SELECT rating, message FROM Reviews WHERE book_id=$1 AND user_id=$2",
      [bookId, userId]
    );
    const hasRated      = userRev.rows.length > 0;
    const userRating    = hasRated ? userRev.rows[0].rating : null;
    const reviewMessage = hasRated ? userRev.rows[0].message : "";

    // 3) count total reviews
    const cntRes = await pool.query(
      "SELECT COUNT(*) AS cnt FROM Reviews WHERE book_id = $1",
      [bookId]
    );
    const total = parseInt(cntRes.rows[0].cnt, 10);
    // 4) calculate average rating only if there is at least one review.
    let averageRating = null;
    if (total > 0) {
      // const avgRes = await pool.query(
      //   `SELECT ROUND(AVG(rating)::numeric,2)::float AS avgRating
      //      FROM Reviews
      //     WHERE book_id = $1`,
      //   [bookId]
      //   // `SELECT AVG(rating) FROM Reviews WHERE book_id = $1`, [bookId]
      // );
      // averageRating = avgRes.rows[0].avgRating;
    const avgRes = await pool.query(
      `SELECT ROUND(AVG(rating)::numeric, 2)::float FROM Reviews WHERE book_id = $1`,
      [bookId]
    );

    // Get the first value in the returned row object
    averageRating = Object.values(avgRes.rows[0])[0];
    }
    
    // 5) fetch reviews (all if <=5, else top3/bottom2 shuffled)
    let reviews = [];
    if (total <= 5) {
      const allRes = await pool.query(
        `SELECT r.review_id, r.rating, r.message, u.username
           FROM Reviews r
           JOIN Users   u ON u.user_id = r.user_id
          WHERE r.book_id = $1
          ORDER BY r.review_date DESC`,
        [bookId]
      );
      reviews = allRes.rows;
    } else {
      const topRes = await pool.query(
        `SELECT r.review_id, r.rating, r.message, u.username
           FROM Reviews r
           JOIN Users   u ON u.user_id = r.user_id
          WHERE r.book_id = $1
          ORDER BY r.rating DESC, r.review_date DESC
          LIMIT 3`,
        [bookId]
      );
      let bottomRes;
      if (topRes.rows.length) {
        const topIds = topRes.rows.map(r => r.review_id);
        bottomRes = await pool.query(
          `SELECT r.review_id, r.rating, r.message, u.username
             FROM Reviews r
             JOIN Users   u ON u.user_id = r.user_id
            WHERE r.book_id = $1
              AND NOT (r.review_id = ANY($2::int[]))
            ORDER BY r.rating ASC, r.review_date DESC
            LIMIT 2`,
          [bookId, topIds]
        );
      } else {
        bottomRes = await pool.query(
          `SELECT r.review_id, r.rating, r.message, u.username
             FROM Reviews r
             JOIN Users   u ON u.user_id = r.user_id
            WHERE r.book_id = $1
            ORDER BY r.rating ASC, r.review_date DESC
            LIMIT 2`,
          [bookId]
        );
      }
      reviews = [...topRes.rows, ...bottomRes.rows];
    }

    // 6) shuffle the reviews array
    for (let i = reviews.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reviews[i], reviews[j]] = [reviews[j], reviews[i]];
    }

    // 7) send everything including reviewCount
    res.status(200).json({
      book: {
        book_id: book.book_id,
        title: book.title,
        publication_year: book.publication_year,
        isbn: book.isbn
      },
      author: { name: book.author_name || "Unknown" },
      hasRated,
      userRating,
      reviewMessage,
      averageRating,   // a number if reviews exist, else null
      reviewCount: total,
      reviews
    });

  } catch (error) {
    console.error("Error fetching book details:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// --- POST /book/:bookId/rate ---
app.post("/book/:bookId/rate", isAuthenticated, async (req, res) => {
  try {
    const bookId = parseInt(req.params.bookId, 10);
    const userId = req.session.userId;
    const { rating, message } = req.body;
    if (isNaN(bookId) || ![1,2,3,4,5].includes(rating)) {
      return res.status(400).json({ message: "Invalid input" });
    }

    // prevent double-rating
    const exists = await pool.query(
      "SELECT 1 FROM Reviews WHERE book_id=$1 AND user_id=$2",
      [bookId, userId]
    );
    if (exists.rows.length) {
      return res.status(409).json({ message: "Already rated" });
    }

    // insert new review
    await pool.query(
      `INSERT INTO Reviews (book_id, user_id, rating, message)
       VALUES ($1, $2, $3, $4)`,
      [bookId, userId, rating, message || null]
    );

    // recalc total
    const cntRes = await pool.query(
      "SELECT COUNT(*) AS cnt FROM Reviews WHERE book_id = $1",
      [bookId]
    );
    const total = parseInt(cntRes.rows[0].cnt, 10);

    // recalc average rating only if reviews exist
    let averageRating = null;
    if (total > 0) {
      // const avgRes = await pool.query(
      //   `SELECT ROUND(AVG(rating)::numeric,2)::float AS avgRating
      //      FROM Reviews
      //     WHERE book_id = $1`,
      //   [bookId]
      // );
      // averageRating = avgRes.rows[0].avgRating;
      const avgRes = await pool.query(
        `SELECT ROUND(AVG(rating)::numeric, 2)::float FROM Reviews WHERE book_id = $1`,
        [bookId]
      );

      // Get the first value in the returned row object
      averageRating = Object.values(avgRes.rows[0])[0];
    }

    // fetch reviews exactly as above
    let reviews = [];
    if (total <= 5) {
      const allRes = await pool.query(
        `SELECT r.review_id, r.rating, r.message, u.username
           FROM Reviews r
           JOIN Users   u ON u.user_id = r.user_id
          WHERE r.book_id = $1
          ORDER BY r.review_date DESC`,
        [bookId]
      );
      reviews = allRes.rows;
    } else {
      const topRes = await pool.query(
        `SELECT r.review_id, r.rating, r.message, u.username
           FROM Reviews r
           JOIN Users   u ON u.user_id = r.user_id
          WHERE r.book_id = $1
          ORDER BY r.rating DESC, r.review_date DESC
          LIMIT 3`,
        [bookId]
      );
      let bottomRes;
      if (topRes.rows.length) {
        const topIds = topRes.rows.map(r => r.review_id);
        bottomRes = await pool.query(
          `SELECT r.review_id, r.rating, r.message, u.username
             FROM Reviews r
             JOIN Users   u ON u.user_id = r.user_id
            WHERE r.book_id = $1
              AND NOT (r.review_id = ANY($2::int[]))
            ORDER BY r.rating ASC, r.review_date DESC
            LIMIT 2`,
          [bookId, topIds]
        );
      } else {
        bottomRes = await pool.query(
          `SELECT r.review_id, r.rating, r.message, u.username
             FROM Reviews r
             JOIN Users   u ON u.user_id = r.user_id
            WHERE r.book_id = $1
            ORDER BY r.rating ASC, r.review_date DESC
            LIMIT 2`,
          [bookId]
        );
      }
      reviews = [...topRes.rows, ...bottomRes.rows];
    }
    for (let i = reviews.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [reviews[i], reviews[j]] = [reviews[j], reviews[i]];
    }

    // respond with updated data including reviewCount
    res.status(200).json({
      message: "Rating submitted",
      averageRating, // a number if reviews exist, else null
      reviewCount: total,
      reviews,
      hasRated: true,
      userRating: rating,
      reviewMessage: message || ""
    });

  } catch (error) {
    console.error("Error submitting rating:", error);
    res.status(500).json({ message: "Server error" });
  }
});




////////////////////////////////////////////////////
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});