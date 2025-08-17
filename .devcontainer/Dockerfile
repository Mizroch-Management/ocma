FROM mcr.microsoft.com/devcontainers/typescript-node:20-bullseye

# Install additional tools
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    curl \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Install Supabase CLI
RUN curl -sSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz -C /usr/local/bin

# Install Deno for Edge Functions
RUN curl -fsSL https://deno.land/x/install/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Set up dangerously skip permissions directory
RUN mkdir -p /dangerously_skip_permissions && \
    chmod 777 /dangerously_skip_permissions

WORKDIR /workspace

# Install global npm packages
RUN npm install -g pnpm tsx nodemon

USER node