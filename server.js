const express = require("express");
const path = require("path");
const app = express();

// Serve static files from current folder
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "spai_single_page_app.html"));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`SPAI running at http://localhost:${PORT}`));
