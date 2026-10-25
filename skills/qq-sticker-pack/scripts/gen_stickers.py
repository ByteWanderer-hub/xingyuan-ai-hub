# -*- coding: utf-8 -*-
"""生成一套「大肥鱼」QQ 表情包（蓝色鲸鱼娘 Q 版），输出 300x300 透明 PNG。"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = r"D:\qqbot\stickers"
os.makedirs(OUT, exist_ok=True)

W = H = 300
FONT_B = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_R = r"C:\Windows\Fonts\msyh.ttc"

BLUE = (96, 186, 234, 255)
BLUE_D = (58, 152, 208, 255)
BELLY = (206, 234, 250, 255)
WHITE = (255, 255, 255, 255)
INK = (36, 47, 58, 255)
PINK = (255, 159, 176, 255)
YELLOW = (255, 214, 92, 255)

CAPS = {
    "idle": "\u5728\u7684",        # 在的
    "speechless": "\u65e0\u8bed",  # 无语
    "fish": "\u6478\u9c7c",        # 摸鱼
    "eat": "\u5403\uff01",         # 吃！
    "angry": "\u54fc\u54fc",       # 哼哼
    "yay": "\u597d\u8036",         # 好耶
    "what": "\uff1f\uff1f",        # ？？
    "gulu": "\u5495\u565c",        # 咕噜
}


def font(size, bold=True):
    path = FONT_B if bold else FONT_R
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def whale(d, body_shift=(0, 0)):
    """画鲸鱼本体：圆胖身体 + 肚皮 + 尾巴 + 鳍。"""
    ox, oy = body_shift
    # 尾巴
    d.polygon([(232 + ox, 182 + oy), (276 + ox, 150 + oy), (262 + ox, 196 + oy), (280 + ox, 224 + oy), (230 + ox, 214 + oy)], fill=BLUE_D)
    # 身体
    d.ellipse([46 + ox, 104 + oy, 246 + ox, 268 + oy], fill=BLUE)
    # 肚皮
    d.ellipse([78 + ox, 176 + oy, 214 + ox, 258 + oy], fill=BELLY)
    # 背上小鳍
    d.polygon([(120 + ox, 108 + oy), (150 + ox, 74 + oy), (176 + ox, 110 + oy)], fill=BLUE_D)
    # 侧鳍
    d.ellipse([70 + ox, 196 + oy, 112 + ox, 226 + oy], fill=BLUE_D)


def spout(d, x=150, y=96, scale=1.0, color=BELLY):
    """水花/泡泡。"""
    r = 7 * scale
    for dx, dy in ((-14, 0), (0, -12), (14, 0), (-6, -22), (8, -24)):
        d.ellipse([x + dx * scale - r, y + dy * scale - r, x + dx * scale + r, y + dy * scale + r], fill=color)


def eyes_normal(d, ox=0, oy=0):
    for cx in (116 + ox, 186 + ox):
        d.ellipse([cx - 11, 158 + oy, cx + 11, 186 + oy], fill=WHITE)
        d.ellipse([cx - 7, 164 + oy, cx + 7, 180 + oy], fill=INK)
        d.ellipse([cx - 3, 166 + oy, cx + 1, 171 + oy], fill=WHITE)


def eyes_closed(d, ox=0, oy=0, grin=True):
    for cx in (116 + ox, 186 + ox):
        d.arc([cx - 13, 164 + oy, cx + 13, 184 + oy], start=200, end=340, fill=INK, width=4)


def eyes_angry(d, ox=0, oy=0):
    for cx, sgn in ((116 + ox, 1), (186 + ox, -1)):
        d.line([cx - 12 * sgn, 156 + oy, cx + 12 * sgn, 168 + oy], fill=INK, width=5)
        d.ellipse([cx - 7, 172 + oy, cx + 7, 186 + oy], fill=INK)


def blush(d, ox=0, oy=0):
    d.ellipse([92 + ox, 186 + oy, 120 + ox, 202 + oy], fill=(255, 170, 185, 160))
    d.ellipse([182 + ox, 186 + oy, 210 + ox, 202 + oy], fill=(255, 170, 185, 160))


def mouth_smile(d, ox=0, oy=0, big=False):
    if big:
        d.arc([132 + ox, 196 + oy, 172 + ox, 224 + oy], start=0, end=180, fill=INK, width=4)
    else:
        d.arc([138 + ox, 200 + oy, 166 + ox, 216 + oy], start=10, end=170, fill=INK, width=4)


def mouth_flat(d, ox=0, oy=0):
    d.line([142 + ox, 206 + oy, 162 + ox, 206 + oy], fill=INK, width=4)


def mouth_o(d, ox=0, oy=0):
    d.ellipse([142 + ox, 200 + oy, 162 + oy + 22, 222 + oy], fill=INK)


def caption(img, text, y=258):
    d = ImageDraw.Draw(img)
    f = font(28)
    bbox = d.textbbox((0, 0), text, font=f)
    x = (W - (bbox[2] - bbox[0])) // 2 - bbox[0]
    # 描边
    for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        d.text((x + dx, y + dy), text, font=f, fill=WHITE)
    d.text((x, y), text, font=f, fill=INK)


def new_canvas():
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def make(kind):
    img = new_canvas()
    d = ImageDraw.Draw(img)

    if kind == "idle":
        spout(d, y=74)
        whale(d, (0, -16))
        eyes_normal(d, 0, -16)
        blush(d, 0, -16)
        mouth_smile(d, 0, -16)

    elif kind == "speechless":
        whale(d, (0, -16))
        # 眼睛变成两条横线
        for cx in (116, 186):
            d.line([cx - 13, 156, cx + 13, 156], fill=INK, width=5)
        mouth_flat(d, 0, -16)
        # 省略号
        for i, x in enumerate((196, 216, 236)):
            d.ellipse([x, 104, x + 12, 116], fill=INK)

    elif kind == "fish":
        whale(d, (0, -16))
        eyes_closed(d, 0, -16)
        mouth_smile(d, 0, -16)
        # Zzz
        f = font(30)
        d.text((214, 80), "z", font=f, fill=INK)
        d.text((232, 58), "Z", font=font(40), fill=INK)

    elif kind == "eat":
        whale(d, (0, -16))
        eyes_closed(d, 0, -16)
        # 张嘴 + 小鱼干
        d.ellipse([134, 180, 170, 210], fill=(120, 60, 60, 255))
        d.line([120, 220, 186, 220], fill=(196, 214, 226, 255), width=5)
        for x in (132, 150, 168):
            d.line([x, 220, x - 4, 230], fill=(196, 214, 226, 255), width=3)
            d.line([x, 220, x + 4, 230], fill=(196, 214, 226, 255), width=3)

    elif kind == "angry":
        whale(d, (0, -16))
        eyes_angry(d, 0, -16)
        blush(d, 0, -16)
        mouth_flat(d, 0, -16)
        # 怒气符号
        d.line([244, 88, 262, 106], fill=(240, 90, 90, 255), width=5)
        d.line([262, 88, 244, 106], fill=(240, 90, 90, 255), width=5)

    elif kind == "yay":
        whale(d, (0, -16))
        eyes_closed(d, 0, -16)
        mouth_smile(d, 0, -16, big=True)
        blush(d, 0, -16)
        spout(d, y=70, scale=1.3)
        # 星星
        for cx, cy, r in ((252, 96, 9), (60, 78, 7)):
            d.polygon([(cx, cy - r), (cx + r * 0.35, cy - r * 0.35), (cx + r, cy), (cx + r * 0.35, cy + r * 0.35),
                       (cx, cy + r), (cx - r * 0.35, cy + r * 0.35), (cx - r, cy), (cx - r * 0.35, cy - r * 0.35)], fill=YELLOW)

    elif kind == "what":
        whale(d, (0, -16))
        eyes_normal(d, 0, -16)
        mouth_o(d, 0, -16)
        f = font(64)
        d.text((236, 46), "?", font=f, fill=INK)

    elif kind == "gulu":
        whale(d, (0, -16))
        eyes_normal(d, 0, -16)
        mouth_smile(d, 0, -16)
        for cx, cy, r in ((70, 120, 10), (92, 92, 7), (56, 96, 5), (252, 150, 8), (268, 122, 5)):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=BLUE_D, width=3)

    caption(img, CAPS[kind])
    path = os.path.join(OUT, f"{kind}.png")
    img.save(path)
    return path


if __name__ == "__main__":
    for k in CAPS:
        print(make(k))
