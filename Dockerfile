# Deployment is intentionally disabled. This image contains only the boundary
# record and has no command, entrypoint, application source, or runtime.
FROM scratch
LABEL org.opencontainers.image.title="pdfgenius non-runnable prototype boundary"
COPY PROJECT_STATUS.json /PROJECT_STATUS.json
