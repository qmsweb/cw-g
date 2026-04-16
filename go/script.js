const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');

// ضبط أبعاد اللعبة لتملأ الشاشة
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- إعداد الصور (PNGs) ---
// ضع صورك في مجلد المشروع وقم بتحديث المسارات هنا
const images = {
    playerClosed: new Image(),
    playerOpen: new Image(),
    goodFood: new Image(),
    badFood: new Image()
};

// مسارات الصور (قم بتغييرها بأسماء صورك الحقيقية)
images.playerClosed.src = 'player_closed.png'; // صورة الشخصية فمها مغلق
images.playerOpen.src = 'player_open.png';     // صورة الشخصية فمها مفتوح
images.goodFood.src = 'good_food.png';         // صورة طعام صالح للأكل
images.badFood.src = 'bad_food.png';           // صورة طعام سيء (يخسّر اللاعب)

// --- متغيرات اللعبة ---
let score = 0;
let gameActive = true;
let fallingItems = [];

// خصائص اللاعب (الشخصية)
const player = {
    width: 100,
    height: 100,
    x: canvas.width / 2 - 50,
    y: canvas.height - 120, // موقعه في أسفل الشاشة
    isMouthOpen: false
};

// --- التحكم في الشخصية (السحب بالماوس أو اللمس) ---
let isDragging = false;

function movePlayer(clientX) {
    if (isDragging && gameActive) {
        // جعل منتصف الشخصية يتبع إصبع/مؤشر اللاعب
        player.x = clientX - (player.width / 2);
        
        // منع الشخصية من الخروج من حدود الشاشة
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    }
}

// أحداث الماوس
canvas.addEventListener('mousedown', (e) => { isDragging = true; movePlayer(e.clientX); });
canvas.addEventListener('mousemove', (e) => movePlayer(e.clientX));
canvas.addEventListener('mouseup', () => isDragging = false);

// أحداث اللمس (للهواتف)
canvas.addEventListener('touchstart', (e) => { isDragging = true; movePlayer(e.touches[0].clientX); });
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // منع تمرير الشاشة
    movePlayer(e.touches[0].clientX);
});
canvas.addEventListener('touchend', () => isDragging = false);


// --- وظائف اللعبة الأساسية ---

// إنشاء عناصر متساقطة جديدة
function spawnItem() {
    if (!gameActive) return;
    
    // نسبة 20% أن يكون العنصر سيئاً، و 80% طعام جيد
    const isBad = Math.random() < 0.2; 
    const size = 50;
    
    fallingItems.push({
        x: Math.random() * (canvas.width - size),
        y: -size, // يبدأ من خارج الشاشة بالأعلى
        width: size,
        height: size,
        speed: 3 + Math.random() * 3, // سرعة عشوائية
        type: isBad ? 'bad' : 'good'
    });
    
    // استدعاء الوظيفة مرة أخرى بعد وقت عشوائي (بين نصف ثانية وثانية ونصف)
    setTimeout(spawnItem, 500 + Math.random() * 1000);
}

// تحديث منطق اللعبة ورسم الإطارات
function update() {
    if (!gameActive) return;

    // مسح الشاشة للرسم الجديد
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.isMouthOpen = false; // افتراضياً الفم مغلق

    // تحديث ورسم العناصر المتساقطة
    for (let i = 0; i < fallingItems.length; i++) {
        let item = fallingItems[i];
        item.y += item.speed; // تحريك العنصر للأسفل

        // التحقق مما إذا كان العنصر قريباً جداً من اللاعب (لفتح الفم)
        // إذا كان العنصر طعاماً جيداً ويقع فوق اللاعب مباشرة بمسافة قريبة
        if (item.type === 'good' && 
            item.y + item.height > player.y - 80 && 
            item.y < player.y + player.height &&
            item.x + item.width > player.x && 
            item.x < player.x + player.width) {
            player.isMouthOpen = true;
        }

        // الكشف عن التصادم (أكل العنصر)
        if (item.y + item.height > player.y && 
            item.y < player.y + player.height &&
            item.x + item.width > player.x && 
            item.x < player.x + player.width) {
            
            if (item.type === 'good') {
                score++;
                scoreElement.innerText = score;
                fallingItems.splice(i, 1); // إزالة العنصر بعد أكله
                i--;
            } else {
                // أكل طعام سيء = خسارة
                gameOver();
            }
            continue; // الانتقال للعنصر التالي لتجنب الأخطاء
        }

        // إزالة العناصر التي تجاوزت أسفل الشاشة
        if (item.y > canvas.height) {
            fallingItems.splice(i, 1);
            i--;
            continue;
        }

        // رسم العنصر المتساقط (الاعتماد على الصورة، وإلا رسم مربع مؤقت)
        let imgToDraw = item.type === 'good' ? images.goodFood : images.badFood;
        if (imgToDraw.complete && imgToDraw.naturalHeight !== 0) {
            ctx.drawImage(imgToDraw, item.x, item.y, item.width, item.height);
        } else {
            ctx.fillStyle = item.type === 'good' ? 'green' : 'red';
            ctx.fillRect(item.x, item.y, item.width, item.height);
        }
    }

    // رسم اللاعب بناءً على حالة الفم
    let playerImg = player.isMouthOpen ? images.playerOpen : images.playerClosed;
    
    // إذا تم تحميل الصورة بنجاح ارسمها، وإلا ارسم مربعاً رمادياً مؤقتاً لتتمكن من تجربة الكود
    if (playerImg.complete && playerImg.naturalHeight !== 0) {
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = 'gray';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // استدعاء الإطار التالي
    requestAnimationFrame(update);
}

// إنهاء اللعبة
function gameOver() {
    gameActive = false;
    gameOverScreen.classList.remove('hidden');
}

// إعادة ضبط اللعبة
window.resetGame = function() {
    score = 0;
    scoreElement.innerText = score;
    fallingItems = [];
    gameActive = true;
    gameOverScreen.classList.add('hidden');
    player.x = canvas.width / 2 - 50;
    
    spawnItem();
    update();
}

// التعامل مع تغيير حجم نافذة المتصفح
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.y = canvas.height - 120;
});

// بدء اللعبة
spawnItem();
update();
