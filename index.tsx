
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

// --- Type Definitions & Styles ---
const styles = {
  container: {
    fontFamily: "'Sarabun', 'Roboto', sans-serif",
    height: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    // Bright Blue/Cyan Gradient as requested
    background: 'linear-gradient(180deg, #005bea 0%, #00c6fb 100%)', 
    color: 'white',
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    padding: '15px 20px',
    backgroundColor: 'rgba(0, 80, 200, 0.6)', // Semi-transparent blue
    backdropFilter: 'blur(10px)',
    color: 'white',
    textAlign: 'center' as const,
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    flexShrink: 0,
    zIndex: 10,
    borderBottom: '1px solid rgba(255,255,255,0.2)',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: 'bold',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  subtitle: {
    margin: '5px 0 0 0',
    fontSize: '1.2rem',
    fontWeight: 500,
    color: '#e0f7fa',
  },
  main: {
    maxWidth: '800px',
    width: '100%',
    padding: '10px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1,
    overflowY: 'auto' as const,
    WebkitOverflowScrolling: 'touch' as const,
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '100%',
    justifyContent: 'start', // Align content to top
    flex: 1,
    paddingTop: '20px',
  },
  posterTextContainer: {
    textAlign: 'center' as const,
    marginBottom: '20px',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  posterSchoolName: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '2px 2px 0px #ff00de, -1px -1px 0 #ff00de, 1px -1px 0 #ff00de, -1px 1px 0 #ff00de, 1px 1px 0 #ff00de', // Pink outline effect simulation
    marginBottom: '5px',
  },
  posterSlogan: {
    fontSize: '2rem',
    fontWeight: 'bold',
    lineHeight: 1.2,
  },
  redText: {
    color: '#ff3f34', // Red for "อาชีวะ"
    fontSize: '2.5rem',
  },
  whiteText: {
    color: '#ffffff', // White for "ร่วมใจ"
  },
  campaignImage: {
    width: '100%',
    maxWidth: '450px', // Slightly larger for the character
    height: 'auto',
    marginBottom: '20px',
    // Removed border and background to let the character blend in
    filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))', 
    objectFit: 'contain' as const,
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glassmorphism
    backdropFilter: 'blur(15px)',
    borderRadius: '25px',
    padding: '20px',
    width: '100%',
    maxWidth: '500px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  micButton: {
    width: '90px',
    height: '90px',
    borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(0, 198, 251, 0.4)',
    outline: 'none',
    touchAction: 'manipulation',
    marginBottom: '10px',
    backgroundColor: '#00d2d3', // Cyan as requested
    color: 'white',
  },
  visualizer: {
    height: '40px',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '15px',
  },
  bar: {
    width: '8px',
    backgroundColor: '#ffffff', // White bars for contrast on blue
    borderRadius: '4px',
    height: '8px',
    willChange: 'height',
    boxShadow: '0 0 8px rgba(255, 255, 255, 0.8)',
  },
  infoSection: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: '20px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
  },
  infoCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '15px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  infoTitle: {
    margin: '0 0 5px 0', 
    color: '#81ecec', // Light Cyan
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: '0.9rem', 
    color: '#ffffff',
    margin: 0,
  }
};

// --- Audio Helpers (Raw PCM Handling) ---

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return new Blob([int16], { type: 'audio/pcm' });
}

