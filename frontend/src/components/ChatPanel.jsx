function MessageList({ messages, loading, imageLoading, messagesEndRef, onSpeak }) {
  return <div className="messages" aria-live="polite">
    {messages.map((message, index) => <div key={index} className={`message-row ${message.sender === "user" ? "user-row" : "bot-row"}`}>
      {message.sender === "bot" && <div className="avatar">🌱</div>}
      <div className={`message ${message.sender === "user" ? "user-message" : "bot-message"}`}>
        {message.sender === "bot" && <strong>कृषीवाणी</strong>}<p>{message.text}</p>
        {message.sender === "bot" && <button className="speak-message-button" onClick={() => onSpeak(message.text)} title="उत्तर ऐका" aria-label="उत्तर ऐका">🔊 ऐका</button>}
      </div>
    </div>)}
    {(loading || imageLoading) && <div className="message-row bot-row"><div className="avatar">🌱</div><div className="message bot-message loading"><span /><span /><span /></div></div>}
    <div ref={messagesEndRef} />
  </div>;
}

export default function ChatPanel({ messages, loading, imageLoading, listening, speaking, selectedImage, imagePreviewUrl, question, setQuestion, messagesEndRef, fileInputRef, onStopSpeaking, onSpeak, onListen, onSubmit, onOpenImagePicker, onImageUpload }) {
  return <section className="chat-panel">
    <div className="chat-heading"><div className="chat-brand-icon">🌱</div><div className="chat-heading-copy"><h2>कृषीवाणी सहाय्यक</h2><p>तुमचे प्रश्न आणि उत्तरे</p></div><div className="chat-heading-actions">{speaking && <button className="stop-speaking-button" onClick={onStopSpeaking}>आवाज थांबवा</button>}<span className="chat-online">● ऑनलाइन</span></div></div>
    <MessageList messages={messages} loading={loading} imageLoading={imageLoading} messagesEndRef={messagesEndRef} onSpeak={onSpeak} />
    {selectedImage && <div className="image-preview"><img src={imagePreviewUrl} alt="निवडलेला पिकाचा फोटो" /><span>निवडलेला फोटो</span></div>}
    {listening && <div className="listening">🔴 ऐकत आहे... मराठीत बोला</div>}
    <form className="bottom-area" onSubmit={onSubmit}>
      <button type="button" className={`mic-button ${listening ? "active" : ""}`} onClick={onListen} disabled={loading} aria-label={listening ? "रेकॉर्डिंग थांबवा" : "बोलून प्रश्न विचारा"} title={listening ? "रेकॉर्डिंग थांबवा" : "बोलून प्रश्न विचारा"}>🎤</button>
      <input type="text" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="इथे तुमचा प्रश्न लिहा..." aria-label="तुमचा प्रश्न" />
      <button type="submit" className="send-button" disabled={loading || !question.trim()} aria-label="प्रश्न पाठवा">➤</button>
      <button type="button" className="photo-button" onClick={onOpenImagePicker} disabled={imageLoading}>{imageLoading ? "फोटो तपासत आहे..." : "📷 फोटो"}</button>
      <input ref={fileInputRef} className="hidden-file-input" type="file" accept="image/*" onChange={onImageUpload} tabIndex={-1} aria-label="केळीच्या पिकाचा फोटो निवडा" />
    </form>
  </section>;
}
