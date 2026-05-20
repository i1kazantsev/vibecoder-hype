/**
 * game.js
 * Основной игровой движок раннера «Вайбкодер: Погоня за Хайпом».
 */

// === Состояния игры ===
const STATES = {
    START: 'START',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER'
};
let gameState = STATES.START;

// === Игровые настройки ===
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;

const LANE_COUNT = 3;
const LANE_WIDTH = CANVAS_WIDTH / LANE_COUNT;
const LANE_CENTERS = [
    LANE_WIDTH * 0 + LANE_WIDTH / 2, // 100
    LANE_WIDTH * 1 + LANE_WIDTH / 2, // 300
    LANE_WIDTH * 2 + LANE_WIDTH / 2  // 500
];

const BRAND_INFO = {
    google: {
        name: 'Google',
        color: '#4285F4',
        accentColor: '#34a853',
        logoSprite: 'logoGoogle',
        updates: ["Gemini 1.5", "Gemini 2.0", "Project Astra", "Gemma 2", "Imagen 3", "Gemini 3.0 Pro"]
    },
    openai: {
        name: 'OpenAI',
        color: '#10a37f',
        accentColor: '#1a7f64',
        logoSprite: 'logoOpenai',
        updates: ["GPT-4o", "o1-mini", "o1-pro", "o3-mini", "Sora", "GPT-5 Hype"]
    },
    anthropic: {
        name: 'Anthropic',
        color: '#f97316', // Оранжевый
        accentColor: '#ea580c',
        logoSprite: 'logoAnthropic',
        updates: ["Claude 3.5 Sonnet", "Claude 3.5 Haiku", "Claude 3.5 Opus", "Claude 3.7 Sonnet", "Computer Use", "Claude 4 Claude"]
    }
};

const LOGO_IMAGES = {
    google: new Image(),
    openai: new Image(),
    anthropic: new Image()
};
LOGO_IMAGES.google.src = 'google_logo.png';
LOGO_IMAGES.openai.src = 'openai_logo.png';
LOGO_IMAGES.anthropic.src = 'anthropic_logo.png';

const OBSTACLES = [
    { type: 'bug', sprite: 'bug', label: 'БАГ В КОДЕ!' },
    { type: 'rateLimit', sprite: 'rateLimit', label: 'ЛИМИТ ЗАПРОСОВ!' },
    { type: 'outage', sprite: 'outage', label: 'ПАДЕНИЕ API!' },
    { type: 'bill', sprite: 'bill', label: 'СЧЕТ ЗА API ($$$)' }
];

// === Аудио Синтезатор (Web Audio API) ===
let audioCtx = null;
let mainGain = null;
let isMuted = false;
let sequenceInterval = null;
let nextNoteTime = 0.0;
let currentStep = 0;

const TEMPO = 140; // BPM
const NOTE_LENGTH = 60.0 / TEMPO / 2; // Восьмые ноты (0.214 сек)

// Ноты для chiptune-последовательности (Am -> F -> C -> G)
const BASS_NOTES = [
    55.00, 82.41, 55.00, 82.41, // Am: A1, E2, A1, E2
    43.65, 65.41, 43.65, 65.41, // F:  F1, C2, F1, C2
    65.41, 98.00, 65.41, 98.00, // C:  C2, G2, C2, G2
    49.00, 73.42, 49.00, 73.42  // G:  G1, D2, G1, D2
];

const LEAD_NOTES = [
    220.00, 329.63, 261.63, 329.63, // Am: A3, E4, C4, E4
    174.61, 261.63, 220.00, 261.63, // F:  F3, C4, A3, C4
    261.63, 392.00, 329.63, 392.00, // C:  C4, G4, E4, G4
    196.00, 293.66, 246.94, 293.66  // G:  G3, D4, B3, D4
];

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mainGain = audioCtx.createGain();
        mainGain.gain.setValueAtTime(isMuted ? 0 : 0.2, audioCtx.currentTime);
        mainGain.connect(audioCtx.destination);
        startSequencer();
    } catch (e) {
        console.warn("Web Audio API не поддерживается этим браузером", e);
    }
}

