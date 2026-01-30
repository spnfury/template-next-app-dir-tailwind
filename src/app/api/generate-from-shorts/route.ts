import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
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
        const { urls, useOriginalBackground } = await request.json();

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

        // 2. Generate Draft Script - Focus on PRESERVATION and CONTINUITY
        const musicOptions = MUSIC_LIBRARY.map(m => m.name).join(", ");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Eres un experto en producción de videos. Te pasaré transcripciones de videos de YouTube.
                    Tu tarea es preparar un guion para un NUEVO video que respete fielmente el contenido original.
                    
                    REGLAS CRÍTICAS:
                    1. TODO EL CONTENIDO DEBE ESTAR EN ESPAÑOL. Si la transcripción original está en INGLÉS o cualquier otro idioma, DEBES TRADUCIRLA FIELMENTE AL ESPAÑOL.
                    2. PERSONALIDAD: Usa mucho HUMOR. El tono debe ser divertido, viral y muy enérgico.
                    3. PALABRA CLAVE: Debes incluir la palabra "BRO" (en mayúsculas o minúsculas) de forma natural pero frecuente en la narración de cada escena.
                    4. NO limites el tiempo. Si el video original dura 60 segundos, el guion debe durar 60 segundos.
                    5. NO limites el número de escenas. Crea tantas escenas como sean necesarias para cubrir TODO el texto transcrito.
                    6. Trata cada URL como una SECCIÓN consecutiva.
                    7. PRESERVA el sentido del guion original pero adáptalo para que sea MUY DIVERTIDO y use la palabra "BRO".
                    
                    La respuesta DEBE ser un objeto JSON:
                    {
                        "musicThemeName": "Uno de: ${musicOptions}",
                        "scenes": [
                            {
                                "text": "resumen visual corto y divertido en ESPAÑOL (2-4 palabras)",
                                "spokenText": "párrafo de la narración con HUMOR y incluyendo la palabra 'BRO' en ESPAÑOL",
                                "imageUrl": "https://loremflickr.com/1080/1920/{keyword}",
                                ${useOriginalBackground ? `"videoIndex": 0, // índice del video de entrada` : ""}
                                "sectionTitle": "Título divertido de la sección en ESPAÑOL"
                            }
                        ]
                    }
                    - Idioma: ESPAÑOL (OBLIGATORIO).`,
                },
                {
                    role: "user",
                    content: `Aquí tienes las transcripciones originales:\n\n${fullTranscript}`,
                },
            ],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("No content from OpenAI");

        const draft = JSON.parse(content);

        // Map videoUrls to the draft if using original backgrounds
        if (useOriginalBackground) {
            draft.scenes = draft.scenes.map((scene: any) => ({
                ...scene,
                videoUrl: videoUrls[scene.videoIndex] !== undefined ? videoUrls[scene.videoIndex] : undefined
            }));
        }

        return NextResponse.json(draft);
    } catch (error) {
        console.error("Error in YouTube draft generation:", error);
        return NextResponse.json({
            error: "Failed to create draft",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
