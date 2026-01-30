import { NextResponse } from "next/server";
import OpenAI from "openai";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { ViralVideoProps } from "../../../types/viral-video";
import { MUSIC_LIBRARY } from "../../../types/music-library";
import { generateFishAudio } from "../../../lib/fish-audio";

const execPromise = promisify(exec);

async function getAudioDurationInFrames(filePath: string): Promise<number> {
    try {
        const { stdout } = await execPromise(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
        );
        const durationInSeconds = parseFloat(stdout.trim());
        return Math.ceil(durationInSeconds * 30); // 30 fps
    } catch (error) {
        console.error("Error probe audio duration:", error);
        return 90; // Default fallback (3s)
    }
}

async function generateAudio(text: string, index: number, openai: OpenAI) {
    const voiceDir = path.resolve("public/voice");
    if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

    const voiceFileName = `voice-prod-${Date.now()}-${index}.mp3`;
    const voiceFilePath = path.join(voiceDir, voiceFileName);

    try {
        // Try Fish Audio first
        console.log(`Generating Fish Audio for scene ${index}...`);
        await generateFishAudio(text, voiceFilePath);
    } catch (error) {
        console.error("Fish Audio failed, falling back to OpenAI TTS:", error);
        // Fallback to OpenAI TTS
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        fs.writeFileSync(voiceFilePath, new Uint8Array(buffer));
    }

    return {
        url: `/voice/${voiceFileName}`,
        path: voiceFilePath
    };
}

export async function POST(request: Request) {
    try {
        const { musicThemeName, scenes, showMusic } = await request.json();

        if (!scenes || !Array.isArray(scenes)) {
            return NextResponse.json({ error: "No scenes provided" }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API Key is missing" }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const selectedMusic = MUSIC_LIBRARY.find(m => m.name === musicThemeName) || MUSIC_LIBRARY[0];

        // Offsets for continuous video playback per unique videoUrl
        const videoOffsets: Record<string, number> = {};

        const processedScenes = await Promise.all(scenes.map(async (scene: any, index: number) => {
            // 1. Generate Voice (TTS - Fish Audio with fallback)
            const audio = await generateAudio(scene.spokenText, index, openai);

            // 2. Get EXACT duration using ffprobe
            const durationInFrames = await getAudioDurationInFrames(audio.path);

            // 3. Generate Subtitles with frame timings
            const timingPrompt = `
                Divide este texto en ESPAÑOL en fragmentos de 3-4 palabras para subtítulos.
                Sincronízalos para que duren exactamente ${durationInFrames} frames en total (30fps).
                Texto: "${scene.spokenText}"
                
                Responde EXCLUSIVAMENTE un JSON con esta forma:
                {
                  "subtitles": [
                    { "text": "fragmento en español", "startFrame": 0, "endFrame": 30 },
                    ...
                  ]
                }
                IMPORTANTE: El último endFrame debe ser ${durationInFrames}. Mantén el idioma ESPAÑOL.
            `;

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "user", content: timingPrompt }],
                response_format: { type: "json_object" },
            });

            const timingData = JSON.parse(completion.choices[0].message.content || '{"subtitles": []}');
            const subtitles = timingData.subtitles || [];

            // 4. Handle Video Offsets for continuity
            let startFrame = 0;
            if (scene.videoUrl) {
                startFrame = videoOffsets[scene.videoUrl] || 0;
                videoOffsets[scene.videoUrl] = startFrame + durationInFrames;
                console.log(`Scene ${index} using video ${scene.videoUrl} starting at ${startFrame}, next will start at ${videoOffsets[scene.videoUrl]}`);
            }

            return {
                text: scene.text,
                imageUrl: scene.imageUrl || "https://loremflickr.com/1080/1920/abstract",
                videoUrl: scene.videoUrl,
                videoStartFrame: startFrame,
                durationInFrames: durationInFrames,
                voiceUrl: audio.url,
                subtitles,
            };
        }));

        const videoProps: ViralVideoProps = {
            scenes: processedScenes,
            musicUrl: showMusic ? selectedMusic.url : undefined,
            showNarration: true,
        };

        return NextResponse.json(videoProps);
    } catch (error) {
        console.error("Production failed:", error);
        return NextResponse.json({
            error: "Failed to produce video",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
