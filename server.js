const express = require('express');
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const cors = require('cors');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: 'https://phillydogs.github.io' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const templatePath = path.join(__dirname, 'templates', 'template.docx');

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

    console.log("Data passed to Docxtemplater:", data);

    try {
        const templateBuffer = fs.readFileSync(templatePath);
        const zip = new PizZip(templateBuffer);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        doc.setData(data);

        // Attempt placeholder replacement
        try {
            doc.render();
        } catch (error) {
            console.error('Render error:', error);
            return res.status(500).send('Error rendering document');
        }

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
