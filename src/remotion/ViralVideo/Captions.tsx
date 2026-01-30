import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "@remotion/google-fonts/Inter";

interface CaptionsProps {
    text: string;
}

export const Captions: React.FC<CaptionsProps> = ({ text }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const entry = spring({
        frame,
        fps,
        config: {
            damping: 12,
        },
    });

    return (
        <AbsoluteFill className="justify-center items-center p-20 select-none">
            <div
                style={{
                    fontFamily,
                    fontSize: 90,
                    fontWeight: 900,
                    color: "white",
                    textAlign: "center",
                    textTransform: "uppercase",
                    transform: `scale(${entry})`,
                    textShadow: "0 0 10px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.5)",
                    WebkitTextStroke: "4px black",
                    lineHeight: 1,
                }}
            >
                {text.split(" ").map((word, i) => (
                    <span
                        key={i}
                        style={{
                            display: "inline-block",
                            margin: "0 10px",
                            color: i % 2 === 0 ? "#FFD700" : "white", // Alternate yellow and white for "viral" feel
                        }}
                    >
                        {word}
                    </span>
                ))}
            </div>
        </AbsoluteFill>
    );
};
