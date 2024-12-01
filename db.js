const { Pool } = require('pg');

// Heroku automatically sets DATABASE_URL in the environment variables for your app
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Required for Heroku PostgreSQL
    },
});

// Export the pool to use for queries
module.exports = {
    query: (text, params) => pool.query(text, params),
};
