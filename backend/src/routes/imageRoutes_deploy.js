import express from "express";
import multer from "multer";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage()
});

router.post("/", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Image is required"
            });
        }

        const formData = new FormData();

        formData.append(
            "image",
            new Blob([req.file.buffer], {
                type: req.file.mimetype
            }),
            req.file.originalname
        );

       const response = await fetch(
    `${process.env.ML_API_URL}/predict`,
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("ML API error:", data);

            return res.status(response.status).json({
                message: "Image analysis failed",
                details: data
            });
        }

        console.log("ML prediction:", data);

        const prediction = data.prediction;
        const confidence = data.confidence;

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

    } catch (error) {
        console.error("Deployment image route error:", error);

        res.status(500).json({
            message: "Image analysis failed"
        });
    }
});

export default router;