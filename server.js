// Import required modules
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Docxtemplater = require('docxtemplater');
const PizZip = require('pizzip');
const app = express();
const cors = require('cors');

// Enable CORS for specific origins (Update for production)
app.use(cors({
    origin: ['https://phillydogs.github.io'], // Update this to allow only specific domains
}));

// Middleware for handling form data
const upload = multer({ dest: 'uploads/' });

// Helper function for formatting dates
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Helper function for formatting downsideThreshold
function formatDownsideThreshold(value) {
    return parseFloat(value).toFixed(2); // Convert to 2 decimal places
}

// Route to generate the document
app.post('/generate', upload.single('template'), (req, res) => {
    try {
        // Load the template
        const content = fs.readFileSync(req.file.path, 'binary');
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Extract data from the form and apply formatting
        const data = {
            issuer: req.body.issuer,
            tradeDate: req.body['tradeDate'],
            maturityDate: formatDate(req.body['maturityDate']), // Format as "May 31, 2024"
            underlierName: req.body['underlierName'],
            downside: req.body['downside'],
            downsideThreshold: formatDownsideThreshold(req.body['downsideThreshold']), // 2 decimal places
            notional: req.body['notional'],
            doc_date: req.body['doc_date'],
        };

        console.log("Formatted Data for Docxtemplater:", data);

        // Set the data in the document
        doc.setData(data);

        // Render the document
        doc.render();

        // Generate the output file
        const buffer = doc.getZip().generate({ type: 'nodebuffer' });
        const outputPath = path.join(__dirname, 'output.docx');
        fs.writeFileSync(outputPath, buffer);

        // Send the file to the user
        res.download(outputPath, 'output.docx', (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).send('Error generating document.');
            }

            // Cleanup temporary files
            fs.unlinkSync(req.file.path);
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error('Error generating document:', error);
        res.status(500).send('Error generating document.');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
