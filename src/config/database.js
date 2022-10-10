require('dotenv').config();
const { DATABASE_NAME, DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST } = process.env;

module.exports = {
    host: DATABASE_HOST,
    database: DATABASE_NAME,
    username: DATABASE_USER,
    password: DATABASE_PASSWORD,
    dialect: 'postgres',
    port: '5432',
    pool: { maxConnections: 5, maxIdleTime: 30},
};
