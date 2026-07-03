"""Swappable translation backend.

Default provider is Argos Translate (fully offline, no API key, no billing --
see ArgosTranslateClient below). Google Cloud Translation v2 REST (API-key
auth) remains available as an opt-in alternative for higher quality/coverage
if you have a key. Falls back to a no-op passthrough translator if neither
is usable, so the whole capture -> VAD -> STT -> translate -> relay pipeline
is testable without any external dependency.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor

import httpx

from .config import Settings

logger = logging.getLogger("transcribe.translate")

GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"


class Translator(ABC):
    @abstractmethod
    async def translate(self, text: str, target_lang: str, source_lang: str | None = None) -> str: ...


class PassthroughTranslator(Translator):
    """Returns text unchanged. Used when no translation API key is configured."""

    _warned = False

    async def translate(self, text: str, target_lang: str, source_lang: str | None = None) -> str:
        if not PassthroughTranslator._warned:
            logger.warning(
                "Translation provider is passthrough (no API key configured) -- "
                "captions will NOT be translated, original text is relayed as-is."
            )
            PassthroughTranslator._warned = True
        return text


class GoogleTranslateClient(Translator):
    def __init__(self, api_key: str, timeout_s: float) -> None:
        self._api_key = api_key
        self._client = httpx.AsyncClient(timeout=timeout_s)

    async def translate(self, text: str, target_lang: str, source_lang: str | None = None) -> str:
        if not text.strip():
            return text
        params = {"key": self._api_key, "q": text, "target": target_lang, "format": "text"}
        if source_lang and source_lang != "auto":
            params["source"] = source_lang
        try:
            response = await self._client.post(GOOGLE_TRANSLATE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            return data["data"]["translations"][0]["translatedText"]
        except Exception:
            logger.warning("Google Translate call failed, falling back to original text", exc_info=True)
            return text

    async def aclose(self) -> None:
        await self._client.aclose()


class ArgosTranslateClient(Translator):
    """Offline machine translation via Argos Translate (no API key, no cost).

    Argos's translate/package APIs are blocking and, like faster-whisper,
    Argos models run on ctranslate2 -- so every call (including warm-up)
    is routed through one dedicated single-worker executor, for the same
    reason documented in transcriber.py: ctranslate2 pays a large one-time
    setup cost the first time it's invoked from a given native thread.
    Warming up on the wrong thread just moves that cost onto a live
    caption instead of eating it at startup.

    Language packages are installed lazily per (source, target) pair on
    first use -- this requires internet access the first time a given pair
    is requested (to download the package), then works fully offline for
    that pair afterwards. If no direct package exists for a pair, falls
    back to pivoting through English (source->en, en->target), which is
    how Argos covers most of its language matrix.
    """

    def __init__(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="argos")
        self._ensured_pairs: set[tuple[str, str]] = set()
        self._failed_pairs: set[tuple[str, str]] = set()
        self._executor.submit(self._warm_up).result()

    def _warm_up(self) -> None:
        import argostranslate.package
        import argostranslate.translate

        # argostranslate.utils sets its own logger to INFO at its *own* import
        # time (see its module-level `logger.setLevel(...)`), which happens
        # lazily here and overwrites any level set before this module was
        # imported -- so the suppression has to be (re-)applied after this
        # point, not at translator.py's top-level import time.
        logging.getLogger("argostranslate.utils").setLevel(logging.WARNING)

        try:
            argostranslate.package.update_package_index()
            logger.info("Argos Translate package index updated")
        except Exception:
            logger.exception(
                "Failed to update Argos Translate package index (needs internet the "
                "first time); language pairs will fail to install until this succeeds"
            )
            return

        # Pay ctranslate2's first-call-from-this-thread cost now, not on a live
        # caption. en->es is used purely as a warm-up pair (almost always
        # available) -- this is not a hardcoded default translation direction.
        try:
            self._ensure_pair_installed("en", "es")
            self._ensured_pairs.add(("en", "es"))
            argostranslate.translate.translate("warm up", "en", "es")
            logger.info("Argos Translate warmed up")
        except Exception:
            logger.exception("Argos Translate warm-up translation failed")

    async def translate(self, text: str, target_lang: str, source_lang: str | None = None) -> str:
        if not text.strip():
            return text
        source_lang = source_lang or "en"
        if source_lang == target_lang:
            return text
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self._executor, self._translate_blocking, text, source_lang, target_lang)

    def _translate_blocking(self, text: str, source_lang: str, target_lang: str) -> str:
        import argostranslate.translate

        pair = (source_lang, target_lang)
        if pair in self._failed_pairs:
            return text

        if pair not in self._ensured_pairs:
            try:
                self._ensure_pair_installed(source_lang, target_lang)
                self._ensured_pairs.add(pair)
            except Exception:
                logger.exception(
                    "No usable Argos Translate package path for %s -> %s, falling back to original text",
                    source_lang,
                    target_lang,
                )
                self._failed_pairs.add(pair)
                return text

        try:
            return argostranslate.translate.translate(text, source_lang, target_lang)
        except Exception:
            logger.exception("Argos translation failed for %s -> %s", source_lang, target_lang)
            return text

    def _ensure_pair_installed(self, source_lang: str, target_lang: str) -> None:
        import argostranslate.package
        import argostranslate.translate

        installed_languages = argostranslate.translate.get_installed_languages()
        from_lang = next((lang for lang in installed_languages if lang.code == source_lang), None)
        to_lang = next((lang for lang in installed_languages if lang.code == target_lang), None)
        if from_lang and to_lang and from_lang.get_translation(to_lang) is not None:
            return

        available = argostranslate.package.get_available_packages()

        direct = next((p for p in available if p.from_code == source_lang and p.to_code == target_lang), None)
        if direct:
            logger.info("Installing Argos package %s -> %s", source_lang, target_lang)
            argostranslate.package.install_from_path(direct.download())
            return

        to_en = next((p for p in available if p.from_code == source_lang and p.to_code == "en"), None)
        from_en = next((p for p in available if p.from_code == "en" and p.to_code == target_lang), None)
        if to_en and from_en:
            logger.info("Installing Argos pivot packages %s->en, en->%s", source_lang, target_lang)
            argostranslate.package.install_from_path(to_en.download())
            argostranslate.package.install_from_path(from_en.download())
            return

        raise RuntimeError(f"No Argos Translate package path found for {source_lang} -> {target_lang}")

    def shutdown(self) -> None:
        self._executor.shutdown(wait=True)


def get_translator(settings: Settings) -> Translator:
    if settings.translation_provider == "google":
        if settings.google_translate_api_key:
            return GoogleTranslateClient(settings.google_translate_api_key, settings.translation_timeout_s)
        logger.warning("translation_provider=google but no google_translate_api_key set -- using passthrough")
        return PassthroughTranslator()
    if settings.translation_provider == "argos":
        return ArgosTranslateClient()
    return PassthroughTranslator()
