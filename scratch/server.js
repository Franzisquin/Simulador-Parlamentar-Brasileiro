const http = require('http');
const fs = require('fs');
const path = require('path');

http.createServer((req, res) => {
  // Decode URL to handle spaces, etc.
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filepath = path.join(__dirname, '..', urlPath);
  if (fs.existsSync(filepath) && fs.statSync(filepath).isDirectory()) {
    filepath = path.join(filepath, 'index.html');
  }

  const ext = path.extname(filepath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  else if (ext === '.css') contentType = 'text/css';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.geojson') contentType = 'application/geo+json';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.svg') contentType = 'image/svg+xml';

  fs.readFile(filepath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + filepath);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}).listen(8000, () => console.log('Server running on port 8000'));
