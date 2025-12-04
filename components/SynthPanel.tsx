
import React from 'react';
import { SynthParams } from '../services/synthService';

interface SynthPanelProps {
    params: SynthParams;
    onChange: (newParams: SynthParams) => void;
    onReset: () => void;
    matchCount: number;
    isOpen: boolean;
    onToggle: () => void;
}

const Slider: React.FC<{ label: string, value: number, onChange: (val: number) => void, color: string }> = ({ label, value, onChange, color }) => (
    <div className="flex flex-col gap-1 mb-3">
        <div className="flex justify-between items-end">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 truncate pr-2">{label}</span>
            <span className={`text-[10px] font-mono font-bold ${value > 0 ? 'text-white' : 'text-gray-600'}`}>{value}%</span>
        </div>
        <div className="relative h-4 w-full flex items-center group">
            {/* Track Background */}
            <div className="absolute w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                 <div 
                    className={`h-full transition-all duration-100 ${color}`} 
                    style={{ width: `${value}%` }}
                 ></div>
            </div>
            {/* Thumb */}
            <input 
                type="range" 
                min="0" 
                max="100" 
                value={value} 
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="absolute w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* Custom Thumb Visual */}
            <div 
                className="absolute w-3 h-3 bg-zinc-200 rounded-full shadow-lg border border-zinc-900 pointer-events-none transition-all duration-100 group-hover:scale-110"
                style={{ left: `calc(${value}% - 6px)` }}
            ></div>
        </div>
    </div>
);

const SynthPanel: React.FC<SynthPanelProps> = ({ params, onChange, onReset, matchCount, isOpen, onToggle }) => {
    
    const updateParam = (key: keyof SynthParams, val: number) => {
        onChange({ ...params, [key]: val });
    };

    const isActive = Object.values(params).some((v: number) => v > 0);

    return (
        <div className={`absolute left-4 bottom-4 z-30 transition-all duration-500 ease-in-out w-[calc(100vw-32px)] max-w-[340px] ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%+24px)]'}`}>
            {/* Toggle Tab */}
            <div 
                onClick={onToggle}
                className={`absolute -top-10 left-0 h-10 px-4 flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-t-lg cursor-pointer shadow-xl hover:bg-zinc-800 transition-colors ${isOpen ? 'text-indigo-400 border-b-0' : 'text-gray-400'}`}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Synth Engine v2.0</span>
                {isActive && !isOpen && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ml-1"></span>
                )}
            </div>

            {/* Main Panel */}
            <div className="w-full bg-zinc-900/95 backdrop-blur-xl border border-zinc-700 rounded-tr-xl rounded-br-xl rounded-bl-xl p-5 shadow-2xl relative">
                <div className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-2">
                    <h3 className="text-white font-black italic text-base tracking-tighter">REVERSE ENGINEER</h3>
                    <div className="flex items-center gap-2">
                        {isActive && (
                            <button onClick={onReset} className="text-[9px] text-gray-500 hover:text-white underline font-bold">RESET</button>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${matchCount > 0 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-gray-500'}`}>
                            {isActive ? `${matchCount} MATCHES` : 'IDLE'}
                        </span>
                    </div>
                </div>

                {/* 2-Column Grid for Sliders */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                    {/* Col 1 */}
                    <div>
                        <Slider 
                            label="Heaviness" 
                            value={params.heaviness} 
                            onChange={(v) => updateParam('heaviness', v)} 
                            color="bg-red-600"
                        />
                        <Slider 
                            label="Speed" 
                            value={params.speed} 
                            onChange={(v) => updateParam('speed', v)} 
                            color="bg-orange-500"
                        />
                        <Slider 
                            label="Complexity" 
                            value={params.complexity} 
                            onChange={(v) => updateParam('complexity', v)} 
                            color="bg-purple-500"
                        />
                         <Slider 
                            label="Vocals" 
                            value={params.vocals} 
                            onChange={(v) => updateParam('vocals', v)} 
                            color="bg-pink-500"
                        />
                    </div>
                    {/* Col 2 */}
                    <div>
                        <Slider 
                            label="Atmosphere" 
                            value={params.atmosphere} 
                            onChange={(v) => updateParam('atmosphere', v)} 
                            color="bg-cyan-500"
                        />
                        <Slider 
                            label="Groove" 
                            value={params.groove} 
                            onChange={(v) => updateParam('groove', v)} 
                            color="bg-emerald-500"
                        />
                        <Slider 
                            label="Production" 
                            value={params.production} 
                            onChange={(v) => updateParam('production', v)} 
                            color="bg-blue-500"
                        />
                        <Slider 
                            label="Mood" 
                            value={params.mood} 
                            onChange={(v) => updateParam('mood', v)} 
                            color="bg-yellow-400"
                        />
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-800 text-center">
                    <p className="text-[9px] text-gray-600">
                        Adjust sliders to filter bands. <br/>
                        <span className="text-indigo-400 opacity-60">Engine v2.0 (Hybrid DNA + Meta)</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SynthPanel;
