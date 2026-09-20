import math, random
from PIL import Image, ImageDraw, ImageFilter

def make_grass_texture(width=512, height=512):
    img = Image.new('RGB', (width, height), (72, 128, 54))
    draw = ImageDraw.Draw(img)
    rng = random.Random(1337)
    
    # Base mottling
    for _ in range(4000):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        r = rng.randint(4, 18)
        c = (
            int(72 + rng.uniform(-14, 22)),
            int(128 + rng.uniform(-20, 26)),
            int(54 + rng.uniform(-12, 16))
        )
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
    
    img = img.filter(ImageFilter.GaussianBlur(radius=3))
    draw = ImageDraw.Draw(img)
    
    # Subtle grass tufts / blades
    for _ in range(3000):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        length = rng.randint(4, 9)
        angle = rng.uniform(-0.5, 0.5)
        bright = rng.choice([(95, 162, 68), (115, 180, 80), (60, 105, 45)])
        dx = math.sin(angle) * length
        dy = -math.cos(angle) * length
        draw.line([x, y, x + dx, y + dy], fill=bright, width=rng.choice([1, 2]))
        
    return img

def make_dirt_texture(width=512, height=512):
    img = Image.new('RGB', (width, height), (150, 118, 85))
    draw = ImageDraw.Draw(img)
    rng = random.Random(2026)
    
    for _ in range(5000):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        r = rng.randint(3, 14)
        c = (
            int(150 + rng.uniform(-24, 28)),
            int(118 + rng.uniform(-20, 22)),
            int(85 + rng.uniform(-16, 18))
        )
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
        
    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    draw = ImageDraw.Draw(img)
    
    # Fine pebbles
    for _ in range(1200):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        r = rng.randint(1, 3)
        c = rng.choice([(180, 160, 135), (105, 80, 58), (125, 95, 70)])
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
        
    return img

def make_rock_texture(width=512, height=512):
    img = Image.new('RGB', (width, height), (115, 118, 126))
    draw = ImageDraw.Draw(img)
    rng = random.Random(42)
    
    for _ in range(4000):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        r = rng.randint(5, 22)
        c = (
            int(115 + rng.uniform(-28, 30)),
            int(118 + rng.uniform(-26, 28)),
            int(126 + rng.uniform(-24, 26))
        )
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
        
    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    draw = ImageDraw.Draw(img)
    
    # Mineral cracks
    for _ in range(25):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        points = [(x, y)]
        for _ in range(rng.randint(6, 14)):
            x += rng.randint(-18, 22)
            y += rng.randint(-18, 22)
            points.append((x % width, y % height))
        draw.line(points, fill=(75, 78, 86), width=rng.choice([1, 2]))
        
    return img

def make_water_normal_texture(width=256, height=256):
    img = Image.new('RGB', (width, height))
    pixels = img.load()
    
    for y in range(height):
        for x in range(width):
            # Sum of sinusoids for flowing wave normal
            nx = (
                math.sin(x * 0.12 + y * 0.08) * 0.4 +
                math.sin(x * 0.25 - y * 0.15) * 0.3 +
                math.cos(x * 0.06 + y * 0.22) * 0.3
            )
            ny = (
                math.cos(x * 0.10 - y * 0.12) * 0.4 +
                math.cos(x * 0.22 + y * 0.18) * 0.3 +
                math.sin(x * 0.08 + y * 0.26) * 0.3
            )
            nz = 1.0
            
            # Normalize vector
            length = math.sqrt(nx*nx + ny*ny + nz*nz)
            nx /= length
            ny /= length
            nz /= length
            
            # Convert normal (-1..1) to RGB (0..255)
            r = int((nx * 0.5 + 0.5) * 255)
            g = int((ny * 0.5 + 0.5) * 255)
            b = int((nz * 0.5 + 0.5) * 255)
            pixels[x, y] = (r, g, b)
            
    return img

