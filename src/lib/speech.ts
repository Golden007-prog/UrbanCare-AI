export function speakText(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) setTimeout(onEnd, 500);
    return;
  }

  window.speechSynthesis.cancel();
  
  // Strip markdown and artifacts to make TTS sound cleaner
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/[|─]/g, '')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  const voices = window.speechSynthesis.getVoices();
  
  // Simple heuristic to detect non-English text to support multilingual
  const isSpanish = /[áéíóúñ¿¡]/i.test(cleanText);
  const isFrench = /[éèêëàâäôöûüç]/i.test(cleanText);
  const isGerman = /[äöüß]/i.test(cleanText);
  
  let targetLang = navigator.language || 'en-US';
  if (isSpanish) targetLang = 'es';
  else if (isFrench) targetLang = 'fr';
  else if (isGerman) targetLang = 'de';

  // 1. Filter voices by language
  // 2. Prioritize "Premium", "Natural", "Google", "Online" voices which sound much more human-like
  const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(targetLang.toLowerCase()));
  
  let bestVoice = langVoices.find(v => 
    v.name.includes('Premium') || 
    v.name.includes('Natural') || 
    v.name.includes('Google') || 
    v.name.includes('Online') ||
    v.name.includes('Multilingual')
  );
  
  if (!bestVoice && langVoices.length > 0) {
    bestVoice = langVoices[0];
  }
  
  // Fallback to any high-quality voice
  if (!bestVoice) {
    bestVoice = voices.find(v => 
      v.name.includes('Premium') || 
      v.name.includes('Natural') || 
      v.name.includes('Google')
    ) || voices[0];
  }

  if (bestVoice) {
    utterance.voice = bestVoice;
    utterance.lang = bestVoice.lang;
  }

  // Slightly slower rate feels more conversational and human
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd; // Important to reset state if speech fails
  }
  
  window.speechSynthesis.speak(utterance);
}

export function stopSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Pre-load voices so they're ready when the user clicks the button
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  // Trigger voice loading
  window.speechSynthesis.getVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }
}
