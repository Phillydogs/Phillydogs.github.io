const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const cors = require('cors');
const corsOptions = {
  origin: 'https://phillydogs.github.io',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Helper function to replace placeholders in text
function replacePlaceholders(text, placeholder, replacement) {
  return text.split(placeholder).join(replacement);
}

// Serve the index.html file at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('template'), (req, res) => {
  const templatePath = req.file.path;
  const underlierName = req.body.underliers; // Make sure this matches the form field name
  const outputPath = path.join('uploads', 'output.docx');

  console.log(`Template path: ${templatePath}`);
  console.log(`Underlier name: ${underlierName}`);

  try {
    // Read the template file
    const templateBuffer = fs.readFileSync(templatePath);
    console.log('Template buffer read successfully.');

    // Load the DOCX file as a binary
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    console.log('Template document loaded successfully.');

    // Replace placeholders with the provided underlier name
    const xml = zip.files['word/document.xml'].asText();
    const updatedXml = replacePlaceholders(xml, '[underlier]', underlierName);
    zip.file('word/document.xml', updatedXml);
    console.log('Placeholders replaced successfully.');

    // Get the rendered document buffer
    const buf = zip.generate({ type: 'nodebuffer' });

    // Save the updated document
    fs.writeFileSync(outputPath, buf);
    console.log(`Output DOCX saved to ${outputPath}.`);

    // Send the updated document as a download
    res.download(outputPath, 'output.docx', (err) => {
      if (err) {
        console.error('Error downloading the file:', err);
        res.status(500).send('Error downloading the file.');
      } else {
        console.log('File downloaded successfully.');
        // Clean up: Delete the uploaded template file
        fs.unlinkSync(templatePath);
      }
    });
  } catch (error) {
    console.error('Error processing the document:', error);
    res.status(500).send('Error processing the document.');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
