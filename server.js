const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const cors = require('cors');
const moment = require('moment');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for specific domains
app.use(cors({
    origin: 'https://phillydogs.github.io'  // Allow only your GitHub Pages domain
}));

// Multer setup to handle form data (without file upload)
const storage = multer.memoryStorage();  // Store the data in memory
const upload = multer({ storage: storage });  // Add multer middleware here

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Path to the template file
const templatePath = path.join(__dirname, 'templates', 'template.docx');

// Function to set data for Docxtemplater
function replacePlaceholders(doc, data) {
    console.log("Formatted Data for Docxtemplater:", data);  // Debugging
    doc.setData(data);  // Set the data for Docxtemplater to replace placeholders
}

app.post('/generate', upload.none(), (req, res) => {
    // Form data from the request
    const {
        issuer,
        tradeDate,
        maturityDate,
        underlierName,
        downside,
        downsideThreshold,
        notional
    } = req.body;

    const currentDate = moment().format('MMMM D, YYYY');

    // Prepare data for placeholder replacement
    const data = {
        '[issuer]': issuer,
        '[trade_date]': tradeDate,
        '[maturity_date]': maturityDate,
        '[underlier]': underlierName, // Corrected to match the template's placeholder
        '[downside]': downside,
        '[downside_threshold]': downsideThreshold,
        '[notional]': notional,
        '[doc_date]': currentDate
    };

    console.log("Data passed to Docxtemplater:", data);  // Debugging

    try {
        // Ensure the template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error("Template file not found.");
        }

        const templateBuffer = fs.readFileSync(templatePath);  // Read the template file
        const zip = new PizZip(templateBuffer);  // Load the file into PizZip
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Replace placeholders
        replacePlaceholders(doc, data);

        // Generate the document in memory
        const buf = doc.getZip().generate({ type: 'nodebuffer' });

        // Set headers for download
        res.setHeader('Content-Disposition', 'attachment; filename=output.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        // Send the generated document
        res.send(buf);

    } catch (error) {
        console.error("Error processing document:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
