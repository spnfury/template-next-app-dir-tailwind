import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneProps } from "../../types/viral-video";
import { loadFont, fontFamily } from "@remotion/google-fonts/Inter";

loadFont("normal", {
    subsets: ["latin"],
    weights: ["400", "700", "900"],
});

export const Scene: React.FC<SceneProps> = ({ text, imageUrl }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const entrance = spring({
        frame,
        fps,
        config: {
            damping: 20,
        },
    });

    const textEntrance = spring({
        frame: frame - 10,
        fps,
        config: {
            damping: 15,
        },
    });

    return (
        <AbsoluteFill className="bg-black overflow-hidden">
            {/* Background Image with slight zoom/movement */}
            <AbsoluteFill
                style={{
                    transform: `scale(${1 + frame * 0.001})`,
                }}
            >
                <Img
                    src={imageUrl}
                    className="w-full h-full object-cover opacity-80"
                    style={{
                        filter: "blur(2px) contrast(1.1)",
                    }}
                />
            </AbsoluteFill>

            {/* Dark Overlay */}
            <AbsoluteFill className="bg-black/30" />

            {/* Text Container */}
            <AbsoluteFill className="justify-center items-center p-20">
                <h2
                    className="text-white text-center font-black drop-shadow-2xl"
                    style={{
                        fontFamily,
                        fontSize: 80,
                        transform: `scale(${textEntrance}) translateY(${(1 - textEntrance) * 50}px)`,
                        opacity: textEntrance,
                        lineHeight: 1.2,
                        textShadow: "0 4px 10px rgba(0,0,0,0.8)",
                    }}
                >
                    {text.toUpperCase()}
                </h2>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
