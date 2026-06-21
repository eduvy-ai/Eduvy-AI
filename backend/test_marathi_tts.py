"""Test Marathi TTS with different voices."""
import asyncio
import edge_tts
import os

TEXT = "तिसरा नियम म्हणजे प्रत्येक क्रियेला समान आणि विरुद्ध प्रतिक्रिया असते."

async def test_voice(voice_name: str, output_file: str):
    """Test a specific voice."""
    print(f"\nTesting: {voice_name}")
    print(f"Text: {TEXT}")
    try:
        tts = edge_tts.Communicate(TEXT, voice_name)
        await tts.save(output_file)
        size = os.path.getsize(output_file)
        print(f"✓ Generated: {output_file} ({size} bytes)")
        return True
    except Exception as e:
        print(f"✗ Failed: {e}")
        return False

async def main():
    # List Marathi voices
    voices = await edge_tts.list_voices()
    marathi_voices = [v for v in voices if "mr-IN" in v["ShortName"]]
    
    print("Available Marathi voices:")
    for v in marathi_voices:
        print(f"  {v['ShortName']} ({v['Gender']})")
    
    # Test each Marathi voice
    print("\n" + "="*50)
    for v in marathi_voices:
        name = v["ShortName"]
        await test_voice(name, f"test_{name.replace('-', '_')}.mp3")
    
    # Also test Hindi voice with Marathi text (they share Devanagari)
    print("\n" + "="*50)
    print("Testing Hindi voice with Marathi text:")
    await test_voice("hi-IN-SwaraNeural", "test_hindi_voice_marathi_text.mp3")

if __name__ == "__main__":
    asyncio.run(main())
