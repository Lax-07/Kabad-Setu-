"""Generate additional bundled guides with installed macOS speech voices."""
import json
import subprocess
import wave
from pathlib import Path

AUDIO = Path(__file__).resolve().parents[1] / 'static' / 'audio'
KEYS = ['welcome', 'registration-name', 'registration-phone', 'registration-address', 'registration-complete', 'sell']
GUIDES = {
'en': ('Rishi', [
 'Welcome to Kabad Setu. Register to sell old laptops, phones, wires and circuit boards. Press Listen for guidance at every step.',
 'Let us create your collector profile. Enter your full name and ten digit mobile number. Then press Continue.',
 'A one-time password is shown in the website notification. Enter the code, then press Verify OTP.',
 'Enter your complete pickup address. Allow location access when your browser asks. You can retry using the current location button. Give your consent and create your profile.',
 'Your registration is complete. Upload a clear photo of your electronic waste. Review the separate categories for laptops, phones, wires and circuit boards.',
 'Take a clear photo of your electronic waste. Review each item and category. Enter the measured weight and check the estimated price. Choose a recycler who accepts your items and book a pickup.'
]),
'mr': ('Lekha', [
 'नमस्कार! कबाड सेतूमध्ये तुमचे स्वागत आहे. जुने लॅपटॉप, मोबाईल, तारा आणि सर्किट बोर्ड विकण्यासाठी नोंदणी करा. प्रत्येक टप्प्यावर मदतीसाठी ऐका बटण दाबा.',
 'चला तुमची नोंदणी करूया. तुमचे पूर्ण नाव आणि दहा अंकी मोबाईल नंबर भरा. त्यानंतर पुढे जा बटण दाबा.',
 'वेबसाइटच्या सूचनेमध्ये एकदाच वापरता येणारा ओटीपी दाखवला आहे. ओटीपी भरा आणि ओटीपी पडताळा बटण दाबा.',
 'कचरा उचलण्यासाठी तुमचा संपूर्ण पत्ता लिहा. ब्राउझरने विचारल्यावर स्थानाची परवानगी द्या. गरज असल्यास सध्याचे स्थान बटण दाबून पुन्हा प्रयत्न करा. संमती देऊन नोंदणी पूर्ण करा.',
 'तुमची नोंदणी पूर्ण झाली आहे. आता तुमच्या इलेक्ट्रॉनिक कचऱ्याचा स्पष्ट फोटो अपलोड करा. लॅपटॉप, मोबाईल, तारा आणि सर्किट बोर्ड यांच्या स्वतंत्र श्रेणी तपासा.',
 'इलेक्ट्रॉनिक कचऱ्याचा स्पष्ट फोटो काढा. प्रत्येक वस्तू आणि तिची श्रेणी तपासा. वजन भरून अंदाजे किंमत पाहा. तुमच्या वस्तू स्वीकारणारा पुनर्वापर करणारा विक्रेता निवडा आणि कचरा उचलण्याची वेळ ठरवा.'
]),
'kn': ('Soumya', [
 'ನಮಸ್ಕಾರ! ಕಬಾಡ್ ಸೇತುಗೆ ಸ್ವಾಗತ. ಹಳೆಯ ಲ್ಯಾಪ್‌ಟಾಪ್, ಮೊಬೈಲ್, ತಂತಿ ಮತ್ತು ಸರ್ಕ್ಯೂಟ್ ಬೋರ್ಡ್ ಮಾರಲು ನೋಂದಣಿ ಮಾಡಿ. ಪ್ರತಿ ಹಂತದಲ್ಲಿ ಸಹಾಯಕ್ಕಾಗಿ ಆಲಿಸಿ ಬಟನ್ ಒತ್ತಿ.',
 'ನಿಮ್ಮ ನೋಂದಣಿ ಮಾಡೋಣ. ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು ಮತ್ತು ಹತ್ತು ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ. ನಂತರ ಮುಂದುವರಿಸಿ ಬಟನ್ ಒತ್ತಿ.',
 'ವೆಬ್‌ಸೈಟ್ ಸೂಚನೆಯಲ್ಲಿ ಒಮ್ಮೆ ಬಳಸುವ ಓಟಿಪಿ ತೋರಿಸಲಾಗಿದೆ. ಓಟಿಪಿ ನಮೂದಿಸಿ ಮತ್ತು ಓಟಿಪಿ ಪರಿಶೀಲಿಸಿ ಬಟನ್ ಒತ್ತಿ.',
 'ತ್ಯಾಜ್ಯ ಸಂಗ್ರಹಿಸಲು ನಿಮ್ಮ ಪೂರ್ಣ ವಿಳಾಸ ಬರೆಯಿರಿ. ಬ್ರೌಸರ್ ಕೇಳಿದಾಗ ಸ್ಥಳದ ಅನುಮತಿ ನೀಡಿ. ಅಗತ್ಯವಿದ್ದರೆ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಟನ್ ಒತ್ತಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ. ಒಪ್ಪಿಗೆ ನೀಡಿ ನೋಂದಣಿ ಪೂರ್ಣಗೊಳಿಸಿ.',
 'ನಿಮ್ಮ ನೋಂದಣಿ ಪೂರ್ಣಗೊಂಡಿದೆ. ಈಗ ನಿಮ್ಮ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ತ್ಯಾಜ್ಯದ ಸ್ಪಷ್ಟ ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ. ಲ್ಯಾಪ್‌ಟಾಪ್, ಮೊಬೈಲ್, ತಂತಿ ಮತ್ತು ಸರ್ಕ್ಯೂಟ್ ಬೋರ್ಡ್ ವರ್ಗಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.',
 'ನಿಮ್ಮ ಎಲೆಕ್ಟ್ರಾನಿಕ್ ತ್ಯಾಜ್ಯದ ಸ್ಪಷ್ಟ ಫೋಟೋ ತೆಗೆಯಿರಿ. ಪ್ರತಿಯೊಂದು ವಸ್ತು ಮತ್ತು ವರ್ಗ ಪರಿಶೀಲಿಸಿ. ತೂಕ ನಮೂದಿಸಿ ಅಂದಾಜು ಬೆಲೆ ನೋಡಿ. ನಿಮ್ಮ ವಸ್ತುಗಳನ್ನು ಸ್ವೀಕರಿಸುವ ಮರುಬಳಕೆದಾರರನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ಸಂಗ್ರಹಣೆಗೆ ಸಮಯ ನಿಗದಿಪಡಿಸಿ.'
])}

if __name__ == '__main__':
 for lang, (voice, texts) in GUIDES.items():
  prompts = dict(zip(KEYS, texts))
  for key, text in prompts.items():
   path = AUDIO / f'{lang}-{key}.wav'
   subprocess.run(['say', '-v', voice, '-r', '150', '--file-format=WAVE', '--data-format=LEI16@22050', '-o', str(path), text], check=True)
   with wave.open(str(path)) as f:
    samples = memoryview(f.readframes(f.getnframes())).cast('h')
    if f.getnframes() < f.getframerate() or max(map(abs, samples), default=0) < 100:
     raise RuntimeError(f'Empty or silent audio: {path.name}')
    print(f'{path.name}: {f.getnframes()/f.getframerate():.1f}s', flush=True)
  (AUDIO / f'{lang}-prompts.json').write_text(json.dumps(prompts, ensure_ascii=False, indent=2)+'\n')
