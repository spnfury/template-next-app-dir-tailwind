import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import { ViralVideoProps } from "../../../types/viral-video";
import { MUSIC_LIBRARY } from "../../../types/music-library";

const execPromise = promisify(exec);

async function downloadAndTranscribe(url: string, openai: OpenAI) {
    const tmpDir = path.resolve("public/tmp-audio");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const fileName = `youtube-${Date.now()}`;
    const outputPath = path.join(tmpDir, `${fileName}.%(ext)s`);

    // Download audio using yt-dlp
    await execPromise(`yt-dlp -x --audio-format mp3 -o "${outputPath}" "${url}"`);

    const mp3Path = path.join(tmpDir, `${fileName}.mp3`);

    // Transcribe using Whisper
    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(mp3Path),
        model: "whisper-1",
    });

    // Cleanup
    fs.unlinkSync(mp3Path);

    return transcription.text;
}

async function downloadVideo(url: string, index: number) {
    const vidDir = path.resolve("public/yt-videos");
    if (!fs.existsSync(vidDir)) fs.mkdirSync(vidDir, { recursive: true });

    const fileName = `video-${Date.now()}-${index}.mp4`;
    const outputPath = path.join(vidDir, fileName);

    // Download video using yt-dlp (best mp4)
    await execPromise(`yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" -o "${outputPath}" "${url}"`);

    return `/yt-videos/${fileName}`;
}

export async function POST(request: Request) {
    try {
        const { urls, useOriginalBackground, showMusic } = await request.json();

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API Key is missing" }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // 1. Download videos if needed and transcribe all
        const [transcriptions, videoUrls] = await Promise.all([
            Promise.all(urls.map(url => downloadAndTranscribe(url, openai))),
            useOriginalBackground
                ? Promise.all(urls.map((url, i) => downloadVideo(url, i)))
                : Promise.resolve([])
        ]);

        const fullTranscript = transcriptions.join("\n\n---\n\n");

        // 2. Generate script based on transcripts
        const musicOptions = MUSIC_LIBRARY.map(m => m.name).join(", ");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Eres un experto en resintetizar contenido viral. Te pasaré transcripciones de varios videos cortos de YouTube. 
          Tu tarea es crear un NUEVO video (guion en ESPAÑOL) que combine lo mejor de ellos o cuente la historia de forma más impactante.
          
          La respuesta DEBE ser un objeto JSON que coincida con este esquema:
          {
            "musicThemeName": "Uno de: ${musicOptions}",
            "scenes": [
              {
                "text": "texto visual corto",
                "spokenText": "guion completo hablado para esta escena",
                "imageUrl": "https://loremflickr.com/1080/1920/{keyword}",
                ${useOriginalBackground ? `"videoIndex": 0, // índice del video original a usar (0 a ${urls.length - 1})` : ""}
                "subtitles": [
                  { "text": "grupo de 2-3 palabras", "startFrame": 0, "endFrame": 30 }
                ]
              }
            ]
          }
          - Usa 3-5 escenas.
          - Idioma: ESPAÑOL.
          - Subtítulos sincronizados (asume 30fps).
          - imageUrl: keywords en inglés (se usará si no hay videoIndex).
          ${useOriginalBackground ? `- videoIndex DEBE ser el índice de uno de los videos de entrada.` : ""}`,
                },
                {
                    role: "user",
                    content: `Aquí tienes las transcripciones de los videos originales:\n\n${fullTranscript}`,
                },
            ],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("No content from OpenAI");

        const aiResponse = JSON.parse(content);
        const selectedMusic = MUSIC_LIBRARY.find(m => m.name === aiResponse.musicThemeName) || MUSIC_LIBRARY[0];

        // 3. Generate Narrations (TTS)
        const voiceDir = path.resolve("public/voice");
        if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });

        const processedScenes = await Promise.all(aiResponse.scenes.map(async (scene: any, index: number) => {
            const mp3 = await openai.audio.speech.create({
                model: "tts-1",
                voice: "alloy",
                input: scene.spokenText,
            });

            const voiceFileName = `voice-yt-${Date.now()}-${index}.mp3`;
            const voiceFilePath = path.join(voiceDir, voiceFileName);
            const buffer = Buffer.from(await mp3.arrayBuffer());
            fs.writeFileSync(voiceFilePath, new Uint8Array(buffer)); // Fix for Buffer vs Uint8Array lint error

            const lastSub = scene.subtitles[scene.subtitles.length - 1];
            const durationInFrames = lastSub ? lastSub.endFrame : 90;

            return {
                text: scene.text,
                imageUrl: scene.imageUrl,
                videoUrl: (useOriginalBackground && videoUrls[scene.videoIndex]) || undefined,
                durationInFrames,
                voiceUrl: `/voice/${voiceFileName}`,
                subtitles: scene.subtitles,
            };
        }));

        const videoProps: ViralVideoProps = {
            scenes: processedScenes,
            musicUrl: showMusic ? selectedMusic.url : undefined,
            showNarration: true,
        };

        return NextResponse.json(videoProps);
    } catch (error) {
        console.error("Error in YouTube generation:", error);
        return NextResponse.json({
            error: "Failed to process YouTube videos",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
