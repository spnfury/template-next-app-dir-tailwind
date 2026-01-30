"use client";

import { Player } from "@remotion/player";
import type { NextPage } from "next";
import { useState, useMemo } from "react";
import { ViralVideo } from "../remotion/ViralVideo/Main";
import { defaultViralVideoProps, ViralVideoProps } from "../types/viral-video";

const Home: NextPage = () => {
  const [mode, setMode] = useState<"prompt" | "youtube">("prompt");
  const [prompt, setPrompt] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([""]);
  const [useOriginalBackground, setUseOriginalBackground] = useState(false);
  const [showMusic, setShowMusic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [producing, setProducing] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);
  const [videoProps, setVideoProps] = useState<ViralVideoProps>(defaultViralVideoProps);
  const [draft, setDraft] = useState<any>(null);

  const totalDuration = useMemo(() => {
    return videoProps.scenes.reduce((acc, scene) => acc + scene.durationInFrames, 0);
  }, [videoProps]);

  const handleGenerate = async () => {
    if (mode === "prompt" && !prompt) return;
    if (mode === "youtube" && !youtubeUrls.some(url => url.trim())) return;

    setLoading(true);
    setRenderUrl(null);
    setDraft(null);
    try {
      const endpoint = mode === "prompt" ? "/api/generate" : "/api/generate-from-shorts";
      const body = mode === "prompt"
        ? { prompt, showMusic }
        : {
          urls: youtubeUrls.filter(url => url.trim()),
          useOriginalBackground,
          showMusic
        };

      const response = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        if (mode === "youtube") {
          setDraft(data);
        } else {
          setVideoProps(data);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate video");
    } finally {
      setLoading(false);
    }
  };

  const handleProduce = async () => {
    if (!draft) return;
    setProducing(true);
    try {
      const response = await fetch("/api/produce", {
        method: "POST",
        body: JSON.stringify({
          ...draft,
          showMusic
        }),
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setVideoProps(data);
        setDraft(null); // Clear draft once produced
      }
    } catch (error) {
      console.error(error);
      alert("Error produciendo el video final");
    } finally {
      setProducing(false);
    }
  };

  const handleRender = async () => {
    setRendering(true);
    setRenderUrl(null);
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        body: JSON.stringify({ videoProps }),
      });
      const data = await response.json();
      if (data.error) {
        alert("Error renderizando: " + data.error);
      } else {
        setRenderUrl(data.url);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to render video");
    } finally {
      setRendering(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        {/* Left Column: Controls */}
        <div className="space-y-8 bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-sm">
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              VIRAL REEL AI
            </h1>
            <p className="text-zinc-400 mt-2">
              Transforma tus ideas en videos virales en segundos.
            </p>
          </div>

          <div className="flex p-1 bg-black/50 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setMode("prompt")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === "prompt" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              📝 Simple Prompt
            </button>
            <button
              onClick={() => setMode("youtube")}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${mode === "youtube" ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              📺 YouTube Shorts
            </button>
          </div>

          <div className="space-y-4">
            {mode === "prompt" ? (
              <>
                <label className="block text-sm font-medium text-zinc-300">
                  ¿De qué debería tratarse el video?
                </label>
                <textarea
                  className="w-full h-32 bg-black border border-zinc-800 rounded-2xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all resize-none"
                  placeholder="Ej: 3 datos curiosos sobre los gatos que te volarán la cabeza"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </>
            ) : (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-zinc-300">
                  URLs de YouTube Shorts (1-3)
                </label>
                {youtubeUrls.map((url, index) => (
                  <input
                    key={index}
                    type="text"
                    className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                    placeholder={`URL de Short ${index + 1}`}
                    value={url}
                    onChange={(e) => {
                      const newUrls = [...youtubeUrls];
                      newUrls[index] = e.target.value;
                      setYoutubeUrls(newUrls);
                    }}
                  />
                ))}
                {youtubeUrls.length < 3 && (
                  <button
                    onClick={() => setYoutubeUrls([...youtubeUrls, ""])}
                    className="text-xs text-purple-400 hover:text-purple-300 font-bold"
                  >
                    + Añadir otro video
                  </button>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="useOriginal"
                    className="w-5 h-5 accent-purple-600 rounded bg-black border-zinc-800"
                    checked={useOriginalBackground}
                    onChange={(e) => setUseOriginalBackground(e.target.checked)}
                  />
                  <label htmlFor="useOriginal" className="text-sm font-medium text-zinc-300 cursor-pointer">
                    Usar video original de fondo 🎬
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="showMusic"
                    className="w-5 h-5 accent-purple-600 rounded bg-black border-zinc-800"
                    checked={showMusic}
                    onChange={(e) => setShowMusic(e.target.checked)}
                  />
                  <label htmlFor="showMusic" className="text-sm font-medium text-zinc-300 cursor-pointer">
                    Música de fondo 🎵
                  </label>
                </div>
              </div>
            )}

            {mode === "prompt" && (
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="checkbox"
                  id="showMusicPrompt"
                  className="w-5 h-5 accent-purple-600 rounded bg-black border-zinc-800"
                  checked={showMusic}
                  onChange={(e) => setShowMusic(e.target.checked)}
                />
                <label htmlFor="showMusicPrompt" className="text-sm font-medium text-zinc-300 cursor-pointer">
                  Música de fondo 🎵
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={handleGenerate}
                disabled={loading || rendering || (mode === "prompt" ? !prompt : !youtubeUrls.some(u => u.trim()))}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                {loading ? "Transcribiendo y Generando..." : "Generar video viral"}
              </button>

              {videoProps !== defaultViralVideoProps && (
                <button
                  onClick={handleRender}
                  disabled={loading || rendering}
                  className="w-full py-4 bg-zinc-800 rounded-2xl font-bold text-lg hover:bg-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-zinc-700"
                >
                  {rendering ? "Renderizando MP4..." : "Descargar Video (.mp4)"}
                </button>
              )}

              {renderUrl && (
                <a
                  href={renderUrl}
                  download
                  className="w-full py-4 bg-green-600 rounded-2xl font-bold text-lg text-center hover:bg-green-500 transition-all shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                >
                  ¡Video Listo! Haz clic aquí para guardar
                </a>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Previsualización</h3>
            <div className="mt-4 space-y-2">
              {videoProps.scenes.map((scene, i) => (
                <div key={i} className="flex items-center gap-4 text-sm text-zinc-400">
                  <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">{i + 1}</span>
                  <p className="truncate">{scene.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Draft Editor Section */}
          {draft && (
            <div className="pt-8 border-t border-zinc-800 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  📝 Editar Guión Producido
                </h3>
                <span className="text-xs text-zinc-500 bg-zinc-800 px-3 py-1 rounded-full uppercase">Borrador</span>
              </div>

              <div className="space-y-6">
                {draft.scenes.map((scene: any, i: number) => (
                  <div key={i} className="p-5 bg-black/40 rounded-2xl border border-zinc-800 space-y-4">
                    <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                        {i + 1}
                      </span>
                      {scene.sectionTitle || "Escena"}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-black mb-1 block">Texto Visual (Subtítulos)</label>
                        <input
                          type="text"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none"
                          value={scene.text}
                          onChange={(e) => {
                            const newScenes = [...draft.scenes];
                            newScenes[i].text = e.target.value;
                            setDraft({ ...draft, scenes: newScenes });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase font-black mb-1 block">Texto Hablado (Narración IA)</label>
                        <textarea
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none h-20 resize-none"
                          value={scene.spokenText}
                          onChange={(e) => {
                            const newScenes = [...draft.scenes];
                            newScenes[i].spokenText = e.target.value;
                            setDraft({ ...draft, scenes: newScenes });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleProduce}
                disabled={producing}
                className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {producing ? "Produciendo voces y video..." : "✨ Finalizar y Producir"}
              </button>
              <p className="text-[10px] text-zinc-500 text-center">
                Esto generará la narración final y sincronizará los subtítulos.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Player */}
        <div className="sticky top-8 flex justify-center">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-[340px] h-[600px] bg-black rounded-[2rem] overflow-hidden border-8 border-zinc-900 shadow-2xl">
              <Player
                component={ViralVideo}
                inputProps={videoProps}
                durationInFrames={totalDuration}
                fps={30}
                compositionHeight={1920}
                compositionWidth={1080}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                controls
                autoPlay
                loop
              />
            </div>
          </div>
        </div>

      </div>
    </main>
  );
};

export default Home;
