/* -------------------------------------------------------------
 * 1. Global States & Variables
 * ------------------------------------------------------------- */
let audioCtx = null;
let isPlayingMusic = false;
let musicInterval = null;
let currentNoteIndex = 0;
let petalsLoop = null;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

/* -------------------------------------------------------------
 * 2. Background Stars Generator
 * ------------------------------------------------------------- */
function createStars() {
  const container = document.getElementById("starsContainer");
  const count = 70;
  for (let i = 0; i < count; i++) {
    const star = document.createElement("div");
    star.className = "star";
    const size = Math.random() * 3 + 1;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.setProperty("--duration", `${Math.random() * 3 + 2}s`);
    star.style.animationDelay = `${Math.random() * 3}s`;
    container.appendChild(star);
  }
}
createStars();

/* -------------------------------------------------------------
 * 3. Open Envelope Action
 * ------------------------------------------------------------- */
function openCard() {
  const envelope = document.getElementById("envelope");
  const introScreen = document.getElementById("introScreen");
  const mainLanding = document.getElementById("mainLanding");

  // 1. Open envelope flap
  envelope.classList.add("open");

  // 2. Play Audio Melody
  startBirthdayMusic();

  // 3. Transition Screens after 1.2s
  setTimeout(() => {
    introScreen.style.opacity = "0";
    introScreen.style.pointerEvents = "none";

    setTimeout(() => {
      introScreen.classList.add("hidden");
      mainLanding.classList.remove("pointer-events-none");
      mainLanding.style.opacity = "1";

      startPetalRain();

      // Reveal floating photos
      revealPhotos();

      // Start Poem Sequential Reveal
      revealPoemLines();
    }, 800);
  }, 1200);
}

/* -------------------------------------------------------------
 * 4. Sequential Poem Text Reveal FX
 * ------------------------------------------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function splitLineIntoWords(line) {
  if (line.dataset.split) return;
  line.dataset.split = "1";
  const words = line.textContent.trim().split(/\s+/);
  const wrap = document.createElement("span");
  wrap.className = "poem-text";
  words.forEach((word, i) => {
    const w = document.createElement("span");
    w.className = "w";
    w.style.setProperty("--i", i);
    w.textContent = word;
    wrap.appendChild(w);
    if (i < words.length - 1) wrap.appendChild(document.createTextNode(" "));
  });
  line.textContent = "";
  line.appendChild(wrap);
}

function heartBurst() {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const spread = Math.min(window.innerWidth * 0.6, 520);
  for (let i = 0; i < 26; i++) {
    setTimeout(
      () =>
        addHeart(
          cx + (Math.random() - 0.5) * spread,
          cy + (Math.random() - 0.5) * 80,
        ),
      i * 70,
    );
  }
}

async function revealPoemLines() {
  if (revealPoemLines.started) return;
  revealPoemLines.started = true;

  const lines = [...document.querySelectorAll(".poem-line")];
  lines.forEach(splitLineIntoWords);
  await sleep(700);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const wordCount = line.querySelectorAll(".w").length;
    line.classList.add("active"); // các từ bay vào lần lượt

    if (i === lines.length - 1) {
      // câu cuối: giữ lại + bắn tim
      await sleep(1500);
      return;
    }
    await sleep(950 + (wordCount - 1) * 95 + 1200); // thời gian vào + thời gian đọc
    line.classList.add("leaving"); // các từ bay lên và mờ dần
    await sleep(750);
    line.classList.remove("active", "leaving");
  }
}

/* -------------------------------------------------------------
 * 5. Reveal Polaroid Photos with Fade & Rotation
 * ------------------------------------------------------------- */
/* ---------- 5. Photo collage ---------- */
const PHOTO_CAPTIONS = {
  1: "Rạng rỡ ❤️",
  2: "Nụ cười dịu dàng",
  3: "Xinh đẹp nhất ✨",
  4: "Hạnh phúc nhé 🌸",
  5: "Toả sáng",
  6: "Ngọt ngào",
  7: "Dịu dàng",
  8: "Yêu thương",
};

