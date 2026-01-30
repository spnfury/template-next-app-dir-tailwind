import { z } from "zod";

export const SubtitleSchema = z.object({
  text: z.string(),
  startFrame: z.number(),
  endFrame: z.number(),
});

export const SceneSchema = z.object({
  text: z.string(),
  imageUrl: z.string(),
  videoUrl: z.string().optional(),
  durationInFrames: z.number(),
  voiceUrl: z.string().optional(),
  subtitles: z.array(SubtitleSchema).optional(),
});

export const ViralVideoSchema = z.object({
  scenes: z.array(SceneSchema),
  musicUrl: z.string().optional(),
  showNarration: z.boolean().optional(),
});

export type Subtitle = z.infer<typeof SubtitleSchema>;
export type ViralVideoProps = z.infer<typeof ViralVideoSchema>;
export type SceneProps = z.infer<typeof SceneSchema>;

export const defaultViralVideoProps: ViralVideoProps = {
  scenes: [
    {
      text: "Did you know that ants never sleep?",
      imageUrl: "https://images.unsplash.com/photo-1559132570-34863f6959b3?q=80&w=1080&auto=format&fit=crop",
      durationInFrames: 90,
      subtitles: [
        { text: "Did you know", startFrame: 0, endFrame: 30 },
        { text: "that ants", startFrame: 30, endFrame: 60 },
        { text: "never sleep?", startFrame: 60, endFrame: 90 },
      ],
    },
    {
      text: "And they don't have lungs!",
      imageUrl: "https://images.unsplash.com/photo-1551020275-385038c1a783?q=80&w=1080&auto=format&fit=crop",
      durationInFrames: 90,
      subtitles: [
        { text: "And they", startFrame: 0, endFrame: 30 },
        { text: "don't have", startFrame: 30, endFrame: 60 },
        { text: "lungs!", startFrame: 60, endFrame: 90 },
      ],
    },
    {
      text: "They breathe through tiny holes in their bodies.",
      imageUrl: "https://images.unsplash.com/photo-1610484826967-09c5720778c7?q=80&w=1080&auto=format&fit=crop",
      durationInFrames: 120,
      subtitles: [
        { text: "They breathe", startFrame: 0, endFrame: 40 },
        { text: "through tiny holes", startFrame: 40, endFrame: 80 },
        { text: "in their bodies.", startFrame: 80, endFrame: 120 },
      ],
    },
  ],
};
