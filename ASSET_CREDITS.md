# Audio asset credits

License declarations checked on 2026-09-10. All shipped third-party audio assets below are CC0 1.0 Universal. Sources are the authors' original release pages; no attribution is legally required by CC0, but the game retains these credits. License reference: https://creativecommons.org/publicdomain/zero/1.0/

| Local file | Work / author | Original release and license declaration | Original file |
|---|---|---|---|
| public/audio/space.mp3 | Space Arp, Faster variant — Centurion_of_war | https://opengameart.org/content/space-arp | space_arp_faster_0.ogg |
| public/audio/searching.mp3 | Searching — yd | https://opengameart.org/content/searching | Searching.ogg |
| public/audio/pressure.mp3 | Pressure — yd | https://opengameart.org/content/pressure | Pressure.ogg |
| public/audio/land.mp3 | Interface Sounds 1.0 — Kenney | https://kenney.nl/assets/interface-sounds | drop_001.ogg |
| public/audio/jump.mp3 | Same pack and author | Same source | select_008.ogg |
| public/audio/spring.mp3 | Same pack and author | Same source | bong_001.ogg |
| public/audio/break.mp3 | Same pack and author | Same source | glass_001.ogg |
| public/audio/death.mp3 | Male Grunt/Yelling sounds — HaelDB | https://opengameart.org/content/male-gruntyelling-sounds (CC0 option) | yelling sounds/1yell11.wav |
| public/audio/zone.mp3 | Same pack and author | Same source | confirmation_002.ogg |
| public/audio/warning.mp3 | Same pack and author | Same source | error_003.ogg |
| public/audio/click.mp3 | Same pack and author | Same source | click_001.ogg |

Processing: BGM converted from original Ogg to 128 kbps MP3 using FFmpeg, loudness normalized to a target of -20 LUFS and -2 dB true peak. Sound effects converted to 96 kbps MP3. No musical composition edits. In-game loops and crossfades are applied at playback. The Kenney archive's original License.txt is preserved at public/audio/Kenney-License.txt.

Direct original downloads:
- https://opengameart.org/sites/default/files/space_arp_faster_0.ogg
- https://opengameart.org/sites/default/files/Searching.ogg
- https://opengameart.org/sites/default/files/Pressure.ogg
- https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip

The generated character sprites, procedural maps and UI are original project work. This file does not assign a license to the entire project. It documents the third-party audio licenses only.

Death voice: original archive https://opengameart.org/sites/default/files/yelling%20sounds.zip . Excerpt 0.70–1.48 seconds of 1yell11.wav, 100–4800 Hz band limiting, 15 ms fade-in, 170 ms fade-out, -18 LUFS / -4 dB true-peak normalization, mono 22050 Hz MP3. Slight animal-dependent pitch variation and spatial mixing at playback.


## Combos-generated game art (separate from CC0 audio)

`public/combos-assets/abyss-guardians.webp`: generated with Combos CLI / Qwen Image 3 Pro, asset ID 2099331795146809344. Three original forest/volcanic/cosmic monster designs; see `public/combos-assets/provenance.json`. This generated art is not classified as CC0 by this project.

`public/combos-assets/v2/` and the sprites cut from it into `public/combos-assets/sprites/`: generated with Combos CLI v1.8.0 / Qwen Image 3 Pro as `static_image`, using `public/art-reference.png` as a style anchor only. Asset IDs: heroes 2099389918464671744, items 2099390317816938496, beast 2099389685735325696, cave 2099389831646773248. Per-cell contents, the known row bleed in the hero sheet, and the credit cost are recorded in `public/combos-assets/v2/provenance.json`.

Slicing is reproducible with `python3 tools/slice-atlas.py`, which finds rows from the image, cuts each row on a fixed column division, keys out the flat background and trims every cell. It writes `public/combos-assets/sprites/manifest.json`.

An earlier batch in `public/combos-assets/v1/` used `--type atlas`. That pipeline treats a prompt as one character to animate, so it returned glossy semi-3D frames instead of the requested 16-bit grid. It is kept for the record and is not shipped or referenced by the renderer.

This generated art is not classified as CC0 by this project.

## Active audio routing and character voices (2026-09-15)

The active death route is `public/audio/combos-death.mp3`, not the retained HaelDB CC0 `death.mp3`. Pickup/punch use `combos-eat.mp3` / `combos-punch.mp3`.

Lobby music: Combos request model `suno-v5-5`, task `06c89116-cdb5-5e7c-8af4-a56f4174ee00`, asset `2099690590417567744`. First 60 seconds normalized to -21 LUFS with boundary fades, 96 kbps MP3.

Character dialogue: six skill lines and two ambient lines in both Chinese and English; Combos requests `elevenlabs_tts`. No real-person voice reference supplied. Requests, task IDs, asset IDs and text are in `art-jobs/voices-v1/jobs.json` and `downloads.json`. Normalized to -19 LUFS, mono 24 kHz / 64 kbps. Playback uses character-dependent pitch, proximity attenuation, cooldowns and music ducking. Generated assets are not claimed as CC0. Requested model IDs are recorded; returned task results do not independently identify model versions.
