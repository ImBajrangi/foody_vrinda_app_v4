import React from 'react';
import styled from 'styled-components';

const ProductCard = ({ title = 'UIVERSE PREMIUM FONT', subtitle = '(REGULAR)', price = '$3', oldPrice = '$6', discount = '-50%', onDownload }) => {
  return (
    <StyledWrapper>
      <div className="card">
        <div className="wrapper">
          <div className="card-image">III</div>
          <div className="content">
            <p className="title">{title} {subtitle}</p>
            <p className="title price">{price}</p>
            <p className="title price old-price">&nbsp;{oldPrice}</p>
          </div>
          <button className="card-btn" onClick={onDownload}>DOWNLOAD</button>
        </div>
        {discount && <p className="tag">{discount}</p>}
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .card {
    width: 190px;
    height: 254px;
    background: #f5f5f5;
    padding: 15px;
    border-radius: 10px;
    overflow: hidden;
    transition: all 0.3s;
    position: relative;
  }
  .wrapper {
    height: fit-content;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 15px;
  }
  .card-image {
    width: 100%;
    height: 170px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 5em;
    font-weight: 900;
    transition: all 0.3s;
    color: #1a1a1a;
  }
  .content {
    height: fit-content;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }
  .title {
    font-size: 0.72em;
    text-transform: uppercase;
    font-weight: 500;
    color: #4d4d4d;
  }
  .price {
    font-size: 1em;
    font-weight: 700;
  }
  .old-price {
    font-size: 0.7em;
    text-decoration: line-through;
    color: #adadad;
  }
  .card-btn {
    margin-top: 10px;
    width: 100%;
    height: 40px;
    background-color: rgb(24, 24, 24);
    border: none;
    border-radius: 40px;
    color: white;
    transition: all 0.3s;
    cursor: pointer;
    font-weight: 500;
    min-height: unset;
    min-width: unset;
  }
  .card:hover .card-image {
    height: 120px;
  }
  .card:hover .card-btn {
    margin-top: 0;
  }
  .card-btn:hover {
    background-color: greenyellow;
    color: rgb(35, 35, 35);
  }
  .card:hover {
    background-color: white;
  }
  .tag {
    position: absolute;
    background-color: greenyellow;
    color: rgb(0, 0, 0);
    left: 12px;
    top: 12px;
    padding: 6px 12px;
    border-radius: 15px;
    font-size: 0.75em;
    font-weight: 500;
  }
`;

export default ProductCard;
