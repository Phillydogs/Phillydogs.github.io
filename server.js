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

app.use(cors({ origin: 'https://phillydogs.github.io' })); // Allow only GitHub Pages domain
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const templatePath = path.join(__dirname, 'templates', 'template.docx');

// Function to replace placeholders in the Word document
function replacePlaceholders(doc, data) {
    console.log("Formatted Data for Docxtemplater:", data); // Log data for debugging
    doc.setData(data); // Pass data to Docxtemplater
}

app.post('/generate', upload.none(), (req, res) => {
    const { issuer, tradeDate, maturityDate, underlierName, downside, downsideThreshold, notional } = req.body;
    const currentDate = moment().format('MMMM D, YYYY');

    const data = {
        '[issuer]': issuer,
        '[trade_date]': tradeDate,
        '[maturity_date]': maturityDate,
        '[underlier]': underlierName,
        '[downside]': downside,
        '[downside_threshold]': downsideThreshold,
        '[notional]': notional,
        '[doc_date]': currentDate
    };

    console.log("Data passed to Docxtemplater:", data); // Debugging log

    try {
        if (!fs.existsSync(templatePath)) {
            throw new Error("Template file not found.");
        }

        const templateBuffer = fs.readFileSync(templatePath);
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        replacePlaceholders(doc, data);

        doc.render(); // Perform placeholder replacement

        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        res.setHeader('Content-Disposition', 'attachment; filename=output.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buf);

    } catch (error) {
        console.error("Error processing document:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
