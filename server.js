const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const cors = require('cors');
const moment = require('moment');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Stored template file path
const templatePath = path.join(__dirname, 'templates', 'template.docx'); // Change this to your template file path

// Helper function to replace placeholders in text
function replacePlaceholders(text, placeholder, replacement) {
    return text.split(placeholder).join(replacement);
}

app.post('/generate', (req, res) => {
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

        let xml = zip.files['word/document.xml'].asText();

        // Replace placeholders with values
        xml = replacePlaceholders(xml, '[issuer]', issuer);
        xml = replacePlaceholders(xml, '[trade_date]', tradeDate);
        xml = replacePlaceholders(xml, '[maturity_date]', maturityDate);
        xml = replacePlaceholders(xml, '[underlier_name]', underlierName);
        xml = replacePlaceholders(xml, '[downside]', downside);
        xml = replacePlaceholders(xml, '[downside_threshold]', downsideThreshold);
        xml = replacePlaceholders(xml, '[notional]', notional);
        xml = replacePlaceholders(xml, '[doc_date]', currentDate);

        zip.file('word/document.xml', xml);

        // Generate the file in memory
        const buf = zip.generate({ type: 'nodebuffer' });

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