function playTone(freq, type, duration, startTime, volume) {
    if (isMuted || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Ретро огибающая (Envelope)
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration - 0.01);
        
        osc.connect(gainNode);
        gainNode.connect(mainGain);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
    } catch(e) {}
}

function startSequencer() {
    if (sequenceInterval) clearInterval(sequenceInterval);
    nextNoteTime = audioCtx.currentTime;
    currentStep = 0;
    
    sequenceInterval = setInterval(() => {
        if (!audioCtx) return;
        while (nextNoteTime < audioCtx.currentTime + 0.1) {
            scheduleNextNotes(currentStep, nextNoteTime);
            currentStep = (currentStep + 1) % 16;
            nextNoteTime += NOTE_LENGTH;
        }
    }, 25);
}

function scheduleNextNotes(step, time) {
    if (gameState !== STATES.PLAYING) return;
    
    // Бас играет на нечетные шаги
    if (step % 2 === 0) {
        const bassFreq = BASS_NOTES[step];
        playTone(bassFreq, 'triangle', NOTE_LENGTH * 1.7, time, 0.25);
    }
    
    // Мелодия арпеджио на каждый шаг
    const leadFreq = LEAD_NOTES[step];
    // Чтобы сделать звук более ретро, добавим короткие "чипы" (квадратная волна)
    playTone(leadFreq, 'square', NOTE_LENGTH * 0.7, time, 0.06);
}

// Звуковые эффекты (SFX)
function playCollectSound() {
    if (isMuted || !audioCtx) return;
    const now = audioCtx.currentTime;
    // Двойной ретро-звон (как в Mario монетка)
    playTone(659.25, 'square', 0.07, now, 0.12); // E5
    playTone(987.77, 'square', 0.18, now + 0.07, 0.12); // B5
}

function playHitSound() {
    if (isMuted || !audioCtx) return;
    try {
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        // Скольжение частоты вниз (взрывной эффект)
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        
        osc.connect(gainNode);
        gainNode.connect(mainGain);
        osc.start(now);
        osc.stop(now + 0.25);
        
        // Немного высокочастотного белого шума для хруста
        const noiseOsc = audioCtx.createOscillator();
        const noiseGain = audioCtx.createGain();
        noiseOsc.type = 'triangle';
        noiseOsc.frequency.setValueAtTime(80, now);
        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.linearRampToValueAtTime(0, now + 0.15);
        noiseOsc.connect(noiseGain);
        noiseGain.connect(mainGain);
        noiseOsc.start(now);
        noiseOsc.stop(now + 0.15);
    } catch(e) {}
}

function playLaneSwitchSound() {
    if (isMuted || !audioCtx) return;
    const now = audioCtx.currentTime;
    // Короткий восходящий свист
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.07);
    
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    
    osc.connect(gainNode);
    gainNode.connect(mainGain);
    osc.start(now);
    osc.stop(now + 0.07);
}

function playGameOverSound() {
    if (isMuted || !audioCtx) return;
    const now = audioCtx.currentTime;
    // Грустные нисходящие ноты
    playTone(392.00, 'square', 0.15, now, 0.15); // G4
    playTone(349.23, 'square', 0.15, now + 0.15, 0.15); // F4
    playTone(311.13, 'square', 0.15, now + 0.3, 0.15); // Eb4
    playTone(261.63, 'square', 0.5, now + 0.45, 0.15); // C4
}


// === Игровые переменные состояния ===
let score = 0;
let highScore = 0;
let speedMultiplier = 1.0;
let hype = 100; // 0 - 100

