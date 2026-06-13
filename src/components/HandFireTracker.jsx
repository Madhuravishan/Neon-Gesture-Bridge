import { useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  HandLandmarker,
} from "@mediapipe/tasks-vision";
import "./HandFireTracker.css";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const THUMB_TIP = 4;
const INDEX_TIP = 8;
const PINCH_THRESHOLD = 0.06;
const PARTICLES_PER_BURST = 5;
const MAX_PARTICLES = 400;

const FIRE_COLORS = ["#ffff44", "#ffcc00", "#ff8800", "#ff4400", "#cc1100"];

function thumbIndexDistance(landmarks) {
  const thumb = landmarks[THUMB_TIP];
  const index = landmarks[INDEX_TIP];
  return Math.hypot(thumb.x - index.x, thumb.y - index.y);
}

function pinchMidpointToCanvas(landmarks, width, height) {
  const thumb = landmarks[THUMB_TIP];
  const index = landmarks[INDEX_TIP];
  const midX = (thumb.x + index.x) / 2;
  const midY = (thumb.y + index.y) / 2;
  return {
    x: (1 - midX) * width,
    y: midY * height,
  };
}

class FireParticle {
  constructor(x, y) {
    this.x = x + (Math.random() - 0.5) * 10;
    this.y = y + (Math.random() - 0.5) * 6;
    this.vx = (Math.random() - 0.5) * 2.4;
    this.vy = -(Math.random() * 2.5 + 1.8);
    this.maxRadius = Math.random() * 10 + 6;
    this.radius = this.maxRadius;
    this.life = 1;
    this.decay = Math.random() * 0.025 + 0.018;
    this.color = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)];
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx += (Math.random() - 0.5) * 0.15;
    this.vy -= 0.04;
    this.life -= this.decay;
    this.radius = this.maxRadius * Math.max(this.life, 0);
    return this.life > 0 && this.radius > 0.4;
  }

  draw(ctx) {
    const alpha = Math.max(this.life, 0);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function HandFireTracker() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const isPinchingRef = useRef(false);
  const emitterRef = useRef(null);

  const [status, setStatus] = useState("Loading…");
  const [isPinching, setIsPinching] = useState(false);

  useEffect(() => {
    let stream = null;
    let cancelled = false;

    async function init() {
      try {
        setStatus("Loading MediaPipe…");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        if (cancelled) return;
        landmarkerRef.current = landmarker;

        setStatus("Starting camera…");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || cancelled) return;

        video.srcObject = stream;
        await video.play();

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        setStatus("Pinch thumb + index to create fire");
        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error(err);
        setStatus(`Error: ${err.message}`);
      }
    }

    function spawnParticles(x, y) {
      const particles = particlesRef.current;
      for (let i = 0; i < PARTICLES_PER_BURST; i++) {
        if (particles.length >= MAX_PARTICLES) particles.shift();
        particles.push(new FireParticle(x, y));
      }
    }

    function loop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      const ctx = canvas?.getContext("2d");

      if (!video || !canvas || !ctx || !landmarker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const result = landmarker.detectForVideo(video, performance.now());
        const hand = result.landmarks?.[0];

        let pinching = false;
        if (hand) {
          pinching = thumbIndexDistance(hand) < PINCH_THRESHOLD;
          emitterRef.current = pinchMidpointToCanvas(
            hand,
            canvas.width,
            canvas.height
          );
        } else {
          emitterRef.current = null;
        }

        if (pinching !== isPinchingRef.current) {
          isPinchingRef.current = pinching;
          setIsPinching(pinching);
        }
      }

      if (isPinchingRef.current && emitterRef.current) {
        spawnParticles(emitterRef.current.x, emitterRef.current.y);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter((p) => {
        const alive = p.update();
        if (alive) p.draw(ctx);
        return alive;
      });

      rafRef.current = requestAnimationFrame(loop);
    }

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      landmarkerRef.current?.close?.();
    };
  }, []);

  return (
    <div className="tracker">
      <div className="tracker__stage">
        <video ref={videoRef} className="tracker__video" playsInline muted />
        <canvas ref={canvasRef} className="tracker__canvas" />
        {isPinching && <span className="tracker__badge">PINCH</span>}
      </div>
      <p className="tracker__status">{status}</p>
    </div>
  );
}
