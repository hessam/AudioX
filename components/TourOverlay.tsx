import React, { useEffect, useState } from 'react';
import { Tour, TourStep } from '../types';

interface TourOverlayProps {
    tour: Tour;
    currentStepIndex: number;
    isPlaying: boolean;
    onNext: () => void;
    onPrev: () => void;
    onTogglePlay: () => void;
    onExit: () => void;
}

const TourOverlay: React.FC<TourOverlayProps> = ({ tour, currentStepIndex, isPlaying, onNext, onPrev, onTogglePlay, onExit }) => {
    const currentStep = tour.steps[currentStepIndex];
    const progress = ((currentStepIndex + 1) / tour.steps.length) * 100;
    
    // Typewriter effect for narrative
    const [displayedText, setDisplayedText] = useState('');
    
    useEffect(() => {
        setDisplayedText('');
        let i = 0;
        const speed = 20; // ms per char
        const txt = currentStep.narrative;
        
        const timer = setInterval(() => {
            if (i < txt.length) {
                setDisplayedText(prev => prev + txt.charAt(i));
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
        
        return () => clearInterval(timer);
    }, [currentStep.narrative]);

    return (
        <div className="absolute inset-x-0 bottom-0 z-40 pointer-events-none flex flex-col items-center justify-end pb-12 animate-fadeIn">
            <div className="bg-black/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-6 w-[90%] max-w-2xl shadow-2xl pointer-events-auto transform transition-all duration-500">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                    <div>
                        <h2 className="text-sm font-black text-indigo-400 uppercase tracking-widest">{tour.title}</h2>
                        <span className="text-xs text-gray-500 font-mono">CHAPTER {currentStepIndex + 1} OF {tour.steps.length}</span>
                    </div>
                    <button onClick={onExit} className="text-gray-500 hover:text-white px-3 py-1 bg-zinc-800 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                        Exit Tour
                    </button>
                </div>

                {/* Content */}
                <div className="mb-6 min-h-[80px] flex items-center">
                    <p className="text-lg md:text-xl text-white font-medium leading-relaxed font-serif">
                        {displayedText}
                        <span className="animate-pulse text-indigo-500">|</span>
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-zinc-800 rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
                </div>

                {/* Controls */}
                <div className="flex justify-between items-center">
                    <button 
                        onClick={onPrev}
                        disabled={currentStepIndex === 0}
                        className="p-2 rounded-full hover:bg-zinc-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button 
                        onClick={onTogglePlay}
                        className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold shadow-lg shadow-indigo-900/50 transition-all transform hover:scale-105 active:scale-95"
                    >
                        {isPlaying ? (
                            <>
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                                <span>PAUSE</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                <span>PLAY</span>
                            </>
                        )}
                    </button>

                    <button 
                        onClick={onNext}
                        disabled={currentStepIndex === tour.steps.length - 1}
                        className="p-2 rounded-full hover:bg-zinc-700 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TourOverlay;