let player = {
    lane: 1, // 0 - влево, 1 - центр, 2 - вправо
    x: LANE_CENTERS[1],
    targetX: LANE_CENTERS[1],
    y: 680,
    width: 64, // Физический хитбокс
    height: 64,
    animFrame: 0,
    animTimer: 0,
    hurtTimer: 0, // Задается при коллизии, дает неуязвимость и смену спрайта
    flickerTimer: 0
};

let spawnables = [];
let particles = [];
let floatingTexts = [];

let spawnTimer = 0;
let spawnInterval = 1200; // мс

let scrollOffset = 0;
let shakeTimer = 0;
let shakeMagnitude = 0;

let statsCollected = {
    google: 0,
    openai: 0,
    anthropic: 0,
    totalUpdates: 0
};

// Загрузка рекорда из LocalStorage
if (localStorage.getItem('vibecoder_highScore')) {
    highScore = parseInt(localStorage.getItem('vibecoder_highScore'), 10);
    document.getElementById('highScoreVal').innerText = String(highScore).padStart(6, '0');
}


// === Инициализация DOM-элементов ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const hudElement = document.getElementById('hud');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const soundToggle = document.getElementById('soundToggle');
const soundIcon = document.getElementById('soundIcon');

const scoreVal = document.getElementById('scoreVal');
const highScoreVal = document.getElementById('highScoreVal');
const hypeBar = document.getElementById('hypeBar');
const speedVal = document.getElementById('speedVal');

const finalScore = document.getElementById('finalScore');
const finalHighScore = document.getElementById('finalHighScore');
const newRecordLabel = document.getElementById('newRecordLabel');
const statsUpdates = document.getElementById('statsUpdates');
const statsCompany = document.getElementById('statsCompany');


// === Обработка Ввода (Controls) ===

// Клавиатура
window.addEventListener('keydown', (e) => {
    if (gameState !== STATES.PLAYING) return;
    
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        movePlayerLeft();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        movePlayerRight();
    }
});

// Клик по дорожкам на холсте
canvas.addEventListener('mousedown', handleScreenInteraction);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Предотвращаем зум
    if (e.touches.length > 0) {
        handleScreenInteraction(e.touches[0]);
    }
});

function handleScreenInteraction(e) {
    if (gameState !== STATES.PLAYING) return;
    
    // Получаем относительные координаты клика на холсте
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    
    // Определяем дорожку
    if (clickX < LANE_WIDTH) {
        changePlayerLane(0);
    } else if (clickX < LANE_WIDTH * 2) {
        changePlayerLane(1);
    } else {
        changePlayerLane(2);
    }
}

function movePlayerLeft() {
    if (player.lane > 0) {
        changePlayerLane(player.lane - 1);
    }
}

function movePlayerRight() {
    if (player.lane < LANE_COUNT - 1) {
        changePlayerLane(player.lane + 1);
    }
}

function changePlayerLane(newLane) {
    if (player.lane !== newLane) {
        player.lane = newLane;
        player.targetX = LANE_CENTERS[newLane];
        playLaneSwitchSound();
    }
}


// === Кнопки Старт, Перезапуск и Звук ===

startButton.addEventListener('click', () => {
    initAudio();
    startGame();
});

restartButton.addEventListener('click', () => {
    startGame();
});

soundToggle.addEventListener('click', () => {
    isMuted = !isMuted;
    soundIcon.innerText = isMuted ? '🔇' : '🔊';
    
    if (mainGain) {
        mainGain.gain.setValueAtTime(isMuted ? 0 : 0.2, audioCtx.currentTime);
    }
});


// === Игровые Функции ===

