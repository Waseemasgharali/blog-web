const express = require("express");
const multer = require("multer");
const path = require("path");
const db = require("./db");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage });

// Homepage route
app.get("/", (req, res) => {
  db.all("SELECT * FROM posts", (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.render("index", { posts: rows });
  });
});

// Add post route
app.get("/add_post", (req, res) => {
  res.render("add_post");
});

app.post("/add_post", upload.single("image"), (req, res) => {
  const { title, content } = req.body;
  const image = req.file ? "/uploads/" + req.file.filename : null;
  const sql = "INSERT INTO posts (title, content, image) VALUES (?, ?, ?)";
  db.run(sql, [title, content, image], (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.redirect("/");
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
