export default function AppHeader({ showIntro, onShowIntro }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">🌱</div>
        <div><h1>कृषीवाणी</h1><span>शेतकऱ्यांचा डिजिटल मित्र</span></div>
      </div>
      <div className="topbar-right">
        <div className="status"><span className="status-dot" />ऑनलाइन</div>
        {!showIntro && <button className="show-intro-button" onClick={onShowIntro} aria-label="परिचय दाखवा">☰ परिचय</button>}
      </div>
    </header>
  );
}
