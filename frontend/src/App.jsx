

import { useEffect, useRef, useState } from "react";

import AppHeader from "./components/AppHeader";
import CameraModal from "./components/CameraModal";
import ChatPanel from "./components/ChatPanel";
import IntroPanel from "./components/IntroPanel";

import "./App.css";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

function App() {

    // UI state shared by the smaller presentational components.
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "🌱 नमस्कार! कृषीवाणी तुमच्या केळी शेतीसाठी मदत करण्यास तयार आहे."
        }
    ]);
    const [loading, setLoading] = useState(false);
    const [listening, setListening] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [showIntro, setShowIntro] = useState(true);
    const [speaking, setSpeaking] = useState(false);
    const [cameraOpen, setCameraOpen] = useState(false);

    // Refs hold browser-only objects that should not trigger a re-render.
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const audioRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioPlayerRef = useRef(null);
    const audioUrlRef = useRef(null);
    const cameraVideoRef = useRef(null);
    const cameraStreamRef = useRef(null);

    // Create a temporary browser URL only while an image is selected.
    useEffect(() => {
        if (!selectedImage) {
            // The preview is derived from the file selection, so clear it with the file.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setImagePreviewUrl(null);
            return undefined;
        }
        const url = URL.createObjectURL(selectedImage);
        setImagePreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [selectedImage]);

    // Release microphone, camera, and audio resources when the app unmounts.
    useEffect(() => () => {
        audioPlayerRef.current?.pause();
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        if (audioRecorderRef.current?.state === "recording") audioRecorderRef.current.stop();
    }, []);

    // Keep the newest reply visible as messages and loading indicators change.
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end"
        });
    }, [messages, loading, imageLoading]);

    // Audio playback: request Marathi speech from the backend and play the returned WAV file.
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

    // Voice input: tapping the microphone again stops recording and sends it for transcription.
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

            // Keep the active recorder so the next mic click can stop this recording.
            audioRecorderRef.current = recorder;
            const chunks = [];
            audioChunksRef.current = chunks;

            recorder.ondataavailable = (event) => {
                if (event.data?.size) chunks.push(event.data);
            };
            recorder.onerror = (event) => {
                console.error("Audio recorder error:", event.error || event);
                stream.getTracks().forEach((track) => track.stop());
                audioRecorderRef.current = null;
                setListening(false);
                alert("आवाज रेकॉर्ड करताना अडचण आली. पुन्हा प्रयत्न करा.");
            };
            recorder.onstop = async () => {
                clearTimeout(recorder.stopTimer);
                stream.getTracks().forEach((track) => track.stop());
                setListening(false);
                const actualType = recorder.mimeType || mimeType || "audio/webm";
                const extension = actualType.includes("ogg") ? "ogg" : actualType.includes("mp4") ? "m4a" : "webm";
                const audioBlob = new Blob(chunks, { type: actualType });
                console.log("Recorded audio:", {
                    sizeBytes: audioBlob.size,
                    type: audioBlob.type,
                });
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

            // Stop automatically after 20 seconds so a recording cannot be left open.
            recorder.stopTimer = setTimeout(() => {
                if (recorder.state === "recording") recorder.stop();
            }, 20000);
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

    // Add the user's question immediately, then replace the loading state with an answer.
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: userQuestion })
            });

            if (!response.ok) throw new Error("Chat request failed");

            const data = await response.json();
            const answer = data.answer || "माफ करा, सध्या उत्तर मिळाले नाही. कृपया पुन्हा प्रयत्न करा.";
            setMessages((previous) => [...previous, { sender: "bot", text: answer }]);
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

    // Image analysis: choose, preview, and send a crop photo to the backend.
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
            const response = await fetch(`${API_URL}/api/image`, {
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

    // The same handler is used for the gallery button and a captured camera image.
    const handleImageUpload = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            if (cameraOpen) closeCamera();
            analyzeImage(file);
        }
        event.target.value = "";
    };

    // Prefer the rear camera on phones, but gracefully fall back to any camera.
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

    // Always stop video tracks; otherwise a phone can keep showing camera-in-use.
    const closeCamera = () => {
        cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        setCameraOpen(false);
    };

    // Draw the current video frame to a canvas, then reuse the normal image analysis flow.
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

    const quickQuestion = (text) => setQuestion(text);

    return (
        <div className={`app ${showIntro ? "" : "intro-hidden"}`}>
            <AppHeader
                showIntro={showIntro}
                onShowIntro={() => setShowIntro(true)}
            />
            <main className="workspace">
                {showIntro && (
                    <IntroPanel
                        listening={listening}
                        loading={loading}
                        imageLoading={imageLoading}
                        onClose={() => setShowIntro(false)}
                        onListen={listening ? stopListening : startListening}
                        onOpenCamera={openCamera}
                        onQuickQuestion={quickQuestion}
                    />
                )}
                <ChatPanel
                    messages={messages}
                    loading={loading}
                    imageLoading={imageLoading}
                    listening={listening}
                    speaking={speaking}
                    selectedImage={selectedImage}
                    imagePreviewUrl={imagePreviewUrl}
                    question={question}
                    setQuestion={setQuestion}
                    messagesEndRef={messagesEndRef}
                    fileInputRef={fileInputRef}
                    onStopSpeaking={stopSpeaking}
                    onSpeak={speakMarathi}
                    onListen={listening ? stopListening : startListening}
                    onSubmit={(event) => {
                        event.preventDefault();
                        sendQuestion();
                    }}
                    onOpenImagePicker={openImagePicker}
                    onImageUpload={handleImageUpload}
                />
            </main>
            <footer className="app-footer">
                🌱 कृषीवाणी • केळी शेतीसाठी तुमचा डिजिटल साथीदार
            </footer>
            {cameraOpen && (
                <CameraModal
                    videoRef={cameraVideoRef}
                    onClose={closeCamera}
                    onOpenImagePicker={openImagePicker}
                    onCapture={capturePhoto}
                />
            )}
        </div>
    );

}

export default App;
