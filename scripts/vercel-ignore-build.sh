#!/usr/bin/env bash
# Vercel's "Ignored Build Step" (vercel.json ignoreCommand).
# Exit 0 skips the deployment, exit 1 builds it.
#
# Every deployment stores its own copy of public/ (~48 MB of card images),
# so needless deployments are what makes Vercel's deployment storage grow.

# Season-data-only commits never change what visitors see: the data is
# only read by the capture job, which commits the images afterwards.
if git diff HEAD^ HEAD --quiet -- . ':(exclude)data/seasons'; then
  echo "Only season data changed: skipping deployment."
  exit 0
fi

# On a branch preview, a commit that only re-bakes card images (and their
# manifests) adds a full new image set to storage without testing any code.
# Production still deploys it, since that is how new images go live.
if [ "$VERCEL_ENV" = "preview" ] &&
  git diff HEAD^ HEAD --quiet -- . ':(exclude)data/seasons' ':(exclude)public/card-snapshots'; then
  echo "Preview with only card-image changes: skipping deployment."
  exit 0
fi

exit 1
