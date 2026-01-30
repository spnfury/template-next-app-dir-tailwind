import { z } from "zod";

export const SceneSchema = z.object({
  text: z.string(),
  imageUrl: z.string(),
  durationInFrames: z.number(),
});

export const ViralVideoSchema = z.object({
  scenes: z.array(SceneSchema),
  musicUrl: z.string().optional(),
});

export type ViralVideoProps = z.infer<typeof ViralVideoSchema>;
export type SceneProps = z.infer<typeof SceneSchema>;

export const defaultViralVideoProps: ViralVideoProps = {
  scenes: [
    {
      text: "Did you know that ants never sleep?",
      imageUrl: "https://images.unsplash.com/photo-1559132570-34863f6959b3?q=80&w=1080&auto=format&fit=crop",
      durationInFrames: 90,
    },
    {
      text: "And they don't have lungs!",
      imageUrl: "https://images.unsplash.com/photo-1551020275-385038c1a783?q=80&w=1080&auto=format&fit=crop",
      durationInFrames: 90,
    },
    {
      text: "They breathe through tiny holes in their bodies.",
      imageUrl: "https://images.unsplash.com/photo-1610484826967-09c5720778c7?q=80&w=1080&auto=format&fit=crop",
      durationInFrames: 120,
    },
  ],
};
