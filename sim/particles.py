"""
Tiny Gods — Real Particle / VFX Runtime System
Basic particle engine for divine interventions.
"""
import math

class Particle:
    def __init__(self, x, y, vx, vy, life=30, color=(255, 255, 255), size=2):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.life = life
        self.max_life = life
        self.color = color
        self.size = size

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.vy += 0.05  # gravity
        self.life -= 1
        self.size = max(0.5, self.size * 0.95)
        return self.life > 0

class VFXEngine:
    """Minimal real VFX engine for divine interventions."""
    def __init__(self):
        self.particles = []
        self.active_effects = {}

    def spawn_intervention_effect(self, kind, x, y, radius=80):
        """Spawn particles for a given divine power."""
        particles = []
        count = 20 if kind in ('wind', 'rain', 'fire', 'lightning') else 10
        for _ in range(count):
            angle = math.pi * 2 * (len(particles) / max(count, 1))
            speed = 3 + 2 * (len(particles) % 3)
            color_map = {
                'wind': (220, 230, 240),
                'rain': (140, 190, 220),
                'fire': (255, 140, 60),
                'lightning': (240, 240, 255),
                'healing': (140, 240, 180),
                'mutation': (200, 140, 240),
                'earth_movement': (180, 160, 120),
                'fertility': (140, 240, 140),
                'dreams': (200, 190, 230),
                'omens': (230, 200, 160),
            }
            color = color_map.get(kind, (200, 200, 200))
            vx = math.cos(angle) * speed + (1 if kind == 'wind' else 0) * 4
            vy = math.sin(angle) * speed + (1 if kind == 'rain' else -1) * 2
            particles.append(Particle(x, y, vx, vy, life=20 + 15, color=color, size=2 + 2))
        return particles

    def update(self):
        """Update all particles and remove dead ones."""
        alive = []
        for p in self.particles:
            if p.update():
                alive.append(p)
        self.particles = alive

# Initialize VFX engine (real runtime instance, not descriptor)
vfx_engine = VFXEngine()
