"""
Google Maps integration (server-side only).

Scenario A — as-you-type suggestions:
  POST https://places.googleapis.com/v1/places:autocomplete

Scenario B — full address text → lat/lng:
  POST https://places.googleapis.com/v1/places:searchText

Place details (after user picks a suggestion):
  GET  https://places.googleapis.com/v1/places/{placeId}

Reverse geocode (map pin → address) still uses Geocoding API.
"""

import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

PLACES_API_BASE = "https://places.googleapis.com/v1"
GEOCODE_API_BASE = "https://maps.googleapis.com/maps/api"


def maps_configured() -> bool:
    return bool(getattr(settings, "GOOGLE_MAPS_API_KEY", ""))


def _api_key() -> str | None:
    key = getattr(settings, "GOOGLE_MAPS_API_KEY", "")
    return key or None


def _parse_error(payload: dict) -> str:
    if "error" in payload:
        err = payload["error"]
        if isinstance(err, dict):
            return err.get("message") or err.get("status") or "Google Maps error"
    return payload.get("error_message") or "Google Maps error"


def _places_request(
    method: str,
    path: str,
    *,
    body: dict | None = None,
    field_mask: str | None = None,
) -> tuple[dict | None, str | None]:
    api_key = _api_key()
    if not api_key:
        return None, "Google Maps API key is not configured on the server"

    url = f"{PLACES_API_BASE}/{path}"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
    }
    if field_mask:
        headers["X-Goog-FieldMask"] = field_mask

    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=8) as response:
            return json.loads(response.read().decode()), None
    except urllib.error.HTTPError as exc:
        try:
            payload = json.loads(exc.read().decode())
            return None, _parse_error(payload)
        except (json.JSONDecodeError, ValueError):
            return None, f"Google Maps HTTP {exc.code}"
    except urllib.error.URLError as exc:
        return None, f"Could not reach Google Maps: {exc}"


def _legacy_geocode_get(params: dict) -> tuple[dict | None, str | None]:
    api_key = _api_key()
    if not api_key:
        return None, "Google Maps API key is not configured on the server"

    query = urllib.parse.urlencode({**params, "key": api_key})
    url = f"{GEOCODE_API_BASE}/geocode/json?{query}"

    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode())
    except urllib.error.URLError as exc:
        return None, f"Could not reach Google Maps: {exc}"

    status = payload.get("status")
    if status not in ("OK", "ZERO_RESULTS"):
        return None, _parse_error(payload)

    return payload, None


def _place_id_from_prediction(pred: dict) -> str | None:
    place_id = pred.get("placeId")
    if place_id:
        return place_id
    place_resource = pred.get("place") or ""
    if isinstance(place_resource, str) and place_resource.startswith("places/"):
        return place_resource.removeprefix("places/")
    return None


def _location_from_place(place: dict) -> tuple[float | None, float | None]:
    location = place.get("location") or {}
    return location.get("latitude"), location.get("longitude")


# --- Scenario A: Autocomplete (as-you-type) ---


def autocomplete_places(input_text: str) -> tuple[list[dict], str | None]:
    payload, err = _places_request(
        "POST",
        "places:autocomplete",
        body={"input": input_text},
        field_mask=(
            "suggestions.placePrediction.placeId,"
            "suggestions.placePrediction.text,"
            "suggestions.placePrediction.place"
        ),
    )
    if err:
        return [], err

    predictions = []
    for item in payload.get("suggestions") or []:
        pred = item.get("placePrediction") or {}
        place_id = _place_id_from_prediction(pred)
        if not place_id:
            continue
        text_obj = pred.get("text") or {}
        description = (
            text_obj.get("text")
            if isinstance(text_obj, dict)
            else str(text_obj)
        )
        if not description:
            continue
        predictions.append({
            "place_id": place_id,
            "description": description,
        })

    return predictions, None


# --- Place details by ID (after autocomplete selection) ---


def place_details(place_id: str) -> tuple[dict | None, str | None]:
    clean_id = place_id.removeprefix("places/")
    encoded_id = urllib.parse.quote(clean_id, safe="")

    payload, err = _places_request(
        "GET",
        f"places/{encoded_id}",
        field_mask="formattedAddress,location",
    )
    if err:
        return None, err

    lat, lon = _location_from_place(payload)
    if lat is None or lon is None:
        return None, "Place has no coordinates"

    return {
        "address": payload.get("formattedAddress", ""),
        "lat": lat,
        "lon": lon,
    }, None


# --- Scenario B: Full address text → lat/lng ---


def geocode_address_text(text: str) -> tuple[dict | None, str | None]:
    payload, err = _places_request(
        "POST",
        "places:searchText",
        body={"textQuery": text},
        field_mask="places.formattedAddress,places.location,places.id",
    )
    if err:
        return None, err

    places = payload.get("places") or []
    if not places:
        return None, "No results for this address"

    place = places[0]
    lat, lon = _location_from_place(place)
    if lat is None or lon is None:
        return None, "Address has no coordinates"

    return {
        "address": place.get("formattedAddress", text),
        "lat": lat,
        "lon": lon,
    }, None


# --- Reverse geocode (coordinates → address) ---


def reverse_geocode(lat: float, lon: float) -> tuple[str | None, str | None]:
    payload, err = _legacy_geocode_get({"latlng": f"{lat},{lon}"})
    if err:
        return None, err

    results = payload.get("results") or []
    if not results:
        return None, "No address found for this location"

    return results[0].get("formatted_address"), None
