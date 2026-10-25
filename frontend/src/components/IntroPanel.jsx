const quickQuestions = [
  ["🌱", "खत", "केळी पिकासाठी योग्य खत कोणते?"],
  ["💧", "पाणी", "केळीला किती पाणी द्यावे?"],
  ["🍃", "पाने", "केळीच्या पानांवर पिवळेपणा का येतो?"],
  ["🐛", "कीड", "केळीच्या पिकावर कीड दिसल्यास काय करावे?"],
];

export default function IntroPanel({ listening, loading, imageLoading, onClose, onListen, onOpenCamera, onQuickQuestion }) {
  return (
    <aside className="intro-panel">
      <button className="close-intro-button" onClick={onClose} aria-label="परिचय बंद करा" title="परिचय बंद करा">×</button>
      <section className="hero">
        <span className="welcome-tag">🌾 तुमच्या शेतीसाठी</span>
        <h2>तुमच्या शेतीची मदत इथे मिळवा</h2>
        <p>🎤 मराठीत बोलून प्रश्न विचारा<br />📷 केळीच्या पिकाचा फोटो तपासा</p>
        <div className="hero-farmer" aria-hidden="true">👨‍🌾</div>
      </section>
      <section className="feature-section">
        <h3>तुम्हाला काय करायचे आहे?</h3>
        <div className="feature-grid">
          <button className="feature-card voice-card" onClick={onListen} disabled={loading}>
            <span className="feature-icon">🎤</span><span className="feature-copy"><strong>बोलून विचारा</strong><small>{listening ? "ऐकत आहे..." : "मराठीत बोला आणि प्रश्न विचारा"}</small></span>
          </button>
          <button className="feature-card photo-card" onClick={onOpenCamera} disabled={imageLoading}>
            <span className="feature-icon">📷</span><span className="feature-copy"><strong>पिकाचा फोटो तपासा</strong><small>{imageLoading ? "फोटो तपासत आहे..." : "कॅमेरा किंवा गॅलरी वापरा"}</small></span>
          </button>
        </div>
      </section>
      <section className="quick-section">
        <div className="section-title"><h3>पटकन प्रश्न विचारा</h3><span>एक निवडा</span></div>
        <div className="quick-grid">
          {quickQuestions.map(([icon, label, question]) => <button key={label} onClick={() => onQuickQuestion(question)}><span>{icon}</span><strong>{label}</strong></button>)}
        </div>
      </section>
      <p className="intro-note">🌱 सोप्या मराठीमध्ये शेतीविषयक मदत</p>
    </aside>
  );
}