function startGame() {
    score = 0;
    hype = 100;
    speedMultiplier = 1.0;
    player.lane = 1;
    player.x = LANE_CENTERS[1];
    player.targetX = LANE_CENTERS[1];
    player.hurtTimer = 0;
    
    spawnables = [];
    particles = [];
    floatingTexts = [];
    
    spawnTimer = 0;
    spawnInterval = 1200;
    
    statsCollected = {
        google: 0,
        openai: 0,
        anthropic: 0,
        totalUpdates: 0
    };
    
    // Обновление HUD
    scoreVal.innerText = '000000';
    speedVal.innerText = '1.0x';
    updateHypeBarUI();
    
    // Смена экранов
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    hudElement.classList.remove('hidden');
    
    gameState = STATES.PLAYING;
    
    // Убедимся, что аудио разблокировано и играет
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function triggerGameOver() {
    gameState = STATES.GAMEOVER;
    
    playGameOverSound();
    
    // Сохранение рекорда
    let isNewRecord = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('vibecoder_highScore', highScore);
        highScoreVal.innerText = String(highScore).padStart(6, '0');
        isNewRecord = true;
    }
    
    // Вывод статистики
    finalScore.innerText = score;
    finalHighScore.innerText = highScore;
    
    if (isNewRecord) {
        newRecordLabel.classList.remove('hidden');
    } else {
        newRecordLabel.classList.add('hidden');
    }
    
    statsUpdates.innerText = `Обновлений собрано: ${statsCollected.totalUpdates}`;
    
    // Находим любимую компанию
    let favorite = 'Google';
    let maxCount = statsCollected.google;
    if (statsCollected.openai > maxCount) {
        favorite = 'OpenAI';
        maxCount = statsCollected.openai;
    }
    if (statsCollected.anthropic > maxCount) {
        favorite = 'Anthropic';
        maxCount = statsCollected.anthropic;
    }
    
    if (statsCollected.totalUpdates === 0) {
        statsCompany.innerText = `Любимая компания: Лентяй (обновлений нет)`;
    } else {
        statsCompany.innerText = `Любимая компания: ${favorite}`;
    }
    
    hudElement.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}


// === Вспомогательные классы сущностей ===

class Spawnable {
    constructor() {
        this.lane = Math.floor(Math.random() * LANE_COUNT);
        this.x = LANE_CENTERS[this.lane];
        this.y = -60; // Спавнимся за границей экрана
        this.width = 48;
        this.height = 48;
        
        // 60% шанс - обновление, 40% - препятствие
        this.isUpdate = Math.random() < 0.6;
        
        if (this.isUpdate) {
            // Бренд соответствует дорожке
            const brands = ['google', 'openai', 'anthropic'];
            this.brand = brands[this.lane];
            const brandDetails = BRAND_INFO[this.brand];
            
            this.color = brandDetails.color;
            this.sprite = brandDetails.logoSprite;
            
            // Выбираем случайную модель этого бренда
            const releasePool = brandDetails.updates;
            this.label = releasePool[Math.floor(Math.random() * releasePool.length)];
        } else {
            // Выбираем препятствие
            const obstacleDetails = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
            this.type = obstacleDetails.type;
            this.sprite = obstacleDetails.sprite;
            this.label = obstacleDetails.label;
            this.color = '#ff0055'; // красный/розовый для препятствий
        }
    }
    
    update(dt, speed) {
        this.y += speed * dt;
    }
    
    draw() {
        if (this.isUpdate) {
            // Отрисовка светящейся капсулы обновления
            const radius = 16;
            drawUpdateBubble(ctx, this.x, this.y, radius, this.color, this.label);
            // Поверх рисуем логотип бренда (загруженное изображение PNG)
507:             const img = LOGO_IMAGES[this.brand];
508:             if (img && img.complete && img.naturalWidth !== 0) {
509:                 // Логотип должен помещаться внутри капсулы обновления
510:                 // Размер капсулы (radius=16) -> 32x32. Рисуем логотип 24x24
511:                 ctx.drawImage(img, this.x - 12, this.y - 12, 24, 24);
512:             } else {
513:                 // Фолбэк на оригинальный спрайт
514:                 drawPixelSprite(ctx, this.sprite, this.x - 12, this.y - 12, 1.5);
515:             }
        } else {
            // Отрисовка препятствия (размер спрайта 16x16. При pixelSize=3 размер будет 48x48)
            drawPixelSprite(ctx, this.sprite, this.x - 24, this.y - 24, 3);
            
            // Текст над препятствием
            ctx.fillStyle = '#ff0055';
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.fillText(this.label, this.x, this.y - 30);
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        // Случайный вектор движения
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = 2 + Math.floor(Math.random() * 4); // 2-5px
        this.life = 20 + Math.random() * 20; // Кадры жизни
        this.maxLife = this.life;
    }
    
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= dt;
    }
    
