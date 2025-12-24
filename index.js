import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import app from './src/app.js';

dotenv.config({
    path: './.env'
});

connectDB()
.then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`Server is running at : http://localhost:${PORT}`);
    });
})
.catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
});