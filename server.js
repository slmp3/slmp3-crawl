const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// shares all files in the root
app.use(express.static(__dirname));

// shares index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// shares index.json
app.get('/index.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.json'));
});

app.listen(PORT, () => {
  console.log(`SLMP3 Crawl running o http://localhost:${PORT}`);
});