    draw() {
        ctx.save();
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.restore();
    }
}

class FloatingText {
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 50; // Кадры жизни
        this.vy = -1.2;
    }
    
    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
    }
    
    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.max(0, this.life / 50);
        
        // Ретро-обводка букв черным цветом
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        
        ctx.restore();
    }
}


// === Спавн частиц ===
function spawnCollectionParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function spawnHitParticles(x, y) {
    // Взрыв красных и дымно-серых частиц
    for (let i = 0; i < 12; i++) {
        particles.push(new Particle(x, y, '#ff0055'));
    }
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, '#7f7f7f'));
    }
}


// === Обновление шкалы хайпа ===
function updateHypeBarUI() {
    hypeBar.style.width = `${hype}%`;
    
    // Убираем старые классы цвета
    hypeBar.classList.remove('hype-high', 'hype-medium', 'hype-low');
    
    if (hype > 50) {
        hypeBar.classList.add('hype-high');
    } else if (hype > 20) {
        hypeBar.classList.add('hype-medium');
    } else {
        hypeBar.classList.add('hype-low');
    }
}

// === Эффект тряски экрана ===
function triggerScreenShake(duration, magnitude) {
    shakeTimer = duration;
    shakeMagnitude = magnitude;
}


// === Основной игровой цикл ===
let lastTime = 0;

function gameLoop(time) {
    // Вычисляем dt (delta time)
    if (!lastTime) lastTime = time;
    let dt = (time - lastTime) / 16.666; // Масштабируем относительно 60 кадров/сек (1 кадр ≈ 16.6мс)
    if (dt > 4) dt = 4; // Предотвращаем гигантские скачки при сворачивании вкладки
    lastTime = time;
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.save();
    
    // Эффект Тряски экрана
    if (shakeTimer > 0) {
        const dx = (Math.random() * 2 - 1) * shakeMagnitude;
        const dy = (Math.random() * 2 - 1) * shakeMagnitude;
        ctx.translate(dx, dy);
        shakeTimer -= dt;
    }
    
    // Отрисовка бэкграунда и логика
    if (gameState === STATES.PLAYING) {
        updateGameLogic(dt);
    }
    
    drawBackground();
    
    if (gameState === STATES.PLAYING || gameState === STATES.GAMEOVER) {
        // Рисуем падающие объекты
        spawnables.forEach(s => s.draw());
        
        // Рисуем частицы
        particles.forEach(p => p.draw());
        
        // Рисуем парящий текст
        floatingTexts.forEach(t => t.draw());
        
        // Рисуем персонажа
        drawPlayer();
    }
    
    ctx.restore();
    
    requestAnimationFrame(gameLoop);
}

