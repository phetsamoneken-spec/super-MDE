import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { MotionConfig } from 'motion/react';
import './index.css';

createRoot(document.getElementById('root')!).render(<MotionConfig reducedMotion="user"><App /></MotionConfig>);
