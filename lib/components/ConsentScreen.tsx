import React, { useState } from 'react';

// Dummy functions for illustration purposes
// In a real implementation, these would trigger backend processes.
const grantConsent = () => console.log("User has granted consent.");
const revokeConsent = () => console.log("User has revoked consent.");

interface ConsentScreenProps {
  onClose: () => void;
}

export const ConsentScreen: React.FC<ConsentScreenProps> = ({ onClose }) => {
  const [hasConsented, setHasConsented] = useState(false);

  const handleConsent = () => {
    grantConsent();
    setHasConsented(true);
    onClose();
  };

  const handleRevoke = () => {
    revokeConsent();
    setHasConsented(false);
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Join the URAI Research Program</h2>
        <p style={styles.paragraph}>
          Help advance the scientific understanding of human emotion. By joining our research program, you can contribute to a new, shared vocabulary for mental well-being.
        </p>

        <h3 style={styles.subtitle}>Our Commitment to Your Privacy</h3>
        <p style={styles.paragraph}>
          Your privacy is the foundation of this project. If you choose to participate, here is our unwavering promise to you:
        </p>
        <ul style={styles.list}>
          <li><strong>You Are Anonymous:</strong> We generate a random ID for you. We can never trace the data back to your account.</li>
          <li><strong>Only Vectors, Not Words:</strong> We ONLY collect the mathematical `EmotionVector` data (e.g., `{valence: 0.8, arousal: 0.6, agency: 0.7}`).</li>
          <li><strong>Your Memories are Yours:</strong> We NEVER collect your text, tags, audio, or any other personal content. That stays private to you, always.</li>
          <li><strong>You Are In Control:</strong> You can join or leave the program at any time, for any reason, without affecting your URAI experience.</li>
        </ul>

        <p style={styles.paragraph}>
          Your contribution will help researchers identify large-scale emotional patterns and build new models for understanding psychological well-being. Thank you for considering.
        </p>

        <div style={styles.buttonContainer}>
          {hasConsented ? (
            <button style={{...styles.button, ...styles.revokeButton}} onClick={handleRevoke}>
              Leave the Program
            </button>
          ) : (
            <button style={{...styles.button, ...styles.consentButton}} onClick={handleConsent}>
              Join the Research Program
            </button>
          )}
          <button style={{...styles.button, ...styles.closeButton}} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// A basic CSS-in-JS styling object for the component
const styles = {
  overlay: {
    position: 'fixed' as 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex' as 'flex',
    justifyContent: 'center' as 'center',
    alignItems: 'center' as 'center',
  },
  modal: {
    backgroundColor: '#2c2c2c',
    padding: '30px',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '600px',
    color: '#e0e0e0',
    fontFamily: 'sans-serif',
  },
  title: {
    color: '#ffffff',
    borderBottom: '1px solid #444',
    paddingBottom: '10px',
  },
  subtitle: {
    color: '#ffffff',
    marginTop: '20px',
  },
  paragraph: {
    lineHeight: '1.6',
  },
  list: {
    lineHeight: '1.6',
    paddingLeft: '20px',
  },
  buttonContainer: {
    marginTop: '30px',
    display: 'flex' as 'flex',
    justifyContent: 'flex-end' as 'flex-end',
  },
  button: {
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer' as 'pointer',
    marginLeft: '10px',
    fontWeight: 'bold' as 'bold',
  },
  consentButton: {
    backgroundColor: '#4CAF50', // Green
    color: 'white',
  },
  revokeButton: {
    backgroundColor: '#f44336', // Red
    color: 'white',
  },
  closeButton: {
    backgroundColor: '#555',
    color: 'white',
  },
};
