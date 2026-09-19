/* =============================================================
 * main.js — Thiệp sinh nhật (bản hoàn chỉnh)
 * Thứ tự: 1 Biến chung · 2 Phong bì (tuỳ chọn) · 3 Thơ · 4 Ảnh
 *         5 Nhạc · 6 Cánh hoa · 7 Hộp quà + thư tình · 8 Khởi động
 * ============================================================= */

/* -------------------------------------------------------------
 * 1. Biến chung
 * ------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
const isDesktopLayout = () => window.matchMedia("(min-width: 1024px)").matches;

const bgMusic = $("bgMusic");
let isPlayingMusic = false;
let petalsLoop = null;

/* -------------------------------------------------------------
 * 2. Màn phong bì (hiện đang tắt bằng CSS, giữ lại để bật khi cần)
 * ------------------------------------------------------------- */
function openCard() {
  const envelope = $("envelope");
  const introScreen = $("introScreen");
  const mainLanding = $("mainLanding");
  if (!envelope || !introScreen || !mainLanding) return;

  envelope.classList.add("open");
  playMusic(); // bấm "Mở thiệp" là thao tác hợp lệ → nhạc chắc chắn phát được

  setTimeout(() => {
    introScreen.style.opacity = "0";
    introScreen.style.pointerEvents = "none";

    setTimeout(() => {
      introScreen.classList.add("hidden");
      mainLanding.classList.remove("pointer-events-none");
      mainLanding.style.opacity = "1";
      startPetalRain();
      revealPhotos().then(startPhotoSparkles);
      revealPoemLines();
    }, 800);
  }, 1200);
}

/* -------------------------------------------------------------
 * 3. Câu thơ hiện từng từ
 * ------------------------------------------------------------- */
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
      // Câu cuối: giữ lại, ~2s để hiện đủ + 3s chờ rồi hiện hộp quà
      await sleep(5000);
      showGiftBox();
      return;
    }
    await sleep(950 + (wordCount - 1) * 95 + 1200); // thời gian vào + thời gian đọc
    line.classList.add("leaving"); // các từ bay lên và mờ dần
    await sleep(750);
    line.classList.remove("active", "leaving");
  }
}

/* -------------------------------------------------------------
 * 4. Ảnh polaroid bay lơ lửng
 * ------------------------------------------------------------- */
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
// Thứ tự trong mảng = thứ tự xuất hiện
const PHOTO_SLOTS_DESKTOP = [
  { img: 1, side: "l", x: 3, y: 5, rot: -8 },
  { img: 2, side: "r", x: 3, y: 8, rot: 7 },
  { img: 1, side: "l", x: 45.5, y: 76, rot: -4 },
  { img: 7, side: "l", x: 45.5, y: 1, rot: 5 },
  { img: 5, side: "l", x: 3, y: 50, rot: 6 },
  { img: 6, side: "r", x: 3, y: 53, rot: -6 },
  { img: 6, side: "l", x: 26, y: 3, rot: -6 },
  { img: 3, side: "l", x: 60, y: 74, rot: 7 },
  { img: 3, side: "l", x: 15, y: 27, rot: -10 },
  { img: 4, side: "r", x: 15, y: 30, rot: 9 },
  { img: 5, side: "l", x: 65, y: 4, rot: 6 },
  { img: 2, side: "l", x: 31, y: 74, rot: -7 },
  { img: 7, side: "l", x: 14, y: 72, rot: 8 },
  { img: 8, side: "r", x: 14, y: 74, rot: -8 },
];

const PHOTO_SLOTS_MOBILE = [
  { img: 1, side: "l", x: 3, y: 6, rot: -8 },
  { img: 2, side: "r", x: 3, y: 9, rot: 7 },
  { img: 3, side: "l", x: 1, y: 38, rot: 6 },
  { img: 4, side: "r", x: 1, y: 42, rot: -6 },
  { img: 5, side: "l", x: 3, y: 70, rot: -5 },
  { img: 6, side: "r", x: 3, y: 73, rot: 8 },
];

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
  const box = $("photoCollage");
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
  const box = $("photoCollage");
  if (!box) return;
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

/* ---------- Lấp lánh trong ảnh ---------- */
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

/* -------------------------------------------------------------
 * 5. Nút nhạc xoay tròn (play / pause)
 * ------------------------------------------------------------- */
const musicBtn = $("musicBtn");
const musicIcon = $("musicIcon");

