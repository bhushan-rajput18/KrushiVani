import express from "express";
import FAQ from "../models/FAQ.js";

const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { question } = req.body;

        if (!question) {
            return res.status(400).json({
                message: "Question is required"
            });
        }

        const faqs = await FAQ.find();

        const userQuestion = question.toLowerCase();

        let bestFAQ = null;
        let highestScore = 0;

        for (const faq of faqs) {
            let score = 0;

            // Check original question
            if (
                faq.question
                    .toLowerCase()
                    .includes(userQuestion)
            ) {
                score += 2;
            }

            // Check keywords
            for (const keyword of faq.keywords) {
                if (
                    userQuestion.includes(
                        keyword.toLowerCase()
                    )
                ) {
                    score++;
                }
            }

            if (score > highestScore) {
                highestScore = score;
                bestFAQ = faq;
            }
        }

        // =========================
        // FAQ ANSWER
        // =========================

        if (bestFAQ && highestScore > 0) {
            return res.json({
                answer: bestFAQ.answer
            });
        }

        // =========================
        // SARVAM AI ANSWER
        // =========================

        const response = await fetch(
            "https://api.sarvam.ai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "api-subscription-key":
                        process.env.SARVAM_API_KEY
                },

                body: JSON.stringify({
                    model: "sarvam-m",
                    messages: [
                        {
                            role: "system",
                            content:
                                "तुम्ही कृषीवाणी नावाचे मराठी कृषी सहाय्यक आहात. केळी शेतीशी संबंधित प्रश्नांची सोप्या आणि शेतकऱ्यांना समजेल अशा मराठीत उत्तरे द्या. उत्तर व्यावहारिक आणि स्पष्ट ठेवा. शक्य असल्यास समस्या, संभाव्य कारण आणि काय करावे हे सांगा. औषध किंवा खताचा अचूक डोस खात्रीशीर माहितीशिवाय सांगू नका."
                        },
                        {
                            role: "user",
                            content: question
                        }
                    ],
                    temperature: 0.3,
                    max_tokens: 500
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "Sarvam error:",
                data
            );

            return res.status(500).json({
                message: "Sarvam AI response failed"
            });
        }

        const answer =
            data?.choices?.[0]?.message?.content;

        if (!answer) {
            return res.status(500).json({
                message: "No answer received from Sarvam"
            });
        }

        res.json({
            answer: answer
        });

    } catch (error) {
        console.error(
            "Chatbot error:",
            error
        );

        res.status(500).json({
            message: "Chatbot error"
        });
    }
});

export default router;