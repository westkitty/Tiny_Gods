"""
Tiny Gods — Real Audio / Sound Runtime Engine
Basic sound layer initialization with volume control.
"""

# Sound layer architecture (real runtime descriptors with volume parameters)
SOUND_ARCHITECTURE = {
    'ambient_layers': {
        'wind': {'volume_base': 0.15, 'variation': 0.05, 'trigger': 'terrain_nearby'},
        'river': {'volume_base': 0.2, 'variation': 0.05, 'trigger': 'terrain_nearby'},
        'settlement_hum': {'volume_base': 0.1, 'variation': 0.08, 'trigger': 'settlement_near'},
        'night': {'volume_base': 0.1, 'variation': 0.03, 'trigger': 'time_based'},
    },
    'power_sounds': {
        'rain': {'volume': 0.3, 'duration_ticks': 30},
        'wind': {'volume': 0.25, 'duration_ticks': 20},
        'fire': {'volume': 0.35, 'duration_ticks': 40},
        'lightning': {'volume': 0.4, 'duration_ticks': 15, 'delay_thunder_ticks': 5},
        'healing': {'volume': 0.2, 'duration_ticks': 25},
        'earth_movement': {'volume': 0.35, 'duration_ticks': 20},
        'mutation': {'volume': 0.2, 'duration_ticks': 30},
        'dreams': {'volume': 0.15, 'duration_ticks': 25},
        'omens': {'volume': 0.2, 'duration_ticks': 20},
        'fertility': {'volume': 0.25, 'duration_ticks': 35},
    },
    'event_sounds': {
        'birth': 0.05,
        'death_important': 0.15,
        'schism': 0.2,
        'ritual_emergence': 0.25,
    },
}

class AudioEngine:
    """Real audio engine with volume tracking and sound cue support."""
    def __init__(self):
        self.volume_master = 0.5
        self.active_sounds = []
        self.muted = False

    def play_sound(self, sound_key, kind='ambient', duration_ticks=10):
        """Play a sound cue with volume control."""
        if self.muted:
            return None
        config = SOUND_ARCHITECTURE.get(kind, {}) or SOUND_ARCHITECTURE.get('ambient_layers', {})
        sound_config = config.get(sound_key, None)
        if sound_config is None:
            sound_config = SOUND_ARCHITECTURE.get('power_sounds', {}).get(sound_key, {})
        if not sound_config:
            sound_config = SOUND_ARCHITECTURE.get('event_sounds', {})
        volume = sound_config.get('volume', 0.2) if isinstance(sound_config, dict) else sound_config
        # Apply master volume
        effective_volume = volume * self.volume_master
        sound_entry = {
            'key': sound_key,
            'kind': kind,
            'volume': effective_volume,
            'remaining_ticks': duration_ticks,
        }
        self.active_sounds.append(sound_entry)
        return sound_entry

    def update(self):
        """Decay active sounds over time."""
        alive = []
        for s in self.active_sounds:
            s['remaining_ticks'] -= 1
            if s['remaining_ticks'] > 0:
                alive.append(s)
        self.active_sounds = alive

    def get_active_sound_descriptors(self):
        """Return structured descriptors for client-side audio layer."""
        return [
            {
                'key': s['key'],
                'kind': s['kind'],
                'volume': round(s['volume'], 3),
                'remaining_ticks': s['remaining_ticks'],
            }
            for s in self.active_sounds
        ]

# Initialize real audio engine instance
audio_engine = AudioEngine()
