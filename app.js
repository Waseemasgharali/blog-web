const express = require("express");
const multer = require("multer");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const db = require("./db");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

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
    console.log(rows); // Log the retrieved rows
    res.render("index", { posts: rows, loggedIn: req.session.loggedIn });
  });
});

// Add post route
app.get("/add_post", (req, res) => {
  // Require authentication
  if (!req.session.loggedIn) {
    res.redirect("/login");
  } else {
    res.render("add_post");
  }
});

// Update the POST route for adding a new post
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

// Add post delete route
app.post("/delete_post/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT image FROM posts WHERE id = ?";

  // Get the image file path before deleting the post
  db.get(sql, id, (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }

    // Delete the post from the database
    db.run("DELETE FROM posts WHERE id = ?", id, (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).send("Internal Server Error");
        return;
      }

      // If the post had an associated image, delete the image file
      if (row && row.image) {
        const imagePath = path.join(__dirname, "public", row.image);
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error(err.message);
            res.status(500).send("Internal Server Error");
            return;
          }
          res.redirect("/");
        });
      } else {
        res.redirect("/");
      }
    });
  });
});

app.get("/login", (req, res) => {
  res.render("login", { error: null }); // Pass error as null initially
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Check if user exists
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }
    if (!row) {
      res.render("login", { error: "Invalid username or password" });
      return;
    }
    // Check password
    bcrypt.compare(password, row.password, (err, result) => {
      if (err) {
        console.error(err.message);
        res.status(500).send("Internal Server Error");
        return;
      }
      if (result) {
        req.session.loggedIn = true;
        req.session.username = username;
        res.redirect("/");
      } else {
        res.render("login", { error: "Invalid username or password" });
      }
    });
  });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", (req, res) => {
  const { username, password } = req.body;

  // Hash password
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }
    // Save user to database
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hash],
      (err) => {
        if (err) {
          console.error(err.message);
          res.status(500).send("Internal Server Error");
          return;
        }
        res.redirect("/login");
      }
    );
  });
});

app.get("/logout", (req, res) => {
  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }
    // Redirect the user to the homepage after logout
    res.redirect("/");
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
