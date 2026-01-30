import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const maxDuration = 300; // 5 minutes

export async function POST(request: Request) {
    console.log("[RenderApi] Received render request");
    try {
        const body = await request.json();
        const { videoProps } = body;

        if (!videoProps) {
            return NextResponse.json({ error: "No video props provided" }, { status: 400 });
        }

        // Remotion v4 uses publicDir to resolve absolute paths like /yt-videos/
        // We ensure all paths in videoProps are relative to public
        const publicDir = path.resolve("public");
        const fixedVideoProps = videoProps;

        console.log("[RenderApi] Starting bundle...");
        const bundleLocation = await bundle({
            entryPoint: path.resolve("src/remotion/index.ts"),
        });
        console.log("[RenderApi] Bundle finished at:", bundleLocation);

        // 2. Select the composition
        console.log("[RenderApi] Selecting composition...");
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: "ViralVideo",
            inputProps: fixedVideoProps,
        });
        console.log("[RenderApi] Composition selected. Duration:", composition.durationInFrames);

        // 3. Set a temporary output location
        const tmpDir = path.resolve("public/renders");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const outputLocation = path.join(tmpDir, `render-${Date.now()}.mp4`);
        console.log("[RenderApi] Output location:", outputLocation);

        // 4. Render the video
        console.log("[RenderApi] Starting renderMedia...");
        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: "h264",
            outputLocation,
            inputProps: fixedVideoProps,
            publicDir, // This is key for resolving /yt-videos/...
            onProgress: (p) => {
                console.log(`[RenderApi] Progress: ${Math.round(p.progress * 100)}%`);
            }
        });
        console.log("[RenderApi] Render finished!");

        // 5. Return the URL to the rendered file
        const fileName = path.basename(outputLocation);
        const publicUrl = `/renders/${fileName}`;

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error("Rendering failed:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : "No stack trace";

        // Write to a log file for debugging since console might not be captured
        fs.appendFileSync(path.resolve("render-error.log"), `[${new Date().toISOString()}] Rendering failed: ${errorMsg}\nStack: ${errorStack}\n\n`);

        return NextResponse.json({
            error: "Rendering failed",
            details: errorMsg
        }, { status: 500 });
    }
}
