import React from 'react';
import styled from 'styled-components';

const RewardButton = ({ text = 'Rewards', onClick }) => {
  return (
    <StyledWrapper>
      <button className="reward-btn" onClick={onClick}>
        <span className="IconContainer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 60 20" className="box-top box">
            <path strokeLinecap="round" strokeWidth="4" stroke="#6A8EF6" d="M2 18L58 18"></path>
            <circle strokeWidth="5" stroke="#6A8EF6" fill="#101218" r="7" cy="9.5" cx="20.5"></circle>
            <circle strokeWidth="5" stroke="#6A8EF6" fill="#101218" r="7" cy="9.5" cx="38.5"></circle>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 58 44" className="box-body box">
            <mask fill="white" id="path-1-inside-1_81_19">
              <rect rx="3" height="44" width="58"></rect>
            </mask>
            <rect mask="url(#path-1-inside-1_81_19)" strokeWidth="8" stroke="#6A8EF6" fill="#101218" rx="3" height="44" width="58"></rect>
            <line strokeWidth="6" stroke="#6A8EF6" y2="29" x2="58" y1="29" x1="0"></line>
            <path strokeLinecap="round" strokeWidth="5" stroke="#6A8EF6" d="M45.0005 20L36 3"></path>
            <path strokeLinecap="round" strokeWidth="5" stroke="#6A8EF6" d="M21 3L13.0002 19.9992"></path>
          </svg>
          <span className="coin"></span>
        </span>
        <span className="text">{text}</span>
      </button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .reward-btn {
    width: 120px;
    height: 40px;
    background-color: #101218;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    min-height: unset;
    min-width: unset;
  }
  .IconContainer {
    width: 40px;
    height: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .IconContainer svg {
    width: 40%;
    z-index: 3;
  }
  .box-top {
    transition: all 0.3s;
  }
  .text {
    width: 70px;
    height: 100%;
    font-size: 13px;
    color: #6a8ef6;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    font-weight: 600;
  }
  .reward-btn:hover .IconContainer .box-top {
    transform: translateY(-5px);
  }
  .reward-btn:hover {
    background-color: #202531;
  }
  .reward-btn:hover .coin {
    transform: translateY(-5px);
    transition-delay: 0.2s;
  }
  .coin {
    width: 25%;
    height: 25%;
    background-color: #e4d61a;
    position: absolute;
    border-radius: 50%;
    transition: all 0.3s;
    z-index: 1;
    border: 2px solid #ffe956;
    margin-top: 4px;
  }
`;

export default RewardButton;
