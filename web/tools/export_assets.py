"""Export game assets (board, decks, tokens, coins) from the board picture into web/assets.

Run from anywhere:  python web/tools/export_assets.py   (needs Pillow)"""
import os
from collections import deque
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'Dhara Rakshak - Quest For Greener Bharat (Board Game) Picture.png')
OUT = os.path.join(ROOT, 'web', 'assets') + os.sep
im = Image.open(SRC).convert('RGB')

# Board (header + board area) at native resolution
im.crop((0, 0, 1110, 722)).save(OUT + 'board.jpg', quality=90, optimize=True, progressive=True)

# Subject decks
decks = {'math': (12, 752, 100, 870), 'science': (102, 752, 190, 870), 'english': (195, 752, 280, 870),
         'hindi': (285, 752, 370, 870), 'social': (375, 752, 458, 870), 'memory': (465, 752, 548, 870),
         'concentration': (555, 752, 640, 870), 'action': (645, 752, 728, 870)}
for k, b in decks.items():
    c = im.crop(b).resize(((b[2]-b[0])*2, (b[3]-b[1])*2), Image.LANCZOS)
    c.save(OUT + f'deck-{k}.jpg', quality=90)

def largest_component(alpha):
    W, H = alpha.size
    pa = alpha.load()
    seen = [[False]*W for _ in range(H)]
    best = []
    for y in range(H):
        for x in range(W):
            if pa[x, y] > 0 and not seen[y][x]:
                comp = []; q = deque([(x, y)]); seen[y][x] = True
                while q:
                    cx, cy = q.popleft(); comp.append((cx, cy))
                    for nx, ny in ((cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)):
                        if 0 <= nx < W and 0 <= ny < H and not seen[ny][nx] and pa[nx, ny] > 0:
                            seen[ny][nx] = True; q.append((nx, ny))
                if len(comp) > len(best): best = comp
    out = Image.new('L', alpha.size, 0); po = out.load()
    for x, y in best: po[x, y] = 255
    return out

# Player tokens: flood-fill the parchment background away
tokens = {'peacock': (742, 758, 806, 870), 'cow': (806, 780, 870, 870), 'owl': (870, 778, 926, 870),
          'turtle': (922, 782, 990, 870), 'deer': (990, 756, 1046, 870), 'tree': (1040, 746, 1110, 870)}
for k, b in tokens.items():
    c = im.crop(b); w = c.copy(); W, H = w.size
    seeds = [(x, 0) for x in range(0, W, 2)] + [(0, y) for y in range(0, H, 2)] + \
            [(W-1, y) for y in range(0, H, 2)] + [(x, H-1) for x in range(0, W, 2)]
    for s in seeds:
        if w.getpixel(s) != (255, 0, 255):
            ImageDraw.floodfill(w, s, (255, 0, 255), thresh=38)
    a = Image.new('L', w.size, 255); px = w.load(); pa = a.load()
    for y in range(H):
        for x in range(W):
            if px[x, y] == (255, 0, 255): pa[x, y] = 0
    a = a.filter(ImageFilter.MinFilter(3))
    a = largest_component(a).filter(ImageFilter.GaussianBlur(0.6))
    rgba = c.convert('RGBA'); rgba.putalpha(a)
    bbox = a.getbbox(); rgba = rgba.crop(bbox)
    rgba = rgba.resize((rgba.width*2, rgba.height*2), Image.LANCZOS)
    rgba.save(OUT + f'token-{k}.png', optimize=True)

# Round pieces: Shakti token coin and Karma marker
def circle_cut(box, name, size=112):
    c = im.crop(box).resize((size, size), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', (size*4, size*4), 0)
    ImageDraw.Draw(m).ellipse((6, 6, size*4-6, size*4-6), fill=255)
    c.putalpha(m.resize((size, size), Image.LANCZOS)); c.save(OUT + name, optimize=True)
circle_cut((23, 911, 75, 963), 'shakti.png')
circle_cut((358, 910, 412, 964), 'karma.png')
print('ok')
