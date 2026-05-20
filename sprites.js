/**
 * sprites.js
 * Библиотека спрайтов на чистом JS для отрисовки 8-битного пиксель-арта на Canvas.
 */

const COLOR_MAP = {
    '.': null, // Прозрачный
    'k': '#0d0d13', // Черный (контур)
    'w': '#ffffff', // Белый
    'g': '#39ff14', // Неоновый зеленый
    'p': '#ff0055', // Неоновый розовый
    'b': '#00f0ff', // Неоновый голубой
    'y': '#fffb00', // Неоновый желтый
    'd': '#4b5563', // Серый темный
    'l': '#9ca3af', // Серый светлый
    's': '#f97316', // Оранжевый (Anthropic)
    'f': '#ffdbb5', // Телесный цвет кожи Вайба кодера
    'h': '#6b21a8', // Фиолетовый (худи Вайба кодера)
    'j': '#9333ea', // Светло-фиолетовый (худи блик)
    'r': '#ef4444', // Красный
};

// 1. Вайба кодер (В худи, очках-визоре и с наушниками) - Бег Кадр 1
const SPRITE_VYPECODER_RUN1 = [
    "....kkkkkkkk....",
    "...kjjjjhhhhkk..",
    "..kjffffffffhhk.",
    ".kjffkkffkkffhhk",
    ".kffppppppppffhk",
    ".kffppppppppffhk",
    ".kfffkkffkkfffhk",
    "..kfffffffffhkk.",
    "..kkkhhhhhhhk...",
    "...khhhhhhhk....",
    "..khhhhhhhhhk...",
    ".khkkhhhhhkkhk..",
    "kk.khhhhhhhk.kk.",
    "...kdd..kdd.....",
    "..kww.k.kww.k...",
    "..kk..k..kk..k.."
];

// Вайба кодер - Бег Кадр 2 (ноги и руки в другой фазе)
const SPRITE_VYPECODER_RUN2 = [
    "....kkkkkkkk....",
    "...kjjjjhhhhkk..",
    "..kjffffffffhhk.",
    ".kjffkkffkkffhhk",
    ".kffppppppppffhk",
    ".kffppppppppffhk",
    ".kfffkkffkkfffhk",
    "..kfffffffffhkk.",
    "..kkkhhhhhhhk...",
    "...khhhhhhhk....",
    "..khhhhhhhhhk...",
    ".kkhhhhhhhhkhk..",
    "k.khhhhhhhkk.kk.",
    "...kdd...kdd....",
    "...kww.k.kww.k..",
    "....kk.k.kk..k.."
];

// Вайба кодер - Кадр Столкновения (боль, шок, очки косятся)
const SPRITE_VYPECODER_HURT = [
    "....kkkkkkkk....",
    "...krrrrrrrrkk..",
    "..krffffffffrrk.",
    ".krffrrffrrffrrk",
    ".kffppwppwppffrk",
    ".kffppppppppffrk",
    ".kfffrrffrrfffrk",
    "..kfffffffffhkk.",
    "..kkkhhhhhhhk...",
    "...khhhhhhhk....",
    "..khhkkkkkkhk...",
    ".khkkhkkkkhkkhk.",
    "kk.khkkkkkkh.kk.",
    "....kdd..kdd....",
    "....krr..krr....",
    "....kk...kk....."
];

// 2. Препятствия (Obstacles)
// Препятствие: Жук (Баг)
const SPRITE_BUG = [
    "................",
    "....k......k....",
    ".....k....k.....",
    "......kkkk......",
    "....kkkkkkkk....",
    "...k.krrkkrrk...",
    "..k.kkkkkkkkkk..",
    "..kkkkkkkkkkk...",
    ".k.kkkkkkkkkk.k.",
    ".k.k.kkkkkk.k.k.",
    "k..k.k.kk.k.k..k",
    "....k..kk..k....",
    ".......kk.......",
    "......k..k......",
    ".....k....k.....",
    "................"
];

// Препятствие: Знак Лимита запросов (Rate Limit) - Песочные часы в красной рамке
const SPRITE_RATE_LIMIT = [
    "....kkkkkkkk....",
    "...krrrrrrrrk...",
    "..krrwkkkkwrrk..",
    ".krrwwkkkkwwrrk.",
    ".krrwyykkyywrrk.",
    ".krrwwykywyywrrk",
    "..krrwwkwwrrk...",
    "...krrrkkrrrk...",
    "...krrrkkrrrk...",
    "..krrwwkwwrrk...",
    ".krrwyykkyywrrk.",
    ".krrwyyyyyywrrk.",
    ".krrwwwwwwwwrrk.",
    "..krrwkkkkwrrk..",
    "...krrrrrrrrk...",
    "....kkkkkkkk...."
];

// Препятствие: Падение API (API Outage) - Вилка розетки с искрами
const SPRITE_OUTAGE = [
    "................",
    "....kk....kk....",
    "....kk....kk....",
    "....kk....kk....",
    "....kkkkkkkk....",
    "....kkddddkk....",
    ".....kddddk.....",
    ".....kddddk.rr..",
    ".....kddddk..rr.",
    "......kkkk.rr...",
    "......kkkk......",
    "......kkkk......",
    "......kkkk......",
    "......kkkk......",
    "......kkkk......",
    "......kkkk......"
];

