'use client';

import React, { useState } from 'react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;
    // Direct mailto fallback or submission
    window.location.href = `mailto:yousefabuelkhear@gmail.com?subject=Contact from ${encodeURIComponent(name)}&body=${encodeURIComponent(message + '\n\nFrom: ' + email)}`;
    setSubmitted(true);
  };

  return (
    <div id="contact">
      <div className="items-container">
        <div className="contact_wrapper">
          <h1>Contact Me</h1>
          <p>
            Got a project waiting to be realized? Let&apos;s collaborate and make it happen!
          </p>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-flex">
              <div className="form-control-template">
                <label htmlFor="contact-name">Your Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  className="form-input-template"
                  placeholder="What's your name?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-control-template">
                <label htmlFor="contact-email">Email / Phone</label>
                <input
                  id="contact-email"
                  type="text"
                  required
                  className="form-input-template"
                  placeholder="How can I reach you?"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-control-template">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                required
                rows={8}
                className="form-input-template body-form"
                placeholder="Send me any inquiries or questions"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <button type="submit" className="contact-submit-btn">
              {submitted ? 'Message Ready (Sent) ✓' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
