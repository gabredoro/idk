import React from 'react';
import { XboxState } from '../types';

interface Props {
  state: XboxState;
  accentColor: string;
  isDark: boolean;
}

const ControllerVisualizer: React.FC<Props> = ({ state, accentColor, isDark }) => {
  // Movement Logic
  const lx = (state.axes[0] || 0) * 8;
  const ly = (state.axes[1] || 0) * 8;
  const rx = (state.axes[2] || 0) * 8;
  const ry = (state.axes[3] || 0) * 8;

  // Calculate stick magnitudes
  const leftStickMag = Math.min(1, Math.sqrt(state.axes[0] ** 2 + state.axes[1] ** 2));
  const rightStickMag = Math.min(1, Math.sqrt(state.axes[2] ** 2 + state.axes[3] ** 2));

  // Visual States
  const isBtnPressed = (idx: number) => state.buttons[idx];
  
  // Analog Trigger Values
  const getTriggerValue = (idx: number) => {
    if (state.buttonValues && typeof state.buttonValues[idx] === 'number') {
      return state.buttonValues[idx];
    }
    return state.buttons[idx] ? 1 : 0;
  };

  const ltValue = getTriggerValue(6);
  const rtValue = getTriggerValue(7);

  // Animations
  const getBtnTransform = (idx: number) => 
    isBtnPressed(idx) 
      ? `translateY(2px) scale(0.96)` 
      : `translateY(0) scale(1)`;

  // Colors & Gradients
  const bodyStroke = isDark ? '#000' : '#d4d4d4';
  const stickCapColor = isDark ? '#111' : '#e5e5e5';
  
  // ABXY Colors
  const gemColors = {
      A: { base: '#4ade80', dark: '#166534' }, // Green
      B: { base: '#f87171', dark: '#991b1b' }, // Red
      X: { base: '#60a5fa', dark: '#1e40af' }, // Blue
      Y: { base: '#facc15', dark: '#854d0e' }, // Yellow
  };

  const getBtnFill = (idx: number, type: 'A'|'B'|'X'|'Y') => {
      return isDark ? `url(#btnDark${type})` : `url(#btnLight${type})`;
  };

  return (
    <div className="relative w-full max-w-[540px] aspect-[1.55] select-none transition-all duration-300">
      <svg viewBox="0 0 540 350" className="w-full h-full overflow-visible">
        
        <defs>
            {/* Plastic Texture Noise */}
            <filter id="plasticTexture" x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise"/>
                <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" in="noise" result="coloredNoise"/>
                <feComposite operator="in" in="coloredNoise" in2="SourceGraphic" result="composite"/>
                <feBlend mode="multiply" in="composite" in2="SourceGraphic"/>
            </filter>

            {/* Trigger Grip Pattern (Dots) */}
            <pattern id="triggerGrip" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
               <circle cx="2" cy="2" r="1.2" fill={isDark ? '#000' : '#666'} opacity="0.3"/>
            </pattern>

            {/* Handle Grip Pattern */}
            <pattern id="handleGrip" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
               <circle cx="1.5" cy="1.5" r="0.7" fill={isDark ? '#000' : '#999'} opacity="0.15"/>
            </pattern>

            {/* --- SHADOWS --- */}
            
            {/* 1. Ambient Occlusion (Internal Shadows) */}
            <filter id="ambientOcclusion">
               <feGaussianBlur stdDeviation="2"/>
               <feComponentTransfer>
                   <feFuncA type="linear" slope="0.5"/>
               </feComponentTransfer>
            </filter>

            {/* 2. Drop Shadow (The controller casting shadow on table) */}
            <filter id="dropShadowMain" x="-20%" y="-20%" width="140%" height="140%">
              {/* Layer 1: Tight, dark contact shadow */}
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur1"/>
              <feOffset dx="0" dy="4" in="blur1" result="offset1"/>
              <feFlood floodColor="#000" floodOpacity="0.4" result="color1"/>
              <feComposite in="color1" in2="offset1" operator="in" result="shadow1"/>

              {/* Layer 2: Soft, spread ambient shadow */}
              <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur2"/>
              <feOffset dx="0" dy="15" in="blur2" result="offset2"/>
              <feFlood floodColor={isDark ? "#000" : "#000"} floodOpacity="0.3" result="color2"/>
              <feComposite in="color2" in2="offset2" operator="in" result="shadow2"/>

              <feMerge>
                <feMergeNode in="shadow2"/>
                <feMergeNode in="shadow1"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* --- GRADIENTS --- */}

            {/* Body Gradient */}
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? '#333' : '#fff'} />
                <stop offset="20%" stopColor={isDark ? '#262626' : '#f5f5f5'} />
                <stop offset="100%" stopColor={isDark ? '#111' : '#e0e0e0'} />
            </linearGradient>

            {/* Trigger Gradient (Metallic/Satin plastic) */}
            <linearGradient id="triggerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? '#3a3a3a' : '#e0e0e0'} />
                <stop offset="100%" stopColor={isDark ? '#1a1a1a' : '#bdbdbd'} />
            </linearGradient>
            
            {/* Bumper Gradient (Smoother) */}
            <linearGradient id="bumperGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? '#444' : '#fff'} />
                <stop offset="10%" stopColor={isDark ? '#333' : '#eee'} />
                <stop offset="100%" stopColor={isDark ? '#222' : '#cfcfcf'} />
            </linearGradient>

            {/* Stick Cap Concave Gradient */}
            <radialGradient id="stickConcave" cx="50%" cy="50%" r="50%">
                <stop offset="50%" stopColor={isDark ? '#000' : '#ccc'} stopOpacity="0.5" />
                <stop offset="90%" stopColor={isDark ? '#222' : '#eee'} stopOpacity="0" />
                <stop offset="100%" stopColor={isDark ? '#333' : '#fff'} stopOpacity="0.8" />
            </radialGradient>
            
            {/* Stick Grip Pattern */}
            <pattern id="stickGrip" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
               <circle cx="2" cy="2" r="1" fill={isDark ? '#333' : '#bbb'} opacity="0.5"/>
            </pattern>

            {/* Button Gradients */}
            {(['A','B','X','Y'] as const).map(k => (
                <radialGradient key={k} id={`btnDark${k}`} cx="30%" cy="30%">
                    <stop offset="0%" stopColor="#222" />
                    <stop offset="90%" stopColor="#000" />
                </radialGradient>
            ))}
             {(['A','B','X','Y'] as const).map(k => (
                <radialGradient key={k} id={`btnLight${k}`} cx="30%" cy="30%">
                     <stop offset="0%" stopColor="#fff" />
                     <stop offset="100%" stopColor="#eee" />
                </radialGradient>
            ))}

            {/* Inner Shadow for wells */}
            <filter id="insetDeep">
                <feOffset dx="0" dy="2"/>
                <feGaussianBlur stdDeviation="2" result="offset-blur"/>
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                <feFlood floodColor="black" floodOpacity="0.7" result="color"/>
                <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
            </filter>

            {/* Active Glow */}
            <filter id="btnGlow">
               <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
               <feMerge>
                   <feMergeNode in="coloredBlur"/>
                   <feMergeNode in="SourceGraphic"/>
               </feMerge>
            </filter>
        </defs>

        {/* ================= TRIGGERS (Layer 0 - Bottom) ================= */}
        {/* The void behind the triggers */}
        <path d="M70,45 Q110,40 150,48 L175,55 L65,70 Z" fill={isDark ? '#000' : '#666'} opacity="0.8" />
        <path d="M470,45 Q430,40 390,48 L365,55 L475,70 Z" fill={isDark ? '#000' : '#666'} opacity="0.8" />

        {/* LEFT TRIGGER (LT) */}
        {/* We use a group transform to simulate the pivot rotation around the top edge */}
        <g transform={`rotate(${ltValue * -15}, 120, 40)`} style={{ transition: 'transform 0.05s linear' }}>
            {/* Trigger Body */}
            <path d="M 65,65 Q 90,75 125,58 L 125,45 Q 90,55 65,65 Z"
                  fill="url(#triggerGrad)" 
                  stroke={isDark ? '#000' : '#999'} strokeWidth="0.5" />
            {/* Grip Texture Overlay */}
            <path d="M 65,65 Q 90,75 125,58 L 125,45 Q 90,55 65,65 Z"
                  fill="url(#triggerGrip)" opacity="0.5" style={{ mixBlendMode: 'multiply' }} />
            {/* Highlight Edge */}
            <path d="M 65,65 Q 90,75 125,58" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        </g>

        {/* RIGHT TRIGGER (RT) */}
        <g transform={`rotate(${rtValue * 15}, 420, 40)`} style={{ transition: 'transform 0.05s linear' }}>
            {/* Trigger Body */}
            <path d="M 475,65 Q 450,75 415,58 L 415,45 Q 450,55 475,65 Z"
                  fill="url(#triggerGrad)"
                  stroke={isDark ? '#000' : '#999'} strokeWidth="0.5" />
             {/* Grip Texture Overlay */}
            <path d="M 475,65 Q 450,75 415,58 L 415,45 Q 450,55 475,65 Z"
                  fill="url(#triggerGrip)" opacity="0.5" style={{ mixBlendMode: 'multiply' }} />
             {/* Highlight Edge */}
             <path d="M 475,65 Q 450,75 415,58" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        </g>


        {/* ================= BUMPERS (Layer 1 - Middle) ================= */}
        {/* Contact shadow for Bumpers on the body */}
        <g filter="url(#ambientOcclusion)" opacity="0.6">
            <path d="M 55,68 Q 60,50 110,48 L 175,52 Q 170,68 155,72 Q 110,68 55,68" fill="#000" />
            <path d="M 485,68 Q 480,50 430,48 L 365,52 Q 370,68 385,72 Q 430,68 485,68" fill="#000" />
        </g>

        {/* LEFT BUMPER (LB) */}
        <g transform={isBtnPressed(4) ? "translate(0, 2)" : "translate(0,0)"} style={{ transition: 'transform 0.1s' }}>
             <path d="M 55,65 Q 60,45 110,45 L 175,50 Q 170,65 155,70 Q 110,65 55,65 Z"
                   fill={isBtnPressed(4) ? accentColor : "url(#bumperGrad)"}
                   stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)"} strokeWidth="0.5" />
             {/* Glossy Highlight on Bumper */}
             {!isBtnPressed(4) && (
                 <path d="M 65,55 Q 100,50 150,55" fill="none" stroke="white" strokeOpacity={isDark ? "0.1" : "0.8"} strokeWidth="2" strokeLinecap="round" />
             )}
        </g>

        {/* RIGHT BUMPER (RB) */}
        <g transform={isBtnPressed(5) ? "translate(0, 2)" : "translate(0,0)"} style={{ transition: 'transform 0.1s' }}>
             <path d="M 485,65 Q 480,45 430,45 L 365,50 Q 370,65 385,70 Q 430,65 485,65 Z"
                   fill={isBtnPressed(5) ? accentColor : "url(#bumperGrad)"}
                   stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.8)"} strokeWidth="0.5" />
             {/* Glossy Highlight on Bumper */}
             {!isBtnPressed(5) && (
                 <path d="M 475,55 Q 440,50 390,55" fill="none" stroke="white" strokeOpacity={isDark ? "0.1" : "0.8"} strokeWidth="2" strokeLinecap="round" />
             )}
        </g>


        {/* ================= MAIN BODY SHELL (Layer 2 - Top) ================= */}
        <g filter="url(#dropShadowMain)">
            {/* The ergonomic "Series X" shape - refined for wider palm feel */}
            <path d="M 175,42 
                     Q 270,38 365,42 
                     C 420,45 455,60 480,95 
                     C 505,130 500,180 490,225 
                     C 480,270 450,310 410,320 
                     C 380,325 360,290 350,270 
                     C 330,230 210,230 190,270 
                     C 180,290 160,325 130,320 
                     C 90,310 60,270 50,225 
                     C 40,180 35,130 60,95 
                     C 85,60 120,45 175,42 Z"
                  fill="url(#bodyGrad)" stroke={bodyStroke} strokeWidth="1" />
            
            {/* ================= SIDE GRIPS ================= */}
            {/* Visual texture patches on the sides of the handles */}
            <g clipPath="url(#bodyClip)">
                 {/* Left Grip Texture */}
                 <path d="M 60,95 C 35,130 40,180 50,225 C 60,270 90,310 130,320 C 135,321 140,320 145,315 C 100,290 85,200 100,120 L 60,95 Z"
                       fill="url(#handleGrip)" opacity="1" style={{mixBlendMode: 'multiply'}} />
                 
                 {/* Right Grip Texture */}
                 <path d="M 480,95 C 505,130 500,180 490,225 C 480,270 450,310 410,320 C 405,321 400,320 395,315 C 440,290 455,200 440,120 L 480,95 Z"
                       fill="url(#handleGrip)" opacity="1" style={{mixBlendMode: 'multiply'}} />
            </g>

            {/* Curvature Shadows for Handles (Gives roundness) */}
            <linearGradient id="handleCurveLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="black" stopOpacity="0.3" />
                <stop offset="40%" stopColor="black" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="handleCurveRight" x1="100%" y1="0%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="black" stopOpacity="0.3" />
                <stop offset="40%" stopColor="black" stopOpacity="0" />
            </linearGradient>

             <path d="M 60,95 C 35,130 40,180 50,225 C 60,270 90,310 130,320 L 140,320 C 100,290 85,150 110,100 Z"
                   fill="url(#handleCurveLeft)" style={{mixBlendMode: isDark ? 'multiply' : 'normal'}} />
                   
             <path d="M 480,95 C 505,130 500,180 490,225 C 480,270 450,310 410,320 L 400,320 C 440,290 455,150 430,100 Z"
                   fill="url(#handleCurveRight)" style={{mixBlendMode: isDark ? 'multiply' : 'normal'}} />

            {/* Matte Plastic Texture Overlay (Global) */}
            <path d="M 175,42 Q 270,38 365,42 C 420,45 455,60 480,95 C 505,130 500,180 490,225 C 480,270 450,310 410,320 C 380,325 360,290 350,270 C 330,230 210,230 190,270 C 180,290 160,325 130,320 C 90,310 60,270 50,225 C 40,180 35,130 60,95 C 85,60 120,45 175,42 Z"
                  fill={isDark ? "black" : "white"} opacity="0.1" filter="url(#plasticTexture)" style={{ mixBlendMode: 'overlay' }} pointerEvents="none" />
        </g>

        {/* ================= SEAMS & DETAILS ================= */}
        {/* Handle Seams (Visual detail for realism) */}
        <path d="M 478,110 C 485,140 485,190 475,225" fill="none" stroke="black" strokeWidth="0.5" opacity="0.3" />
        <path d="M 62,110 C 55,140 55,190 65,225" fill="none" stroke="black" strokeWidth="0.5" opacity="0.3" />


        {/* ================= LEFT STICK (Analog) ================= */}
        <g transform="translate(130, 115)">
           {/* Stick Well (Concave housing in body) */}
           <circle r="40" fill={isDark ? '#050505' : '#d4d4d4'} filter="url(#insetDeep)"/>
           
           <g transform={`translate(${lx}, ${ly})`}>
              {/* Stick Shaft/Dome */}
              <circle r="20" fill={isDark ? '#1a1a1a' : '#bbb'} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
              
              {/* Stick Cap */}
              <g>
                <circle r="22" fill={stickCapColor} stroke={isDark ? '#000' : '#aaa'} strokeWidth="1" />
                {/* Rubber Grip Texture */}
                <circle r="21" fill="url(#stickGrip)" opacity="0.2" />
                {/* Concave Shadow Gradient */}
                <circle r="22" fill="url(#stickConcave)" />
                {/* Dynamic Glow for movement */}
                {leftStickMag > 0.1 && (
                    <circle r="22" fill={accentColor} opacity={leftStickMag * 0.4} filter="blur(4px)" style={{ mixBlendMode: 'overlay' }} />
                )}
                {/* Stick Click Highlight */}
                {isBtnPressed(10) && <circle r="18" fill={accentColor} opacity="0.5" filter="url(#btnGlow)" />}
              </g>
           </g>
        </g>


        {/* ================= RIGHT STICK (Analog) ================= */}
        <g transform="translate(350, 195)">
           {/* Stick Well */}
           <circle r="40" fill={isDark ? '#050505' : '#d4d4d4'} filter="url(#insetDeep)"/>
           
           <g transform={`translate(${rx}, ${ry})`}>
              <circle r="20" fill={isDark ? '#1a1a1a' : '#bbb'} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
              <g>
                <circle r="22" fill={stickCapColor} stroke={isDark ? '#000' : '#aaa'} strokeWidth="1" />
                <circle r="21" fill="url(#stickGrip)" opacity="0.2" />
                <circle r="22" fill="url(#stickConcave)" />
                {rightStickMag > 0.1 && (
                    <circle r="22" fill={accentColor} opacity={rightStickMag * 0.4} filter="blur(4px)" style={{ mixBlendMode: 'overlay' }} />
                )}
                {isBtnPressed(11) && <circle r="18" fill={accentColor} opacity="0.5" filter="url(#btnGlow)" />}
              </g>
           </g>
        </g>


        {/* ================= D-PAD (Hybrid Dish) ================= */}
        <g transform="translate(190, 195)">
           {/* The "Dish" base */}
           <circle r="34" fill={isDark ? '#111' : '#e0e0e0'} stroke={bodyStroke} strokeWidth="1" filter="url(#insetDeep)" />
           
           {/* The Cross (Raised) */}
           <g transform="scale(0.9)">
             <path d="M-12,-34 L12,-34 L14,-14 L34,-12 L34,12 L14,14 L12,34 L-12,34 L-14,14 L-34,12 L-34,-12 L-14,-14 Z" 
                   fill={isDark ? '#222' : '#f5f5f5'} 
                   stroke={bodyStroke} strokeWidth="1"
                   filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.3))" />
             
             {/* Center indentation */}
             <circle r="10" fill={isDark ? '#151515' : '#e5e5e5'} />

             {/* Directional Highlights */}
             {isBtnPressed(12) && <path d="M-6,-28 L6,-28 L8,-12 L-8,-12 Z" fill={accentColor} filter="url(#btnGlow)" />}
             {isBtnPressed(13) && <path d="M-6,28 L6,28 L8,12 L-8,12 Z" fill={accentColor} filter="url(#btnGlow)" />}
             {isBtnPressed(14) && <path d="M-28,-6 L-28,6 L-12,8 L-12,-8 Z" fill={accentColor} filter="url(#btnGlow)" />}
             {isBtnPressed(15) && <path d="M28,-6 L28,6 L12,8 L12,-8 Z" fill={accentColor} filter="url(#btnGlow)" />}
           </g>
        </g>


        {/* ================= ABXY BUTTONS (Glassy) ================= */}
        <g transform="translate(390, 115)">
           {/* Y */}
           <g transform={`translate(0, -32)`}>
              <g style={{ transition: 'transform 0.05s', transform: getBtnTransform(3), transformOrigin: 'center' }}>
                <circle r="13" fill={getBtnFill(3, 'Y')} stroke={isDark?'#000':'#ccc'} strokeWidth="1" filter={isBtnPressed(3) ? "url(#btnGlow)" : ""} />
                {/* Inner Text with color */}
                <text y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill={gemColors.Y.base} style={{textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>Y</text>
                {/* Gloss Reflection */}
                <ellipse cx="0" cy="-6" rx="6" ry="3" fill="white" opacity="0.3" />
              </g>
           </g>
           {/* B */}
           <g transform={`translate(32, 0)`}>
              <g style={{ transition: 'transform 0.05s', transform: getBtnTransform(1), transformOrigin: 'center' }}>
                <circle r="13" fill={getBtnFill(1, 'B')} stroke={isDark?'#000':'#ccc'} strokeWidth="1" filter={isBtnPressed(1) ? "url(#btnGlow)" : ""} />
                <text y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill={gemColors.B.base} style={{textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>B</text>
                <ellipse cx="0" cy="-6" rx="6" ry="3" fill="white" opacity="0.3" />
              </g>
           </g>
           {/* A */}
           <g transform={`translate(0, 32)`}>
              <g style={{ transition: 'transform 0.05s', transform: getBtnTransform(0), transformOrigin: 'center' }}>
                <circle r="13" fill={getBtnFill(0, 'A')} stroke={isDark?'#000':'#ccc'} strokeWidth="1" filter={isBtnPressed(0) ? "url(#btnGlow)" : ""} />
                <text y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill={gemColors.A.base} style={{textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>A</text>
                <ellipse cx="0" cy="-6" rx="6" ry="3" fill="white" opacity="0.3" />
              </g>
           </g>
           {/* X */}
           <g transform={`translate(-32, 0)`}>
              <g style={{ transition: 'transform 0.05s', transform: getBtnTransform(2), transformOrigin: 'center' }}>
                <circle r="13" fill={getBtnFill(2, 'X')} stroke={isDark?'#000':'#ccc'} strokeWidth="1" filter={isBtnPressed(2) ? "url(#btnGlow)" : ""} />
                <text y="5" textAnchor="middle" fontSize="14" fontWeight="800" fill={gemColors.X.base} style={{textShadow: '0 1px 2px rgba(0,0,0,0.5)'}}>X</text>
                <ellipse cx="0" cy="-6" rx="6" ry="3" fill="white" opacity="0.3" />
              </g>
           </g>
        </g>


        {/* ================= CENTER BUTTONS ================= */}
        
        {/* Xbox Logo (Guide) */}
        <g transform="translate(270, 80)">
            <circle r="18" fill={isDark?'#111':'#fff'} stroke={isDark?'#333':'#ccc'} strokeWidth="1" />
            <g transform="scale(0.8)">
               <path d="M-8,-8 L-3,-3 L-8,3 L-12,8 L-6,8 L0,2 L6,8 L12,8 L8,3 L3,-3 L8,-8 L12,-8 L6,-8 L0,-2 L-6,-8 Z" 
                     fill={isBtnPressed(16) ? '#fff' : (isDark ? '#444' : '#bbb')} 
                     filter={isBtnPressed(16) ? "url(#btnGlow)" : ""}
                     style={{ transition: 'all 0.2s' }} />
            </g>
            {isBtnPressed(16) && <circle r="18" fill={accentColor} filter="blur(10px)" opacity="0.6" />}
        </g>
        
        {/* View Button */}
        <g transform="translate(225, 80)">
             <circle r="6" fill={isDark?'#1a1a1a':'#e5e5e5'} stroke={bodyStroke} strokeWidth="0.5"/>
             {/* Icon */}
             <rect x="-3" y="-3" width="6" height="6" rx="1" fill="none" stroke={isDark ? '#666' : '#999'} strokeWidth="1.5" />
             <rect x="-1" y="-3" width="2" height="6" fill="none" stroke={isDark ? '#666' : '#999'} strokeWidth="1.5" />
             {isBtnPressed(8) && <circle r="6" fill={accentColor} filter="url(#btnGlow)" opacity="0.8"/>}
        </g>
        
        {/* Menu Button */}
        <g transform="translate(315, 80)">
             <circle r="6" fill={isDark?'#1a1a1a':'#e5e5e5'} stroke={bodyStroke} strokeWidth="0.5"/>
             {/* Icon */}
             <line x1="-3" y1="-2" x2="3" y2="-2" stroke={isDark ? '#666' : '#999'} strokeWidth="1.5" strokeLinecap="round" />
             <line x1="-3" y1="2" x2="3" y2="2" stroke={isDark ? '#666' : '#999'} strokeWidth="1.5" strokeLinecap="round" />
             <line x1="-3" y1="0" x2="3" y2="0" stroke={isDark ? '#666' : '#999'} strokeWidth="1.5" strokeLinecap="round" />
             {isBtnPressed(9) && <circle r="6" fill={accentColor} filter="url(#btnGlow)" opacity="0.8"/>}
        </g>

        {/* Share Button (Visual Only - Center) */}
        <g transform="translate(270, 130)">
             <path d="M-4,0 Q-4,-4 0,-4 Q4,-4 4,0 Q4,4 0,4 Q-4,4 -4,0" fill={isDark?'#1a1a1a':'#e5e5e5'} stroke={bodyStroke} strokeWidth="0.5"/>
             <rect x="-1.5" y="-2" width="3" height="4" fill={isDark ? '#666' : '#999'} rx="0.5" />
             <line x1="0" y1="-2" x2="0" y2="1" stroke={isDark ? '#1a1a1a' : '#e5e5e5'} strokeWidth="1" />
        </g>
        
      </svg>
    </div>
  );
};

export default ControllerVisualizer;