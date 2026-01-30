import { NextResponse } from "next/server";
import { ViralVideoProps } from "@/types/viral-video";

// This is a mock for now, later we can integrate with OpenAI
export async function POST(request: Request) {
    try {
        const { prompt } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // Mock AI response for now to get things moving
        // In a real app, you'd call OpenAI here
        const videoProps: ViralVideoProps = {
            scenes: [
                {
                    text: `Viral Fact about: ${prompt}`,
                    imageUrl: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=1080&auto=format&fit=crop",
                    durationInFrames: 90,
                },
                {
                    text: "Did you count the pages?",
                    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1080&auto=format&fit=crop",
                    durationInFrames: 90,
                },
                {
                    text: "Knowledge is power!",
                    imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=1080&auto=format&fit=crop",
                    durationInFrames: 120,
                },
            ],
            musicUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        };

        return NextResponse.json(videoProps);
    } catch (error) {
        console.error("Error generating video script:", error);
        return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
    }
}
