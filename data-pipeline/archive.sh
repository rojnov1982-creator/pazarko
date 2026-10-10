#!/usr/bin/env bash
# Сохраняет дневные архивы КЗП (kolkostruva.bg) в GitHub Releases этого репозитория.
# КЗП хранит файлы только ~14 дней, поэтому каждый день докачиваем всё, чего ещё нет.
# Один релиз на месяц: тег kzp-YYYY-MM, файлы YYYY-MM-DD.zip.
# Нужен GH_TOKEN с правом contents: write (в Actions это github.token).
set -euo pipefail

DAYS_BACK="${DAYS_BACK:-16}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
saved=0; skipped=0; missing=0

for i in $(seq 0 "$DAYS_BACK"); do
  d="$(date -u -d "-$i day" +%F)"
  tag="kzp-${d:0:7}"

  if ! gh release view "$tag" >/dev/null 2>&1; then
    gh release create "$tag" --title "Архив КЗП ${d:0:7}" \
      --notes "Дневные архивы цен от kolkostruva.bg (отворени данни на КЗП) за ${d:0:7}. Файл = дата, за которую сети подали данные." \
      --latest=false >/dev/null
  fi

  if gh release view "$tag" --json assets -q '.assets[].name' | grep -qx "$d.zip"; then
    skipped=$((skipped+1)); continue
  fi

  f="$WORK/$d.zip"
  code="$(curl -sS -L -A "pazarko-archive (+https://github.com/rojnov1982-creator/pazarko)" \
    -o "$f" -w '%{http_code}' "https://kolkostruva.bg/opendata_files/$d.zip" || echo 000)"
  if [ "$code" != "200" ] || ! unzip -tq "$f" >/dev/null 2>&1; then
    missing=$((missing+1)); echo "нет файла за $d (HTTP $code)"; continue
  fi

  gh release upload "$tag" "$f" >/dev/null
  saved=$((saved+1)); echo "сохранён $d ($(du -h "$f" | cut -f1))"
  sleep 2
done

echo "Итого: новых $saved, уже были $skipped, недоступно $missing"
