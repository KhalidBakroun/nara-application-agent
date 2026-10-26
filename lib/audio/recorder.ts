import { encodeWav } from "./wav";

/** Records from the microphone and returns a 16 kHz mono WAV when stopped (browser only). */
export async function startRecording(): Promise<{ stop: () => Promise<Blob> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();

  return {
    stop: () =>
      new Promise<Blob>((resolve, reject) => {
        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          try {
            const audio = new AudioContext();
            const decoded = await audio.decodeAudioData(await new Blob(chunks).arrayBuffer());
            const wav = encodeWav(decoded.getChannelData(0), decoded.sampleRate);
            await audio.close();
            resolve(new Blob([wav.buffer as ArrayBuffer], { type: "audio/wav" }));
          } catch (err) {
            reject(err);
          }
        };
        recorder.stop();
      }),
  };
}
