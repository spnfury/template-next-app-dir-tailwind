import { AbsoluteFill, Img, useCurrentFrame, Audio, Sequence, Video } from "remotion";
import { SceneProps } from "../../types/viral-video";
import { loadFont } from "@remotion/google-fonts/Inter";
import { Captions } from "./Captions";

loadFont("normal", {
    subsets: ["latin"],
    weights: ["400", "700", "900"],
});

export const Scene: React.FC<SceneProps & { showNarration?: boolean }> = ({
    text: defaultText,
    imageUrl,
    videoUrl,
    voiceUrl,
    showNarration,
    subtitles
}) => {
    const frame = useCurrentFrame();

    return (
        <AbsoluteFill className="bg-black overflow-hidden">
            {voiceUrl && showNarration && <Audio src={voiceUrl} />}

            {/* Background Content */}
            <AbsoluteFill
                style={{
                    transform: `scale(${1 + frame * 0.001})`,
                }}
            >
                {videoUrl ? (
                    <Video
                        src={videoUrl}
                        className="w-full h-full object-cover opacity-80"
                        muted // Only narration and music should be heard
                    />
                ) : (
                    <Img
                        src={imageUrl}
                        className="w-full h-full object-cover opacity-80"
                        style={{
                            filter: "blur(2px) contrast(1.1)",
                        }}
                    />
                )}
            </AbsoluteFill>

            {/* Dark Overlay */}
            <AbsoluteFill className="bg-black/30" />

            {/* Subtitles or Default Text */}
            <AbsoluteFill>
                {subtitles && subtitles.length > 0 ? (
                    subtitles.map((sub, i) => (
                        <Sequence
                            key={i}
                            from={sub.startFrame}
                            durationInFrames={sub.endFrame - sub.startFrame}
                        >
                            <Captions text={sub.text} />
                        </Sequence>
                    ))
                ) : (
                    <Captions text={defaultText} />
                )}
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
