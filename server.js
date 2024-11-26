const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const multer = require('multer');  // Import multer
const cors = require('cors');
const moment = require('moment');

const app = express();
const port = process.env.PORT || 3000;

// Multer setup to handle form data (without file upload)
const storage = multer.memoryStorage();  // We store the data in memory
const upload = multer({ storage: storage });  // Add multer middleware here

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stored template file path
const templatePath = path.join(__dirname, 'templates', 'template.docx'); // Change this to your template file path

// Helper function to replace placeholders in text
function replacePlaceholders(doc, data) {
    const formattedData = {};
    Object.keys(data).forEach(key => {
        formattedData[key.replace(/[\[\]]/g, '')] = data[key]; // Remove [ and ]
    });
    console.log("Formatted Data for Docxtemplater:", formattedData);  // Debugging data
    doc.setData(formattedData);  // Set the data for Docxtemplater to replace placeholders
}

// Handle form submission and document generation
app.post('/generate', upload.none(), (req, res) => {
    // Check if we are receiving data in the body correctly
    console.log("Data received on server:", req.body);  // Debugging line

    const { issuer, tradeDate, maturityDate, underlierName, downside, downsideThreshold, notional } = req.body;
    const currentDate = moment().format('MMMM D, YYYY');

    try {
        // Ensure template exists
        if (!fs.existsSync(templatePath)) {
            throw new Error("Template file not found.");
        }

        const templateBuffer = fs.readFileSync(templatePath);
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Prepare data to replace the placeholders in the template
        const data = {
            '[issuer]': issuer,
            '[trade_date]': tradeDate,
            '[maturity_date]': maturityDate,
            '[underlier_name]': underlierName,
            '[downside]': downside,
            '[downside_threshold]': downsideThreshold,
            '[notional]': notional,
            '[doc_date]': currentDate
        };

        console.log("Data passed to Docxtemplater:", data);  // Debugging line
        
        // Replace the placeholders with the provided data (removing the brackets)
        replacePlaceholders(doc, data);

        // Generate the file in memory
        const buf = doc.getZip().generate({ type: 'nodebuffer' });

        // Set headers for the download
        res.setHeader('Content-Disposition', 'attachment; filename=output.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

        // Send the generated file as a response
        res.send(buf);

    } catch (error) {
        console.error("Error processing document:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
