import React from 'react';
import './TypingIndicator.css';
import { TypingIndicator } from '../../../types/chat';

interface TypingIndicatorProps {
  indicators: TypingIndicator[];
  currentUserId: string;
}

const TypingIndicatorComponent: React.FC<TypingIndicatorProps> = ({
  indicators,
  currentUserId
}) => {
  // Filter out current user's typing indicator
  const filteredIndicators = indicators.filter(indicator => 
    indicator.userId !== currentUserId
  );

  if (filteredIndicators.length === 0) {
    return null;
  }

  const formatUserList = (users: string[]): string => {
    if (users.length === 1) {
      return `${users[0]} is typing`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing`;
    } else if (users.length === 3) {
      return `${users[0]}, ${users[1]}, and ${users[2]} are typing`;
    } else {
      return `${users[0]}, ${users[1]}, and ${users.length - 2} others are typing`;
    }
  };

  const usernames = filteredIndicators.map(indicator => indicator.username);
  const typingText = formatUserList(usernames);

  return (
    <div className="typing-indicator-container">
      <div className="typing-indicator">
        <div className="typing-avatars">
          {filteredIndicators.slice(0, 3).map((indicator, index) => (
            <div key={indicator.userId} className="typing-avatar" style={{zIndex: 3 - index}}>
              <div className="avatar-placeholder">
                {indicator.username.charAt(0).toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        <div className="typing-content">
          <div className="typing-text">{typingText}</div>
          <div className="typing-animation">
            <div className="typing-dots">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicatorComponent;