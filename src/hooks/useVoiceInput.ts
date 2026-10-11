// ============================================================
// MODULE 10 — VOICE INPUT HOOK (Web Speech API)
// ============================================================
// The microphone feeds the SAME composer as the keyboard: it only
// produces transcript text that the user can review/edit before
// sending through the identical send pipeline.
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface UseVoiceInputResult {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceInput(
  onFinalTranscript: (transcript: string) => void,
  lang: string = 'ar-SA'
): UseVoiceInputResult {
  const [isSupported] = useState<boolean>(() => !!getRecognitionCtor());
  const [isListening, setIsListening] = useState<boolean>(false);
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef<string>('');
  const onFinalRef = useRef(onFinalTranscript);
  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const buildRecognition = useCallback((): SpeechRecognitionLike => {
    const Ctor = getRecognitionCtor()!;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalRef.current += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimTranscript(interim);
    };

    rec.onerror = (event: any) => {
      setError(
        event.error === 'not-allowed'
          ? 'Microphone permission denied.'
          : `Voice recognition error: ${event.error}`
      );
      setIsListening(false);
    };

    rec.onend = () => {
      // Flush whatever was recognized when the session ends.
      const flushed = finalRef.current.trim();
      finalRef.current = '';
      setInterimTranscript('');
      setIsListening(false);
      if (flushed) onFinalRef.current(flushed);
    };

    return rec;
  }, [lang]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop(); // triggers onend → flush
    } catch {
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    try {
      setError(null);
      finalRef.current = '';
      setInterimTranscript('');
      recognitionRef.current = buildRecognition();
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      setError(err?.message || 'Could not start voice recognition.');
      setIsListening(false);
    }
  }, [buildRecognition, isSupported]);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}
