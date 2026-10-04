import { useRef, useState } from "react";
import "./App.css";

function App() {
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);

    // Image states
    const [imageLoading, setImageLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    const fileInputRef = useRef(null);

    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "🌱 कृषीवाणी तुमच्या शेतीसाठी मदत करेल."
        }
    ]);

    // =========================
    // 🎤 Voice Input
    // =========================

    const startListening = () => {
        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("तुमच्या ब्राउझरमध्ये आवाजाची सुविधा उपलब्ध नाही.");
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
    // 💬 Send Question
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

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    sender: "bot",
                    text: data.answer
                }
            ]);

        } catch (error) {
            console.error(error);

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    sender: "bot",
                    text: "सर्व्हरशी कनेक्ट होता आले नाही. कृपया पुन्हा प्रयत्न करा."
                }
            ]);

        } finally {
            setLoading(false);
        }
    };

    // =========================
    // 📷 Image Upload
    // =========================

    const openImagePicker = () => {
        fileInputRef.current?.click();
    };

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];

        if (!file) return;

        setSelectedImage(file);

        setImageLoading(true);

        // Show image sent message
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
                    data.message;

            } else {

                let diseaseName = data.prediction;

                // Convert model names into simple Marathi
                if (diseaseName === "healthy") {
                    diseaseName = "केळीचे झाड निरोगी दिसत आहे 🌱";
                }

                else if (
                    diseaseName === "fusarium_wilt"
                ) {
                    diseaseName =
                        "फ्युजेरियम विल्ट (पनामा रोग)";
                }

                else if (
                    diseaseName === "yellow_sigatoka"
                ) {
                    diseaseName =
                        "यलो सिगाटोका";
                }

                message =
                    "🔍 फोटो तपासला आहे.\n\n" +
                    "📌 ओळख: " +
                    diseaseName +
                    "\n\n" +
                    "📊 विश्वास: " +
                    data.confidence.toFixed(2) +
                    "%";

                // Low confidence safety message
                if (data.confidence < 70) {
                    message +=
                        "\n\n⚠️ फोटोवरून खात्रीने सांगता येत नाही. अधिक स्पष्ट फोटो द्या.";
                }
            }

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    sender: "bot",
                    text: message
                }
            ]);

        } catch (error) {

            console.error(error);

            setMessages((previousMessages) => [
                ...previousMessages,
                {
                    sender: "bot",
                    text:
                        "❌ फोटो तपासता आला नाही.\nकृपया पुन्हा फोटो पाठवा."
                }
            ]);

        } finally {

            setImageLoading(false);

            // Allow same image to be selected again
            event.target.value = "";
        }
    };

    // =========================
    // Quick Question
    // =========================

    const quickQuestion = (text) => {
        setQuestion(text);
    };

    // =========================
    // UI
    // =========================

    return (
        <div className="app">

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

                {/* ================= HERO ================= */}

                <section className="hero">

                    <div className="hero-content">

                        <span className="welcome-tag">
                            🌾 तुमच्या शेतीसाठी
                        </span>

                        <h2>
                            तुमच्या शेतीची मदत इथे मिळवा
                        </h2>

                        <p>
                            🎤 बोलून विचारा
                            <br />
                            📷 पिकाचा फोटो पाठवा
                        </p>

                    </div>

                    <div className="hero-farmer">
                        👨‍🌾
                    </div>

                </section>


                {/* ================= MAIN ACTIONS ================= */}

                <section className="feature-section">

                    <h3>
                        तुम्हाला काय करायचे आहे?
                    </h3>

                    <div className="feature-grid">

                        {/* Voice */}

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
                                    मराठीत बोला
                                </p>
                            </div>

                        </button>


                        {/* Photo */}

                        <button
                            className="feature-card photo-card"
                            onClick={openImagePicker}
                            disabled={imageLoading}
                        >

                            <div className="feature-icon">
                                📷
                            </div>

                            <div>
                                <strong>
                                    पिकाचा फोटो
                                </strong>

                                <p>
                                    {imageLoading
                                        ? "फोटो तपासत आहे..."
                                        : "फोटो काढा / निवडा"}
                                </p>
                            </div>

                        </button>

                    </div>


                    {/* Hidden image input */}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        style={{
                            display: "none"
                        }}
                    />


                    {/* Image preview */}

                    {selectedImage && (
                        <div
                            style={{
                                marginTop: "20px",
                                textAlign: "center"
                            }}
                        >

                            <img
                                src={URL.createObjectURL(
                                    selectedImage
                                )}
                                alt="Banana plant"
                                style={{
                                    width: "180px",
                                    height: "180px",
                                    objectFit: "cover",
                                    borderRadius: "16px",
                                    border:
                                        "3px solid #2e7d32"
                                }}
                            />

                            <p>
                                📷 फोटो तपासण्यासाठी पाठवला आहे
                            </p>

                        </div>
                    )}

                </section>


                {/* ================= QUICK QUESTIONS ================= */}

                <section className="quick-section">

                    <div className="section-title">

                        <h3>
                            पटकन प्रश्न विचारा
                        </h3>

                        <span>
                            👇 निवडा
                        </span>

                    </div>


                    <div className="quick-grid">

                        <button
                            onClick={() =>
                                quickQuestion(
                                    "केळी पिकासाठी योग्य खत कोणते?"
                                )
                            }
                        >
                            <span>🌱</span>

                            <div>
                                <strong>
                                    खत
                                </strong>

                                <small>
                                    कोणते खत?
                                </small>
                            </div>
                        </button>


                        <button
                            onClick={() =>
                                quickQuestion(
                                    "केळीला किती पाणी द्यावे?"
                                )
                            }
                        >
                            <span>💧</span>

                            <div>
                                <strong>
                                    पाणी
                                </strong>

                                <small>
                                    किती पाणी?
                                </small>
                            </div>
                        </button>


                        <button
                            onClick={() =>
                                quickQuestion(
                                    "केळीच्या पानांवर पिवळेपणा का येतो?"
                                )
                            }
                        >
                            <span>🍃</span>

                            <div>
                                <strong>
                                    पाने
                                </strong>

                                <small>
                                    पाने पिवळी?
                                </small>
                            </div>
                        </button>


                        <button
                            onClick={() =>
                                quickQuestion(
                                    "केळीच्या पिकावर कीड दिसल्यास काय करावे?"
                                )
                            }
                        >
                            <span>🐛</span>

                            <div>
                                <strong>
                                    कीड
                                </strong>

                                <small>
                                    काय करावे?
                                </small>
                            </div>
                        </button>

                    </div>

                </section>


                {/* ================= CHAT ================= */}

                <section className="chat-section">

                    <div className="chat-heading">

                        <div>

                            <h3>
                                कृषीवाणी
                            </h3>

                            <p>
                                तुमचे प्रश्न आणि उत्तरे
                            </p>

                        </div>

                        <div className="chat-leaf">
                            🌱
                        </div>

                    </div>


                    <div className="messages">

                        {messages.map(
                            (message, index) => (

                                <div
                                    key={index}
                                    className={`message-row ${
                                        message.sender ===
                                        "user"
                                            ? "user-row"
                                            : "bot-row"
                                    }`}
                                >

                                    {message.sender ===
                                        "bot" && (
                                        <div className="avatar">
                                            🌱
                                        </div>
                                    )}


                                    <div
                                        className={`message ${
                                            message.sender ===
                                            "user"
                                                ? "user-message"
                                                : "bot-message"
                                        }`}
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


            {/* ================= INPUT ================= */}

            <footer className="bottom-area">

                {listening && (

                    <div className="listening">
                        🔴 ऐकत आहे...
                        <br />
                        मराठीत बोला
                    </div>

                )}


                <div className="input-wrapper">

                    {/* Voice */}

                    <button
                        className={`mic-button ${
                            listening
                                ? "active"
                                : ""
                        }`}
                        onClick={startListening}
                        disabled={
                            loading ||
                            listening
                        }
                    >
                        🎤
                    </button>


                    {/* Text */}

                    <input
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
                        placeholder="इथे प्रश्न लिहा..."
                    />


                    {/* Send */}

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


                {/* Big Photo Button */}

                <button
                    onClick={openImagePicker}
                    disabled={imageLoading}
                    style={{
                        width: "100%",
                        marginTop: "12px",
                        padding: "16px",
                        border: "none",
                        borderRadius: "16px",
                        background:
                            "#2e7d32",
                        color: "white",
                        fontSize: "18px",
                        fontWeight: "bold",
                        cursor: "pointer"
                    }}
                >

                    📷
                    {" "}
                    {imageLoading
                        ? "फोटो तपासत आहे..."
                        : "पिकाचा फोटो काढा / निवडा"}

                </button>


                <p className="footer-text">

                    🌱 कृषीवाणी •
                    केळी शेतीसाठी तुमचा डिजिटल साथीदार

                </p>

            </footer>

        </div>
    );
}

export default App;