// Giao diện luôn bám theo trạng thái thật của thẻ <audio>, không tự đoán
function setMusicUI(playing) {
  isPlayingMusic = playing;
  if (!musicBtn) return;
  musicBtn.classList.toggle("is-playing", playing);
  musicBtn.setAttribute("aria-label", playing ? "Tạm dừng nhạc" : "Phát nhạc");
  if (musicIcon)
    musicIcon.className = playing ? "fa-solid fa-pause" : "fa-solid fa-play";
}

if (bgMusic) {
  bgMusic.addEventListener("play", () => setMusicUI(true));
  bgMusic.addEventListener("pause", () => setMusicUI(false));
  setMusicUI(!bgMusic.paused); // đồng bộ ngay nếu nhạc đã tự phát trước khi gắn listener
}

function playMusic() {
  if (!bgMusic) return Promise.resolve(false);
  bgMusic.volume = 0.7;
  bgMusic.muted = false;
  const p = bgMusic.play();
  return p && p.then
    ? p.then(
        () => true,
        () => false,
      )
    : Promise.resolve(true);
}

function startBirthdayMusic() {
  return playMusic(); // giữ tên cũ cho tương thích
}

function toggleMusic() {
  if (bgMusic && !bgMusic.paused) bgMusic.pause();
  else playMusic();
}

if (musicBtn) musicBtn.addEventListener("click", toggleMusic);

// Trình duyệt chặn tự phát → chạm lần đầu ở bất kỳ đâu là phát, thử lại đến khi thành công
function armMusicAutoplay() {
  const evts = ["pointerup", "touchend", "click", "keydown"];
  const off = () =>
    evts.forEach((t) => document.removeEventListener(t, onGesture, true));

  async function onGesture(e) {
    if (musicBtn && musicBtn.contains(e.target)) return off(); // bấm vào nút thì để nút tự xử lý
    if (!bgMusic || !bgMusic.paused) return off();
    await playMusic();
    if (!bgMusic.paused) off();
  }
  evts.forEach((t) => document.addEventListener(t, onGesture, true));
}

/* -------------------------------------------------------------
 * 6. Mưa cánh hoa
 * ------------------------------------------------------------- */
