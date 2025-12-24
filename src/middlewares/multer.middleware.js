import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Files will be saved here initially
        cb(null, "./public/temp"); 
    },
    filename: function (req, file, cb) {
        // Keep the original name with a suffix to avoid duplicates
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
    }
});

export const upload = multer({ 
    storage, 
    limits: { fileSize: 5 * 1024 * 1024 } // Limit: 5MB
});