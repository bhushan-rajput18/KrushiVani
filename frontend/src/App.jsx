
import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showIntro, setShowIntro] = useState(true);
    const [speaking, setSpeaking] = useState(false);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "🌱 नमस्कार! कृषीवाणी तुमच्या केळी शेतीसाठी मदत करण्यास तयार आहे."
        }
    ]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });
    }, [messages, loading, imageLoading]);

    // Marathi voice output
    const speakMarathi = (text) => {
        if (!("speechSynthesis" in window)) {
            alert("तुमच्या ब्राउझरमध्ये आवाजाची सुविधा उपलब्ध नाही.");
            return;
        }

        window.speechSynthesis.cancel();

        const cleanText = String(text)
            .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
            .replace(/\n+/g, ". ")
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "mr-IN";
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        const voices = window.speechSynthesis.getVoices();
        const marathiVoice = voices.find(
            (voice) =>
                voice.lang.toLowerCase() === "mr-in" ||
                voice.lang.toLowerCase().startsWith("mr")
        );

        if (marathiVoice) {
            utterance.voice = marathiVoice;
        }

        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        window.speechSynthesis?.cancel();
        setSpeaking(false);
    };

    // Marathi voice input
    const startListening = () => {
        const SpeechRecognition =
            window.SpeechRecognition ||
            window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert(
                "तुमच्या ब्राउझरमध्ये आवाजाची सुविधा उपलब्ध नाही. कृपया Chrome वापरा."
            );
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = "mr-IN";
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setListening(true);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setQuestion(transcript);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setListening(false);
        };

        recognition.onend = () => setListening(false);

        try {
            recognition.start();
        } catch (error) {
            console.error(error);
            setListening(false);
        }
    };

    // Send a chatbot question
    const sendQuestion = async (text = question) => {
        if (!text.trim() || loading) return;

        const userQuestion = text.trim();

        setMessages((previous) => [
            ...previous,
            { sender: "user", text: userQuestion }
        ]);

        setQuestion("");
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: userQuestion
                })
            });

            if (!response.ok) {
                throw new Error("Chat request failed");
            }

            const data = await response.json();
            const answer =
                data.answer ||
                "माफ करा, सध्या उत्तर मिळाले नाही. कृपया पुन्हा प्रयत्न करा.";

            setMessages((previous) => [
                ...previous,
                { sender: "bot", text: answer }
            ]);

            // Browser voice output; requires a supported Marathi voice
            speakMarathi(answer);
        } catch (error) {
            console.error(error);

            setMessages((previous) => [
                ...previous,
                {
                    sender: "bot",
                    text: "सर्व्हरशी कनेक्ट होता आले नाही. कृपया बॅकएंड सुरू आहे का ते तपासा."
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    // Open gallery or camera picker
    const openImagePicker = () => {
        fileInputRef.current?.click();
    };

    // Upload a banana plant image
    const handleImageUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("कृपया फोटो निवडा.");
            event.target.value = "";
            return;
        }

        setSelectedImage(file);
        setImageLoading(true);

        setMessages((previous) => [
            ...previous,
            {
                sender: "user",
                text: "📷 केळीच्या पिकाचा फोटो पाठवला आहे."
            }
        ]);

        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch(`${API_URL}/api/image`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                throw new Error("Image analysis request failed");
            }

            const data = await response.json();
            let message = "";

            if (data.prediction === "uncertain") {
                message =
                    "⚠️ " +
                    (data.message ||
                        "फोटोवरून रोग निश्चितपणे ओळखता आला नाही. कृपया अधिक स्पष्ट फोटो द्या.");
            } else {
                let diseaseName = data.prediction;

                if (diseaseName === "healthy") {
                    diseaseName = "केळीचे झाड निरोगी दिसत आहे 🌱";
                } else if (diseaseName === "fusarium_wilt") {
                    diseaseName = "फ्युजेरियम विल्ट (पनामा रोग)";
                } else if (diseaseName === "yellow_sigatoka") {
                    diseaseName = "यलो सिगाटोका";
                }

                const confidence = Number(data.confidence);

                message =
                    "🔍 फोटो तपासला आहे.\n\n" +
                    "📌 संभाव्य ओळख: " +
                    diseaseName +
                    "\n\n📊 विश्वास पातळी: " +
                    (Number.isFinite(confidence)
                        ? confidence.toFixed(2)
                        : "उपलब्ध नाही") +
                    (Number.isFinite(confidence) ? "%" : "");

                if (Number.isFinite(confidence) && confidence < 70) {
                    message +=
                        "\n\n⚠️ हा अंदाज आहे; फोटोवरून खात्रीने सांगता येत नाही. अधिक स्पष्ट फोटो द्या आणि गरज असल्यास कृषी तज्ज्ञांचा सल्ला घ्या.";
                } else {
                    message +=
                        "\n\nटीप: हा AI-आधारित अंदाज आहे. उपचार करण्यापूर्वी लक्षणांची खात्री करा.";
                }
            }

            setMessages((previous) => [
                ...previous,
                { sender: "bot", text: message }
            ]);

            speakMarathi(message);
        } catch (error) {
            console.error(error);

            setMessages((previous) => [
                ...previous,
                {
                    sender: "bot",
                    text: "❌ फोटो तपासता आला नाही. कृपया बॅकएंड सुरू आहे का ते तपासा आणि पुन्हा फोटो पाठवा."
                }
            ]);
        } finally {
            setImageLoading(false);
            event.target.value = "";
        }
    };

    const quickQuestion = (text) => {
        setQuestion(text);
    };

    return (
        <div className={`app ${showIntro ? "" : "intro-hidden"}`}>
            <header className="topbar">
                <div className="brand">
                    <div className="brand-icon">🌱</div>
                    <div>
                        <h1>कृषीवाणी</h1>
                        <span>शेतकऱ्यांचा डिजिटल मित्र</span>
                    </div>
                </div>

                <div className="topbar-right">
                    <div className="status">
                        <span className="status-dot" />
                        ऑनलाइन
                    </div>

                    {!showIntro && (
                        <button
                            className="show-intro-button"
                            onClick={() => setShowIntro(true)}
                            aria-label="परिचय दाखवा"
                        >
                            ☰ परिचय
                        </button>
                    )}
                </div>
            </header>

            <main className="workspace">
                {showIntro && (
                    <aside className="intro-panel">
                        <button
                            className="close-intro-button"
                            onClick={() => setShowIntro(false)}
                            aria-label="परिचय बंद करा"
                            title="परिचय बंद करा"
                        >
                            ×
                        </button>

                        <section className="hero">
                            <span className="welcome-tag">
                                🌾 तुमच्या शेतीसाठी
                            </span>

                            <h2>तुमच्या शेतीची मदत इथे मिळवा</h2>

                            <p>
                                🎤 मराठीत बोलून प्रश्न विचारा
                                <br />
                                📷 केळीच्या पिकाचा फोटो तपासा
                            </p>

                            <div className="hero-farmer" aria-hidden="true">
                                👨‍🌾
                            </div>
                        </section>

                        <section className="feature-section">
                            <h3>तुम्हाला काय करायचे आहे?</h3>

                            <div className="feature-grid">
                                <button
                                    className="feature-card voice-card"
                                    onClick={startListening}
                                    disabled={loading || listening}
                                >
                                    <span className="feature-icon">🎤</span>
                                    <span className="feature-copy">
                                        <strong>बोलून विचारा</strong>
                                        <small>
                                            {listening
                                                ? "ऐकत आहे..."
                                                : "मराठीत बोला आणि प्रश्न विचारा"}
                                        </small>
                                    </span>
                                </button>

                                <button
                                    className="feature-card photo-card"
                                    onClick={openImagePicker}
                                    disabled={imageLoading}
                                >
                                    <span className="feature-icon">📷</span>
                                    <span className="feature-copy">
                                        <strong>पिकाचा फोटो तपासा</strong>
                                        <small>
                                            {imageLoading
                                                ? "फोटो तपासत आहे..."
                                                : "कॅमेरा किंवा गॅलरी वापरा"}
                                        </small>
                                    </span>
                                </button>
                            </div>
                        </section>

                        <section className="quick-section">
                            <div className="section-title">
                                <h3>पटकन प्रश्न विचारा</h3>
                                <span>एक निवडा</span>
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
                                    <strong>खत</strong>
                                </button>

                                <button
                                    onClick={() =>
                                        quickQuestion(
                                            "केळीला किती पाणी द्यावे?"
                                        )
                                    }
                                >
                                    <span>💧</span>
                                    <strong>पाणी</strong>
                                </button>

                                <button
                                    onClick={() =>
                                        quickQuestion(
                                            "केळीच्या पानांवर पिवळेपणा का येतो?"
                                        )
                                    }
                                >
                                    <span>🍃</span>
                                    <strong>पाने</strong>
                                </button>

                                <button
                                    onClick={() =>
                                        quickQuestion(
                                            "केळीच्या पिकावर कीड दिसल्यास काय करावे?"
                                        )
                                    }
                                >
                                    <span>🐛</span>
                                    <strong>कीड</strong>
                                </button>
                            </div>
                        </section>

                        <p className="intro-note">
                            🌱 सोप्या मराठीमध्ये शेतीविषयक मदत
                        </p>
                    </aside>
                )}

                <section className="chat-panel">
                    <div className="chat-heading">
                        <div className="chat-brand-icon">🌱</div>
                        <div className="chat-heading-copy">
                            <h2>कृषीवाणी सहाय्यक</h2>
                            <p>तुमचे प्रश्न आणि उत्तरे</p>
                        </div>

                        <div className="chat-heading-actions">
                            {speaking && (
                                <button
                                    className="stop-speaking-button"
                                    onClick={stopSpeaking}
                                >
                                    आवाज थांबवा
                                </button>
                            )}
                            <span className="chat-online">● ऑनलाइन</span>
                        </div>
                    </div>

                    <div className="messages" aria-live="polite">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`message-row ${
                                    message.sender === "user"
                                        ? "user-row"
                                        : "bot-row"
                                }`}
                            >
                                {message.sender === "bot" && (
                                    <div className="avatar">🌱</div>
                                )}

                                <div
                                    className={`message ${
                                        message.sender === "user"
                                            ? "user-message"
                                            : "bot-message"
                                    }`}
                                >
                                    {message.sender === "bot" && (
                                        <strong>कृषीवाणी</strong>
                                    )}
                                    <p>{message.text}</p>

                                    {message.sender === "bot" && (
                                        <button
                                            className="speak-message-button"
                                            onClick={() =>
                                                speakMarathi(message.text)
                                            }
                                            title="उत्तर ऐका"
                                            aria-label="उत्तर ऐका"
                                        >
                                            🔊 ऐका
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {(loading || imageLoading) && (
                            <div className="message-row bot-row">
                                <div className="avatar">🌱</div>
                                <div className="message bot-message loading">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {selectedImage && (
                        <div className="image-preview">
                            <img
                                src={URL.createObjectURL(selectedImage)}
                                alt="निवडलेला पिकाचा फोटो"
                            />
                            <span>निवडलेला फोटो</span>
                        </div>
                    )}

                    {listening && (
                        <div className="listening">
                            🔴 ऐकत आहे... मराठीत बोला
                        </div>
                    )}

                    <form
                        className="bottom-area"
                        onSubmit={(event) => {
                            event.preventDefault();
                            sendQuestion();
                        }}
                    >
                        <button
                            type="button"
                            className={`mic-button ${
                                listening ? "active" : ""
                            }`}
                            onClick={startListening}
                            disabled={loading || listening}
                            aria-label="बोलून प्रश्न विचारा"
                            title="बोलून प्रश्न विचारा"
                        >
                            🎤
                        </button>

                        <input
                            type="text"
                            value={question}
                            onChange={(event) =>
                                setQuestion(event.target.value)
                            }
                            placeholder="इथे तुमचा प्रश्न लिहा..."
                            aria-label="तुमचा प्रश्न"
                        />

                        <button
                            type="submit"
                            className="send-button"
                            disabled={loading || !question.trim()}
                            aria-label="प्रश्न पाठवा"
                        >
                            ➤
                        </button>

                        <button
                            type="button"
                            className="photo-button"
                            onClick={openImagePicker}
                            disabled={imageLoading}
                        >
                            {imageLoading
                                ? "फोटो तपासत आहे..."
                                : "📷 फोटो"}
                        </button>

                        <input
                            ref={fileInputRef}
                            className="hidden-file-input"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageUpload}
                            tabIndex={-1}
                            aria-hidden="true"
                        />
                    </form>
                </section>
            </main>

            <footer className="app-footer">
                🌱 कृषीवाणी • केळी शेतीसाठी तुमचा डिजिटल साथीदार
            </footer>
        </div>
    );
}

export default App;
