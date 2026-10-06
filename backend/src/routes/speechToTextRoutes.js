import express from "express";
import multer from "multer";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage()
});

router.post("/", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Audio is required"
            });
        }

        const formData = new FormData();

        formData.append(
            "file",
            new Blob([req.file.buffer], {
                type: req.file.mimetype
            }),
            req.file.originalname
        );

        formData.append("model", "saaras:v4");
        formData.append("language_code", "mr-IN");
        formData.append("mode", "transcribe");

        const response = await fetch(
            "https://api.sarvam.ai/speech-to-text",
            {
                method: "POST",
                headers: {
                    "api-subscription-key":
                        process.env.SARVAM_API_KEY
                },
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Sarvam STT error:", data);

            return res.status(response.status).json({
                message: "Speech-to-text failed",
                details: data
            });
        }

        console.log("Transcript:", data.transcript);

        res.json({
            text: data.transcript
        });

    } catch (error) {
        console.error("Speech-to-text error:", error);

        res.status(500).json({
            message: "Speech-to-text failed"
        });
    }
});

export default router;