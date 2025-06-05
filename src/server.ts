import app from './app';
import db from './db';

const PORT = process.env.PORT || 8080;

db.query('SELECT NOW()')
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('Failed to connect to database on startup:', err);
        process.exit(1);
    });

