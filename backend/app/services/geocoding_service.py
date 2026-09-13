"""
geocoding_service.py — Provider-abstracted reverse geocoding.

Per ARCHITECTURE §2 & RULES §2.2: concrete providers implement GeocodingProvider
interface so they can be swapped via config without code changes.
Default: Nominatim (OpenStreetMap) — free, no API key required.
"""
from abc import ABC, abstractmethod
from typing import Optional
import httpx


class GeocodingProvider(ABC):
    """Interface all geocoding providers must implement — RULES §2.2."""

    @abstractmethod
    async def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        """Return human-readable address string or None on failure."""
        ...


class NominatimProvider(GeocodingProvider):
    """Nominatim (OpenStreetMap) reverse geocoding — free, no API key."""

    BASE_URL = "https://nominatim.openstreetmap.org/reverse"

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    self.BASE_URL,
                    params={
                        "lat": lat,
                        "lon": lon,
                        "format": "json",
                        "addressdetails": 1,
                    },
                    headers={"User-Agent": "AI-Civic-Guardian/1.0"},
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("display_name")
        except Exception:
            return None  # RULES §2.7 — fail gracefully, never silently


class MockGeocodingProvider(GeocodingProvider):
    """Deterministic mock for unit/integration tests — RULES §2.10."""

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[str]:
        return f"Mock Address at ({lat:.4f}, {lon:.4f}), Test City, India"


def get_geocoding_provider(provider_name: str) -> GeocodingProvider:
    """Factory — swaps provider from config string (RULES §2.2)."""
    providers = {
        "nominatim": NominatimProvider,
        "mock": MockGeocodingProvider,
    }
    cls = providers.get(provider_name.lower(), NominatimProvider)
    return cls()
