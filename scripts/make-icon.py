"""生成简白应用图标：深色圆角方块 + 白色「简」字（与应用内品牌标同比例）
每个尺寸直接矢量渲染，保证小尺寸（16/24/32）下清晰不糊。
输出：build/icon.ico（多尺寸）、build/icon-512.png
"""
import os
import pymupdf

DARK = (0.1216, 0.1373, 0.1569)  # #1f2328 字色，与界面一致
GLYPH_RATIO = 0.53  # 字号 / 边长，与应用内 brand-mark 一致
SIZES = [256, 128, 64, 48, 40, 32, 24, 20, 16]

FONT_CANDIDATES = [
    r'C:\Windows\Fonts\msyhbd.ttc',
    r'C:\Windows\Fonts\msyh.ttc',
    r'C:\Windows\Fonts\simhei.ttf',
]
fontfile = next((f for f in FONT_CANDIDATES if os.path.exists(f)), None)
if not fontfile:
    raise SystemExit('未找到可用中文字体')

font = pymupdf.Font(fontfile=fontfile)


def render(size: int) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page(width=size, height=size)
    # 白底方形（满铺，无圆角）+ 极浅灰描边，避免浅色任务栏下隐形
    page.draw_rect(
        pymupdf.Rect(0, 0, size, size),
        color=(0.85, 0.86, 0.88),
        fill=(1, 1, 1),
        width=max(1.0, size * 0.012),
    )

    em = GLYPH_RATIO * size
    x = (size - em) / 2
    # CJK 视觉中心略高于几何中心：基线 = 中心 + 0.36em
    baseline = size / 2 + em * 0.36
    page.insert_text((x, baseline), '简', fontsize=em, fontfile=fontfile, fontname='msyh', color=DARK)

    pix = page.get_pixmap(matrix=pymupdf.Matrix(1, 1), alpha=False)
    data = pix.samples
    return data, pix.width, pix.height


from PIL import Image

os.makedirs('build', exist_ok=True)

# 512 预览图
data, w, h = render(512)
img512 = Image.frombytes('RGB', (w, h), data)
img512.save('build/icon-512.png')

# 各尺寸独立渲染后合成 ico（大 → 小）
images = []
for s in sorted(SIZES, reverse=True):
    data, w, h = render(s)
    images.append(Image.frombytes('RGB', (w, h), data))

base = images[0]
base.save(
    'build/icon.ico',
    format='ICO',
    append_images=images[1:],
    sizes=[(s, s) for s in SIZES],
)

# 验证 ico 内包含的尺寸
ico = Image.open('build/icon.ico')
print('ico sizes:', sorted(ico.ico.sizes()))
print('ICO OK', os.path.getsize('build/icon.ico'), 'bytes')
print('PNG OK 512')
