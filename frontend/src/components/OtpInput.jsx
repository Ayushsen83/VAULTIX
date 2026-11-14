import React, { useRef } from 'react';

export default function OtpInput({ otp, setOtp, onComplete, disabled }) {
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-advance to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((digit) => digit !== '')) {
      onComplete?.(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (!/^\d{6}$/.test(pasted)) return;

    const digits = pasted.split('');
    setOtp(digits);
    inputRefs.current[5]?.focus();
    onComplete?.(pasted);
  };

  return (
    <div style={styles.container} onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          id = {`otp-input-${i}`}
          aria-label={`OTP input ${i + 1}`}
          name={`otp-input-${i}`}
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={disabled}
          style={styles.box}
        />
      ))}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
    margin: '1.25rem 0',
  },
  box: {
    width: '45px',
    height: '52px',
    textAlign: 'center',
    fontSize: '1.3rem',
    fontWeight: '700',
    borderRadius: '8px',
    border: '1.5px solid #334155',
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    outline: 'none',
  },
};