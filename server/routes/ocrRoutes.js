const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { extractTextFromImage } = require('./ocrcontroller');
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/api/ocr/:userId', upload.single('billImage'), async (req, res) => {
  try {
    const imagePath = path.resolve(req.file.path);
    const rawText = await extractTextFromImage(imagePath);

    const items = parseItems(rawText);
    fs.unlinkSync(imagePath); // clean temp image

    res.json({ items });
  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

// Very basic parsing logic (can be improved)
function parseItems(text) {
  const lines = text.split('\n');
  const items = [];

  for (let line of lines) {
    // Match something like "Rice 2", "Sugar - 5", "Atta    3.5"
    const match = line.match(/^(.*?)[\s\-]+(\d+(\.\d+)?)$/);
    if (match) {
      items.push({
        name: match[1].trim(),
        quantity: parseFloat(match[2])
      });
    }
  }

  return items;
}

module.exports = router;