function updateGameLogic(dt) {
    // 1. Постепенное падение хайпа
    // Базовая скорость падения: ~6% в секунду на скорости 1.0x
    const hypeDrain = 0.08 * speedMultiplier * dt;
    hype = Math.max(0, hype - hypeDrain);
    updateHypeBarUI();
    
    if (hype <= 0) {
        triggerGameOver();
        return;
    }
    
    // 2. Движение Вайбкодера к своей дорожке
    player.x += (player.targetX - player.x) * 0.2 * dt;
    
    // Анимация Вайбкодера (бег)
    player.animTimer += dt;
    if (player.animTimer > 8) {
        player.animFrame = (player.animFrame + 1) % 2;
        player.animTimer = 0;
    }
    
    // Управление неуязвимостью после удара
    if (player.hurtTimer > 0) {
        player.hurtTimer -= dt;
        player.flickerTimer += dt;
    }
    
    // 3. Прокрутка фоновой разметки дорожек
    const scrollSpeed = 6 * speedMultiplier;
    scrollOffset = (scrollOffset + scrollSpeed * dt) % 40;
    
    // 4. Логика спавна объектов
    spawnTimer += 16.666 * dt; // Приближаем мс
    const adjustedSpawnInterval = Math.max(500, spawnInterval - (speedMultiplier - 1.0) * 400);
    
    if (spawnTimer >= adjustedSpawnInterval) {
        spawnables.push(new Spawnable());
        spawnTimer = 0;
    }
    
    // 5. Движение и удаление объектов
    for (let i = spawnables.length - 1; i >= 0; i--) {
        const item = spawnables[i];
        item.update(dt, scrollSpeed);
        
        // Проверка столкновения
        // Игрок находится на высоте player.y = 680 (спрайт 16x4=64px, рисуется от player.y - 32)
        // Объекты падают сверху. Размеры хитбокса игрока ~ 50px
        const playerCenterX = player.x;
        const playerCenterY = player.y - 32; // Смещение центра спрайта
        
        const distY = Math.abs(item.y - playerCenterY);
        const distX = Math.abs(item.x - playerCenterX);
        
        if (distX < 45 && distY < 45) {
            handleCollision(item);
            spawnables.splice(i, 1);
            continue;
        }
        
        // Удаление вылетевших за экран
        if (item.y > CANVAS_HEIGHT + 50) {
            spawnables.splice(i, 1);
        }
    }
    
    // 6. Обновление частиц
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt);
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // 7. Обновление всплывающего текста
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const t = floatingTexts[i];
        t.update(dt);
        if (t.life <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
    
    // 8. Увеличение скорости игры в зависимости от очков
    // Каждые 600 очков увеличивают множитель скорости на 0.08x
    const targetSpeedMult = 1.0 + Math.floor(score / 600) * 0.08;
    if (speedMultiplier < targetSpeedMult) {
        speedMultiplier = Math.min(2.5, targetSpeedMult);
        speedVal.innerText = `${speedMultiplier.toFixed(1)}x`;
        
        // Создаем всплывающий текст "СКОРОСТЬ UP!"
        floatingTexts.push(new FloatingText("СКОРОСТЬ UP!", CANVAS_WIDTH/2, CANVAS_HEIGHT/2 - 100, '#00f0ff'));
    }
}

function handleCollision(item) {
    if (item.isUpdate) {
        // Успешный сбор обновления!
        playCollectSound();
        
        const brandDetails = BRAND_INFO[item.brand];
        
        // Очки и хайп
        const hypeBonus = 20;
        const scoreBonus = 100;
        
        hype = Math.min(100, hype + hypeBonus);
        score += scoreBonus;
        scoreVal.innerText = String(score).padStart(6, '0');
        updateHypeBarUI();
        
        // Эффекты
        spawnCollectionParticles(item.x, item.y, item.color);
        floatingTexts.push(new FloatingText(`+${scoreBonus}`, item.x, item.y - 20, '#fffb00'));
        floatingTexts.push(new FloatingText(`+${hypeBonus}% ХАЙП`, item.x, item.y - 35, brandDetails.color));
        
        // Сбор статистики
        statsCollected[item.brand]++;
        statsCollected.totalUpdates++;
        
    } else {
        // Столкновение с багом/препятствием!
        if (player.hurtTimer > 0) return; // У игрока фреймы неуязвимости
        
        playHitSound();
        triggerScreenShake(20, 8); // Тряска 20 кадров с амплитудой 8
        
        // Минус хайп
        const hypePenalty = 25;
        hype = Math.max(0, hype - hypePenalty);
        updateHypeBarUI();
        
        // Игрок получает "шок"
        player.hurtTimer = 90; // 1.5 секунды неуязвимости
        player.flickerTimer = 0;
        
        // Эффекты
        spawnHitParticles(item.x, item.y);
        floatingTexts.push(new FloatingText(`-${hypePenalty}% ХАЙП`, player.x, player.y - 80, '#ff0055'));
        floatingTexts.push(new FloatingText(`CRASH!`, player.x, player.y - 65, '#ffffff'));
    }
}


