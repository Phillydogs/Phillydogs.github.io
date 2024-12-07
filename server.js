const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const cors = require("cors");

const app = express();
const upload = multer();

const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

require('dotenv').config();

// CORS configuration (adjusted for troubleshooting; allow everything for now)
app.use(cors({ origin: "*" }));

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


app.post('/underliers', express.json(), async (req, res) => {
    console.log('Request body:', req.body); // Debugging: Check the request body
    const { name } = req.body;

    if (!name) {
        console.log('Validation failed: Underlier name is required.');
        return res.status(400).send('Underlier name is required.');
    }

    try {
        const result = await pool.query(
            'INSERT INTO underliers (name) VALUES ($1) RETURNING *',
            [name]
        );
        console.log('Inserted underlier:', result.rows[0]); // Debugging: Log the saved underlier
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error inserting underlier:', error);
        res.status(500).send('Error adding underlier.');
    }
});


app.get('/underliers', async (req, res) => {
    try {
        console.log('Fetching all underliers...');
        const result = await pool.query("SELECT * FROM underliers ORDER BY created_at DESC");
        console.log('Fetched underliers:', result.rows); // Debugging: Log the fetched data
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching underliers:", error);
        res.status(500).send("Error fetching underliers.");
    }
});


app.put('/underliers/:id', express.json(), async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.status(400).send("Underlier name is required.");
    }

    try {
        const result = await pool.query(
            "UPDATE underliers SET name = $1 WHERE id = $2 RETURNING *",
            [name, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send("Underlier not found.");
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error updating underlier:", error);
        res.status(500).send("Error updating underlier.");
    }
});


app.delete('/underliers/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query("DELETE FROM underliers WHERE id = $1 RETURNING *", [id]);

        if (result.rowCount === 0) {
            return res.status(404).send("Underlier not found.");
        }

        res.sendStatus(204); // No content response
    } catch (error) {
        console.error("Error deleting underlier:", error);
        res.status(500).send("Error deleting underlier.");
    }
});


// Root endpoint for health check
app.get("/", (req, res) => {
    res.send("Server is up and running!");
});

// Helper function to remove only the $ symbol from the notional value
function cleanNotional(value) {
    if (!value) return "";
    return value.replace(/\$/g, ""); // Remove only the $ symbol
}

// Endpoint to handle file generation
app.post("/generate", upload.none(), (req, res) => {
        // Get the issuer from the request
        const issuer = req.body.issuer;

        // Choose the template file based on the issuer
        let templateFileName;
        if (issuer === 'RBC') {
            templateFileName = 'RBC template.docx';
        } else if (issuer === 'BNS') {
            templateFileName = 'BNS bofa template.docx';
        } else {
            templateFileName = 'template.docx'; // fallback if issuer isn't matched
        }
    
        // Construct the full path to the chosen template
        const templatePath = path.join(__dirname, "templates", templateFileName);
    
        try {
            const content = fs.readFileSync(templatePath, "binary");
            // ... rest of the code remains the same
        } catch (error) {
            console.error("Error reading template:", error);
            return res.status(500).send("Error reading template file.");
        }   
    
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
            CUSIP: req.body.CUSIP || "N/A",
            underlierName: req.body.underlierName || "N/A",
            downside: req.body.downside || "N/A",
            downsideThreshold: formatDownsideThreshold(req.body.downsideThreshold), // Format to 2 decimal places
            notional: cleanNotional(req.body.notional), // Remove $ and commas
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

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).send("Server error. Please try again later.");
});



// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
