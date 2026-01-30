import { NextResponse } from "next/server";
import OpenAI from "openai";
import { ViralVideoProps } from "../../../types/viral-video";
import { MUSIC_LIBRARY } from "../../../types/music-library";
import fs from "fs";
import path from "path";
import { generateFishAudio } from "../../../lib/fish-audio";

// Simulación de conector para Qwen3-TTS
const QWEN3_TTS_URL = process.env.QWEN3_TTS_URL;

async function generateAudio(text: string, index: number, openai: OpenAI) {
    const voiceDir = path.resolve("public/voice");
    if (!fs.existsSync(voiceDir)) fs.mkdirSync(voiceDir, { recursive: true });
    const fileName = `voice-${Date.now()}-${index}.mp3`;
    const filePath = path.join(voiceDir, fileName);

    try {
        await generateFishAudio(text, filePath);
    } catch (error) {
        console.error("Fish Audio failed in simple generate, falling back to OpenAI:", error);
        // Fallback a OpenAI TTS
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: text,
        });
        const buffer = Buffer.from(await mp3.arrayBuffer());
        fs.writeFileSync(filePath, new Uint8Array(buffer));
    }

    return `/voice/${fileName}`;
}

export async function POST(request: Request) {
    try {
        const { prompt, showMusic } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API Key is missing. Please add it to .env" }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const musicOptions = MUSIC_LIBRARY.map(m => m.name).join(", ");

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `Eres un experto en videos virales. Crea un guion en ESPAÑOL para un video de 15 segundos.
          
          REGLAS DE TONO:
          - Usa mucho HUMOR.
          - Debes decir la palabra "BRO" en cada una de las escenas.
          - El tono debe ser divertido y muy de 'influencer' viral.

          La respuesta DEBE ser un objeto JSON que coincida con este esquema:
          {
            "musicThemeName": "Uno de: ${musicOptions}",
            "scenes": [
              {
                "text": "texto visual corto y gracioso",
                "spokenText": "guion hablado con HUMOR y diciendo 'BRO' en esta escena",
                "imageUrl": "https://loremflickr.com/1080/1920/{keyword}",
                "subtitles": [
                  { "text": "grupo de 2-3 palabras", "startFrame": 0, "endFrame": 30 }
                ]
              }
            ]
          }
          - Usa 3-4 escenas.
          - IMPORTANTE: Idioma ESPAÑOL.
          - 'subtitles' debe dividir 'spokenText' en fragmentos cortos sincronizados.
          - Asume 30fps. Estima los frames basándote en que hablamos a unas 150 palabras por minuto (~2.5 palabras por segundo -> 12 frames por palabra).
          - Ajusta los frames de los subtítulos secuencialmente dentro de cada escena.
          - imageUrl debe usar keywords en inglés (ej: 'landscape', 'luxury').`,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        if (!content) throw new Error("No content from OpenAI");

        const aiResponse = JSON.parse(content);
        const selectedMusic = MUSIC_LIBRARY.find(m => m.name === aiResponse.musicThemeName) || MUSIC_LIBRARY[0];

        const processedScenes = await Promise.all(aiResponse.scenes.map(async (scene: any, index: number) => {
            const voiceUrl = await generateAudio(scene.spokenText, index, openai);

            // Calculamos la duración total de la escena basándonos en el último subtítulo
            const lastSub = scene.subtitles[scene.subtitles.length - 1];
            const durationInFrames = lastSub ? lastSub.endFrame : 90;

            return {
                text: scene.text,
                imageUrl: scene.imageUrl,
                durationInFrames,
                voiceUrl,
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
        console.error("Error generating video script:", error);
        return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
    }
}
