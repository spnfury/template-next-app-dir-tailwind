import { AbsoluteFill, Series, Audio } from "remotion";
import { ViralVideoProps } from "../../../types/viral-video";
import { Scene } from "./Scene";

export const ViralVideo: React.FC<ViralVideoProps> = ({ scenes, musicUrl }) => {
    return (
        <AbsoluteFill>
            {musicUrl && <Audio src={musicUrl} />}
            <Series>
                {scenes.map((scene, index) => (
                    <Series.Sequence
                        key={index}
                        durationInFrames={scene.durationInFrames}
                    >
                        <Scene {...scene} />
                    </Series.Sequence>
                ))}
            </Series>
        </AbsoluteFill>
    );
};
