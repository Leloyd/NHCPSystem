# Ana Kalang — 3D Guide Model

Drop the rigged character model here as:

    static/models/ana-kalang/ana-kalang.glb

The landing page guide ([templates/Landing.html](../../../templates/Landing.html) →
[static/js/landing-guide.js](../../js/landing-guide.js)) loads this file automatically.

## Requirements / tips
- **Format:** `.glb` (binary glTF). Embed textures inside the GLB.
- **Up axis:** Y-up, facing +Z. The loader auto-centers, sits the model on the
  ground, and scales it to a consistent height, so exact dimensions don't matter.
- **Animations (optional):** If the GLB contains animation clips, the **first
  clip** is auto-played as an idle/talking loop. If there are no clips, the guide
  applies a gentle auto-rotate + breathing bob instead.
- **Budget:** Keep it light for mobile (ideally < 5 MB, ~30–50k tris, 1–2K
  textures) since it renders in a small always-on canvas.

## Until the model is added
A stylized gold placeholder figure renders in its place and **all narration,
voice, and controls already work** — so the feature is fully functional now.
Just replacing the file with `ana-kalang.glb` swaps in the real character; no
code changes needed.

To use a different filename or path, edit the `data-model-url` attribute on the
`#anaGuide` element in `templates/Landing.html`.