// side "l" = cách mép trái, "r" = cách mép phải | x, y tính bằng % | rot = độ nghiêng
// Thứ tự trong mảng = thứ tự xuất hiện (đã xen kẽ để ảnh nảy ra khắp màn hình)
// Ảnh trùng nhau được đặt xa nhau, ảnh kề nhau luôn khác ảnh.
const PHOTO_SLOTS_DESKTOP = [
  { img: 1, side: "l", x: 3, y: 5, rot: -8 }, // trái - trên
  { img: 2, side: "r", x: 3, y: 8, rot: 7 }, // phải - trên
  { img: 1, side: "l", x: 45.5, y: 76, rot: -4 }, // dưới - giữa
  { img: 7, side: "l", x: 45.5, y: 1, rot: 5 }, // trên - giữa
  { img: 5, side: "l", x: 3, y: 50, rot: 6 }, // trái - giữa
  { img: 6, side: "r", x: 3, y: 53, rot: -6 }, // phải - giữa
  { img: 6, side: "l", x: 26, y: 3, rot: -6 }, // trên - trái
  { img: 3, side: "l", x: 60, y: 74, rot: 7 }, // dưới - phải
  { img: 3, side: "l", x: 15, y: 27, rot: -10 }, // trái - lệch vào
  { img: 4, side: "r", x: 15, y: 30, rot: 9 }, // phải - lệch vào
  { img: 5, side: "l", x: 65, y: 4, rot: 6 }, // trên - phải
  { img: 2, side: "l", x: 31, y: 74, rot: -7 }, // dưới - trái
  { img: 7, side: "l", x: 14, y: 72, rot: 8 }, // trái - dưới
  { img: 8, side: "r", x: 14, y: 74, rot: -8 }, // phải - dưới
];

const PHOTO_SLOTS_MOBILE = [
  { img: 1, side: "l", x: 3, y: 6, rot: -8 },
  { img: 2, side: "r", x: 3, y: 9, rot: 7 },
  { img: 3, side: "l", x: 1, y: 38, rot: 6 },
  { img: 4, side: "r", x: 1, y: 42, rot: -6 },
  { img: 5, side: "l", x: 3, y: 70, rot: -5 },
  { img: 6, side: "r", x: 3, y: 73, rot: 8 },
];

const isDesktopLayout = () => window.matchMedia("(min-width: 1024px)").matches;

// Tải + giải mã ảnh trước, tối đa chờ 2.5s để không bị treo
function preloadImages(urls, timeout = 2500) {
  const tasks = urls.map(
    (src) =>
      new Promise((resolve) => {
        const im = new Image();
        im.src = src;
        (im.decode ? im.decode() : Promise.resolve()).then(resolve, resolve);
      }),
  );
  return Promise.race([
    Promise.all(tasks),
    new Promise((r) => setTimeout(r, timeout)),
  ]);
}

function buildPhotoCollage() {
  const box = document.getElementById("photoCollage");
  const desktop = isDesktopLayout();
  const slots = desktop ? PHOTO_SLOTS_DESKTOP : PHOTO_SLOTS_MOBILE;
  const frag = document.createDocumentFragment();

  slots.forEach((s, i) => {
    const slot = document.createElement("div");
    slot.className = "pc-slot";
    slot.style[s.side === "r" ? "right" : "left"] = s.x + "%";
    slot.style.top = s.y + "%";
    slot.style.setProperty("--rot", s.rot + "deg");
    slot.style.setProperty("--delay", (0.3 + i * 0.28).toFixed(2) + "s");
    slot.style.setProperty(
      "--float-delay",
      "-" + (Math.random() * 5).toFixed(1) + "s",
    );

    const miniStars = desktop
      ? `<span class="mini-star" style="left:28%;animation-duration:3.4s;animation-delay:${(i % 3) * 0.7}s"></span>
         <span class="mini-star" style="left:68%;animation-duration:3.9s;animation-delay:${1.2 + (i % 3) * 0.5}s"></span>`
      : "";

    slot.innerHTML = `
      <div class="pc-card">
        <div class="pc-frame">
          <img src="./assets/img/img${s.img}.jpg" alt="" decoding="async">
          <div class="pc-fade"></div>
          <div class="photo-stars">${miniStars}</div>
        </div>
        <p class="pc-cap font-caveat">${PHOTO_CAPTIONS[s.img]}</p>
      </div>`;

    const img = slot.querySelector("img");
    img.onerror = () => {
      img.onerror = null;
      img.src = `https://placehold.co/300x360/ffb6c1/ffffff?text=Photo+${s.img}`;
    };
    frag.appendChild(slot);
  });

  box.innerHTML = "";
  box.appendChild(frag);
  return preloadImages([
    ...new Set(slots.map((s) => `./assets/img/img${s.img}.jpg`)),
  ]);
}

