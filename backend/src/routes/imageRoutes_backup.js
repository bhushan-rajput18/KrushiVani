import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const router = express.Router();

// Temporary upload folder
const uploadFolder = "uploads";

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

// Store uploaded image temporarily
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },

    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage
});

// Analyze uploaded image
router.post("/", upload.single("image"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "Image is required"
            });
        }

        console.log("Image received:");
        console.log(req.file.originalname);
        console.log(req.file.path);

        // Python script path
        const pythonScript = "C:/KrushiVani_Dataset/predict.py";

        // Start Python
        const python = spawn(
            "C:/KrushiVani_Dataset/.venv/Scripts/python.exe",
            [
                pythonScript,
                req.file.path
            ]
        );

        let output = "";
        let errorOutput = "";

        // Receive Python output
        python.stdout.on("data", (data) => {
            output += data.toString();
        });

        // Receive Python errors
        python.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        // Python finished
        python.on("close", (code) => {

            // Delete temporary image
            fs.unlink(req.file.path, (err) => {
                if (err) {
                    console.log("Could not delete temporary image");
                }
            });

            if (code !== 0) {

                console.error("Python error:");
                console.error(errorOutput);

                return res.status(500).json({
                    message: "Image analysis failed"
                });
            }

            console.log("Python output:");
            console.log(output);

            // Extract prediction
            const predictionMatch =
                output.match(/Prediction:\s*(.+)/);

            const confidenceMatch =
                output.match(/Confidence:\s*([\d.]+)%/);

            if (!predictionMatch || !confidenceMatch) {

                return res.status(500).json({
                    message: "Could not read model prediction"
                });
            }

            const prediction =
                predictionMatch[1].trim();

            const confidence =
                parseFloat(confidenceMatch[1]);

            // Low confidence handling
            if (confidence < 60) {

                return res.json({
                    prediction: "uncertain",
                    confidence: confidence,
                    message:
                        "फोटोवरून रोग निश्चितपणे ओळखता आला नाही. कृपया केळीच्या झाडाचा स्पष्ट फोटो द्या."
                });
            }

            res.json({
                prediction: prediction,
                confidence: confidence,
                message: "Image analyzed successfully"
            });

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Image analysis failed"
        });
    }

});

export default router;