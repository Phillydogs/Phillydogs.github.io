const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const moment = require('moment');
const multer = require('multer');
const cors = require('cors');

const app = require('express')();
const port = 3000;

// Set up multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Allow CORS for all domains
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Template file path
const templatePath = path.join(__dirname, 'templates', 'template.docx'); // Your template path

function replacePlaceholders(doc, data) {
    // Clean data and replace placeholders
    const formattedData = {};
    Object.keys(data).forEach((key) => {
        formattedData[key.replace(/[\[\]]/g, '')] = data[key]; // Removing brackets from placeholder names
    });
    console.log("Formatted Data for Docxtemplater:", formattedData);
    doc.setData(formattedData); // Set the data in Docxtemplater to replace placeholders
}

app.post('/generate', upload.none(), (req, res) => {
    // Get data from form
    const { issuer, tradeDate, maturityDate, underlierName, downside, downsideThreshold, notional } = req.body;
    const currentDate = moment().format('MMMM D, YYYY');

    // Debugging logs
    console.log("Data received on server:", req.body);
    console.log("Date passed to Docxtemplater:", currentDate);

    try {
        // Read and load the template file
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
            '[doc_date]': currentDate,
        };

        // Log the data being passed for template replacement
        console.log("Data passed to Docxtemplater:", data);

        // Replace placeholders with actual values
        replacePlaceholders(doc, data);

        // Generate the file in memory
        const buf = doc.getZip().generate({ type: 'nodebuffer' });

        // Set response headers and send the generated file as download
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
