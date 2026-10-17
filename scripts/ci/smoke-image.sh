#!/usr/bin/env bash
set -Eeuo pipefail
image="${1:?}"
name="ci-frontend-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"
cleanup(){
 docker rm -f "$name" >/dev/null 2>&1 || true
 :
}
trap cleanup EXIT
docker run -d --name "$name" -e ALLOWED_HOSTS=localhost,127.0.0.1 "$image" >/dev/null
for _attempt in $(seq 1 90); do
 if docker exec "$name" node -e "fetch('http://127.0.0.1:4200/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
   echo 'Imagem iniciou e respondeu ao healthcheck.'
   docker exec "$name" node -e "fetch('http://127.0.0.1:4200/privacidade').then(async r=>{const html=await r.text();if(!r.ok||!html.includes('Privacidade'))process.exit(1)})"
   exit 0
 fi
 if [[ $(docker inspect --format '{{.State.Running}}' "$name") != true ]]; then break; fi
 sleep 2
done
docker logs "$name"
echo 'A imagem não passou no smoke test.' >&2
exit 1
