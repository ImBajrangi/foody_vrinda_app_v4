import React from 'react';
import styled from 'styled-components';

const StarRating = ({ value = 0, onChange }) => {
  return (
    <StyledWrapper>
      <div className="rating">
        {[5, 4, 3, 2, 1].map(star => (
          <React.Fragment key={star}>
            <input 
              type="radio" 
              id={`star-${star}`} 
              name="star-radio" 
              value={`star-${star}`}
              checked={value === star}
              onChange={() => onChange && onChange(star)}
            />
            <label htmlFor={`star-${star}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path pathLength="360" d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z"></path>
              </svg>
            </label>
          </React.Fragment>
        ))}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .rating {
    display: flex;
    flex-direction: row-reverse;
    gap: 0.3rem;
    --stroke: #666;
    --fill: #ffc73a;
  }
  .rating input {
    appearance: unset;
    width: 0;
    height: 0;
    position: absolute;
    opacity: 0;
  }
  .rating label {
    cursor: pointer;
    min-height: unset;
    min-width: unset;
  }
  .rating svg {
    width: 2rem;
    height: 2rem;
    overflow: visible;
    fill: transparent;
    stroke: var(--stroke);
    stroke-linejoin: bevel;
    stroke-dasharray: 12;
    animation: idle 4s linear infinite;
    transition: stroke 0.2s, fill 0.5s;
  }
  @keyframes idle {
    from {
      stroke-dashoffset: 24;
    }
  }
  .rating label:hover svg {
    stroke: var(--fill);
  }
  .rating input:checked ~ label svg {
    transition: 0s;
    animation: idle 4s linear infinite, yippee 0.75s backwards;
    fill: var(--fill);
    stroke: var(--fill);
    stroke-opacity: 0;
    stroke-dasharray: 0;
    stroke-linejoin: miter;
    stroke-width: 8px;
  }
  @keyframes yippee {
    0% {
      transform: scale(1);
      fill: var(--fill);
      fill-opacity: 0;
      stroke-opacity: 1;
      stroke: var(--stroke);
      stroke-dasharray: 10;
      stroke-width: 1px;
      stroke-linejoin: bevel;
    }
    30% {
      transform: scale(0);
      fill: var(--fill);
      fill-opacity: 0;
      stroke-opacity: 1;
      stroke: var(--stroke);
      stroke-dasharray: 10;
      stroke-width: 1px;
      stroke-linejoin: bevel;
    }
    30.1% {
      stroke: var(--fill);
      stroke-dasharray: 0;
      stroke-linejoin: miter;
      stroke-width: 8px;
    }
    60% {
      transform: scale(1.2);
      fill: var(--fill);
    }
  }
`;

export default StarRating;
