import fs from "fs";

const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;

// Voice ID provided by the user: "15dda171995e4fff8bd56fa621e3673a"
const DEFAULT_SPANISH_VOICE_ID = "15dda171995e4fff8bd56fa621e3673a";

export async function generateFishAudio(text: string, outputPath: string, voiceId = DEFAULT_SPANISH_VOICE_ID): Promise<string> {
    if (!FISH_AUDIO_API_KEY) {
        throw new Error("FISH_AUDIO_API_KEY is missing in environment variables");
    }

    console.log(`[FishAudio] Requesting TTS for: "${text.substring(0, 30)}..." with voice: ${voiceId}`);

    const response = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: text,
            reference_id: voiceId,
            format: "mp3",
            latency: "normal",
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FishAudio] API error: ${response.status} - ${errorText}`);
        throw new Error(`Fish Audio API error: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputPath, new Uint8Array(buffer));

    console.log(`[FishAudio] Audio saved to: ${outputPath}`);
    return outputPath;
}
