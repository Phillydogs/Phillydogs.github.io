const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Helper function to replace placeholders in text
function replacePlaceholders(text, placeholder, replacement) {
  return text.split(placeholder).join(replacement);
}

// Helper function to format the date as "Month Day, Year"
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

app.post('/upload', upload.single('template'), (req, res) => {
  const templatePath = req.file.path;
  const underlierName = req.body.underlier_name; // Get the underlier name from the form
  const downsideThreshold = req.body.downside_threshold; // Get the downside threshold from the form
  const currentDate = formatDate(new Date()); // Get today's date in the desired format
  const outputPath = path.join('uploads', 'output.docx');

  console.log(`Template path: ${templatePath}`);
  console.log(`Underlier name: ${underlierName}`);
  console.log(`Downside Threshold: ${downsideThreshold}`);
  console.log(`Current Date: ${currentDate}`);

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

    // Replace placeholders
    let xml = zip.files['word/document.xml'].asText();
    xml = replacePlaceholders(xml, '[underlier]', underlierName);
    xml = replacePlaceholders(xml, '[downside_threshold]', downsideThreshold);
    xml = replacePlaceholders(xml, '[doc_date]', currentDate);

    // Update the document with the replaced text
    zip.file('word/document.xml', xml);
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
