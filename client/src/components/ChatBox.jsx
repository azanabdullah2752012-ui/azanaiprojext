import React, { useState, useEffect, useRef } from 'react';

export function ChatBox({ messages, onSendMessage }) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="console-chat-wrapper">
      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            <div className="msg-header">
              <span className={`msg-sender ${msg.type === 'player' ? 'player' : msg.type === 'citizen' ? 'citizen' : ''}`}>
                {msg.sender}
              </span>
              <span className="msg-time">{msg.time}</span>
            </div>
            <div className="msg-text">{msg.text}</div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-wrapper">
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message or command..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="send-btn">
          SEND
        </button>
      </form>
    </div>
  );
}
