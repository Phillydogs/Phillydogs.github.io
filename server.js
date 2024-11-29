const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { Delimiters } = require('docxtemplater-expressions');
const cors = require('cors');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// CORS Configuration to Allow Only Specific Domain
const corsOptions = {
    origin: 'https://phillydogs.github.io', // Replace with your production domain
    methods: ['GET', 'POST'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type'], // Allowed headers
};
app.use(cors(corsOptions)); // Apply restricted CORS middleware

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer Configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Template Path
const templatePath = path.join(__dirname, 'templates', 'template.docx');

// Configure Docxtemplater to Recognize Square Brackets
function customParser(tag) {
    return {
        get: tag === '.' ? function (s) { return s; } : function (s) { return require('angular-expressions').compile(tag)(s); }
    };
}

app.post('/generate', upload.none(), (req, res) => {
    const {
        issuer,
        tradeDate,
        maturityDate,
        underlierName,
        downside,
        downsideThreshold,
        notional
    } = req.body;

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Data for Placeholder Replacement
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
        const templateBuffer = fs.readFileSync(templatePath);
        const zip = new PizZip(templateBuffer);

        const doc = new Docxtemplater(zip, {
            modules: [new Delimiters({ delimiters: ['[', ']'] })], // Use square brackets
            parser: customParser
        });

        doc.setData(data);

        // Perform Placeholder Replacement
        try {
            doc.render();
        } catch (error) {
            console.error('Render error:', error);
            return res.status(500).send('Error rendering document');
        }

        // Generate and Send the Word Document
        const buf = doc.getZip().generate({ type: 'nodebuffer' });
        res.setHeader('Content-Disposition', 'attachment; filename=output.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buf);

    } catch (error) {
        console.error("Error processing document:", error);
        res.status(500).send(error.message);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
