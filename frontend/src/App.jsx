import { useEffect, useRef, useState } from "react";

function App() {
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);

    const [imageLoading, setImageLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");

    const [cameraOpen, setCameraOpen] = useState(false);
    const [speaking, setSpeaking] = useState(false);

    const cameraVideoRef = useRef(null);
    const cameraStreamRef = useRef(null);

    const galleryInputRef = useRef(null);
    const chatRef = useRef(null);

    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "🌱 नमस्कार! कृषीवाणी तुमच्या केळी शेतीसाठी मदत करण्यास तयार आहे."
        }
    ]);

    // =========================
    // Preview
    // =========================

    useEffect(() => {
        if (!selectedImage) {
            setPreviewUrl("");
            return;
        }

        const url = URL.createObjectURL(selectedImage);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [selectedImage]);

    // =========================
    // Auto Scroll
    // =========================

    useEffect(() => {
        if (chatRef.current) {
            chatRef.current.scrollTop =
                chatRef.current.scrollHeight;
        }
    }, [messages, loading, imageLoading]);

    // =========================
    // 🔊 Marathi Voice Output
    // =========================

    const speakMarathi = (text) => {
        if (!("speechSynthesis" in window)) {
            alert(
                "तुमच्या ब्राउझरमध्ये आवाजाची सुविधा उपलब्ध नाही."
            );
            return;
        }

        window.speechSynthesis.cancel();

        const cleanText = text
            .replace(
                /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu,
                ""
            )
            .replace(/\n+/g, ". ")
            .trim();

        if (!cleanText) return;

        const speech =
            new SpeechSynthesisUtterance(cleanText);

        speech.lang = "mr-IN";
        speech.rate = 0.9;
        speech.pitch = 1;
        speech.volume = 1;

        const voices =
            window.speechSynthesis.getVoices();

        const marathiVoice = voices.find(
            (voice) =>
                voice.lang.toLowerCase() === "mr-in" ||
                voice.lang.toLowerCase().startsWith("mr")
        );

        if (marathiVoice) {
            speech.voice = marathiVoice;
        }

        speech.onstart = () => {
            setSpeaking(true);
        };

        speech.onend = () => {
            setSpeaking(false);
        };

        speech.onerror = () => {
            setSpeaking(false);
        };

        window.speechSynthesis.speak(speech);
    };

    // =========================
    // Stop Voice
    // =========================

    const stopSpeaking = () => {
        window.speechSynthesis.cancel();
        setSpeaking(false);
    };

    // =========================
    // Voice Input
    // =========================

    const startListening = () => {
        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert(
                "तुमच्या ब्राउझरमध्ये आवाजाची सुविधा उपलब्ध नाही."
            );
            return;
        }

        const recognition = new SpeechRecognition();

        recognition.lang = "mr-IN";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => {
            setListening(true);
        };

        recognition.onresult = (event) => {
            const transcript =
                event.results[0][0].transcript;

            setQuestion(transcript);
        };

        recognition.onerror = (event) => {
            console.error(
                "Speech recognition error:",
                event.error
            );

            setListening(false);
        };

        recognition.onend = () => {
            setListening(false);
        };

        recognition.start();
    };

    // =========================
    // Send Question
    // =========================

    const sendQuestion = async (text = question) => {
        if (!text.trim() || loading) return;

        const userQuestion = text.trim();

        setMessages((previousMessages) => [
            ...previousMessages,
            {
                sender: "user",
                text: userQuestion
            }
        ]);

        setQuestion("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/chat",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        question: userQuestion
                    })
                }
            );

            const data = await response.json();

            const answer =
                data.answer ||
                "उत्तर मिळाले नाही.";

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    sender: "bot",
                    text: answer
                }
            ]);

            // 🔊 Speak chatbot answer in Marathi
            speakMarathi(answer);

        } catch (error) {
            console.error(error);

            const errorMessage =
                "सर्व्हरशी कनेक्ट होता आले नाही. कृपया पुन्हा प्रयत्न करा.";

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    sender: "bot",
                    text: "❌ " + errorMessage
                }
            ]);

            speakMarathi(errorMessage);

        } finally {
            setLoading(false);
        }
    };

    // =========================
    // Image Analysis
    // =========================

    const analyzeImage = async (file) => {
        if (!file) return;

        setSelectedImage(file);
        setImageLoading(true);

        setMessages((previousMessages) => [
            ...previousMessages,
            {
                sender: "user",
                text: "📷 पिकाचा फोटो पाठवला आहे."
            }
        ]);

        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch(
                "http://localhost:5000/api/image",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            let message = "";

            if (data.prediction === "uncertain") {
                message =
                    "⚠️ " +
                    (data.message ||
                        "फोटोवरून रोग निश्चितपणे ओळखता आला नाही.");
            } else {
                let diseaseName = data.prediction;

                if (diseaseName === "healthy") {
                    diseaseName =
                        "केळीचे झाड निरोगी दिसत आहे.";
                } else if (
                    diseaseName === "fusarium_wilt"
                ) {
                    diseaseName =
                        "फ्युजेरियम विल्ट म्हणजे पनामा रोग.";
                } else if (
                    diseaseName === "yellow_sigatoka"
                ) {
                    diseaseName =
                        "यलो सिगाटोका रोगाची लक्षणे दिसत आहेत.";
                }

                const confidence =
                    Number(data.confidence || 0);

                message =
                    "फोटो तपासला आहे.\n\n" +
                    "ओळख: " +
                    diseaseName +
                    "\n\n" +
                    "विश्वास: " +
                    confidence.toFixed(2) +
                    "%";

                if (confidence < 70) {
                    message +=
                        "\n\nफोटोवरून खात्रीने सांगता येत नाही. अधिक स्पष्ट फोटो द्या.";
                }
            }

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    sender: "bot",
                    text: message
                }
            ]);

            // 🔊 Speak image-analysis result in Marathi
            speakMarathi(message);

        } catch (error) {
            console.error(error);

            const errorMessage =
                "फोटो तपासता आला नाही. कृपया पुन्हा फोटो पाठवा.";

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    sender: "bot",
                    text: "❌ " + errorMessage
                }
            ]);

            speakMarathi(errorMessage);

        } finally {
            setImageLoading(false);
        }
    };

    // =========================
    // Gallery
    // =========================

    const openGallery = () => {
        galleryInputRef.current?.click();
    };

    const handleGalleryUpload = (event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        analyzeImage(file);

        event.target.value = "";
    };

    // =========================
    // Camera
    // =========================

    const openCamera = async () => {
        try {
            let stream;

            try {
                stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: {
                                ideal: "environment"
                            }
                        },
                        audio: false
                    });
            } catch {
                stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
            }

            cameraStreamRef.current = stream;
            setCameraOpen(true);

            setTimeout(() => {
                if (cameraVideoRef.current) {
                    cameraVideoRef.current.srcObject =
                        stream;
                }
            }, 100);

        } catch (error) {
            console.error(error);

            alert(
                "कॅमेरा सुरू करता आला नाही. कृपया Browser Camera Permission तपासा."
            );
        }
    };

    const closeCamera = () => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current
                .getTracks()
                .forEach((track) => track.stop());

            cameraStreamRef.current = null;
        }

        setCameraOpen(false);
    };

    const capturePhoto = () => {
        const video = cameraVideoRef.current;

        if (!video) return;

        const canvas =
            document.createElement("canvas");

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");

        context.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        canvas.toBlob(
            (blob) => {
                if (!blob) return;

                const file = new File(
                    [blob],
                    "krushivani-photo.jpg",
                    {
                        type: "image/jpeg"
                    }
                );

                closeCamera();
                analyzeImage(file);
            },
            "image/jpeg",
            0.9
        );
    };

    // =========================
    // Quick Questions
    // =========================

    const quickQuestion = (text) => {
        setQuestion(text);

        setTimeout(() => {
            sendQuestion(text);
        }, 50);
    };

    // =========================
    // UI
    // =========================

    return (
        <div className="app">

            <style>{`

                * {
                    box-sizing: border-box;
                }

                html {
                    scroll-behavior: smooth;
                }

                body {
                    margin: 0;
                    font-family:
                        "Noto Sans Devanagari",
                        "Nirmala UI",
                        Arial,
                        sans-serif;
                    background: #f4faf5;
                    color: #173b25;
                }

                button,
                input {
                    font-family: inherit;
                }

                button {
                    -webkit-tap-highlight-color: transparent;
                }

                .app {
                    min-height: 100vh;
                    background:
                        radial-gradient(
                            circle at top right,
                            rgba(126, 211, 141, 0.20),
                            transparent 28%
                        ),
                        linear-gradient(
                            180deg,
                            #f7fcf8 0%,
                            #eef8f0 100%
                        );
                }

                .topbar {
                    width: 100%;
                    background: linear-gradient(
                        135deg,
                        #176b38,
                        #23884a
                    );
                    min-height: 76px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px clamp(18px, 5vw, 70px);
                    box-shadow:
                        0 5px 20px rgba(24, 91, 48, 0.18);
                    color: white;
                }

                .brand {
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    min-width: 0;
                }

                .brand-icon {
                    width: 48px;
                    height: 48px;
                    flex-shrink: 0;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                    background: rgba(255,255,255,0.16);
                }

                .brand h1 {
                    margin: 0;
                    font-size: 25px;
                    line-height: 1.15;
                    font-weight: 800;
                    color: white;
                }

                .brand span {
                    display: block;
                    margin-top: 3px;
                    font-size: 12px;
                    color: rgba(255,255,255,0.78);
                }

                .status {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    padding: 8px 13px;
                    border-radius: 30px;
                    background: rgba(255,255,255,0.12);
                    color: #eaffef;
                    font-size: 13px;
                    white-space: nowrap;
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    background: #8df5a6;
                    border-radius: 50%;
                    box-shadow: 0 0 10px #8df5a6;
                }

                .main {
                    width: min(1120px, calc(100% - 32px));
                    margin: 0 auto;
                    padding: 32px 0 35px;
                }

                .hero {
                    position: relative;
                    overflow: hidden;
                    min-height: 300px;
                    border-radius: 28px;
                    padding: clamp(30px, 5vw, 55px);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 30px;
                    background:
                        radial-gradient(
                            circle at 90% 15%,
                            rgba(255,255,255,0.18),
                            transparent 25%
                        ),
                        linear-gradient(
                            135deg,
                            #176b38,
                            #238b4b 52%,
                            #2e9c57
                        );
                    box-shadow:
                        0 18px 45px rgba(31, 112, 57, 0.20);
                }

                .hero-content {
                    position: relative;
                    z-index: 2;
                    max-width: 680px;
                }

                .welcome-tag {
                    display: inline-flex;
                    padding: 7px 13px;
                    border-radius: 30px;
                    background: rgba(255,255,255,0.14);
                    color: white;
                    font-size: 14px;
                    margin-bottom: 15px;
                }

                .hero h2 {
                    margin: 0;
                    color: white;
                    font-size: clamp(28px, 4vw, 47px);
                    line-height: 1.2;
                    font-weight: 800;
                }

                .hero p {
                    margin: 17px 0 0;
                    color: rgba(255,255,255,0.90);
                    font-size: 17px;
                    line-height: 1.9;
                }

                .hero-farmer {
                    position: relative;
                    z-index: 2;
                    width: 150px;
                    height: 150px;
                    flex-shrink: 0;
                    border-radius: 45px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 80px;
                    background: rgba(255,255,255,0.12);
                }

                .section {
                    margin-top: 35px;
                }

                .section-heading {
                    display: flex;
                    align-items: end;
                    justify-content: space-between;
                    gap: 15px;
                    margin-bottom: 15px;
                }

                .section-heading h3 {
                    margin: 0;
                    color: #183e27;
                    font-size: 23px;
                    font-weight: 800;
                }

                .section-heading span {
                    color: #6c8673;
                    font-size: 13px;
                }

                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 18px;
                }

                .feature-card {
                    border: none;
                    text-align: left;
                    min-height: 145px;
                    padding: 25px;
                    border-radius: 23px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    transition: 0.2s ease;
                }

                .feature-card:hover {
                    transform: translateY(-3px);
                }

                .feature-card:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                    transform: none;
                }

                .voice-card {
                    background: linear-gradient(
                        135deg,
                        #e3f7e7,
                        #f1fbf2
                    );
                    border: 1px solid #c9e9d0;
                }

                .photo-card {
                    background: linear-gradient(
                        135deg,
                        #fff4dc,
                        #fffaf0
                    );
                    border: 1px solid #f1dfb8;
                }

                .feature-icon {
                    width: 62px;
                    height: 62px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 19px;
                    font-size: 31px;
                    background: white;
                    box-shadow:
                        0 6px 18px rgba(0,0,0,0.08);
                }

                .feature-card strong {
                    display: block;
                    color: #183d26;
                    font-size: 20px;
                    margin-bottom: 6px;
                }

                .feature-card p {
                    margin: 0;
                    color: #69806f;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .preview-card {
                    margin-top: 20px;
                    padding: 18px;
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #dcebe0;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .preview-card img {
                    width: 90px;
                    height: 90px;
                    object-fit: cover;
                    border-radius: 15px;
                    border: 3px solid #3a9957;
                }

                .preview-text strong {
                    display: block;
                    color: #1d4b2c;
                    margin-bottom: 5px;
                }

                .preview-text span {
                    color: #718476;
                    font-size: 13px;
                }

                .quick-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 13px;
                }

                .quick-card {
                    border: 1px solid #dcebe0;
                    background: white;
                    padding: 16px;
                    border-radius: 18px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    text-align: left;
                    transition: 0.2s ease;
                }

                .quick-card:hover {
                    transform: translateY(-2px);
                    border-color: #9bcbaa;
                }

                .quick-icon {
                    width: 42px;
                    height: 42px;
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 13px;
                    background: #edf8ef;
                    font-size: 21px;
                }

                .quick-card strong {
                    display: block;
                    color: #244b30;
                    font-size: 15px;
                }

                .quick-card small {
                    display: block;
                    margin-top: 3px;
                    color: #819187;
                    font-size: 11px;
                }

                .chat-box {
                    margin-top: 35px;
                    background: white;
                    border: 1px solid #dcebe0;
                    border-radius: 25px;
                    overflow: hidden;
                    box-shadow:
                        0 12px 35px rgba(30, 90, 45, 0.08);
                }

                .chat-header {
                    padding: 20px 23px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid #edf2ee;
                    background: #fbfefb;
                }

                .chat-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .chat-avatar {
                    width: 46px;
                    height: 46px;
                    border-radius: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #e5f5e8;
                    font-size: 24px;
                }

                .chat-header h3 {
                    margin: 0;
                    color: #21492c;
                    font-size: 19px;
                }

                .chat-header p {
                    margin: 3px 0 0;
                    color: #7b8d80;
                    font-size: 12px;
                }

                .chat-online {
                    color: #3e9454;
                    font-size: 12px;
                }

                .messages {
                    height: 390px;
                    overflow-y: auto;
                    padding: 23px;
                    background: #f8fcf8;
                }

                .message-row {
                    display: flex;
                    gap: 9px;
                    margin-bottom: 15px;
                    width: 100%;
                }

                .bot-row {
                    justify-content: flex-start;
                }

                .user-row {
                    justify-content: flex-end;
                }

                .avatar {
                    width: 35px;
                    height: 35px;
                    flex-shrink: 0;
                    border-radius: 11px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #e3f5e7;
                    font-size: 18px;
                }

                .message {
                    max-width: min(75%, 650px);
                    padding: 13px 16px;
                    border-radius: 17px;
                    line-height: 1.65;
                    font-size: 14px;
                    white-space: pre-line;
                }

                .bot-message {
                    background: white;
                    color: #304938;
                    border: 1px solid #e1ebe3;
                    border-top-left-radius: 5px;
                }

                .user-message {
                    background: #23884a;
                    color: white;
                    border-top-right-radius: 5px;
                }

                .message strong {
                    display: block;
                    margin-bottom: 5px;
                    font-size: 12px;
                    color: #2f8147;
                }

                .message p {
                    margin: 0;
                }

                .loading {
                    display: flex;
                    gap: 5px;
                    align-items: center;
                    min-width: 60px;
                }

                .loading span {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #65a975;
                    animation: bounce 1.2s infinite;
                }

                .loading span:nth-child(2) {
                    animation-delay: 0.15s;
                }

                .loading span:nth-child(3) {
                    animation-delay: 0.3s;
                }

                @keyframes bounce {
                    0%, 60%, 100% {
                        transform: translateY(0);
                    }

                    30% {
                        transform: translateY(-5px);
                    }
                }

                .bottom-area {
                    width: min(1120px, calc(100% - 32px));
                    margin: 0 auto;
                    padding: 0 0 30px;
                }

                .listening {
                    margin-bottom: 10px;
                    padding: 11px 15px;
                    border-radius: 14px;
                    background: #fff0f0;
                    color: #b52d2d;
                    text-align: center;
                    font-size: 13px;
                    border: 1px solid #ffd6d6;
                }

                .speaking {
                    margin-bottom: 10px;
                    padding: 10px 14px;
                    border-radius: 13px;
                    background: #e8f7eb;
                    color: #27703c;
                    text-align: center;
                    font-size: 13px;
                }

                .input-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    padding: 9px;
                    background: white;
                    border: 1px solid #d6e6da;
                    border-radius: 19px;
                    box-shadow:
                        0 8px 25px rgba(35, 100, 49, 0.08);
                }

                .mic-button,
                .send-button {
                    width: 46px;
                    height: 46px;
                    flex-shrink: 0;
                    border: none;
                    border-radius: 14px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 21px;
                }

                .mic-button {
                    background: #eaf7ed;
                }

                .mic-button.active {
                    background: #ffe2e2;
                    animation: pulse 1.2s infinite;
                }

                .send-button {
                    background: #23884a;
                    color: white;
                }

                .send-button:disabled,
                .mic-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                @keyframes pulse {
                    50% {
                        transform: scale(1.06);
                    }
                }

                .question-input {
                    flex: 1;
                    min-width: 0;
                    border: none;
                    outline: none;
                    font-size: 15px;
                    color: #294631;
                    background: transparent;
                    padding: 0 6px;
                }

                .question-input::placeholder {
                    color: #9aaba0;
                }

                .photo-actions {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-top: 12px;
                }

                .photo-action {
                    min-height: 52px;
                    border: none;
                    border-radius: 15px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 700;
                    transition: 0.2s ease;
                }

                .photo-action:hover {
                    transform: translateY(-2px);
                }

                .camera-action {
                    color: white;
                    background: #23884a;
                }

                .gallery-action {
                    color: #34543c;
                    background: #edf7ef;
                    border: 1px solid #d5e8d9;
                }

                .photo-action:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                    transform: none;
                }

                .footer-text {
                    margin: 18px 0 0;
                    text-align: center;
                    color: #8a9b8e;
                    font-size: 12px;
                }

                /* Camera */

                .camera-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    background: rgba(7, 24, 13, 0.78);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                    backdrop-filter: blur(5px);
                }

                .camera-modal {
                    width: min(650px, 100%);
                    background: white;
                    border-radius: 25px;
                    padding: 18px;
                    box-shadow:
                        0 25px 80px rgba(0,0,0,0.35);
                }

                .camera-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 13px;
                }

                .camera-header h3 {
                    margin: 0;
                    color: #20452b;
                    font-size: 19px;
                }

                .close-camera {
                    width: 38px;
                    height: 38px;
                    border: none;
                    border-radius: 12px;
                    background: #edf4ef;
                    cursor: pointer;
                    font-size: 20px;
                }

                .camera-video {
                    display: block;
                    width: 100%;
                    max-height: 65vh;
                    min-height: 250px;
                    object-fit: cover;
                    border-radius: 18px;
                    background: #101712;
                }

                .capture-button {
                    width: 100%;
                    margin-top: 13px;
                    height: 52px;
                    border: none;
                    border-radius: 15px;
                    background: #23884a;
                    color: white;
                    font-size: 16px;
                    font-weight: 800;
                    cursor: pointer;
                }

                @media (max-width: 850px) {

                    .quick-grid {
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                    }

                    .hero-farmer {
                        width: 120px;
                        height: 120px;
                        font-size: 65px;
                    }
                }

                @media (max-width: 650px) {

                    .topbar {
                        padding: 11px 16px;
                    }

                    .brand h1 {
                        font-size: 21px;
                    }

                    .brand span {
                        font-size: 10px;
                    }

                    .status {
                        padding: 7px 9px;
                        font-size: 11px;
                    }

                    .main {
                        width: min(
                            100% - 22px,
                            600px
                        );
                        padding-top: 18px;
                    }

                    .hero {
                        min-height: 0;
                        padding: 28px 22px;
                        border-radius: 23px;
                    }

                    .hero h2 {
                        font-size: 29px;
                    }

                    .hero p {
                        font-size: 14px;
                    }

                    .hero-farmer {
                        display: none;
                    }

                    .feature-grid {
                        grid-template-columns: 1fr;
                    }

                    .feature-card {
                        min-height: 125px;
                    }

                    .quick-grid {
                        grid-template-columns: 1fr 1fr;
                    }

                    .quick-card {
                        padding: 13px;
                    }

                    .quick-card small {
                        display: none;
                    }

                    .messages {
                        height: 350px;
                        padding: 16px;
                    }

                    .message {
                        max-width: 88%;
                    }

                    .bottom-area {
                        width: min(
                            100% - 22px,
                            600px
                        );
                    }

                    .photo-actions {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 420px) {

                    .brand span {
                        display: none;
                    }

                    .brand-icon {
                        width: 43px;
                        height: 43px;
                    }

                    .hero h2 {
                        font-size: 26px;
                    }

                    .section-heading h3 {
                        font-size: 20px;
                    }

                    .quick-grid {
                        grid-template-columns: 1fr 1fr;
                    }

                    .quick-card {
                        min-height: 75px;
                    }

                    .quick-icon {
                        width: 36px;
                        height: 36px;
                        font-size: 18px;
                    }

                    .quick-card strong {
                        font-size: 13px;
                    }

                    .input-wrapper {
                        padding: 7px;
                    }

                    .mic-button,
                    .send-button {
                        width: 43px;
                        height: 43px;
                    }
                }

            `}</style>

            {/* ================= HEADER ================= */}

            <header className="topbar">

                <div className="brand">

                    <div className="brand-icon">
                        🌱
                    </div>

                    <div>
                        <h1>कृषीवाणी</h1>

                        <span>
                            शेतकऱ्यांचा डिजिटल मित्र
                        </span>
                    </div>

                </div>

                <div className="status">
                    <span className="status-dot"></span>
                    ऑनलाइन
                </div>

            </header>


            {/* ================= MAIN ================= */}

            <main className="main">

                {/* HERO */}

                <section className="hero">

                    <div className="hero-content">

                        <span className="welcome-tag">
                            🌾 तुमच्या शेतीसाठी
                        </span>

                        <h2>
                            तुमच्या शेतीची मदत
                            इथे मिळवा
                        </h2>

                        <p>
                            🎤 मराठीत बोलून प्रश्न विचारा
                            <br />
                            📷 पिकाचा फोटो पाठवून समस्या तपासा
                        </p>

                    </div>

                    <div className="hero-farmer">
                        👨‍🌾
                    </div>

                </section>


                {/* ACTIONS */}

                <section className="section">

                    <div className="section-heading">

                        <h3>
                            तुम्हाला काय करायचे आहे?
                        </h3>

                        <span>
                            दोन सोपे पर्याय
                        </span>

                    </div>


                    <div className="feature-grid">

                        <button
                            className="feature-card voice-card"
                            onClick={startListening}
                            disabled={
                                loading ||
                                listening
                            }
                        >

                            <div className="feature-icon">
                                🎤
                            </div>

                            <div>

                                <strong>
                                    बोलून विचारा
                                </strong>

                                <p>
                                    मराठीत बोला आणि तुमचा प्रश्न विचारा
                                </p>

                            </div>

                        </button>


                        <button
                            className="feature-card photo-card"
                            onClick={openCamera}
                            disabled={imageLoading}
                        >

                            <div className="feature-icon">
                                📷
                            </div>

                            <div>

                                <strong>
                                    पिकाचा फोटो तपासा
                                </strong>

                                <p>
                                    कॅमेरा वापरून झाडाचा फोटो काढा
                                </p>

                            </div>

                        </button>

                    </div>


                    {selectedImage && previewUrl && (

                        <div className="preview-card">

                            <img
                                src={previewUrl}
                                alt="Banana plant"
                            />

                            <div className="preview-text">

                                <strong>
                                    📷 फोटो तपासणी
                                </strong>

                                <span>
                                    {imageLoading
                                        ? "AI फोटो तपासत आहे..."
                                        : "फोटो तपासणी पूर्ण झाली."}
                                </span>

                            </div>

                        </div>

                    )}

                </section>


                {/* QUICK QUESTIONS */}

                <section className="section">

                    <div className="section-heading">

                        <h3>
                            पटकन प्रश्न विचारा
                        </h3>

                        <span>
                            👇 एक निवडा
                        </span>

                    </div>


                    <div className="quick-grid">

                        <button
                            className="quick-card"
                            onClick={() =>
                                quickQuestion(
                                    "केळी पिकासाठी योग्य खत कोणते?"
                                )
                            }
                        >

                            <div className="quick-icon">
                                🌱
                            </div>

                            <div>
                                <strong>खत</strong>

                                <small>
                                    कोणते खत?
                                </small>
                            </div>

                        </button>


                        <button
                            className="quick-card"
                            onClick={() =>
                                quickQuestion(
                                    "केळीला किती पाणी द्यावे?"
                                )
                            }
                        >

                            <div className="quick-icon">
                                💧
                            </div>

                            <div>
                                <strong>पाणी</strong>

                                <small>
                                    किती पाणी?
                                </small>
                            </div>

                        </button>


                        <button
                            className="quick-card"
                            onClick={() =>
                                quickQuestion(
                                    "केळीच्या पानांवर पिवळेपणा का येतो?"
                                )
                            }
                        >

                            <div className="quick-icon">
                                🍃
                            </div>

                            <div>
                                <strong>पाने</strong>

                                <small>
                                    पाने पिवळी?
                                </small>
                            </div>

                        </button>


                        <button
                            className="quick-card"
                            onClick={() =>
                                quickQuestion(
                                    "केळीच्या पिकावर कीड दिसल्यास काय करावे?"
                                )
                            }
                        >

                            <div className="quick-icon">
                                🐛
                            </div>

                            <div>
                                <strong>कीड</strong>

                                <small>
                                    काय करावे?
                                </small>
                            </div>

                        </button>

                    </div>

                </section>


                {/* CHAT */}

                <section className="chat-box">

                    <div className="chat-header">

                        <div className="chat-title">

                            <div className="chat-avatar">
                                🌱
                            </div>

                            <div>

                                <h3>
                                    कृषीवाणी
                                </h3>

                                <p>
                                    तुमचे प्रश्न आणि उत्तरे
                                </p>

                            </div>

                        </div>

                        <span className="chat-online">
                            ● ऑनलाइन
                        </span>

                    </div>


                    <div
                        className="messages"
                        ref={chatRef}
                    >

                        {messages.map(
                            (message, index) => (

                                <div
                                    key={index}
                                    className={
                                        "message-row " +
                                        (
                                            message.sender ===
                                            "user"
                                                ? "user-row"
                                                : "bot-row"
                                        )
                                    }
                                >

                                    {message.sender ===
                                        "bot" && (

                                        <div className="avatar">
                                            🌱
                                        </div>

                                    )}


                                    <div
                                        className={
                                            "message " +
                                            (
                                                message.sender ===
                                                "user"
                                                    ? "user-message"
                                                    : "bot-message"
                                            )
                                        }
                                    >

                                        {message.sender ===
                                            "bot" && (

                                            <strong>
                                                कृषीवाणी
                                            </strong>

                                        )}

                                        <p>
                                            {message.text}
                                        </p>

                                    </div>

                                </div>

                            )
                        )}


                        {(loading ||
                            imageLoading) && (

                            <div className="message-row bot-row">

                                <div className="avatar">
                                    🌱
                                </div>

                                <div className="message bot-message loading">

                                    <span></span>
                                    <span></span>
                                    <span></span>

                                </div>

                            </div>

                        )}

                    </div>

                </section>

            </main>


            {/* ================= BOTTOM ================= */}

            <footer className="bottom-area">

                {listening && (

                    <div className="listening">

                        🔴 ऐकत आहे...
                        <br />
                        मराठीत बोला

                    </div>

                )}


                {speaking && (

                    <div className="speaking">

                        🔊 कृषीवाणी उत्तर सांगत आहे...

                        <button
                            onClick={stopSpeaking}
                            style={{
                                marginLeft: "10px",
                                border: "none",
                                borderRadius: "8px",
                                padding: "5px 9px",
                                cursor: "pointer",
                                background: "#ffffff",
                                color: "#27703c"
                            }}
                        >
                            थांबवा
                        </button>

                    </div>

                )}


                <div className="input-wrapper">

                    <button
                        className={
                            "mic-button " +
                            (
                                listening
                                    ? "active"
                                    : ""
                            )
                        }
                        onClick={startListening}
                        disabled={
                            loading ||
                            listening
                        }
                    >
                        🎤
                    </button>


                    <input
                        className="question-input"
                        type="text"
                        value={question}
                        onChange={(e) =>
                            setQuestion(
                                e.target.value
                            )
                        }
                        onKeyDown={(e) => {

                            if (e.key === "Enter") {
                                sendQuestion();
                            }

                        }}
                        placeholder="इथे तुमचा प्रश्न लिहा..."
                    />


                    <button
                        className="send-button"
                        onClick={() =>
                            sendQuestion()
                        }
                        disabled={
                            loading ||
                            !question.trim()
                        }
                    >
                        ➤
                    </button>

                </div>


                {/* PHOTO BUTTONS */}

                <div className="photo-actions">

                    <button
                        className="photo-action camera-action"
                        onClick={openCamera}
                        disabled={imageLoading}
                    >
                        📷 फोटो काढा
                    </button>


                    <button
                        className="photo-action gallery-action"
                        onClick={openGallery}
                        disabled={imageLoading}
                    >
                        🖼️ गॅलरीमधून निवडा
                    </button>

                </div>


                <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    style={{
                        display: "none"
                    }}
                />


                <p className="footer-text">
                    🌱 कृषीवाणी •
                    केळी शेतीसाठी तुमचा डिजिटल साथीदार
                </p>

            </footer>


            {/* ================= CAMERA MODAL ================= */}

            {cameraOpen && (

                <div className="camera-overlay">

                    <div className="camera-modal">

                        <div className="camera-header">

                            <h3>
                                📷 फोटो काढा
                            </h3>

                            <button
                                className="close-camera"
                                onClick={closeCamera}
                            >
                                ✕
                            </button>

                        </div>


                        <video
                            ref={cameraVideoRef}
                            className="camera-video"
                            autoPlay
                            playsInline
                            muted
                        />


                        <button
                            className="capture-button"
                            onClick={capturePhoto}
                        >
                            📸 फोटो कॅप्चर करा
                        </button>

                    </div>

                </div>

            )}

        </div>
    );
}

export default App;