def make_burned_texture(width=512, height=512):
    img = Image.new('RGB', (width, height), (38, 32, 30))
    draw = ImageDraw.Draw(img)
    rng = random.Random(666)
    
    for _ in range(4000):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        r = rng.randint(3, 16)
        c = (
            int(38 + rng.uniform(-18, 24)),
            int(32 + rng.uniform(-16, 20)),
            int(30 + rng.uniform(-14, 18))
        )
        draw.ellipse([x - r, y - r, x + r, y + r], fill=c)
        
    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    draw = ImageDraw.Draw(img)
    
    # Glowing ember cracks
    for _ in range(18):
        x = rng.randint(0, width)
        y = rng.randint(0, height)
        points = [(x, y)]
        for _ in range(rng.randint(5, 12)):
            x += rng.randint(-15, 20)
            y += rng.randint(-15, 20)
            points.append((x % width, y % height))
        draw.line(points, fill=(185, 70, 20), width=2)
        draw.line(points, fill=(245, 160, 40), width=1)
        
    return img

def make_cloud_texture(width=512, height=512):
    img = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(img)
    rng = random.Random(777)
    
    # Soft overlapping cloud puffs
    for _ in range(40):
        cx = rng.randint(50, width - 50)
        cy = rng.randint(50, height - 50)
        for _ in range(12):
            ox = cx + rng.randint(-60, 60)
            oy = cy + rng.randint(-40, 40)
            r = rng.randint(35, 90)
            alpha = rng.randint(25, 75)
            draw.ellipse([ox - r, oy - r, ox + r, oy + r], fill=alpha)
            
    img = img.filter(ImageFilter.GaussianBlur(radius=24))
    return img

# Particle VFX
def make_sparkle(size=128):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    half = size / 2
    for r in range(int(half), 0, -1):
        alpha = int((1.0 - (r / half) ** 0.6) * 255)
        draw.ellipse([half - r, half - r, half + r, half + r], fill=(255, 245, 210, alpha))
    # 4-point star rays
    draw.line([half, 4, half, size - 4], fill=(255, 255, 255, 220), width=2)
    draw.line([4, half, size - 4, half], fill=(255, 255, 255, 220), width=2)
    return img.filter(ImageFilter.GaussianBlur(radius=1.5))

def make_smoke(size=128):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    half = size / 2
    rng = random.Random(88)
    for _ in range(16):
        ox = half + rng.randint(-16, 16)
        oy = half + rng.randint(-16, 16)
        r = rng.randint(18, 38)
        draw.ellipse([ox - r, oy - r, ox + r, oy + r], fill=(210, 205, 200, 35))
    return img.filter(ImageFilter.GaussianBlur(radius=8))

def make_leaf(size=64):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Leaf shape
    coords = [(32, 6), (50, 26), (46, 48), (32, 58), (18, 48), (14, 26)]
    draw.polygon(coords, fill=(120, 175, 60, 230))
    draw.line([(32, 8), (32, 56)], fill=(80, 130, 40, 240), width=2)
    return img.filter(ImageFilter.GaussianBlur(radius=0.5))

def make_flame(size=128):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    half = size / 2
    for r in range(int(half), 0, -1):
        ratio = r / half
        alpha = int((1.0 - ratio) * 230)
        red = 255
        green = int(max(0, min(255, (1.0 - ratio * 0.8) * 210)))
        blue = int(max(0, min(255, (1.0 - ratio * 1.5) * 80)))
        draw.ellipse([half - r * 0.7, half - r * 0.9, half + r * 0.7, half + r * 0.8], fill=(red, green, blue, alpha))
    return img.filter(ImageFilter.GaussianBlur(radius=3))

make_grass_texture().save('assets/textures/terrain_grass.png')
make_dirt_texture().save('assets/textures/terrain_dirt.png')
make_rock_texture().save('assets/textures/terrain_rock.png')
make_water_normal_texture().save('assets/textures/terrain_water_norm.png')
make_burned_texture().save('assets/textures/terrain_burned.png')
make_cloud_texture().save('assets/textures/cloud_shadow.png')

make_sparkle().save('assets/vfx/sparkle.png')
make_smoke().save('assets/vfx/smoke.png')
make_leaf().save('assets/vfx/leaf.png')
make_flame().save('assets/vfx/flame.png')

print("All textures and VFX sprites generated successfully!")