// === Отрисовка бэкграунда и сетки дорожек ===
function drawBackground() {
    // Рисуем границы дорожек и логотипы компаний
    for (let i = 0; i < LANE_COUNT; i++) {
        const startX = i * LANE_WIDTH;
        const endX = startX + LANE_WIDTH;
        
        // Берем настройки бренда для дорожки
        // 0 -> google, 1 -> openai, 2 -> anthropic
        const brands = ['google', 'openai', 'anthropic'];
        const brandKey = brands[i];
        const brand = BRAND_INFO[brandKey];
        
        // Отрисовка фона дорожки (слегка подсвеченного цветом бренда)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(startX, 0, LANE_WIDTH, CANVAS_HEIGHT);
        
        // Отрисовка логотипа бренда на заднем плане (вверху дорожки)
839:         ctx.save();
840:         ctx.globalAlpha = 0.15; // Полупрозрачные бренды на бэкграунде
841:         const logoSize = 120; // Увеличим размер для фонового логотипа
842:         const logoX = LANE_CENTERS[i] - logoSize / 2;
843:         const logoY = 100;
844:         
845:         const img = LOGO_IMAGES[brandKey];
846:         if (img && img.complete && img.naturalWidth !== 0) {
847:             ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
848:         } else {
849:             // Фолбэк на оригинальный спрайт
850:             drawPixelSprite(ctx, brand.logoSprite, logoX + (logoSize - 96)/2, logoY + (logoSize - 96)/2, 6);
851:         }
        
        // Название бренда
        ctx.fillStyle = '#ffffff';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText(brand.name, LANE_CENTERS[i], 240);
        ctx.restore();
        
        // Границы дорожек
        ctx.save();
        ctx.shadowColor = brand.color;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = brand.color;
        ctx.lineWidth = 4;
        
        // Рисуем левую и правую разметку для каждой полосы
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, CANVAS_HEIGHT);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, CANVAS_HEIGHT);
        ctx.stroke();
        
        ctx.restore();
        
        // Добавляем ретро-эффект летящих пиксельных полосок (разделителей) внутри полосы
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let y = scrollOffset - 40; y < CANVAS_HEIGHT; y += 80) {
            if (y > 0) {
                // Поперечные линии для эффекта перспективы/скорости
                ctx.fillRect(startX + 10, y, LANE_WIDTH - 20, 2);
            }
        }
    }
}

// === Отрисовка Вайбкодера ===
function drawPlayer() {
    let spriteName = 'vibecoderRun1';
    
    if (player.hurtTimer > 0) {
        spriteName = 'vibecoderHurt';
        // Эффект мерцания при получении урона
        if (Math.floor(player.flickerTimer / 4) % 2 === 0) {
            return; // Пропускаем отрисовку этого кадра
        }
    } else {
        spriteName = player.animFrame === 0 ? 'vibecoderRun1' : 'vibecoderRun2';
    }
    
    // Спрайт Вайбкодера имеет разрешение 16x16
    // Отрисуем его размером 4x пикселя на холсте => итоговый размер 64x64px
    const pixelScale = 4;
    const spriteSize = 16 * pixelScale; // 64
    
    const drawX = player.x - spriteSize / 2;
    const drawY = player.y - spriteSize; // Рисуем вверх от базовой Y координаты
    
    drawPixelSprite(ctx, spriteName, drawX, drawY, pixelScale);
}


// === Запуск цикла ===
// Делаем первый запуск, игра будет ждать на стартовом экране
requestAnimationFrame(gameLoop);
