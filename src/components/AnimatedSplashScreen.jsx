import React from 'react';
import FoodySplash from '../foody/FoodySplash';

export default function AnimatedSplashScreen({ onFinish, speed = 1.35 }) {
  return <FoodySplash onDone={onFinish} speed={speed} />;
}
