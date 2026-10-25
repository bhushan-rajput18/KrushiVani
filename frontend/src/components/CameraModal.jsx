export default function CameraModal({ videoRef, onClose, onOpenImagePicker, onCapture }) {
  return (
    <div className="camera-overlay" role="dialog" aria-modal="true" aria-label="केळीच्या पिकाचा फोटो घ्या">
      <div className="camera-modal">
        <div className="camera-header"><h3>📷 पिकाचा फोटो घ्या</h3><button type="button" className="close-camera" onClick={onClose} aria-label="कॅमेरा बंद करा">×</button></div>
        <video ref={videoRef} className="camera-video" autoPlay playsInline muted />
        <p className="camera-help">पान स्पष्ट दिसेल असा फोटो घ्या.</p>
        <div className="camera-actions"><button type="button" onClick={onOpenImagePicker} className="camera-gallery-button">गॅलरीमधून निवडा</button><button type="button" onClick={onCapture} className="camera-capture-button">फोटो घ्या आणि तपासा</button></div>
      </div>
    </div>
  );
}
