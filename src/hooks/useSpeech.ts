import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  useEffect(() => {
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    
    updateVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);
  
  return voices;
}

export function useSpeech(onCommand: (text: string, isFinal: boolean) => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        onCommand(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        onCommand(interimTranscript.trim(), false);
      }
      setTranscript(interimTranscript || finalTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Failed to restart recognition", e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [onCommand]);

  const startListening = useCallback(() => {
    setIsListening(true);
    try {
      recognitionRef.current?.start();
    } catch (e) {
      console.error("Failed to start recognition", e);
    }
  }, []);

  const stopListening = useCallback(() => {
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch (e) {
      console.error("Failed to stop recognition", e);
    }
  }, []);

  return { isListening, transcript, startListening, stopListening };
}

export const unlockAudio = () => {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance('');
  utterance.volume = 0;
  window.speechSynthesis.speak(utterance);
};

export const speak = (text: string, voiceURI?: string, speed = 1, pitch = 1) => {
  if (!window.speechSynthesis) return;
  
  const cleanText = text.replace(/there are non-text parts functionCall in the response.*/gi, '').trim();
  if (!cleanText) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = speed;
  utterance.pitch = pitch;
  
  const voices = window.speechSynthesis.getVoices();
  if (voiceURI) {
    const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
    if (selectedVoice) utterance.voice = selectedVoice;
  } else {
    const preferredVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Male')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
  }
  
  window.speechSynthesis.speak(utterance);
};
