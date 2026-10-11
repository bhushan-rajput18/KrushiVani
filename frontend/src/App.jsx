

import { useEffect, useRef, useState } from "react";

import "./App.css";



const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");



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
    const audioRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(null);
    const audioUrlRef = useRef(null);
    const cameraVideoRef = useRef(null);
    const cameraStreamRef = useRef(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

    useEffect(() => {
        if (!selectedImage) {
            setImagePreviewUrl(null);
            return undefined;
        }
        const url = URL.createObjectURL(selectedImage);
        setImagePreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [selectedImage]);

    useEffect(() => () => {
        audioPlayerRef.current?.pause();
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        if (audioRecorderRef.current?.state === "recording") audioRecorderRef.current.stop();
    }, []);



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



    // Sarvam Marathi text-to-speech
    const speakMarathi = async (text) => {
        const cleanText = String(text || "")
            .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
            .trim();
        if (!cleanText) return;

        stopSpeaking();
        try {
            setSpeaking(true);
            const response = await fetch(`${API_URL}/api/text-to-speech`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: cleanText })
            });
            const data = await response.json();
            if (!response.ok || !data.audio) {
                throw new Error(data.message || "Sarvam TTS request failed");
            }

            const binary = atob(data.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: "audio/wav" });
            const audioUrl = URL.createObjectURL(blob);
            audioUrlRef.current = audioUrl;
            const player = new Audio(audioUrl);
            audioPlayerRef.current = player;
            player.onended = () => {
                setSpeaking(false);
                if (audioUrlRef.current === audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                    audioUrlRef.current = null;
                }
                if (audioPlayerRef.current === player) audioPlayerRef.current = null;
            };
            player.onerror = () => {
                setSpeaking(false);
                if (audioUrlRef.current === audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                    audioUrlRef.current = null;
                }
                if (audioPlayerRef.current === player) audioPlayerRef.current = null;
            };
            await player.play();
        } catch (error) {
            console.error("Sarvam text-to-speech error:", error);
            setSpeaking(false);
        }
    };

    const stopSpeaking = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
            audioPlayerRef.current.currentTime = 0;
            audioPlayerRef.current = null;
        }
        if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
            audioUrlRef.current = null;
        }
        setSpeaking(false);
    };

    // Sarvam Marathi speech-to-text. Tap the mic again to finish recording.
    const startListening = async () => {
        if (listening) {
            stopListening();
            return;
        }
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
            alert("या ब्राउझरमध्ये आवाज रेकॉर्ड करता येत नाही. कृपया अद्ययावत Chrome वापरा.");
            return;
        }

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
                .find((type) => MediaRecorder.isTypeSupported(type)) || "";
            const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
            audioChunksRef.current = [];
            audioRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data?.size) audioChunksRef.current.push(event.data);
            };
            recorder.onerror = (event) => {
                console.error("Audio recorder error:", event.error || event);
                stream.getTracks().forEach((track) => track.stop());
                audioRecorderRef.current = null;
                setListening(false);
                alert("आवाज रेकॉर्ड करताना अडचण आली. पुन्हा प्रयत्न करा.");
            };
            recorder.onstop = async () => {
                stream.getTracks().forEach((track) => track.stop());
                setListening(false);
                const actualType = recorder.mimeType || mimeType || "audio/webm";
                const extension = actualType.includes("ogg") ? "ogg" : actualType.includes("mp4") ? "m4a" : "webm";
                const audioBlob = new Blob(audioChunksRef.current, { type: actualType });
                audioRecorderRef.current = null;
                if (!audioBlob.size) {
                    alert("आवाज रेकॉर्ड झाला नाही. पुन्हा प्रयत्न करा.");
                    return;
                }

                setLoading(true);
                try {
                    const formData = new FormData();
                    formData.append("audio", audioBlob, `krushivani_voice.${extension}`);
                    const response = await fetch(`${API_URL}/api/speech-to-text`, { method: "POST", body: formData });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || "Speech-to-text failed");
                    if (data.text?.trim()) setQuestion(data.text.trim());
                    else alert("आवाजातील प्रश्न समजला नाही. कृपया पुन्हा स्पष्ट बोला.");
                } catch (error) {
                    console.error("Sarvam speech-to-text error:", error);
                    alert("आवाज समजण्यात अडचण आली. कृपया पुन्हा प्रयत्न करा.");
                } finally {
                    setLoading(false);
                }
            };
            recorder.start();
            setListening(true);
        } catch (error) {
            console.error("Microphone permission/error:", error);
            stream?.getTracks().forEach((track) => track.stop());
            setListening(false);
            alert("मायक्रोफोनची परवानगी द्या आणि पुन्हा प्रयत्न करा.");
        }
    };

    const stopListening = () => {
        const recorder = audioRecorderRef.current;
        if (recorder && recorder.state === "recording") recorder.stop();
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



    // Open the device's image picker. On phones, capture="environment" also offers camera capture.
    const openImagePicker = () => fileInputRef.current?.click();

    const analyzeImage = async (file) => {
        if (!file || !file.type.startsWith("image/")) {
            alert("कृपया योग्य फोटो निवडा.");
            return;
        }
        setSelectedImage(file);
        setImageLoading(true);
        setMessages((previous) => [...previous, { sender: "user", text: "📷 केळीच्या पिकाचा फोटो पाठवला आहे." }]);

        try {
            const formData = new FormData();
            formData.append("image", file);
            const response = await fetch(`${API_URL}/api/image-deploy`, {
            method: "POST",
            body: formData
        });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || "Image analysis failed");

            let message;
            if (data.prediction === "uncertain") {
                message = "⚠️ " + (data.message || "फोटोवरून रोग निश्चितपणे ओळखता आला नाही. कृपया अधिक स्पष्ट फोटो द्या.");
            } else {
                let diseaseName = data.prediction;
                if (diseaseName === "healthy") diseaseName = "केळीचे झाड निरोगी दिसत आहे 🌱";
                else if (diseaseName === "fusarium_wilt") diseaseName = "फ्युजेरियम विल्ट (पनामा रोग)";
                else if (diseaseName === "yellow_sigatoka") diseaseName = "यलो सिगाटोका";
                const confidence = Number(data.confidence);
                message = `🔍 फोटो तपासला आहे.\n\n📌 संभाव्य ओळख: ${diseaseName}\n\n📊 विश्वास पातळी: ${Number.isFinite(confidence) ? confidence.toFixed(2) + "%" : "उपलब्ध नाही"}`;
                if (Number.isFinite(confidence) && confidence < 70) {
                    message += "\n\n⚠️ हा अंदाज आहे; फोटोवरून खात्रीने सांगता येत नाही. अधिक स्पष्ट फोटो द्या आणि गरज असल्यास कृषी तज्ज्ञांचा सल्ला घ्या.";
                } else {
                    message += "\n\nटीप: हा AI-आधारित अंदाज आहे. उपचार करण्यापूर्वी लक्षणांची खात्री करा.";
                }
            }
            setMessages((previous) => [...previous, { sender: "bot", text: message }]);
        } catch (error) {
            console.error("Image analysis error:", error);
            setMessages((previous) => [...previous, { sender: "bot", text: "❌ फोटो तपासता आला नाही. कृपया बॅकएंड सुरू आहे का ते तपासा आणि पुन्हा फोटो पाठवा." }]);
        } finally {
            setImageLoading(false);
        }
    };

    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (cameraOpen) closeCamera();
            analyzeImage(file);
        }
        event.target.value = "";
    };

    const openCamera = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            alert("कॅमेरा उपलब्ध नाही. फोटो निवडण्यासाठी गॅलरी बटण वापरा.");
            openImagePicker();
            return;
        }
        try {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
            } catch {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            }
            cameraStreamRef.current = stream;
            setCameraOpen(true);
            requestAnimationFrame(() => {
                if (cameraVideoRef.current) cameraVideoRef.current.srcObject = stream;
            });
        } catch (error) {
            console.error("Camera error:", error);
            alert("कॅमेरा सुरू करता आला नाही. Browser camera permission तपासा किंवा गॅलरी वापरा.");
        }
    };

    const closeCamera = () => {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        setCameraOpen(false);
    };

    const capturePhoto = () => {
        const video = cameraVideoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
            alert("कॅमेरा तयार झाल्यावर पुन्हा प्रयत्न करा.");
            return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        context?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) {
                alert("फोटो घेता आला नाही. पुन्हा प्रयत्न करा.");
                return;
            }
            closeCamera();
            analyzeImage(new File([blob], "krushivani-photo.jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.9);
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

                                    onClick={listening ? stopListening : startListening}

                                    disabled={loading}

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

                                    onClick={openCamera}

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

                                src={imagePreviewUrl}

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

                            onClick={listening ? stopListening : startListening}

                            disabled={loading}

                            aria-label={listening ? "रेकॉर्डिंग थांबवा" : "बोलून प्रश्न विचारा"}

                            title={listening ? "रेकॉर्डिंग थांबवा" : "बोलून प्रश्न विचारा"}

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
                        onChange={handleImageUpload}
                        tabIndex={-1}
                        aria-label="केळीच्या पिकाचा फोटो निवडा"
                        />

                    </form>

                </section>

            </main>



            <footer className="app-footer">

                🌱 कृषीवाणी • केळी शेतीसाठी तुमचा डिजिटल साथीदार

            </footer>

            {cameraOpen && (
                <div className="camera-overlay" role="dialog" aria-modal="true" aria-label="केळीच्या पिकाचा फोटो घ्या">
                    <div className="camera-modal">
                        <div className="camera-header">
                            <h3>📷 पिकाचा फोटो घ्या</h3>
                            <button type="button" className="close-camera" onClick={closeCamera} aria-label="कॅमेरा बंद करा">×</button>
                        </div>
                        <video ref={cameraVideoRef} className="camera-video" autoPlay playsInline muted />
                        <p className="camera-help">पान स्पष्ट दिसेल असा फोटो घ्या.</p>
                        <div className="camera-actions">
                            <button type="button" onClick={openImagePicker} className="camera-gallery-button">गॅलरीमधून निवडा</button>
                            <button type="button" onClick={capturePhoto} className="camera-capture-button">फोटो घ्या आणि तपासा</button>
                        </div>
                    </div>
                </div>
            )}

        </div>

    );

}



export default App;