function startPetalRain() {
  if (reduce.matches) return;
  document.body.classList.add("opened");
  if (petalsLoop) clearInterval(petalsLoop);
  spawnPetals(7000);
  petalsLoop = setInterval(() => {
    if (document.body.classList.contains("opened")) spawnPetals(5000);
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

/* -------------------------------------------------------------
 * 7. Hộp quà bất ngờ + thư tình bay
 * ------------------------------------------------------------- */
const GIFT_SULK_LINES = [
  "Hứ... sao em lại bấm Không vậy 😤",
  "Anh dỗi rồi đó nha 😠",
  "Anh buồn lắm luôn á 🥺",
  "Em nỡ từ chối anh sao 💔",
  "Anh ngồi đây đợi đến khi em bấm Đồng ý 🥹",
  "Đừng bấm Không nữa mà, anh khóc bây giờ đó 😭",
  "Thôi mà, bấm Đồng ý đi, mai anh mời bánh kem 🍰",
  "Anh không chịu đâu, phải bấm Đồng ý cơ 😤",
];

let giftShown = false;
let giftNoCount = 0;
let giftDone = false;

function giftRestartAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth; // ép trình duyệt tính lại để animation chạy lại từ đầu
  el.classList.add(cls);
}

function showGiftBox() {
  const overlay = $("giftOverlay");
  if (giftShown || !overlay) return;
  giftShown = true;
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
}

function openGiftBox() {
  const overlay = $("giftOverlay");
  if (!overlay || overlay.classList.contains("opened")) return;
  overlay.classList.add("opened");
}

function onGiftNo() {
  if (giftDone) return;
  giftNoCount++;
  const reply = $("giftReply");
  const actions = $("giftActions");
  const inner = document.querySelector(".gift-inner");

  reply.textContent =
    GIFT_SULK_LINES[(giftNoCount - 1) % GIFT_SULK_LINES.length];
  reply.classList.remove("happy");
  giftRestartAnim(reply, "pop");
  giftRestartAnim(inner, "shake");

  // Bấm Không càng nhiều: nút Đồng ý to dần, nút Không nhỏ dần
  actions.style.setProperty(
    "--yes",
    Math.min(1 + giftNoCount * 0.1, 1.5).toFixed(2),
  );
  actions.style.setProperty(
    "--no",
    Math.max(1 - giftNoCount * 0.07, 0.72).toFixed(2),
  );
}

function onGiftYes() {
  if (giftDone) return;
  giftDone = true;

  const overlay = $("giftOverlay");
  const reply = $("giftReply");
  const actions = $("giftActions");

  actions.classList.add("gone");
  reply.textContent = "Ai mà đáng yêu quá zợ! 🥰";
  reply.classList.add("happy");
  giftRestartAnim(reply, "pop");

  setTimeout(() => {
    overlay.classList.add("closing"); // bỏ lớp mờ
    launchLoveLetters(); // thư tình bay lên
    setTimeout(() => (overlay.style.display = "none"), 1000);
  }, 2000);
}

// Dùng ?. để nếu thiếu phần tử trong HTML thì chỉ bỏ qua, không làm sập cả file
$("giftBox")?.addEventListener("click", openGiftBox);
$("giftYes")?.addEventListener("click", onGiftYes);
$("giftNo")?.addEventListener("click", onGiftNo);

/* ---------- Thư tình bay như khói ---------- */
function launchLoveLetters() {
  if (reduce.matches) return;
  const canvas = $("loveLetters");
  if (!canvas || canvas.dataset.running) return;
  canvas.dataset.running = "1";

  const mobile = window.matchMedia("(max-width: 1023px)").matches;
  const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.display = "block";
  const ctx = canvas.getContext("2d");

  // Vẽ sẵn mỗi loại icon 1 lần, sau đó chỉ việc drawImage (rất nhẹ)
  const SPR = 64;
  const sprites = ["💌", "💌", "✉️", "✉️", "💗"].map((emoji) => {
    const c = document.createElement("canvas");
    c.width = c.height = SPR;
    const x = c.getContext("2d");
    x.font = `${SPR * 0.72}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(emoji, SPR / 2, SPR / 2 + 3);
    return c;
  });

  const TOTAL = mobile ? 140 : 350; // muốn nhiều/ít hơn thì sửa số này
  const SPAWN_MS = 6500; // thời gian "xả" hết số thư
  const parts = [];
  let spawned = 0;

  function make() {
    return {
      spr: sprites[(Math.random() * sprites.length) | 0],
      x0: Math.random() * W,
      y0: H + 10 + Math.random() * 50, // xuất phát ngay dưới mép màn hình → lấp ló chui lên
      rise: H * (0.45 + Math.random() * 0.6), // quãng đường bay lên
      size: (mobile ? 16 : 20) + Math.random() * (mobile ? 22 : 30),
      amp: 14 + Math.random() * 40, // biên độ uốn lượn
      freq: 0.7 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      rot: (Math.random() - 0.5) * 0.9,
      life: 4.5 + Math.random() * 3.5, // giây
      age: 0,
    };
  }

  let last = performance.now();
  const start = last;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    // Xả thư dần dần theo thời gian
    const target = Math.min(
      TOTAL,
      Math.floor((TOTAL * (now - start)) / SPAWN_MS),
    );
    while (spawned < target) {
      parts.push(make());
      spawned++;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }

      const ease = 1 - (1 - t) * (1 - t); // bay chậm dần như khói
      const spread = 0.4 + t * 1.1; // càng lên càng tản rộng
      const x = p.x0 + Math.sin(p.age * p.freq + p.phase) * p.amp * spread;
      const y = p.y0 - p.rise * ease;
      const s = p.size * (0.65 + t * 0.7); // nở dần ra
      const r = p.rot + Math.sin(p.age * p.freq * 0.8 + p.phase) * 0.35;

      const fadeIn = Math.min(1, t / 0.15);
      const fadeOut = t > 0.55 ? 1 - (t - 0.55) / 0.45 : 1;
      ctx.globalAlpha = 0.9 * fadeIn * fadeOut;

      const c = Math.cos(r) * dpr;
      const sn = Math.sin(r) * dpr;
      ctx.setTransform(c, sn, -sn, c, x * dpr, y * dpr);
      ctx.drawImage(p.spr, -s / 2, -s / 2, s, s);
    }

    if (spawned >= TOTAL && parts.length === 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = "none";
      delete canvas.dataset.running;
      return; // hết thư → dừng vòng lặp, không tốn pin
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/* -------------------------------------------------------------
 * 8. Khởi động
 * ------------------------------------------------------------- */
function boot() {
  revealPhotos().then(startPhotoSparkles);
  revealPoemLines();
  startPetalRain();
  playMusic(); // thử tự phát ngay
  armMusicAutoplay(); // nếu bị chặn: chạm lần đầu ở bất kỳ đâu sẽ phát
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
