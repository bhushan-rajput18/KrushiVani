import express from "express";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                message: "Text is required"
            });
        }

        const response = await fetch(
            "https://api.sarvam.ai/text-to-speech",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "api-subscription-key":
                        process.env.SARVAM_API_KEY
                },

                body: JSON.stringify({
                    inputs: [text],
                    target_language_code: "mr-IN",
                    speaker: "shubh",
                    model: "bulbul:v3",
                    pace: 1.0,
                    speech_sample_rate: 24000,
                    enable_preprocessing: true
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "Sarvam TTS error:",
                data
            );

            return res.status(response.status).json({
                message: "Text-to-speech failed",
                details: data
            });
        }

        const audioBase64 =
            data?.audios?.[0];

        if (!audioBase64) {
            return res.status(500).json({
                message: "No audio received from Sarvam"
            });
        }

        res.json({
            audio: audioBase64
        });

    } catch (error) {
        console.error(
            "Text-to-speech error:",
            error
        );

        res.status(500).json({
            message: "Text-to-speech failed"
        });
    }
});

export default router;