// Препятствие: Счет за подписку (Billing Stack)
const SPRITE_BILL = [
    "....kkkkkkkkkk..",
    "...kwwwwwwwwwk..",
    "..kwwwwwwwwwwk..",
    ".kkkkkkkkkkkkk..",
    ".kwwwwwwwwwwk...",
    ".kwyrrryyyywk...",
    ".kwyyrrryyywk...",
    ".kwyyyrrryywk...",
    ".kwyyyyryyywk...",
    ".kwwwwwwwwwwk...",
    ".kkkkkkkkkkkk...",
    "..kwwwwwwwwk....",
    "..kwwwwwwwwk....",
    "..kwwwwwwwwk....",
    "..kkkkkkkkkk...."
];

// 3. Бренды / Дорожки (Размер поменьше, 12x12 или 16x16 для логотипов)
// Логотип Google (Пиксельная буква G)
const SPRITE_LOGO_GOOGLE = [
    "....kkkkkkkk....",
    "...kbbbbbbbbk...",
    "..kbbkkkkkkkkk..",
    ".kbbbk..kgggggk.",
    ".kbbk...kgggggk.",
    "kbbk....kggkkkkk",
    "kbbk....kggk.kggk",
    "kbbk....kggk.kggk",
    "kbbk....kkkk.kggk",
    "kbbk.........kggk",
    ".kbbk.......kggk.",
    ".kbbbk.....kggk.",
    "..kbbbbkkkkggk..",
    "...kbbbbggggk...",
    "....kkkkkkkk...."
];

// Логотип GPT (Пиксельная спираль)
const SPRITE_LOGO_GPT = [
    "....kkkkkkkk....",
    "...kggggggggk...",
    "..kggkkkkkkggk..",
    ".kggk.kggk.kggk.",
    ".kggk.kggk.kggk.",
    "kggk.kggkk.kggk.",
    "kggk.kggkk.kggk.",
    "kggk.kkkk..kggk.",
    "kggk.......kggk.",
    "kggkk.....kkggk.",
    ".kggkkkkkkkggk..",
    "..kgggggggggk...",
    "...kkkkkkkkk....",
    "................"
];

// Логотип Anthropic (Пиксельная стилизованная буква A)
const SPRITE_LOGO_ANTHROPIC = [
    "....kkkkkkkk....",
    "...kssssssssk...",
    "..ksskkkkkkssk..",
    ".kssk......kssk.",
    ".kssk......kssk.",
    "kssk........kssk",
    "kssk........kssk",
    "ksskkkkkkkkkkssk",
    "kssssssssssssssk",
    "kssk........kssk",
    "kssk........kssk",
    "kssk........kssk",
    ".kkk........kkk.",
    "................"
];

const ALL_SPRITES = {
    vibecoderRun1: SPRITE_VYPECODER_RUN1,
    vibecoderRun2: SPRITE_VYPECODER_RUN2,
    vibecoderHurt: SPRITE_VYPECODER_HURT,
    bug: SPRITE_BUG,
    rateLimit: SPRITE_RATE_LIMIT,
    outage: SPRITE_OUTAGE,
    bill: SPRITE_BILL,
    logoGoogle: SPRITE_LOGO_GOOGLE,
    logoGpt: SPRITE_LOGO_GPT,
    logoAnthropic: SPRITE_LOGO_ANTHROPIC
};

/**
 * Отрисовка спрайта на холсте
 * @param {CanvasRenderingContext2D} ctx - Контекст Canvas
 * @param {string} spriteName - Имя спрайта из ALL_SPRITES
 * @param {number} x - Координата X (левый верхний угол)
 * @param {number} y - Координата Y (левый верхний угол)
 * @param {number} pixelSize - Физический размер одного пикселя спрайта на холсте
 * @param {boolean} flipX - Отразить ли спрайт по горизонтали
 * @param {string} [customColor] - Опционально заменить цвет деталей спрайта (например, для бренда)
 */
function drawPixelSprite(ctx, spriteName, x, y, pixelSize = 3, flipX = false, customColor = null) {
    const spriteGrid = ALL_SPRITES[spriteName];
    if (!spriteGrid) return;
    
    const height = spriteGrid.length;
    const width = spriteGrid[0].length;
    
    ctx.save();
    
    // Переносим начало координат для отрисовки
    ctx.translate(x, y);
    
    if (flipX) {
        ctx.scale(-1, 1);
        ctx.translate(-width * pixelSize, 0);
    }
    
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const char = spriteGrid[row][col];
            let color = COLOR_MAP[char];
            
            if (color) {
                // Если задан кастомный цвет и этот пиксель - брендовый (синий 'b' / зеленый 'g' / оранжевый 's')
                if (customColor && (char === 'b' || char === 'g' || char === 's')) {
                    color = customColor;
                }
                
                ctx.fillStyle = color;
                // Рисуем пиксель в виде маленького квадрата
                ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    
    ctx.restore();
}

/**
 * Отрисовка светящейся капсулы обновления
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x - центр X
 * @param {number} y - центр Y
 * @param {number} radius - радиус круга
 * @param {string} color - цвет свечения
 * @param {string} text - текст релиза (например, "Gemini 2.0")
 */
function drawUpdateBubble(ctx, x, y, radius, color, text) {
    ctx.save();
    
    // Свечение (shadow blur)
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    
    // Внутренний круг
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Внешняя пиксельная кайма (имитация 8-битного свечения)
    ctx.shadowBlur = 0; // отключаем размытие для рисования каемки
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    
    // Название релиза модели
    ctx.fillStyle = '#ffffff';
    ctx.font = '6px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Текст под капсулой или на ней
    ctx.fillText(text, x, y - radius - 10);
    
    ctx.restore();
}