async function revealPhotos() {
  const box = document.getElementById("photoCollage");
  box.classList.remove("is-ready");
  await buildPhotoCollage();
  requestAnimationFrame(() => box.classList.add("is-ready")); // 1 lần đổi class → CSS tự stagger
}

// Xoay điện thoại / đổi cỡ cửa sổ qua ngưỡng 1024px thì dựng lại
let lastLayout = isDesktopLayout();
window.addEventListener("resize", () => {
  const now = isDesktopLayout();
  if (now !== lastLayout) {
    lastLayout = now;
    revealPhotos();
  }
});

const photoSparkSymbols = ["✦", "✧", "✩", "✫", "❈", "•", "◦"];
const maxPhotoSparks = 3;

function spawnPhotoSpark(starsLayer) {
  if (starsLayer.querySelectorAll(".photo-spark").length >= maxPhotoSparks) {
    return;
  }

  const spark = document.createElement("span");
  spark.className = "photo-spark";
  spark.textContent =
    photoSparkSymbols[Math.floor(Math.random() * photoSparkSymbols.length)];
  spark.style.left = `${8 + Math.random() * 84}%`;
  spark.style.top = `${12 + Math.random() * 72}%`;

  const angle = Math.random() * Math.PI * 2;
  const distance = 16 + Math.random() * 28;
  spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
  spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance - 12}px`);
  spark.style.setProperty(
    "--spark-rotate",
    `${(Math.random() - 0.5) * 180}deg`,
  );
  spark.style.fontSize = `${7 + Math.random() * 5}px`;
  const duration = 1.8 + Math.random() * 1.4;
  spark.style.animationDuration = `${duration}s`;
  starsLayer.appendChild(spark);
  setTimeout(() => spark.remove(), duration * 1000 + 100);
}
let sparkTimer = null;
function startPhotoSparkles() {
  if (sparkTimer || reduce.matches) return;
  const every = isDesktopLayout() ? 350 : 900;
  sparkTimer = setInterval(() => {
    if (document.hidden) return;
    const layers = document.querySelectorAll(".photo-stars");
    if (layers.length)
      spawnPhotoSpark(layers[Math.floor(Math.random() * layers.length)]);
  }, every);
}

const bgMusic = document.getElementById("bgMusic");

window.addEventListener("DOMContentLoaded", () => {
  revealPhotos().then(startPhotoSparkles);
  revealPoemLines();
  startPetalRain();
  setTimeout(() => {
    try {
      startBirthdayMusic();
    } catch (error) {
      console.warn("Auto-play blocked by browser:", error);
    }
  }, 800);

  document.addEventListener(
    "pointerdown",
    () => {
      if (bgMusic && bgMusic.paused) {
        startBirthdayMusic();
      }
    },
    { once: true },
  );
});

/* -------------------------------------------------------------
 * 6. Audio Synthesizer (Happy Birthday Tune via Web Audio API)
 * ------------------------------------------------------------- */
const birthdayNotes = [
  { note: 261.63, duration: 0.35 }, // C4
  { note: 261.63, duration: 0.25 }, // C4
  { note: 293.66, duration: 0.6 }, // D4
  { note: 261.63, duration: 0.6 }, // C4
  { note: 349.23, duration: 0.6 }, // F4
  { note: 329.63, duration: 1.0 }, // E4

  { note: 261.63, duration: 0.35 }, // C4
  { note: 261.63, duration: 0.25 }, // C4
  { note: 293.66, duration: 0.6 }, // D4
  { note: 261.63, duration: 0.6 }, // C4
  { note: 392.0, duration: 0.6 }, // G4
  { note: 349.23, duration: 1.0 }, // F4

  { note: 261.63, duration: 0.35 }, // C4
  { note: 261.63, duration: 0.25 }, // C4
  { note: 523.25, duration: 0.6 }, // C5
  { note: 440.0, duration: 0.6 }, // A4
  { note: 349.23, duration: 0.6 }, // F4
  { note: 329.63, duration: 0.6 }, // E4
  { note: 293.66, duration: 0.8 }, // D4

  { note: 466.16, duration: 0.35 }, // A#4
  { note: 466.16, duration: 0.25 }, // A#4
  { note: 440.0, duration: 0.6 }, // A4
  { note: 349.23, duration: 0.6 }, // F4
  { note: 392.0, duration: 0.6 }, // G4
  { note: 349.23, duration: 1.2 }, // F4
];

function playTone(freq, duration) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // Smooth envelope
    gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + duration,
    );

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error(e);
  }
}

function playNextNote() {
  if (!isPlayingMusic) return;
  const item = birthdayNotes[currentNoteIndex];
  playTone(item.note, item.duration);
  currentNoteIndex = (currentNoteIndex + 1) % birthdayNotes.length;
  musicInterval = setTimeout(playNextNote, item.duration * 1000 + 80);
}

function startBirthdayMusic() {
  const vinyl = document.getElementById("vinylDisc");
  const musicBox = document.getElementById("musicBox");
  const status = document.getElementById("musicStatus");

  if (bgMusic) {
    bgMusic.volume = 0.7;
    bgMusic.muted = false;
    const playPromise = bgMusic.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          isPlayingMusic = true;
          musicBox.classList.add("is-playing");
          vinyl.classList.remove("paused");
          status.innerText = "Đang phát nhạc 🎶";
          document.getElementById("musicIcon").className = "fa-solid fa-pause";
        })
        .catch(() => {
          isPlayingMusic = false;
          musicBox.classList.remove("is-playing");
          status.innerText = "Bấm vào đây để bật nhạc 🔊";
          if (vinyl) vinyl.classList.add("paused");
          const musicIcon = document.getElementById("musicIcon");
          if (musicIcon) musicIcon.className = "fa-solid fa-music";
        });
      return;
    }
  }

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  isPlayingMusic = true;
  musicBox.classList.add("is-playing");
  vinyl.classList.remove("paused");
  status.innerText = "Đang phát nhạc 🎶";
  document.getElementById("musicIcon").className = "fa-solid fa-pause";

  if (!bgMusic || bgMusic.paused) {
    playNextNote();
  }
}

function toggleMusic() {
  const vinyl = document.getElementById("vinylDisc");
  const status = document.getElementById("musicStatus");

  if (isPlayingMusic) {
    isPlayingMusic = false;
    clearTimeout(musicInterval);
    if (bgMusic) {
      bgMusic.pause();
    }
    document.getElementById("musicBox").classList.remove("is-playing");
    vinyl.classList.add("paused");
    status.innerText = "Tạm dừng nhạc ⏸️";
    document.getElementById("musicIcon").className = "fa-solid fa-music";
  } else {
    startBirthdayMusic();
  }
}

/* -------------------------------------------------------------
 * 7. Fireworks Canvas Effect
 * ------------------------------------------------------------- */
const fwCanvas = document.getElementById("fireworksCanvas");
const fwCtx = fwCanvas.getContext("2d");
let fwParticles = [];

function resizeFwCanvas() {
  fwCanvas.width = window.innerWidth;
  fwCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeFwCanvas);
resizeFwCanvas();

class FireworkParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 4 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.decay = Math.random() * 0.015 + 0.01;
    this.gravity = 0.05;
  }

  update() {
    this.vx *= 0.98;
    this.vy *= 0.98;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}

function createFireworkBurst(x, y) {
  const colors = [
    "#ff4e50",
    "#f9d423",
    "#ff69b4",
    "#00ffff",
    "#ff1493",
    "#ffd700",
    "#ffffff",
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];
  for (let i = 0; i < 45; i++) {
    fwParticles.push(new FireworkParticle(x, y, color));
  }
}

function launchFireworksBurst() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  createFireworkBurst(
    w * 0.2 + Math.random() * w * 0.6,
    h * 0.2 + Math.random() * h * 0.3,
  );
}

function triggerInitialFireworks() {
  launchFireworksBurst();
  setInterval(() => {
    if (document.getElementById("mainLanding").style.opacity === "1") {
      launchFireworksBurst();
    }
  }, 2200);
}

function renderFireworks() {
  fwCtx.fillStyle = "rgba(15, 5, 29, 0.2)";
  fwCtx.fillRect(0, 0, fwCanvas.width, fwCanvas.height);

  for (let i = fwParticles.length - 1; i >= 0; i--) {
    const p = fwParticles[i];
    p.update();
    p.draw(fwCtx);
    if (p.alpha <= 0) {
      fwParticles.splice(i, 1);
    }
  }
  requestAnimationFrame(renderFireworks);
}
renderFireworks();

/* -------------------------------------------------------------
 * 8. Mouse / Touch Interactive Floating Hearts Effect
 * ------------------------------------------------------------- */
const heartsCanvas = document.getElementById("heartsCanvas");
const hCtx = heartsCanvas.getContext("2d");
let hearts = [];

function resizeHeartsCanvas() {
  heartsCanvas.width = window.innerWidth;
  heartsCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeHeartsCanvas);
resizeHeartsCanvas();

class FloatingHeart {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 12 + 10;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = -Math.random() * 2 - 1;
    this.alpha = 1;
    this.color = `hsl(${Math.random() * 50 + 330}, 100%, 70%)`;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.015;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    const topCurveHeight = this.size * 0.3;
    ctx.moveTo(this.x, this.y + topCurveHeight);
    // Heart shape bezier curve
    ctx.bezierCurveTo(
      this.x,
      this.y,
      this.x - this.size / 2,
      this.y,
      this.x - this.size / 2,
      this.y + topCurveHeight,
    );
    ctx.bezierCurveTo(
      this.x - this.size / 2,
      this.y + (this.size + topCurveHeight) / 2,
      this.x,
      this.y + this.size,
      this.x,
      this.y + this.size,
    );
    ctx.bezierCurveTo(
      this.x,
      this.y + this.size,
      this.x + this.size / 2,
      this.y + (this.size + topCurveHeight) / 2,
      this.x + this.size / 2,
      this.y + topCurveHeight,
    );
    ctx.bezierCurveTo(
      this.x + this.size / 2,
      this.y,
      this.x,
      this.y,
      this.x,
      this.y + topCurveHeight,
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function addHeart(x, y) {
  hearts.push(new FloatingHeart(x, y));
}

function renderHearts() {
  hCtx.clearRect(0, 0, heartsCanvas.width, heartsCanvas.height);
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.update();
    h.draw(hCtx);
    if (h.alpha <= 0) {
      hearts.splice(i, 1);
    }
  }
  requestAnimationFrame(renderHearts);
}
renderHearts();

function startPetalRain() {
  if (reduce.matches) return;
  document.body.classList.add("opened");
  if (petalsLoop) {
    clearInterval(petalsLoop);
  }
  spawnPetals(7000);
  petalsLoop = setInterval(() => {
    if (document.body.classList.contains("opened")) {
      spawnPetals(5000);
    }
  }, 10000);
}

function spawnPetals(durationMs = 6000) {
  if (reduce.matches) return;
  const colors = ["#7a1f26", "#a9424a", "#c9727a", "#e6b4b8", "#c9a227"];
  const container = document.createElement("div");
  container.className = "petals";
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);

  const total = 150;
  let spawned = 0;
  const spawner = setInterval(
    () => {
      if (spawned >= total) {
        clearInterval(spawner);
        return;
      }
      spawned++;
      const petal = document.createElement("span");
      petal.className = "petal";
      const size = 8 + Math.random() * 12;
      const dur = 5 + Math.random() * 4;
      const delay = Math.random() * 0.5;
      const left = Math.random() * 100;
      const dx1 = Math.round(Math.random() * 90 - 45) + "px";
      const dx2 = Math.round(Math.random() * 90 - 45) + "px";
      const spin = (Math.random() > 0.5 ? 1 : -1) * (280 + Math.random() * 260);
      petal.style.left = left + "vw";
      petal.style.width = size + "px";
      petal.style.height = size * 0.82 + "px";
      petal.style.background =
        colors[Math.floor(Math.random() * colors.length)];
      petal.style.animationDuration = dur + "s";
      petal.style.animationDelay = delay + "s";
      petal.style.setProperty("--dx1", dx1);
      petal.style.setProperty("--dx2", dx2);
      petal.style.setProperty("--spin", spin + "deg");
      petal.addEventListener("animationend", () => petal.remove());
      container.appendChild(petal);
    },
    window.innerWidth < 1024 ? 320 : 140,
  );

  setTimeout(() => clearInterval(spawner), durationMs);
  setTimeout(() => container.remove(), durationMs + 7000);
}
