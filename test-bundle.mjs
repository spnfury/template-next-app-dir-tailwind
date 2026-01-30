import { bundle } from "@remotion/bundler";
import path from "path";

async function test() {
    console.log("Starting test bundle...");
    try {
        const bundleLocation = await bundle({
            entryPoint: path.resolve("src/remotion/index.ts"),
            onProgress: (p) => console.log(`Bundling: ${Math.round(p * 100)}%`),
        });
        console.log("Bundle success:", bundleLocation);
    } catch (e) {
        console.error("Bundle failed:", e);
        process.exit(1);
    }
}

test();
