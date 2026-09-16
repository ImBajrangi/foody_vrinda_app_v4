import React from 'react';
import styled from 'styled-components';

const BouncingLoader = () => {
  return (
    <StyledWrapper>
      <div className="wrapper">
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="circle"></div>
        <div className="shadow"></div>
        <div className="shadow"></div>
        <div className="shadow"></div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  .wrapper {
    width: 140px;
    height: 48px;
    position: relative;
    z-index: 1;
  }
  .circle {
    width: 14px;
    height: 14px;
    position: absolute;
    border-radius: 50%;
    background: linear-gradient(135deg, #FFF8CC 0%, #E0FF33 60%, #B8E600 100%);
    box-shadow: 0 0 10px rgba(224, 255, 51, 0.65), 0 2px 6px rgba(0, 0, 0, 0.4);
    left: 18%;
    transform-origin: 50%;
    animation: circle7124 .55s alternate infinite cubic-bezier(0.2, 0.8, 0.4, 1);
  }
  @keyframes circle7124 {
    0% {
      top: 42px;
      height: 4px;
      border-radius: 50px 50px 25px 25px;
      transform: scaleX(1.6);
    }
    40% {
      height: 14px;
      border-radius: 50%;
      transform: scaleX(1);
    }
    100% {
      top: 0%;
    }
  }
  .circle:nth-child(2) {
    left: 48%;
    animation-delay: .18s;
  }
  .circle:nth-child(3) {
    left: auto;
    right: 18%;
    animation-delay: .36s;
  }
  .shadow {
    width: 14px;
    height: 3px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.85);
    position: absolute;
    top: 44px;
    transform-origin: 50%;
    z-index: -1;
    left: 18%;
    filter: blur(1.5px);
    animation: shadow046 .55s alternate infinite cubic-bezier(0.2, 0.8, 0.4, 1);
  }
  @keyframes shadow046 {
    0% {
      transform: scaleX(1.6);
      opacity: .9;
    }
    40% {
      transform: scaleX(1);
      opacity: .6;
    }
    100% {
      transform: scaleX(.25);
      opacity: .2;
    }
  }
  .shadow:nth-child(4) {
    left: 48%;
    animation-delay: .18s;
  }
  .shadow:nth-child(5) {
    left: auto;
    right: 18%;
    animation-delay: .36s;
  }
`;

export default BouncingLoader;

