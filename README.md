# Five Nights at Chesse — fnaf-improvements

This branch adds multiple quality-of-life and feature improvements:

What's included

- Audio (synthesized via WebAudio) for ambient drone, footsteps, door knock and jumpscare — no external audio files required.
- Toggle desk/office view with:
  - Click same camera twice (toggle behavior)
  - On-screen button: "Toggle Desk View" (also bound to keyboard key `D`)
- Stronger visual cues:
  - Blinking danger border when the animatronic is at your door
  - Warning overlay message
  - Screen-shake + jumpscare sound on game over
- PNG-friendly assets referenced if available (the code prefers PNG versions if present). If you want PNG exports, add them beside the SVGs (assets/*.png). Suggested sizes were prepared in the plan.
- All changes are committed to branch `fnaf-improvements` so you can review before merging.

Controls

- Click a camera once: view that camera.
- Click the same camera twice: toggle the desk view (put down / pick up the camera).
- Or press `D` or click the "Toggle Desk View" button.
- Toggle left/right doors with the on-screen buttons.

Notes

- The audio is generated in-browser (WebAudio). The first call to audio (clicking the toggle desk button or pressing space) will resume/create the audio context to comply with browser autoplay restrictions.
- If you prefer real audio files (MP3/OGG), I can replace the synths with short permissively-licensed assets and commit them under `assets/sfx/`.

Next steps (I can do automatically)

- Generate PNG exports for the SVGs at the resolutions discussed and commit them (I left the code using PNG paths if you add them), or I can add a small script/workflow to render them server-side.
- Replace synthesized audio with supplied or licensed sample files if you want higher fidelity.

If this looks good I can open a pull request from `fnaf-improvements` into `main` with a short description and links to the changed files. Otherwise tell me what to adjust and I'll update the branch.
