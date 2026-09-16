import React from 'react';
import styled from 'styled-components';

const RealismButton = ({ children = 'Realism', onClick, className = '' }) => {
  return (
    <StyledWrapper className={className}>
      <button className="realism-button" onClick={onClick}>
        <div className="blob1"></div>
        <div className="blob2"></div>
        <div className="inner">{children}</div>
      </button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .realism-button {
    cursor: pointer;
    font-size: 1.4rem;
    border-radius: 16px;
    border: none;
    padding: 2px;
    background: radial-gradient(circle 80px at 80% -10%, #ffffff, #181b1b);
    position: relative;
    transition: background 0.3s, transform 0.3s;
    min-height: unset;
    min-width: unset;
  }
  .realism-button:hover {
    transform: scale(0.98);
  }
  .realism-button::after {
    content: "";
    position: absolute;
    width: 65%;
    height: 60%;
    border-radius: 120px;
    top: 0;
    right: 0;
    box-shadow: 0 0 20px #ffffff38;
    z-index: -1;
    transition: box-shadow 0.3s;
  }
  .realism-button:hover::after {
    box-shadow: 0 0 10px #ffffff18;
  }
  .blob1 {
    position: absolute;
    width: 70px;
    height: 100%;
    border-radius: 16px;
    bottom: 0;
    left: 0;
    background: radial-gradient(circle 60px at 0% 100%, #3fe9ff, #0000ff80, transparent);
    box-shadow: -10px 10px 30px #0051ff2d;
    transition: background 0.3s, box-shadow 0.3s;
  }
  .realism-button:hover .blob1 {
    box-shadow: -5px 5px 20px #000;
  }
  .inner {
    padding: 14px 25px;
    border-radius: 14px;
    color: #fff;
    z-index: 3;
    position: relative;
    background: radial-gradient(circle 80px at 80% -50%, #777777, #0f1111);
    transition: background 0.3s;
    font-family: inherit;
    font-weight: 600;
    letter-spacing: 0.05em;
  }
  .realism-button:hover .inner {
    background: radial-gradient(circle 80px at 80% -50%, #333333, #0f0f0f);
  }
  .inner::before {
    content: "";
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    border-radius: 14px;
    background: radial-gradient(circle 60px at 0% 100%, #00e1ff1a, #0000ff11, transparent);
    position: absolute;
    transition: opacity 0.3s;
  }
  .realism-button:hover .inner::before {
    opacity: 0;
  }
`;

export default RealismButton;