function decodeAudio(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function arrayBufferToAudioBuffer(
  data: Uint8Array,
  context: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = context.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function convertBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// --- Main Application Component ---

const App = () => {
  const [connected, setConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);

  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isSpeakingRef = useRef(false);
  const connectedRef = useRef(false);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    connectedRef.current = connected;
  }, [connected]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      if (connectedRef.current) {
        barRefs.current.forEach((bar) => {
          if (bar) {
            const base = isSpeakingRef.current ? 25 : 8;
            const variance = isSpeakingRef.current ? 15 : 4;
            const height = Math.max(8, Math.min(40, base + Math.random() * variance));
            bar.style.height = `${height}px`;
            bar.style.opacity = '1';
          }
        });
      } else {
        barRefs.current.forEach((bar) => {
          if (bar) {
            bar.style.height = '8px';
            bar.style.opacity = '0.5';
          }
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setConnected(false);
    setIsSpeaking(false);
  };

  const connect = async () => {
    try {
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await inputAudioContextRef.current.resume();
      await outputAudioContextRef.current.resume();

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        คุณคือ "พี่หมวกกันน็อก" ตัวแทนจาก "วิทยาลัยการอาชีพบ้านแพ้ว"
        หน้าที่ของคุณคือประชาสัมพันธ์ "โครงการอาชีวะร่วมใจ สวมใส่หมวกกันน็อก"
        
        บุคลิก: ร่าเริง เป็นกันเอง เสียงสดใส สนุกสนาน
        กลุ่มเป้าหมาย: นักเรียน นักศึกษา และประชาชนทั่วไป
        
        เนื้อหา:
        1. เชิญชวนให้สวมหมวกกันน็อก 100%
        2. พูดสโลแกน "อาชีวะร่วมใจ สวมใส่หมวกกันน็อก" บ่อยๆ
        3. ให้ความรู้ความปลอดภัยจราจร
        
        การตอบ: พูดภาษาไทย สั้นๆ กระชับ ได้ใจความ
      `;

      let resolveSession: (s: any) => void;
      const sessionPromise = new Promise<any>((resolve) => {
        resolveSession = resolve;
      });

      const session = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Connected');
            setConnected(true);
            if (!inputAudioContextRef.current || !streamRef.current) return;
            
            sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = async (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const sum = inputData.reduce((a, b) => a + Math.abs(b), 0);
              const avg = sum / inputData.length;
              if (avg > 0.01) setIsSpeaking(false); 

              const blob = createBlob(inputData);
              const base64Data = await convertBlobToBase64(blob);
              
              sessionPromise.then(currentSession => {
                 currentSession.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: base64Data
                    }
                 });
              });
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData && outputAudioContextRef.current) {
                setIsSpeaking(true);
                nextStartTimeRef.current = Math.max(
                    nextStartTimeRef.current,
                    outputAudioContextRef.current.currentTime
                );
                const rawBytes = decodeAudio(audioData);
                const audioBuffer = await arrayBufferToAudioBuffer(rawBytes, outputAudioContextRef.current);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContextRef.current.destination);
                source.onended = () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) setIsSpeaking(false);
                };
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
             }
             if (message.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
                 setIsSpeaking(false);
             }
          },
          onclose: () => {
             console.log('Gemini Live Closed');
             disconnect();
          },
          onerror: (err) => {
             console.error('Gemini Live Error', err);
             disconnect();
          }
        }
      });
      
      sessionRef.current = session;
      resolveSession!(session);

    } catch (error) {
      console.error("Connection failed", error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      disconnect();
    }
  };

  const toggleConnection = () => {
    if (connected) disconnect();
    else connect();
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Smart Helmet PR Station</h1>
        <p style={styles.subtitle}>สถานีประชาสัมพันธ์อัจฉริยะ</p>
      </header>

      <main style={styles.main}>
        <div style={styles.contentWrapper}>
            
            {/* Header Text matching the Poster */}
            <div style={styles.posterTextContainer}>
              <div style={styles.posterSchoolName}>วิทยาลัยการอาชีพบ้านแพ้ว</div>
              <div style={styles.posterSlogan}>
                <span style={styles.redText}>อาชีวะ</span>
                <span style={styles.whiteText}> ร่วมใจ</span>
                <br/>
                <span style={{fontSize: '1.6rem', color: 'white'}}>สวมใส่หมวกกันน็อค</span>
              </div>
            </div>

            {/* 
              Image Component 
              The user must save their image as 'banner.png' in the root directory.
            */}
            <img 
              src="banner.png" 
              alt="Campaign Banner"
              style={styles.campaignImage}
              onError={(e) => {
                // Show a helpful placeholder if the image is missing
                e.currentTarget.src = "https://placehold.co/400x500/0072ff/ffffff?text=%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%93%E0%B8%B2%E0%B8%9A%E0%B8%B1%E0%B8%99%E0%B8%97%E0%B8%B6%E0%B8%81%E0%B8%A3%E0%B8%B9%E0%B8%9B%E0%B9%80%E0%B8%9B%E0%B9%87%E0%B8%99%5Cn'banner.png'";
              }}
            />

            <div style={styles.statusCard}>
              {/* Optimized Visualizer */}
              <div style={styles.visualizer}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    ref={el => { barRefs.current[i] = el; }}
                    style={{
                      ...styles.bar,
                      height: '8px',
                      opacity: 0.5
                    }} 
                  />
                ))}
              </div>

              <button 
                style={{
                  ...styles.micButton,
                  backgroundColor: connected ? '#ff6b6b' : '#00d2d3', // Red (Stop) / Cyan (Start)
                  boxShadow: connected ? '0 4px 15px rgba(255, 107, 107, 0.4)' : '0 4px 15px rgba(0, 210, 211, 0.4)',
                  transform: isSpeaking ? 'scale(1.05)' : 'scale(1)',
                }}
                onClick={toggleConnection}
              >
                {connected ? '⏹' : '🎙'}
              </button>
              
              <p style={{marginTop: '10px', fontWeight: 'bold', fontSize: '1.1rem', color: connected ? '#ff6b6b' : '#ffffff'}}>
                {connected ? (isSpeaking ? 'กำลังพูด...' : 'กำลังฟัง...') : 'กดปุ่มเพื่อคุยกับเรา'}
              </p>
            </div>

            <div style={styles.infoSection}>
              <div style={styles.infoGrid}>
                <div style={styles.infoCard}>
                  <h3 style={styles.infoTitle}>❤️ ด้วยความห่วงใย</h3>
                  <p style={styles.infoText}>สวมหมวกกันน็อกทุกครั้งที่ขับขี่ เพื่อคนที่คุณรัก</p>
                </div>
                <div style={styles.infoCard}>
                  <h3 style={styles.infoTitle}>🛡️ ปลอดภัย 100%</h3>
                  <p style={styles.infoText}>ลดความรุนแรงของอุบัติเหตุได้จริง</p>
                </div>
              </div>
            </div>
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);
