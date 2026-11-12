"""Regenerate the bundled Hindi prompts on macOS with the installed Lekha voice."""
import json
import struct
import subprocess
import wave
from pathlib import Path

AUDIO = Path(__file__).resolve().parents[1] / 'static' / 'audio'
PROMPTS = {
 'welcome': 'नमस्ते! कबाड़ सेतु में आपका स्वागत है। पुराने लैपटॉप, मोबाइल, तार और सर्किट बोर्ड बेचने के लिए पहले पंजीकरण करें। सुनें बटन दबाएँ, मैं हर कदम पर आपकी मदद करूँगी।',
 'registration-name': 'आइए आपका पंजीकरण करें। कृपया अपना पूरा नाम और दस अंकों का मोबाइल नंबर भरें। फिर आगे बढ़ें बटन दबाएँ।',
 'registration-phone': 'वेबसाइट की सूचना में एक बार इस्तेमाल होने वाला ओटीपी दिखाया गया है। ओटीपी भरें और ओटीपी सत्यापित करें बटन दबाएँ।',
 'registration-address': 'अपना पूरा पता लिखें। अपना स्थान साझा करने के लिए लोकेशन बटन दबाएँ। फिर सहमति देकर पंजीकरण पूरा करें।',
 'registration-complete': 'आपका पंजीकरण पूरा हो गया है। अब अपने इलेक्ट्रॉनिक कबाड़ की साफ तस्वीर अपलोड करें। लैपटॉप, मोबाइल, तार और सर्किट बोर्ड को अलग अलग श्रेणियों में जोड़ें।',
 'sell': 'अपना इलेक्ट्रॉनिक कबाड़ बेचने के लिए उसकी साफ तस्वीर लें। लैपटॉप, मोबाइल, तार और सर्किट बोर्ड के लिए अलग श्रेणी चुनें। हर वस्तु का अनुमानित वजन भरें और कीमत देखें। फिर इलेक्ट्रॉनिक कबाड़ लेने वाला रीसाइकलर चुनकर पिकअप बुक करें।'
}
if __name__ == '__main__':
 AUDIO.mkdir(parents=True, exist_ok=True)
 for name, text in PROMPTS.items():
  path=AUDIO/f'{name}.wav'
  subprocess.run(['say','-v','Lekha','-r','155','--file-format=WAVE','--data-format=LEI16@22050','-o',str(path),text],check=True)
  with wave.open(str(path)) as f:
   raw=f.readframes(f.getnframes())
   samples=struct.unpack('<'+'h'*(len(raw)//2),raw)
   if f.getnframes()<f.getframerate() or not samples or max(abs(v) for v in samples)<100:
    raise RuntimeError(f'{name}: empty or silent audio; allow access to the system speech service.')
   print(f'{name}: {f.getnframes()/f.getframerate():.1f}s')
 (AUDIO/'prompts.json').write_text(json.dumps(PROMPTS,ensure_ascii=False,indent=2)+'\n')
