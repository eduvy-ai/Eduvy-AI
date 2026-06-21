"""Test gTTS Marathi support."""
from gtts import gTTS
import os

text = "तिसरा नियम म्हणजे प्रत्येक क्रियेला समान आणि विरुद्ध प्रतिक्रिया असते."

try:
    tts = gTTS(text, lang='mr')
    tts.save('test_gtts_marathi.mp3')
    size = os.path.getsize('test_gtts_marathi.mp3')
    print(f"gTTS Marathi: {size} bytes - SUCCESS")
except Exception as e:
    print(f"gTTS Marathi FAILED: {e}")
