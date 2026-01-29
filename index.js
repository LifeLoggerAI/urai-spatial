const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get('/about', (req, res) => {
  res.send('This is the about page.');
});

// 404 handler - must be the last route
app.use((req, res) => {
  res.status(404).send('404: Page not found');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
