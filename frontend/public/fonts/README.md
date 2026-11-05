# Bundled fonts

Inter and Montserrat are the unchanged WOFF2 files from this project's previously built Vercel output. Their original character subsets, weights, `font-display: swap`, and Arial fallback metrics are preserved in `app/styles/fonts.css`. The Latin subsets are preloaded by the root layout.

Bundling these files removes the build-time dependency on Google Fonts. A fresh build uses these checked-in files and does not need the old `.vercel/` output.

Copyright information was read from the fonts' embedded name tables:

- Inter: Copyright 2016 The Inter Project Authors (<https://github.com/rsms/inter>).
- Montserrat: Copyright 2011 The Montserrat Project Authors (<https://github.com/JulietaUla/Montserrat>).

Both are distributed under the SIL Open Font License 1.1 in [OFL.txt](OFL.txt).
