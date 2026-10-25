# OpenBench project site

This directory contains the Hugo source for the OpenBench project site. It uses the
[Spudlab Project theme](https://github.com/spudlab-xyz/spudlab-project-theme) v0.1.0 or newer.

## Preview locally

Install Hugo 0.123.0 or newer, then install the theme into this site:

```sh
git clone --branch v0.1.0 --depth 1 \
  https://github.com/spudlab-xyz/spudlab-project-theme.git \
  site/themes/spudlab-project-theme
```

From the repository root, start the preview server:

```sh
hugo server --source site
```

Open the URL printed by Hugo. The local theme checkout and generated output are ignored by Git.

## Production build

Run the same strict build used to validate the site:

```sh
hugo --source site --minify --gc --panicOnWarning
```

The configured `baseURL` is root-relative for local use. Supply the intended public URL when testing
a production build manually, for example:

```sh
hugo --source site --baseURL https://project.example/ --minify --gc --panicOnWarning
```

Generated files are written to `site/public/` and must not be committed.

## GitHub Pages deployment

The `Deploy project site` workflow in `.github/workflows/site.yml` publishes this directory to
GitHub Pages on pushes to `main` that change the site or its workflow. It can also be started
manually with **Run workflow**.

The workflow:

1. installs Hugo 0.131.0 Extended;
2. clones the pinned Spudlab Project theme v0.1.0;
3. obtains the configured Pages URL from `actions/configure-pages`;
4. passes that URL to Hugo so canonical URLs and repository-subpath links are correct;
5. uploads and deploys `site/public` with the official Pages actions.

In the repository settings, select **GitHub Actions** as the Pages source before the first
deployment. The deployment job uses the `github-pages` environment and the least privileges needed
to publish: `contents: read`, `pages: write`, and `id-token: write`.
