const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const cors = require("cors");

const app = express();
const upload = multer();

// CORS configuration (adjusted for troubleshooting; allow everything for now)
app.use(cors({ origin: "*" }));

const templatePath = path.join(__dirname, "templates", "template.docx");

// Helper function for formatting dates
function formatDate(dateString) {
    if (!dateString) return "N/A";
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
}

// Helper function for formatting downsideThreshold
function formatDownsideThreshold(value) {
    if (!value) return "N/A";
    return parseFloat(value).toFixed(2); // Convert to 2 decimal places
}

function selectView(view) {
    // Reset both buttons to inactive state
    document.getElementById("prelim-btn").classList.remove("active");
    document.getElementById("final-btn").classList.remove("active");
  
    // Set the selected button to active
    if (view === "prelim") {
      document.getElementById("prelim-btn").classList.add("active");
    } else if (view === "final") {
      document.getElementById("final-btn").classList.add("active");
    }
  
    // Additional functionality can go here, e.g., toggling view content
    console.log(`Selected view: ${view}`);
  }


// Root endpoint for health check
app.get("/", (req, res) => {
    res.send("Server is up and running!");
});

// Endpoint to handle file generation
app.post("/generate", upload.none(), (req, res) => {
    try {
        // Load the Word document template
        const content = fs.readFileSync(templatePath, "binary");
        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, { linebreaks: true });

        // Set data for replacement with formatting
        const data = {
            issuer: req.body.issuer || "Unknown Issuer",
            tradeDate: req.body.tradeDate || "N/A",
            settlementDate: formatDate(req.body.settlementDate), // Format date
            maturityDate: formatDate(req.body.maturityDate), // Format date
            underlierName: req.body.underlierName || "N/A",
            downside: req.body.downside || "N/A",
            downsideThreshold: formatDownsideThreshold(req.body.downsideThreshold), // Format to 2 decimal places
            notional: req.body.notional || "N/A",
            doc_date: req.body.doc_date || "N/A",
        };

        console.log("Data passed to Docxtemplater:", data);

        // Render the template with provided data
        doc.setData(data);
        doc.render();

        // Generate the final document as a buffer
        const buffer = doc.getZip().generate({ type: "nodebuffer" });

        // Send the buffer as a downloadable .docx file
        res.setHeader("Content-Disposition", 'attachment; filename="output.docx"');
        res.send(buffer);
    } catch (error) {
        console.error("Error rendering document:", error);
        res.status(500).send(`Error generating document: ${error.message}`);
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
