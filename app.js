import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;


// Database setup
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "booksrating",
  password: "2022$TheAlpha",
  port: 5432,
});
db.connect();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static("public"));

// Fetch book description from Open Library API
async function fetchDescription(isbn) {
    if (!isbn) return null;

    try {
        const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
        const response = await axios.get(url);
        const bookKey = `ISBN:${isbn}`;
        return response.data[bookKey]?.description || null;
    } catch (err) {
        console.error(`Error fetching description for ISBN ${isbn}:`, err.message);
        return null;
    }
}

// Routes

// Get all books
app.get("/", async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM books');
        console.log(result.rows);
        res.render("index.ejs", { books: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving books');
    }
});

// Render Add Book Form
app.get('/add', (req, res) => {
    res.render("add-book.ejs");
});

// Add a new book
app.post('/add', async (req, res) => {
    const { title, author, rating, isbn } = req.body;

    try {
        const coverUrl = isbn
            ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
            : null;

        // Fetch description using Open Library API
        const description = await fetchDescription(isbn);

        await db.query(
            'INSERT INTO books (title, author, rating, isbn, cover_url, description) VALUES ($1, $2, $3, $4, $5, $6)',
            [title, author, rating, isbn, coverUrl, description]
        );

        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error adding book');
    }
});

// Render Edit Book Form
app.get('/edit/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('SELECT * FROM books WHERE id = $1', [id]);
        res.render("edit-book.ejs", { book: result.rows[0] });
    } catch (err) {
        res.status(500).send('Error retrieving book for editing');
    }
});

// Update book
app.post('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const { title, author, rating, isbn } = req.body;

    try {
        const coverUrl = isbn
            ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
            : null;

        // Fetch description using Open Library API
        const description = await fetchDescription(isbn);

        await db.query(
            'UPDATE books SET title = $1, author = $2, rating = $3, isbn = $4, cover_url = $5, description = $6 WHERE id = $7',
            [title, author, rating, isbn, coverUrl, description, id]
        );

        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error updating book');
    }
});

// Delete book
app.post('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM books WHERE id = $1', [id]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error deleting book');
    }
});

// Start server
app.listen(port, () => {
    console.log('Server running on http://localhost:3000');
});