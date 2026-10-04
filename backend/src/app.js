import imageRoutes from "./routes/imageRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/faqs", faqRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/image", imageRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "ShetiMitra backend is running 🌱"
    });
});

	import dns from "dns";
	dns.setServers([
    		'1.1.1.1',
    		'8.8.8.8'
	])

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URL)
    .then(() => {
        console.log("MongoDB connected successfully");

        app.listen(PORT, () => {
            console.log(`ShetiMitra server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
    });