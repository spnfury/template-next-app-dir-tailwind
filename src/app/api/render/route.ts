import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { videoProps } = body;

        if (!videoProps) {
            return NextResponse.json({ error: "No video props provided" }, { status: 400 });
        }

        // 1. Bundle the composition
        const bundleLocation = await bundle({
            entryPoint: path.resolve("src/remotion/index.ts"),
        });

        // 2. Select the composition
        const composition = await selectComposition({
            serveUrl: bundleLocation,
            id: "ViralVideo",
            inputProps: videoProps,
        });

        // 3. Set a temporary output location
        const tmpDir = path.resolve("public/renders");
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const outputLocation = path.join(tmpDir, `render-${Date.now()}.mp4`);

        // 4. Render the video
        await renderMedia({
            composition,
            serveUrl: bundleLocation,
            codec: "h264",
            outputLocation,
            inputProps: videoProps,
        });

        // 5. Return the URL to the rendered file
        const fileName = path.basename(outputLocation);
        const publicUrl = `/renders/${fileName}`;

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        console.error("Rendering failed:", error);
        return NextResponse.json({
            error: "Rendering failed",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
